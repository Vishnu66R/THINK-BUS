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

    # Fetch students belonging to this parent with all relational data
    students_res = (
        supabase.table("students")
        .select("*, routes:default_route_id(name), route_stops:boarding_stop_id(stop_name), buses:current_bus_id(registration_number, status, drivers:driver_id(full_name, phone_number))")
        .eq("parent_id", parent_id)
        .execute()
    )
    students = students_res.data or []

    # Fetch all stops for each unique child route to give the map coordinates and timings
    route_ids = list(set([s["default_route_id"] for s in students if s.get("default_route_id")]))
    stops_by_route = {}
    route_max_times = {}

    if route_ids:
        stops_res = supabase.table("route_stops").select("id, route_id, stop_name, stop_order, time_from_start_mins, stop_locations(latitude, longitude)").in_("route_id", route_ids).order("stop_order").execute()
        if stops_res.data:
            for st in stops_res.data:
                r_id = st["route_id"]
                if r_id not in stops_by_route:
                    stops_by_route[r_id] = []
                    route_max_times[r_id] = 0
                
                loc = st.get("stop_locations") or {}
                time_mins = st.get("time_from_start_mins") or 0
                route_max_times[r_id] = max(route_max_times[r_id], time_mins)

                stops_by_route[r_id].append({
                    "id": st["id"],
                    "name": st["stop_name"],
                    "time_mins": time_mins,
                    "lat": float(loc.get("latitude") or 0.0),
                    "lng": float(loc.get("longitude") or 0.0),
                    # isBoarding will be set per child
                })

    from routes.admin import get_tracking_status
    
    # Enrich each student with the fetched relational details
    children = []
    for s in students:
        r_info = s.get("routes") or {}
        st_info = s.get("route_stops") or {}
        b_info = s.get("buses") or {}
        d_info = b_info.get("drivers") or {}

        route_id = s.get("default_route_id")
        bus_id = s.get("current_bus_id")
        board_stop_id = s.get("boarding_stop_id")
        
        # Prepare stops specific to this student to correctly highlight boarding stop
        student_stops = []
        student_stop_time = 0
        if route_id and route_id in stops_by_route:
            import copy
            base_stops = copy.deepcopy(stops_by_route[route_id])
            for bs in base_stops:
                is_boarding = (bs["id"] == board_stop_id)
                bs["isBoarding"] = is_boarding
                if is_boarding:
                    student_stop_time = bs["time_mins"]
            student_stops = base_stops

        # Calculate Real-Time ETA
        eta_mins = None
        tracking_active = False
        
        if bus_id:
            track_info = get_tracking_status(bus_id)
            if track_info and track_info.get("active"):
                tracking_active = True
                elapsed = track_info.get("elapsed_mins", 0)
                direction = track_info.get("direction", "to_college")
                
                s_time = student_stop_time
                if direction == "to_stop" and route_id in route_max_times:
                    s_time = route_max_times[route_id] - s_time
                    
                if elapsed < s_time:
                    eta_mins = int(round(s_time - elapsed))
                else:
                    eta_mins = 0

        children.append({
            "id": s["id"],
            "full_name": s["full_name"],
            "adm_number": s.get("adm_number", ""),
            "semester": s.get("semester", ""),
            "department": s.get("department", ""),
            "route_id": route_id,
            "bus_id": bus_id,
            "route_name": r_info.get("name", "—"),
            "stop_name": st_info.get("stop_name", "—"),
            "bus_number": b_info.get("registration_number", "—"),
            "bus_status": b_info.get("status", "Normal"),
            "driver_name": d_info.get("full_name", "—"),
            "driver_phone": d_info.get("phone_number", "—"),
            "is_active": s.get("is_active", True),
            "eta_mins": eta_mins,
            "tracking_active": tracking_active,
            "stops": student_stops
        })

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
        "map_config": children_resp.get("map_config", {}),
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

    # Real-time DB Notifications (Driver Delays, etc.)
    try:
        notif_res = supabase.table("notifications").select("*").eq("is_active", True).execute()
        db_notifs = notif_res.data or []
        
        # Get all bus IDs for this parent's children
        child_bus_ids = [s.get("current_bus_id") for s in students if s.get("current_bus_id")]
        
        for n in db_notifs:
            role_match = n.get("target_role") in ["All", "Parent"]
            bus_match = n.get("target_bus_id") is None or n.get("target_bus_id") in child_bus_ids
            
            if role_match and bus_match:
                alerts.append({
                    "id": f"db-{n['id']}",
                    "type": n.get("type", "warning"),
                    "title": n["title"],
                    "message": n["message"],
                    "timestamp": "Just Now",
                    "read": False
                })
    except Exception as e:
        print(f"Error fetching DB notifications: {e}")

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
