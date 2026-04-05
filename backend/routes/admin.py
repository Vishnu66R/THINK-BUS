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
            "*, routes:default_route_id(name), buses:current_bus_id(registration_number), route_stops:boarding_stop_id(stop_name)"
        ).order("id").execute()
        
        data = []
        for s in result.data:
            s["route_name"] = s.get("routes", {}).get("name") if s.get("routes") else None
            s["stop_name"] = s.get("route_stops", {}).get("stop_name") if s.get("route_stops") else None
            s["bus_registration"] = s.get("buses", {}).get("registration_number") if s.get("buses") else None
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
        for drv in drivers:
            bus = supabase.table("buses").select("registration_number, route_id, routes:route_id(name)").eq("driver_id", drv["id"]).execute()
            if bus.data:
                drv["bus_registration"] = bus.data[0].get("registration_number")
                drv["route_name"] = bus.data[0].get("routes", {}).get("name") if bus.data[0].get("routes") else None
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
    """List all users with role 'parent'."""
    try:
        result = supabase.table("users").select("id, username").eq("role", "parent").execute()
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
