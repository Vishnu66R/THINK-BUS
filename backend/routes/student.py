from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
import json
from supabase import create_client, Client
from pydantic import BaseModel

router = APIRouter(prefix="/student", tags=["Student"])

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.get("/dashboard")
def get_student_dashboard(username: str):
    try:
        if not username:
            return JSONResponse(status_code=400, content={"success": False, "message": "Username is required"})

        # 1. Get the user record
        user_res = supabase.table("users").select("id").eq("username", username).execute()
        if not user_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "User not found"})
        user_id = user_res.data[0]["id"]

        # 2. Get the student record including relational fields
        student_res = supabase.table("students").select(
            "*, routes:default_route_id(name), route_stops:boarding_stop_id(stop_name), buses:current_bus_id(id, registration_number, status, driver_id)"
        ).eq("user_id", user_id).execute()

        if not student_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student profile not linked to user"})
        
        student = student_res.data[0]

        # 3. Flatten the relational fields for the frontend
        bus_data = student.get("buses") or {}
        route_data = student.get("routes") or {}
        stop_data = student.get("route_stops") or {}

        bus_id = bus_data.get("id")
        driver_name = "Unassigned"
        
        # 4. If assigned to a bus with a driver, get driver name
        if bus_data.get("driver_id"):
            driver_res = supabase.table("drivers").select("full_name").eq("id", bus_data["driver_id"]).execute()
            if driver_res.data:
                driver_name = driver_res.data[0]["full_name"]

        # 5. Fetch all stops for the student's route with coordinates
        route_id = student.get("default_route_id")
        stops_data = []
        if route_id:
            # Join route_stops with stop_locations
            stops_res = supabase.table("route_stops").select(
                "id, stop_name, stop_order, stop_locations(latitude, longitude)"
            ).eq("route_id", route_id).order("stop_order").execute()

            if stops_res.data:
                for s in stops_res.data:
                    loc = s.get("stop_locations") or {}
                    stops_data.append({
                        "id": s["id"],
                        "name": s["stop_name"],
                        "lat": float(loc.get("latitude") or 0.0),
                        "lng": float(loc.get("longitude") or 0.0),
                        "isBoarding": s["id"] == student.get("boarding_stop_id")
                    })

        # 6. Fetch map configuration
        map_config_res = supabase.table("map_config").select("*").execute()
        map_config = {item["config_key"]: item["config_value"] for item in map_config_res.data} if map_config_res.data else {}

        # Format Response Payload
        payload = {
            "success": True,
            "data": {
                "student_name": student["full_name"],
                "bus_number": bus_data.get("registration_number") or "Unassigned",
                "bus_id": bus_id,
                "route_id": route_id,
                "route_name": route_data.get("name") or "Unassigned",
                "stop_name": stop_data.get("stop_name") or "Unassigned",
                "driver_name": driver_name,
                "status": bus_data.get("status") or "Normal",
                "estimated_arrival": "8:15 AM",
                "last_updated": "Just now",
                "alert_message": "Bus Route has been changed due to traffic" if bus_data.get("status") == "Rerouted" else None,
                "stops": stops_data,
                "map_config": map_config
            }
        }

        return payload

    except Exception as e:
        print(f"[STUDENT DASHBOARD ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.get("/fees")
def get_student_fees(username: str):
    try:
        user_res = supabase.table("users").select("id").eq("username", username).execute()
        if not user_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "User not found"})
        user_id = user_res.data[0]["id"]

        student_res = supabase.table("students").select("id, full_name, semester, fee_paid").eq("user_id", user_id).execute()
        if not student_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student not found"})
        
        student = student_res.data[0]
        
        # Resolve real totals based on fee_paid db column
        is_paid = student.get("fee_paid", "unpaid") == "paid"
        total_fee = 15000
        paid_amt = 15000 if is_paid else 0
        pending_amt = total_fee - paid_amt
        
        return {
            "success": True,
            "data": {
                "student_name": student["full_name"],
                "semester": student["semester"] or "S1",
                "total_fee": total_fee,
                "paid_amount": paid_amt,
                "pending_amount": pending_amt,
                "status": "Paid" if is_paid else "Pending"
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.get("/alerts")
def get_student_alerts(username: str):
    try:
        user_res = supabase.table("users").select("id").eq("username", username).execute()
        if not user_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "User not found"})
        user_id = user_res.data[0]["id"]

        student_res = supabase.table("students").select("id, full_name, current_bus_id, boarding_stop_id").eq("user_id", user_id).execute()
        if not student_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student not found"})
            
        student = student_res.data[0]
        
        alerts = []
        
        # 1. Read live ML simulation alerts if present
        sim_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "latest_simulation.json")
        if os.path.exists(sim_path):
            try:
                with open(sim_path, "r") as f:
                    sim_data = json.load(f)
                
                if sim_data.get("status") == "rerouted":
                    broken_bus_ids = set(sim_data.get("broken_bus_ids", []))
                    
                    stop_reassignment = {}
                    for route in sim_data.get("buses", []):
                        for st in route.get("stops", []):
                            stop_reassignment[st["stop_id"]] = route
                    
                    c_bus_id = student.get("current_bus_id")
                    b_stop_id = student.get("boarding_stop_id")
                    
                    if c_bus_id in broken_bus_ids:
                        assigned_route = stop_reassignment.get(b_stop_id)
                        if assigned_route:
                            alerts.append({
                                "id": "ml-1",
                                "type": "alert",
                                "title": f"Bus Breakdown & Reassigned!",
                                "message": f"Your original bus broke down. You have been reassigned to Bus {assigned_route['registration']} (Route: {assigned_route['original_route']}). Expect delays.",
                                "timestamp": "Just Now (Live ML)",
                                "read": False
                            })
                    else:
                        assigned_route = stop_reassignment.get(b_stop_id)
                        if assigned_route and assigned_route["bus_id"] == c_bus_id:
                            alerts.append({
                                "id": "ml-2",
                                "type": "warning",
                                "title": f"Rerouting Notification: Bus {assigned_route['registration']}",
                                "message": f"Your bus has been dynamically rerouted to pick up extra students from a broken bus. Expect delays or early arrival.",
                                "timestamp": "Just Now (Live ML)",
                                "read": False
                            })
            except Exception as e:
                print(f"Error reading simulation cache: {e}")

        # Static / generic notifications
        alerts.append({
            "id": 100,
            "type": "info",
            "title": "Welcome to Think-Bus",
            "message": "Stay updated on your daily bus journeys.",
            "timestamp": "System",
            "read": True
        })
        
        return {"success": True, "alerts": alerts}
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


