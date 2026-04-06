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

    # Fetch map configuration
    map_config_res = supabase.table("map_config").select("*").execute()
    map_config = {item["config_key"]: item["config_value"] for item in map_config_res.data} if map_config_res.data else {}

    return {
        "success": True,
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

        if stops_res.data:
            for s in stops_res.data:
                loc = s.get("stop_locations") or {}
                stops_data.append({
                    "id": s["id"],
                    "name": s["stop_name"],
                    "lat": float(loc.get("latitude") or 0.0),
                    "lng": float(loc.get("longitude") or 0.0),
                    "isBoarding": False  # Not relevant for driver view
                })

    # Fetch map configuration
    map_config_res = supabase.table("map_config").select("*").execute()
    map_config = {item["config_key"]: item["config_value"] for item in map_config_res.data} if map_config_res.data else {}

    return {
        "success": True,
        "summary": {
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
    Updates the bus status based on emergency type.
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
    except Exception as e:
        print(f"[EMERGENCY ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

    return {
        "success": True,
        "message": f"Emergency reported: {data.type.upper()}. Bus status updated to '{new_status}'.",
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
