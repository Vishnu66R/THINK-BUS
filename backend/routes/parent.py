# backend/routes/parent.py
# -----------------------------------------------------------
# API endpoints for the Parent Panel.
# Fetches parent profile, linked children, bus/route info,
# alerts, and fee details from Supabase.
# -----------------------------------------------------------

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import json
import os
from database import supabase

router = APIRouter(prefix="/parent", tags=["Parent"])


# ─── Helper: resolve parent record from username ───
def _get_parent_by_username(username: str):
    """Look up the user row, then the parent row linked to that user."""
    user_res = supabase.table("users").select("id").eq("username", username).execute()
    if not user_res.data:
        return None, "User not found"
    user_id = user_res.data[0]["id"]

    parent_res = supabase.table("parents").select("*").eq("user_id", user_id).execute()
    if not parent_res.data:
        return None, "Parent record not found"
    return parent_res.data[0], None


# ─── 1. Parent Profile ───
@router.get("/profile")
def get_parent_profile(username: str = Query(...)):
    """Return the parent's own profile details."""
    parent, err = _get_parent_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    return {
        "success": True,
        "profile": {
            "id": parent["id"],
            "full_name": parent["full_name"],
            "phone_number": parent.get("phone_number", ""),
            "address": parent.get("address", "Not provided"),
            "username": username,
        },
    }


# ─── 2. Children linked to this parent ───
@router.get("/children")
def get_children(username: str = Query(...)):
    """Return all students (children) linked to this parent, with bus/route/stop info."""
    parent, err = _get_parent_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    parent_id = parent["id"]

    # Fetch students belonging to this parent
    students_res = (
        supabase.table("students")
        .select("*")
        .eq("parent_id", parent_id)
        .execute()
    )
    students = students_res.data or []

    # Enrich each student with bus, route, and stop details
    children = []
    for s in students:
        # Route info
        route_name = "—"
        if s.get("default_route_id"):
            r = supabase.table("routes").select("name").eq("id", s["default_route_id"]).execute()
            if r.data:
                route_name = r.data[0]["name"]

        # Stop info
        stop_name = "—"
        if s.get("boarding_stop_id"):
            st = supabase.table("route_stops").select("stop_name").eq("id", s["boarding_stop_id"]).execute()
            if st.data:
                stop_name = st.data[0]["stop_name"]

        # Bus info
        bus_number = "—"
        bus_status = "Normal"
        driver_name = "—"
        driver_phone = "—"
        if s.get("current_bus_id"):
            b = supabase.table("buses").select("*").eq("id", s["current_bus_id"]).execute()
            if b.data:
                bus = b.data[0]
                bus_number = bus["registration_number"]
                bus_status = bus.get("status", "Active")
                # Driver info
                if bus.get("driver_id"):
                    d = supabase.table("drivers").select("full_name, phone_number").eq("id", bus["driver_id"]).execute()
                    if d.data:
                        driver_name = d.data[0]["full_name"]
                        driver_phone = d.data[0].get("phone_number", "—")

        children.append({
            "id": s["id"],
            "full_name": s["full_name"],
            "adm_number": s.get("adm_number", ""),
            "semester": s.get("semester", ""),
            "department": s.get("department", ""),
            "route_id": s.get("default_route_id"),
            "route_name": route_name,
            "stop_name": stop_name,
            "bus_number": bus_number,
            "bus_status": bus_status,
            "driver_name": driver_name,
            "driver_phone": driver_phone,
            "is_active": s.get("is_active", True),
        })

    # Fetch all stops for each child's route with coordinates
    for child in children:
        student_rec = next((s for s in students if s["id"] == child["id"]), None)
        route_id = student_rec.get("default_route_id") if student_rec else None
        stops_data = []
        if route_id:
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
                        "isBoarding": s["id"] == student_rec.get("boarding_stop_id")
                    })
        child["stops"] = stops_data

    # Fetch map configuration
    map_config_res = supabase.table("map_config").select("*").execute()
    map_config = {item["config_key"]: item["config_value"] for item in map_config_res.data} if map_config_res.data else {}

    return {"success": True, "children": children, "map_config": map_config}


# ─── 3. Dashboard overview ───
@router.get("/dashboard")
def get_dashboard(username: str = Query(...)):
    """Compact overview for the dashboard: parent name + children summary."""
    parent, err = _get_parent_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    # Reuse children endpoint logic
    children_resp = get_children(username)
    # children_resp is a dict (not JSONResponse) on success
    if isinstance(children_resp, JSONResponse):
        return children_resp

    children = children_resp["children"]
    active_count = sum(1 for c in children if c["is_active"])
    rerouted_count = sum(1 for c in children if c["bus_status"] not in ("Active", "Normal"))

    return {
        "success": True,
        "parent_name": parent["full_name"],
        "total_children": len(children),
        "active_children": active_count,
        "rerouted_buses": rerouted_count,
        "children": children,
    }