class PayFeeRequest(BaseModel):
    username: str
    amount: float

@router.post("/pay-fee")
def pay_student_fee(req: PayFeeRequest):
    try:
        user_res = supabase.table("users").select("id").eq("username", req.username).execute()
        if not user_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "User not found"})
        user_id = user_res.data[0]["id"]

        # Engineered endpoint to change fee_paid to "paid"
        update_res = supabase.table("students").update({"fee_paid": "paid"}).eq("user_id", user_id).execute()
        
        if not update_res.data:
            return JSONResponse(status_code=400, content={"success": False, "message": "Failed to update fee status"})
            
        return {"success": True, "message": "Payment successful"}
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.get("/profile")
def get_student_profile(username: str):
    try:
        user_res = supabase.table("users").select("id").eq("username", username).execute()
        if not user_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "User not found"})
        user_id = user_res.data[0]["id"]

        student_res = supabase.table("students").select(
            "*, routes:default_route_id(name), route_stops:boarding_stop_id(stop_name), buses:current_bus_id(id, registration_number), parents:parent_id(full_name, phone_number)"
        ).eq("user_id", user_id).execute()

        if not student_res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student profile not linked to user"})
            
        student = student_res.data[0]
        bus_data = student.get("buses") or {}
        route_data = student.get("routes") or {}
        stop_data = student.get("route_stops") or {}
        parent_data = student.get("parents") or {}

        # Fallback names/phones
        parent_name = parent_data.get("full_name") or "Unassigned"
        parent_phone = parent_data.get("phone_number") or "N/A"

        return {
            "success": True,
            "data": {
                "fullName": student.get("full_name", "Unknown"),
                "admNumber": student.get("adm_number", "Unknown"),
                "department": student.get("department", "Unknown"),
                "semester": student.get("semester", "Unknown"),
                "busNumber": bus_data.get("registration_number") or "Unassigned",
                "busId": bus_data.get("id") or 0,
                "routeName": route_data.get("name") or "Unassigned",
                "stopName": stop_data.get("stop_name") or "Unassigned",
                "parentName": parent_name,
                "parentPhone": parent_phone,
                "email": f"{username}@cep.ac.in",
                "phone": "N/A",  # Not stored in DB for students currently
                "isActive": student.get("is_active", False),
                "validUntil": "June 2026"
            }
        }

    except Exception as e:
        print(f"[STUDENT PROFILE ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})
