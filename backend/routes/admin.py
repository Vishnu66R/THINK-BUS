# backend/routes/admin.py
# ---------------------------------------------------------------
# Admin Panel API — CRUD for Students, Buses, Drivers
# Also provides dashboard stats, unified search, and route list.
# ---------------------------------------------------------------

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from database import supabase
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Pydantic Models ───────────────────────────────────────────

class StudentCreate(BaseModel):
    full_name: str
    adm_number: str
    semester: str
    department: str
    parent_id: Optional[int] = None
    boarding_stop_id: Optional[int] = None
    default_route_id: Optional[int] = None
    current_bus_id: Optional[int] = None

class BusCreate(BaseModel):
    registration_number: str
    capacity: int
    driver_id: Optional[int] = None
    route_id: Optional[int] = None
    status: str = "Idle"

class DriverCreate(BaseModel):
    full_name: str
    license_number: Optional[str] = None
    phone_number: Optional[str] = None
    experience_years: Optional[int] = None

class StopCreate(BaseModel):
    stop_name: str
    time_from_start_mins: int

class RouteCreate(BaseModel):
    name: str
    start_point: str
    end_point: str
    estimated_duration_minutes: int
    stops: list[StopCreate]


# ─── Dashboard Stats ───────────────────────────────────────────

@router.get("/stats")
def get_stats():
    """Return aggregate counts for the dashboard command centre."""
    try:
        students = supabase.table("students").select("id", count="exact").execute()
        drivers = supabase.table("drivers").select("id", count="exact").execute()
        buses_active = supabase.table("buses").select("id", count="exact").eq("status", "Active").execute()
        buses_total = supabase.table("buses").select("id", count="exact").execute()
        routes = supabase.table("routes").select("id", count="exact").execute()
        parents = supabase.table("parents").select("id", count="exact").execute()

        return {
            "success": True,
            "stats": {
                "totalStudents": students.count or 0,
                "totalDrivers": drivers.count or 0,
                "activeBuses": buses_active.count or 0,
                "totalBuses": buses_total.count or 0,
                "totalRoutes": routes.count or 0,
                "totalParents": parents.count or 0,
            }
        }
    except Exception as e:
        print(f"[ADMIN STATS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Students CRUD ─────────────────────────────────────────────

@router.get("/students")
def list_students():
    """List all students with related route, bus, and parent info."""
    try:
        result = supabase.table("students").select(
            "*, parents:parent_id(full_name), routes:default_route_id(name), buses:current_bus_id(registration_number), route_stops:boarding_stop_id(stop_name)"
        ).order("id").execute()
        
        data = []
        for s in result.data:
            s["route_name"] = s.get("routes", {}).get("name") if s.get("routes") else None
            s["stop_name"] = s.get("route_stops", {}).get("stop_name") if s.get("route_stops") else None
            s["bus_registration"] = s.get("buses", {}).get("registration_number") if s.get("buses") else None
            s["parent_name"] = s.get("parents", {}).get("full_name") if s.get("parents") else None
            data.append(s)

        return {"success": True, "data": data}
    except Exception as e:
        print(f"[ADMIN LIST STUDENTS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.get("/students/{student_id}")
def get_student(student_id: int):
    try:
        result = supabase.table("students").select("*").eq("id", student_id).execute()
        if not result.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student not found"})
        return {"success": True, "data": result.data[0]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.post("/students")
def create_student(data: StudentCreate):
    try:
        # Auto-generate the next student ID
        last = supabase.table("students").select("id").order("id", desc=True).limit(1).execute()
        next_id = (last.data[0]["id"] + 1) if last.data else 1

        # Create a user account for the student
        last_user = supabase.table("users").select("id").order("id", desc=True).limit(1).execute()
        next_user_id = (last_user.data[0]["id"] + 1) if last_user.data else 1

        username = f"student_{next_user_id}"
        supabase.table("users").insert({
            "id": next_user_id,
            "username": username,
            "password": "student@123",
            "role": "Student"
        }).execute()

        # Insert student record
        record = {
            "id": next_id,
            "user_id": next_user_id,
            "full_name": data.full_name,
            "adm_number": data.adm_number,
            "semester": data.semester,
            "department": data.department,
            "parent_id": data.parent_id,
            "boarding_stop_id": data.boarding_stop_id,
            "default_route_id": data.default_route_id,
            "current_bus_id": data.current_bus_id,
            "is_active": True,
        }
        result = supabase.table("students").insert(record).execute()
        return {"success": True, "message": "Student created", "data": result.data}
    except Exception as e:
        print(f"[ADMIN CREATE STUDENT ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.put("/students/{student_id}")
def update_student(student_id: int, data: StudentCreate):
    try:
        update_data = {
            "full_name": data.full_name,
            "adm_number": data.adm_number,
            "semester": data.semester,
            "department": data.department,
            "parent_id": data.parent_id,
            "boarding_stop_id": data.boarding_stop_id,
            "default_route_id": data.default_route_id,
            "current_bus_id": data.current_bus_id,
        }
        result = supabase.table("students").update(update_data).eq("id", student_id).execute()
        if not result.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student not found"})
        return {"success": True, "message": "Student updated", "data": result.data}
    except Exception as e:
        print(f"[ADMIN UPDATE STUDENT ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.delete("/students/{student_id}")
def delete_student(student_id: int):
    try:
        # Get user_id first so we can clean up the users table too
        student = supabase.table("students").select("user_id").eq("id", student_id).execute()
        if not student.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student not found"})

        user_id = student.data[0]["user_id"]
        supabase.table("students").delete().eq("id", student_id).execute()
        supabase.table("users").delete().eq("id", user_id).execute()

        return {"success": True, "message": "Student deleted"}
    except Exception as e:
        print(f"[ADMIN DELETE STUDENT ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Buses CRUD ────────────────────────────────────────────────

@router.get("/buses")
def list_buses():
    """List all buses with driver and route info."""
    try:
        result = supabase.table("buses").select(
            "*, drivers:driver_id(full_name), routes:route_id(name)"
        ).order("id").execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        print(f"[ADMIN LIST BUSES ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.post("/buses")
def create_bus(data: BusCreate):
    try:
        last = supabase.table("buses").select("id").order("id", desc=True).limit(1).execute()
        next_id = (last.data[0]["id"] + 1) if last.data else 1

        record = {
            "id": next_id,
            "registration_number": data.registration_number,
            "capacity": data.capacity,
            "driver_id": data.driver_id,
            "route_id": data.route_id,
            "status": data.status,
        }
        result = supabase.table("buses").insert(record).execute()
        return {"success": True, "message": "Bus created", "data": result.data}
    except Exception as e:
        print(f"[ADMIN CREATE BUS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.put("/buses/{bus_id}")
def update_bus(bus_id: int, data: BusCreate):
    try:
        update_data = {
            "registration_number": data.registration_number,
            "capacity": data.capacity,
            "driver_id": data.driver_id,
            "route_id": data.route_id,
            "status": data.status,
        }
        result = supabase.table("buses").update(update_data).eq("id", bus_id).execute()
        if not result.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Bus not found"})
        return {"success": True, "message": "Bus updated", "data": result.data}
    except Exception as e:
        print(f"[ADMIN UPDATE BUS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.delete("/buses/{bus_id}")
def delete_bus(bus_id: int):
    try:
        result = supabase.table("buses").delete().eq("id", bus_id).execute()
        if not result.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Bus not found"})
        return {"success": True, "message": "Bus deleted"}
    except Exception as e:
        print(f"[ADMIN DELETE BUS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.get("/buses/{bus_id}/stops")
def get_bus_stops(bus_id: int):
    """Get geolocated route_stops for a specific bus ID."""
    try:
        # Get the route assigned to this bus
        bus_res = supabase.table("buses").select("route_id").eq("id", bus_id).execute()
        if not bus_res.data or not bus_res.data[0].get("route_id"):
            return {"success": True, "data": []}
            
        route_id = bus_res.data[0]["route_id"]
        
        # Fetch stops identically to the student panel
        stops_res = supabase.table("route_stops").select(
            "id, stop_name, stop_order, stop_locations(latitude, longitude)"
        ).eq("route_id", route_id).order("stop_order").execute()

        formatted_stops = []
        for st in stops_res.data:
            if st.get("stop_locations"):
                formatted_stops.append({
                    "name": st["stop_name"] or "Unknown",
                    "lat": st["stop_locations"]["latitude"],
                    "lng": st["stop_locations"]["longitude"],
                    "isBoarding": False
                })

        return {"success": True, "data": formatted_stops}
    except Exception as e:
        print(f"[ADMIN GET BUS STOPS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Drivers CRUD ──────────────────────────────────────────────

@router.get("/drivers")
def list_drivers():
    """List all drivers with their bus assignment."""
    try:
        result = supabase.table("drivers").select("*").order("id").execute()

        # Attach bus info to each driver
        drivers = result.data
        if drivers:
            buses_res = supabase.table("buses").select("driver_id, registration_number, route_id, routes:route_id(name)").not_.is_("driver_id", "null").execute()
            buses_by_driver = {b["driver_id"]: b for b in buses_res.data} if buses_res.data else {}

            for drv in drivers:
                bus = buses_by_driver.get(drv["id"])
                if bus:
                    drv["bus_registration"] = bus.get("registration_number")
                    drv["route_name"] = bus.get("routes", {}).get("name") if bus.get("routes") else None
                else:
                    drv["bus_registration"] = None
                    drv["route_name"] = None

        return {"success": True, "data": drivers}
    except Exception as e:
        print(f"[ADMIN LIST DRIVERS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.post("/drivers")
def create_driver(data: DriverCreate):
    try:
        last = supabase.table("drivers").select("id").order("id", desc=True).limit(1).execute()
        next_id = (last.data[0]["id"] + 1) if last.data else 1

        # Create user account for the driver
        last_user = supabase.table("users").select("id").order("id", desc=True).limit(1).execute()
        next_user_id = (last_user.data[0]["id"] + 1) if last_user.data else 1

        username = f"driver_{next_user_id}"
        supabase.table("users").insert({
            "id": next_user_id,
            "username": username,
            "password": "driver@123",
            "role": "Driver"
        }).execute()

        record = {
            "id": next_id,
            "user_id": next_user_id,
            "full_name": data.full_name,
            "license_number": data.license_number,
            "phone_number": data.phone_number,
            "experience_years": data.experience_years,
            "is_active": True,
        }
        result = supabase.table("drivers").insert(record).execute()
        return {"success": True, "message": "Driver created", "data": result.data}
    except Exception as e:
        print(f"[ADMIN CREATE DRIVER ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.put("/drivers/{driver_id}")
def update_driver(driver_id: int, data: DriverCreate):
    try:
        update_data = {
            "full_name": data.full_name,
            "license_number": data.license_number,
            "phone_number": data.phone_number,
            "experience_years": data.experience_years,
        }
        result = supabase.table("drivers").update(update_data).eq("id", driver_id).execute()
        if not result.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Driver not found"})
        return {"success": True, "message": "Driver updated", "data": result.data}
    except Exception as e:
        print(f"[ADMIN UPDATE DRIVER ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.delete("/drivers/{driver_id}")
def delete_driver(driver_id: int):
    try:
        driver = supabase.table("drivers").select("user_id").eq("id", driver_id).execute()
        if not driver.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Driver not found"})

        user_id = driver.data[0]["user_id"]
        supabase.table("drivers").delete().eq("id", driver_id).execute()
        supabase.table("users").delete().eq("id", user_id).execute()

        return {"success": True, "message": "Driver deleted"}
    except Exception as e:
        print(f"[ADMIN DELETE DRIVER ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Unified Search ────────────────────────────────────────────

@router.get("/search")
def unified_search(q: str = Query("", min_length=1)):
    """Search students, buses, and drivers by a single query string."""
    try:
        query = q.strip().lower()
        results = {"students": [], "buses": [], "drivers": []}

        # Search students by name or adm_number
        students = supabase.table("students").select("id, full_name, adm_number, department, semester").ilike("full_name", f"%{query}%").limit(10).execute()
        students2 = supabase.table("students").select("id, full_name, adm_number, department, semester").ilike("adm_number", f"%{query}%").limit(10).execute()
        seen_ids = set()
        for s in students.data + students2.data:
            if s["id"] not in seen_ids:
                seen_ids.add(s["id"])
                results["students"].append(s)

        # Search buses by registration_number
        buses = supabase.table("buses").select("id, registration_number, capacity, status").ilike("registration_number", f"%{query}%").limit(10).execute()
        results["buses"] = buses.data

        # Search drivers by name or phone
        drivers = supabase.table("drivers").select("id, full_name, phone_number, license_number").ilike("full_name", f"%{query}%").limit(10).execute()
        results["drivers"] = drivers.data

        return {"success": True, "results": results}
    except Exception as e:
        print(f"[ADMIN SEARCH ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Routes List (for dropdowns) ──────────────────────────────

@router.get("/routes")
def list_routes():
    """List all routes (used in dropdowns for assigning buses/students)."""
    try:
        result = supabase.table("routes").select("*").order("id").execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.get("/routes/details")
def list_routes_detailed():
    """List all routes with nested route_stops."""
    try:
        result = supabase.table("routes").select("*, route_stops(*)").order("id").execute()
        data = result.data
        for r in data:
            if "route_stops" in r and r["route_stops"]:
                r["route_stops"].sort(key=lambda x: x["stop_order"])
        return {"success": True, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.post("/routes")
def create_route(data: RouteCreate):
    try:
        # Route ID
        last = supabase.table("routes").select("id").order("id", desc=True).limit(1).execute()
        next_route_id = (last.data[0]["id"] + 1) if last.data else 1

        route_record = {
            "id": next_route_id,
            "name": data.name,
            "start_point": data.start_point,
            "end_point": data.end_point,
            "estimated_duration_minutes": data.estimated_duration_minutes
        }
        supabase.table("routes").insert(route_record).execute()

        # Insert Stops
        if data.stops:
            last_stop = supabase.table("route_stops").select("id").order("id", desc=True).limit(1).execute()
            next_stop_id = (last_stop.data[0]["id"] + 1) if last_stop.data else 1

            stops_to_insert = []
            for i, stop in enumerate(data.stops):
                stops_to_insert.append({
                    "id": next_stop_id + i,
                    "route_id": next_route_id,
                    "stop_name": stop.stop_name,
                    "stop_order": i + 1,
                    "time_from_start_mins": stop.time_from_start_mins
                })
            supabase.table("route_stops").insert(stops_to_insert).execute()

        return {"success": True, "message": "Route created", "route_id": next_route_id}
    except Exception as e:
        print(f"[ADMIN CREATE ROUTE ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.put("/routes/{route_id}")
def update_route(route_id: int, data: RouteCreate):
    try:
        route_update = {
            "name": data.name,
            "start_point": data.start_point,
            "end_point": data.end_point,
            "estimated_duration_minutes": data.estimated_duration_minutes
        }
        res = supabase.table("routes").update(route_update).eq("id", route_id).execute()
        if not res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Route not found"})

        # Update stops by completely replacing them
        supabase.table("route_stops").delete().eq("route_id", route_id).execute()

        if data.stops:
            last_stop = supabase.table("route_stops").select("id").order("id", desc=True).limit(1).execute()
            next_stop_id = (last_stop.data[0]["id"] + 1) if last_stop.data else 1

            stops_to_insert = []
            for i, stop in enumerate(data.stops):
                stops_to_insert.append({
                    "id": next_stop_id + i,
                    "route_id": route_id,
                    "stop_name": stop.stop_name,
                    "stop_order": i + 1,
                    "time_from_start_mins": stop.time_from_start_mins
                })
            if stops_to_insert:
                supabase.table("route_stops").insert(stops_to_insert).execute()

        return {"success": True, "message": "Route updated"}
    except Exception as e:
        print(f"[ADMIN UPDATE ROUTE ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.delete("/routes/{route_id}")
def delete_route(route_id: int):
    try:
        res = supabase.table("routes").delete().eq("id", route_id).execute()
        if not res.data:
            return JSONResponse(status_code=404, content={"success": False, "message": "Route not found"})
        return {"success": True, "message": "Route deleted"}
    except Exception as e:
        print(f"[ADMIN DELETE ROUTE ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.get("/parents")
def list_parents():
    """List all parents from the parents table (for student assignment dropdowns)."""
    try:
        result = supabase.table("parents").select("id, full_name").order("id").execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.get("/route_stops")
def list_route_stops():
    """List all route stops."""
    try:
        result = supabase.table("route_stops").select("id, stop_name, route_id, routes(name)").order("id").execute()
        data = []
        for stop in result.data:
            rname = stop.get("routes", {}).get("name") if stop.get("routes") else "Unknown Route"
            data.append({
                "id": stop["id"],
                "stop_name": stop["stop_name"],
                "route_name": rname
            })
        return {"success": True, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

# ─── Fees Management ──────────────────────────────────────────

@router.get("/fees")
def list_admin_fees():
    """Aggregate global fee data and individual student fee statuses."""
    try:
        result = supabase.table("students").select("id, full_name, adm_number, semester, fee_paid").order("id").execute()
        
        total_students = len(result.data)
        total_receivables = total_students * 15000
        
        collected = 0
        pending = 0
        students_fees = []
        
        for s in result.data:
            is_paid = s.get("fee_paid", "unpaid") == "paid"
            paid_amt = 15000 if is_paid else 0
            pending_amt = 15000 - paid_amt
            
            collected += paid_amt
            pending += pending_amt
            
            students_fees.append({
                "student_id": s["id"],
                "full_name": s["full_name"],
                "adm_number": s["adm_number"],
                "semester": s.get("semester") or "S1",
                "total_fee": 15000,
                "paid_amount": paid_amt,
                "pending_amount": pending_amt,
                "status": "Paid" if is_paid else "Pending"
            })
            
        return {
            "success": True, 
            "data": {
                "aggregates": {
                    "totalStudents": total_students,
                    "totalReceivables": total_receivables,
                    "totalCollected": collected,
                    "totalPending": pending
                },
                "students": students_fees
            }
        }
    except Exception as e:
        print(f"[ADMIN FEES ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Simulated Date / Time ────────────────────────────────────

class DateTimePayload(BaseModel):
    sim_date: str  # e.g. "2026-04-05"
    sim_time: str  # e.g. "08:30"

@router.post("/simulate-datetime")
def save_simulate_datetime(payload: DateTimePayload):
    """Upsert simulated date and time into the date_time table (always row id=1)."""
    try:
        supabase.table("date_time").upsert({
            "id": 1,
            "date": payload.sim_date,
            "time": payload.sim_time,
        }).execute()
        return {"success": True, "message": "Simulated date/time saved"}
    except Exception as e:
        print(f"[SIMULATE DATETIME ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.get("/simulate-datetime")
def get_simulate_datetime():
    """Fetch the currently saved simulated date/time."""
    try:
        result = supabase.table("date_time").select("*").eq("id", 1).execute()
        if result.data:
            row = result.data[0]
            # Normalise: return as sim_date/sim_time so frontend hook stays unchanged
            return {"success": True, "data": {"sim_date": row.get("date"), "sim_time": row.get("time")}}
        return {"success": True, "data": None}
    except Exception as e:
        print(f"[GET SIMULATE DATETIME ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── Bus Tracking (In-Memory State) ──────────────────────────

import time as _time

# In-memory store: { bus_id: { "start_time": float, "direction": "to_college"|"to_stop", "route_id": int } }
_bus_tracking_state = {}


class TrackingStartPayload(BaseModel):
    bus_id: int
    direction: str   # "to_college" or "to_stop"

class StartAllTrackingPayload(BaseModel):
    direction: str

@router.post("/start-all-tracking")
def start_all_tracking(payload: StartAllTrackingPayload):
    """Start tracking ALL buses. Records the current time as the start time."""
    try:
        direction = payload.direction
        # Get all buses with an assigned route
        bus_res = supabase.table("buses").select("id, route_id").not_.is_("route_id", "null").execute()
        
        count = 0
        for b in bus_res.data:
            _bus_tracking_state[b["id"]] = {
                "start_time": _time.time(),
                "direction": direction,
                "route_id": b["route_id"],
            }
            count += 1

        return {"success": True, "message": f"Started tracking for {count} buses ({direction})"}
    except Exception as e:
        print(f"[START ALL TRACKING ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.post("/stop-all-tracking")
def stop_all_tracking():
    """Stop tracking ALL buses."""
    _bus_tracking_state.clear()
    return {"success": True, "message": "All tracking stopped"}

@router.post("/start-tracking")
def start_tracking(payload: TrackingStartPayload):
    """Start tracking a bus. Records the current time as the start time."""
    try:
        bus_id = payload.bus_id
        direction = payload.direction

        # Get the route_id for this bus
        bus_res = supabase.table("buses").select("route_id").eq("id", bus_id).execute()
        if not bus_res.data or not bus_res.data[0].get("route_id"):
            return JSONResponse(status_code=404, content={"success": False, "message": "Bus has no assigned route"})

        route_id = bus_res.data[0]["route_id"]

        _bus_tracking_state[bus_id] = {
            "start_time": _time.time(),
            "direction": direction,
            "route_id": route_id,
        }

        return {"success": True, "message": f"Bus {bus_id} tracking started ({direction})"}
    except Exception as e:
        print(f"[START TRACKING ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.post("/stop-tracking/{bus_id}")
def stop_tracking(bus_id: int):
    """Stop tracking a specific bus."""
    if bus_id in _bus_tracking_state:
        del _bus_tracking_state[bus_id]
    return {"success": True, "message": f"Bus {bus_id} tracking stopped"}


@router.get("/tracking-status/{bus_id}")
def get_tracking_status(bus_id: int):
    """
    Get the current tracking position for a bus.
    Returns which two stops the bus is between and the fractional progress.
    Uses time_from_start_mins from route_stops to compute position based on elapsed real time.
    Time is SCALED: 1 real minute = 1 DB minute (real-time).
    """
    try:
        if bus_id not in _bus_tracking_state:
            return {"success": True, "active": False}

        state = _bus_tracking_state[bus_id]
        elapsed_seconds = _time.time() - state["start_time"]
        
        from datetime import datetime
        paused_until = state.get("paused_until")
        is_paused = False
        delay_mins = state.get("delay_mins", 0)

        if paused_until and datetime.now() < paused_until:
            is_paused = True
            pause_remaining = (paused_until - datetime.now()).total_seconds()
            elapsed_seconds += pause_remaining

        elapsed_mins = elapsed_seconds / 60.0

        route_id = state["route_id"]
        direction = state["direction"]

        # Fetch route stops with locations, ordered by stop_order
        stops_res = supabase.table("route_stops").select(
            "id, stop_name, stop_order, time_from_start_mins, stop_locations(latitude, longitude)"
        ).eq("route_id", route_id).order("stop_order").execute()

        stops = []
        for st in stops_res.data:
            if st.get("stop_locations"):
                stops.append({
                    "name": st["stop_name"],
                    "lat": float(st["stop_locations"]["latitude"]),
                    "lng": float(st["stop_locations"]["longitude"]),
                    "time_mins": st["time_from_start_mins"] or 0,
                    "stop_order": st["stop_order"],
                })

        if len(stops) < 2:
            return {"success": True, "active": True, "arrived": True, "message": "Not enough stops"}

        # If direction is "to_stop" (college to stop), reverse the stops and adjust times
        if direction == "to_stop":
            max_time = stops[-1]["time_mins"]
            stops = list(reversed(stops))
            for s in stops:
                s["time_mins"] = max_time - s["time_mins"]

        total_route_time = stops[-1]["time_mins"]

        # Check if bus has arrived at final destination
        if elapsed_mins >= total_route_time:
            # Bus has arrived, remove tracking
            del _bus_tracking_state[bus_id]
            return {
                "success": True,
                "active": False,
                "arrived": True,
                "message": "Bus has reached its destination",
                "final_stop": stops[-1]["name"],
            }

        # Find which two stops the bus is between
        from_stop = stops[0]
        to_stop = stops[1] if len(stops) > 1 else stops[0]
        fraction = 0.0
        leg_index = 0

        for i in range(len(stops) - 1):
            if elapsed_mins >= stops[i]["time_mins"] and elapsed_mins < stops[i + 1]["time_mins"]:
                from_stop = stops[i]
                to_stop = stops[i + 1]
                leg_index = i
                segment_duration = to_stop["time_mins"] - from_stop["time_mins"]
                if segment_duration > 0:
                    fraction = (elapsed_mins - from_stop["time_mins"]) / segment_duration
                else:
                    fraction = 1.0
                break

        # Send leg_index and fraction. We no longer calculate straight-line lat/lng here
        # because the frontend will use the exact OSRM route geometry.
        return {
            "success": True,
            "active": True,
            "arrived": False,
            "direction": direction,
            "elapsed_mins": round(elapsed_mins, 2),
            "total_route_mins": total_route_time,
            "from_stop": from_stop["name"],
            "to_stop": to_stop["name"],
            "leg_index": leg_index,
            "fraction": round(fraction, 4),
            "is_paused": is_paused,
            "delay_mins": delay_mins,
        }
    except Exception as e:
        print(f"[TRACKING STATUS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@router.get("/tracking-active")
def get_all_active_tracking():
    """Return all currently tracked buses."""
    result = {}
    for bus_id, state in _bus_tracking_state.items():
        elapsed = _time.time() - state["start_time"]
        result[bus_id] = {
            "direction": state["direction"],
            "route_id": state["route_id"],
            "elapsed_seconds": round(elapsed, 1),
        }
    return {"success": True, "data": result}
    

# ─── Notifications ─────────────────────────────────────────────

@router.get("/notifications")
def get_admin_notifications():
    """Fetch active notifications for the admin dashboard."""
    try:
        # Fetch from notifications table, filtered by target role Admin or All
        res = supabase.table("notifications")\
            .select("*, buses:target_bus_id(registration_number, routes:route_id(name))")\
            .eq("is_active", True)\
            .in_("target_role", ["Admin", "All"])\
            .order("created_at", desc=True)\
            .execute()
        
        return {"success": True, "data": res.data or []}
    except Exception as e:
        print(f"[ADMIN NOTIFICATIONS ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

@router.post("/notifications/dismiss/{notif_id}")
def dismiss_notification(notif_id: int):
    """Mark a notification as inactive (dismissed)."""
    try:
        supabase.table("notifications").update({"is_active": False}).eq("id", notif_id).execute()
        return {"success": True, "message": "Notification dismissed"}
    except Exception as e:
        print(f"[DISMISS NOTIFICATION ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

