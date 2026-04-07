# backend/routes/driver.py
# -----------------------------------------------------------
# API endpoints for the Driver Panel.
# Fetches driver profile, assigned bus/route, stops, students,
# and handles emergency reporting & status updates.
# -----------------------------------------------------------

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from database import supabase

router = APIRouter(prefix="/driver", tags=["Driver"])


# ─── Pydantic models for request bodies ───
class EmergencyReport(BaseModel):
    type: str        # "breakdown", "delay", "traffic"
    message: str     # optional extra info
    delay_mins: int = 0

class StatusUpdate(BaseModel):
    status: str      # "Active", "Idle", "Maintenance", "Breakdown"


# ─── Helper: resolve driver record from username ───
def _get_driver_by_username(username: str):
    """Look up user → driver record."""
    user_res = supabase.table("users").select("id").eq("username", username).execute()
    if not user_res.data:
        return None, None, "User not found"
    user_id = user_res.data[0]["id"]

    driver_res = supabase.table("drivers").select("*").eq("user_id", user_id).execute()
    if not driver_res.data:
        return None, None, "Driver record not found"
    driver = driver_res.data[0]

    # Also grab the bus assigned to this driver
    bus_res = supabase.table("buses").select("*").eq("driver_id", driver["id"]).execute()
    bus = bus_res.data[0] if bus_res.data else None

    return driver, bus, None


# ─── 1. Driver Profile ───
@router.get("/profile")
def get_driver_profile(username: str = Query(...)):
    """Return the driver's own profile details."""
    driver, bus, err = _get_driver_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    return {
        "success": True,
        "profile": {
            "id": driver["id"],
            "full_name": driver["full_name"],
            "phone_number": driver.get("phone_number", ""),
            "license_number": driver.get("license_number", ""),
            "experience_years": driver.get("experience_years", "—"),
            "is_active": driver.get("is_active", True),
            "username": username,
            "bus_number": bus["registration_number"] if bus else "Not assigned",
        },
    }


# ─── 2. My Route — assigned route + ordered stops ───
@router.get("/my-route")
def get_my_route(username: str = Query(...)):
    """Return the driver's assigned route with all stops in order."""
    driver, bus, err = _get_driver_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    if not bus or not bus.get("route_id"):
        return {"success": True, "route": None, "stops": [], "message": "No route assigned"}

    # Route details
    route_res = supabase.table("routes").select("*").eq("id", bus["route_id"]).execute()
    route = route_res.data[0] if route_res.data else None

    # Stops in order with coordinates
    stops_res = (
        supabase.table("route_stops")
        .select("*, stop_locations(latitude, longitude)")
        .eq("route_id", bus["route_id"])
        .order("stop_order")
        .execute()
    )
    stops = stops_res.data or []

    # --- Live Simulation Intercept ---
    import os
    import json
    sim_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "latest_simulation.json")
    if os.path.exists(sim_path):
        try:
            with open(sim_path, "r") as f:
                sim_data = json.load(f)
            
            if sim_data.get("status") == "rerouted":
                broken_bus_ids = set(sim_data.get("broken_bus_ids", []))
                
                if bus["id"] in broken_bus_ids:
                    bus["status"] = "Breakdown (ML Override)"
                    stops = []
                else:
                    for r_bus in sim_data.get("buses", []):
                        if r_bus["bus_id"] == bus["id"]:
                            # Override route estimated duration
                            if route:
                                route["estimated_duration_minutes"] = r_bus["estimated_duration_mins"]
                                route["name"] += " [REROUTED]"
                            
                            new_stops = []
                            for idx, st in enumerate(r_bus["stops"]):
                                loc = st.get("location") or {}
                                new_stops.append({
                                    "id": st["stop_id"],
                                    "stop_name": st["stop_name"] + " (Optimized Dispatch)",
                                    "stop_order": idx + 1,
                                    "time_from_start_mins": 0,
                                    "stop_locations": {"latitude": loc.get("latitude"), "longitude": loc.get("longitude")}
                                })
                            # Replace normal stops with optimized sequence!
                            stops = new_stops
                            bus["status"] = "Rerouted"
                            break
        except Exception as e:
            print("Error interpreting simulation:", e)

    # Fetch map configuration
    map_config_res = supabase.table("map_config").select("*").execute()
    map_config = {item["config_key"]: item["config_value"] for item in map_config_res.data} if map_config_res.data else {}

    return {
        "success": True,
        "bus_id": bus["id"],
        "bus_number": bus["registration_number"],
        "bus_status": bus.get("status", "Active"),
        "route": {
            "id": route["id"],
            "name": route["name"],
            "start_point": route["start_point"],
            "end_point": route["end_point"],
            "estimated_duration": route.get("estimated_duration_minutes", "—"),
        } if route else None,
        "stops": [
            {
                "id": s["id"],
                "name": s["stop_name"],
                "order": s["stop_order"],
                "time_from_start": s.get("time_from_start_mins", 0),
                "lat": float(s.get("stop_locations", {}).get("latitude") or 0.0) if s.get("stop_locations") else 0.0,
                "lng": float(s.get("stop_locations", {}).get("longitude") or 0.0) if s.get("stop_locations") else 0.0,
            }
            for s in stops
        ],
        "map_config": map_config
    }