# ─── 4. Alerts / Notifications ───
@router.get("/alerts")
def get_alerts(username: str = Query(...)):
    """
    Return alerts relevant to this parent.
    Checks for buses with non-Active/Maintenance status among the parent's children.
    Also returns a set of static informational alerts.
    """
    parent, err = _get_parent_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    parent_id = parent["id"]
    students_res = supabase.table("students").select("full_name, current_bus_id").eq("parent_id", parent_id).execute()
    students = students_res.data or []

    alerts = []

    # Check each child's bus status for dynamic alerts
    for s in students:
        if s.get("current_bus_id"):
            b = supabase.table("buses").select("registration_number, status").eq("id", s["current_bus_id"]).execute()
            if b.data:
                bus = b.data[0]
                status = bus.get("status", "Active")
                if status == "Maintenance":
                    alerts.append({
                        "type": "warning",
                        "title": f"Bus {bus['registration_number']} Under Maintenance",
                        "message": f"Your child {s['full_name']}'s bus is currently under maintenance. A replacement may be assigned.",
                        "timestamp": "Today",
                    })
                elif status == "Breakdown":
                    alerts.append({
                        "type": "danger",
                        "title": f"Bus {bus['registration_number']} Breakdown",
                        "message": f"Your child {s['full_name']}'s bus has broken down. Please check for rerouting updates.",
                        "timestamp": "Today",
                    })

    # Read live ML simulation alerts if present
    sim_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "latest_simulation.json")
    if os.path.exists(sim_path):
        try:
            with open(sim_path, "r") as f:
                sim_data = json.load(f)
            
            if sim_data.get("status") == "rerouted":
                broken_bus_ids = set(sim_data.get("broken_bus_ids", []))
                
                # Pre-map which new active bus handles each stop
                stop_reassignment = {}
                for route in sim_data.get("buses", []):
                    for st in route.get("stops", []):
                        stop_reassignment[st["stop_id"]] = route
                
                # Parent's students check for boarding stop reassignment
                students_ext_res = supabase.table("students").select("full_name, current_bus_id, boarding_stop_id").eq("parent_id", parent_id).execute()
                students_ext = students_ext_res.data or []
                
                for s in students_ext:
                    c_bus_id = s.get("current_bus_id")
                    b_stop_id = s.get("boarding_stop_id")
                    
                    if c_bus_id in broken_bus_ids:
                        assigned_route = stop_reassignment.get(b_stop_id)
                        if assigned_route:
                            alerts.append({
                                "type": "danger",
                                "title": f"Bus Breakdown & Reassigned!",
                                "message": f"Your child {s['full_name']}'s original bus broke down. They have been reassigned to Bus {assigned_route['registration']} (Route: {assigned_route['original_route']}). Expect delays.",
                                "timestamp": "Just Now (Live ML)",
                            })
                    else:
                        # Child's bus is not broken, but could be rerouted
                        assigned_route = stop_reassignment.get(b_stop_id)
                        if assigned_route and assigned_route["bus_id"] == c_bus_id:
                            alerts.append({
                                "type": "warning",
                                "title": f"Rerouting Notification: Bus {assigned_route['registration']}",
                                "message": f"Your child {s['full_name']}'s bus has been dynamically rerouted to pick up extra students from a broken bus. Expect delays or early arrival.",
                                "timestamp": "Just Now (Live ML)",
                            })

        except Exception as e:
            print(f"Error reading simulation cache: {e}")

    # Static informational alerts (always shown)
    alerts.append({
        "type": "info",
        "title": "Welcome to Think-Bus Parent Portal",
        "message": "You can view your children's bus details, routes, and receive real-time alerts here.",
        "timestamp": "System",
    })
    alerts.append({
        "type": "info",
        "title": "Fee Payment Reminder",
        "message": "Transport fees for the current semester are due. Check the Fees section for details.",
        "timestamp": "This Week",
    })

    return {"success": True, "alerts": alerts}


@router.get("/fees")
def get_fees(username: str = Query(...)):
    """
    Return transport fee details for each child, extracting live database status.
    """
    parent, err = _get_parent_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    parent_id = parent["id"]
    students_res = supabase.table("students").select("id, full_name, semester, fee_paid").eq("parent_id", parent_id).execute()
    students = students_res.data or []

    fees = []
    for s in students:
        is_paid = s.get("fee_paid", "unpaid") == "paid"
        total_fee = 15000
        paid_amt = 15000 if is_paid else 0
        pending_amt = total_fee - paid_amt
        semester = s.get("semester") or "S1"

        fees.append({
            "id": s["id"],
            "child_name": s["full_name"],
            "total_fee": total_fee,
            "paid_amount": paid_amt,
            "pending_amount": pending_amt,
            "semester": semester,
            "status": "Paid" if is_paid else "Pending",
        })

    return {"success": True, "fees": fees}


# ─── 6. Bus info (detailed) ───
@router.get("/bus-info")
def get_bus_info(username: str = Query(...)):
    """Detailed bus/route/driver info for every child."""
    # This is essentially the same enriched data as /children
    return get_children(username)