# ─── 3. Navigate — route progression ───
@router.get("/navigate")
def get_navigation(username: str = Query(...)):
    """Return navigation data: stops with timing for step-by-step progression."""
    # Reuse my-route data
    route_data = get_my_route(username)
    if isinstance(route_data, JSONResponse):
        return route_data
    return route_data  # Frontend handles the step-based progression


# ─── 4. Summary — trip statistics ───
@router.get("/summary")
def get_trip_summary(username: str = Query(...)):
    """Return trip summary: stops, students on bus, duration."""
    driver, bus, err = _get_driver_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    if not bus:
        return {"success": True, "summary": None, "message": "No bus assigned"}

    # Count stops
    stops_res = (
        supabase.table("route_stops")
        .select("id")
        .eq("route_id", bus.get("route_id", -1))
        .execute()
    )
    total_stops = len(stops_res.data) if stops_res.data else 0

    # Count students on this bus
    students_res = (
        supabase.table("students")
        .select("id")
        .eq("current_bus_id", bus["id"])
        .execute()
    )
    total_students = len(students_res.data) if students_res.data else 0

    # Route duration
    route_res = supabase.table("routes").select("name, estimated_duration_minutes").eq("id", bus.get("route_id", -1)).execute()
    route = route_res.data[0] if route_res.data else {}

    # Fetch all stops for this specific route with coordinates
    route_id = bus.get("route_id")
    stops_data = []
    if route_id:
        stops_res = supabase.table("route_stops").select(
            "id, stop_name, stop_order, stop_locations(latitude, longitude)"
        ).eq("route_id", route_id).order("stop_order").execute()

        _stops = stops_res.data or []

        # Intercept for summary stops list
        import os, json
        sim_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "latest_simulation.json")
        if os.path.exists(sim_path):
            try:
                with open(sim_path, "r") as f:
                    sim_data = json.load(f)
                if sim_data.get("status") == "rerouted":
                    broken_bus_ids = set(sim_data.get("broken_bus_ids", []))
                    if bus["id"] in broken_bus_ids:
                        _stops = []
                        total_stops = 0
                        total_students = 0
                        bus["status"] = "Breakdown (ML Override)"
                    else:
                        for r_bus in sim_data.get("buses", []):
                            if r_bus["bus_id"] == bus["id"]:
                                new_stops = []
                                for idx, st in enumerate(r_bus["stops"]):
                                    loc = st.get("location") or {}
                                    new_stops.append({
                                        "id": st["stop_id"],
                                        "stop_name": st["stop_name"] + " (Optimized)",
                                        "stop_order": idx + 1,
                                        "stop_locations": {"latitude": loc.get("latitude"), "longitude": loc.get("longitude")}
                                    })
                                _stops = new_stops
                                total_stops = len(new_stops)
                                total_students = r_bus["passenger_count"]
                                if route:
                                    route["estimated_duration_minutes"] = r_bus["estimated_duration_mins"]
                                break
            except Exception:
                pass

        if _stops:
            for s in _stops:
                loc = s.get("stop_locations") or {}
                stops_data.append({
                    "id": s["id"],
                    "name": s["stop_name"],
                    "lat": float(loc.get("latitude") or 0.0),
                    "lng": float(loc.get("longitude") or 0.0),
                    "isBoarding": False
                })

    # Fetch map configuration
    map_config_res = supabase.table("map_config").select("*").execute()
    map_config = {item["config_key"]: item["config_value"] for item in map_config_res.data} if map_config_res.data else {}

    return {
        "success": True,
        "summary": {
            "bus_id": bus["id"],
            "bus_number": bus["registration_number"],
            "route_id": bus.get("route_id"),
            "route_name": route.get("name", "—"),
            "total_stops": total_stops,
            "total_students": total_students,
            "route_duration_mins": route.get("estimated_duration_minutes", "—"),
            "bus_capacity": bus.get("capacity", 50),
            "bus_status": bus.get("status", "Active"),
            "stops": stops_data,
        },
        "map_config": map_config
    }


# ─── 5. Emergency Report ───
@router.post("/emergency")
def report_emergency(data: EmergencyReport, username: str = Query(...)):
    """
    Handle emergency reports from the driver.
    Updates the bus status based on emergency type and dispatches notifications.
    """
    driver, bus, err = _get_driver_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    if not bus:
        return JSONResponse(status_code=400, content={"success": False, "message": "No bus assigned"})

    # Map emergency type → bus status
    status_map = {
        "breakdown": "Breakdown",
        "delay": "Active",       # still active but delayed
        "traffic": "Active",     # still active but slow
    }
    new_status = status_map.get(data.type, bus.get("status", "Active"))

    # Update bus status in database
    try:
        supabase.table("buses").update({"status": new_status}).eq("id", bus["id"]).execute()

        # Generate Notification Record
        if data.type in ["delay", "traffic", "breakdown"]:
            if data.type == "breakdown":
                title = "Bus Breakdown Emergency!"
                msg = f"Driver reported a breakdown: {data.message}."
                noti_type = "alert"
            else:
                title = f"Bus Delayed ({data.delay_mins} mins)"
                msg = f"Driver reported {data.type}: {data.message}. The bus will pause for {data.delay_mins} minutes."
                noti_type = "warning"
            
            # Insert into notifications table
            supabase.table("notifications").insert({
                "type": noti_type,
                "title": title,
                "message": msg,
                "target_role": "All",
                "target_bus_id": bus["id"],
                "delay_mins": data.delay_mins
            }).execute()

            # Tell the in-memory tracker to pause this bus if there is a delay!
            if data.delay_mins > 0:
                import datetime
                from routes.admin import _bus_tracking_state
                if bus["id"] in _bus_tracking_state:
                    _bus_tracking_state[bus["id"]]["start_time"] += (data.delay_mins * 60)
                    _bus_tracking_state[bus["id"]]["paused_until"] = datetime.datetime.now() + datetime.timedelta(minutes=data.delay_mins)
                    _bus_tracking_state[bus["id"]]["delay_mins"] = data.delay_mins

    except Exception as e:
        print(f"[EMERGENCY ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

    return {
        "success": True,
        "message": f"Delay set for {data.delay_mins} mins." if data.delay_mins > 0 else f"Emergency reported: {data.type.upper()}.",
        "new_status": new_status,
    }


# ─── 6. Status Update ───
@router.post("/status")
def update_status(data: StatusUpdate, username: str = Query(...)):
    """Allow driver to update their bus status (Active, Idle, Maintenance)."""
    driver, bus, err = _get_driver_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    if not bus:
        return JSONResponse(status_code=400, content={"success": False, "message": "No bus assigned"})

    valid_statuses = ["Active", "Idle", "Maintenance", "Breakdown"]
    if data.status not in valid_statuses:
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": f"Invalid status. Choose from: {valid_statuses}"
        })

    try:
        supabase.table("buses").update({"status": data.status}).eq("id", bus["id"]).execute()
    except Exception as e:
        print(f"[STATUS UPDATE ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

    return {
        "success": True,
        "message": f"Bus status updated to '{data.status}'.",
        "new_status": data.status,
    }


# ─── 7. Get current status ───
@router.get("/status")
def get_status(username: str = Query(...)):
    """Return current bus status for this driver."""
    driver, bus, err = _get_driver_by_username(username)
    if err:
        return JSONResponse(status_code=404, content={"success": False, "message": err})

    if not bus:
        return {"success": True, "status": "No bus assigned", "bus_number": "—"}

    return {
        "success": True,
        "status": bus.get("status", "Active"),
        "bus_number": bus["registration_number"],
        "driver_name": driver["full_name"],
    }
