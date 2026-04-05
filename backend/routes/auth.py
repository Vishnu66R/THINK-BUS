# backend/routes/auth.py

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models import SignupRequest, LoginRequest, StudentSignupRequest, VALID_ROLES
from database import supabase

router = APIRouter()

DEFAULT_STUDENT_PASSWORD = "student@123"


# ─── GET /routes ─────────────────────────────────────────────────────────────
# Returns all available bus routes for signup selection.

@router.get("/routes")
def get_routes():
    try:
        result = supabase.table("routes").select("id, name").order("id").execute()
        return {"success": True, "routes": result.data}
    except Exception as e:
        print(f"[ROUTES ERROR] {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


# ─── GET /route-stops ────────────────────────────────────────────────────────
# Returns boarding stops for a specific route.
# Defaults to Route 1 if no route_id is provided.

@router.get("/route-stops")
def get_route_stops(route_id: int = 1):
    try:
        result = (
            supabase.table("route_stops")
            .select("id, stop_name, stop_order")
            .eq("route_id", route_id)
            .lt("stop_order", 10)          # exclude the college stop (stop_order 10)
            .order("stop_order")
            .execute()
        )
        return {"success": True, "stops": result.data}
    except Exception as e:
        print(f"[ROUTE STOPS ERROR] {e}")
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": f"Server error: {str(e)}"
        })


# ─── POST /signup/student ─────────────────────────────────────────────────────
# Full student self-registration.
# 1. Creates a users row (username = adm_number, password = student@123, role = Student)
# 2. Creates a students row with all profile fields + selected boarding_stop_id

@router.post("/signup/student")
def signup_student(data: StudentSignupRequest):
    try:
        # --- Check for duplicate admission number / username ---
        existing_user = supabase.table("users").select("id").eq("username", data.adm_number).execute()
        if existing_user.data:
            return JSONResponse(status_code=409, content={
                "success": False,
                "message": "A student with this admission number already exists."
            })

        existing_adm = supabase.table("students").select("id").eq("adm_number", data.adm_number).execute()
        if existing_adm.data:
            return JSONResponse(status_code=409, content={
                "success": False,
                "message": "This admission number is already registered."
            })

        # --- Validate that the selected boarding stop exists ---
        stop_check = supabase.table("route_stops").select("id, route_id").eq("id", data.boarding_stop_id).execute()
        if not stop_check.data:
            return JSONResponse(status_code=400, content={
                "success": False,
                "message": "Invalid boarding stop selected."
            })

        stop_info = stop_check.data[0]
        route_id = stop_info["route_id"]

        # --- Compute next user id (users table has INT PK, not SERIAL — must be supplied manually) ---
        max_user = supabase.table("users").select("id").order("id", desc=True).limit(1).execute()
        next_user_id = (max_user.data[0]["id"] + 1) if max_user.data else 1

        # --- Create the users row ---
        user_insert = supabase.table("users").insert({
            "id": next_user_id,
            "username": data.adm_number,          # username = admission number
            "password": DEFAULT_STUDENT_PASSWORD,  # always student@123
            "role": "Student"
        }).execute()

        if not user_insert.data:
            return JSONResponse(status_code=500, content={
                "success": False,
                "message": "Failed to create user account."
            })

        new_user_id = user_insert.data[0]["id"]

        # --- Compute next student id (same reason — INT PK, not SERIAL) ---
        max_student = supabase.table("students").select("id").order("id", desc=True).limit(1).execute()
        next_student_id = (max_student.data[0]["id"] + 1) if max_student.data else 1

        # --- Create the students row ---
        student_payload = {
            "id": next_student_id,
            "user_id": new_user_id,
            "full_name": data.full_name,
            "adm_number": data.adm_number,
            "semester": data.semester or None,
            "department": data.department or None,
            "boarding_stop_id": data.boarding_stop_id,
            "default_route_id": route_id,
            "is_active": True,
        }

        supabase.table("students").insert(student_payload).execute()

        return {
            "success": True,
            "message": f"Account created! Use your admission number '{data.adm_number}' and password 'student@123' to log in.",
            "username": data.adm_number
        }

    except Exception as e:
        print(f"[STUDENT SIGNUP ERROR] {e}")
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": f"Server error: {str(e)}"
        })


# ─── POST /signup (generic — kept for admin/driver creation) ─────────────────

@router.post("/signup")
def signup(data: SignupRequest):
    if data.role not in VALID_ROLES:
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": f"Invalid role. Choose from: {VALID_ROLES}"
        })

    try:
        existing = supabase.table("users").select("id").eq("username", data.username).execute()
        if existing.data:
            return JSONResponse(status_code=409, content={
                "success": False,
                "message": "Username already taken. Please choose another."
            })

        supabase.table("users").insert({
            "username": data.username,
            "password": data.password,
            "role": data.role
        }).execute()

        return {"success": True, "message": f"Account created! Welcome, {data.role} {data.username}."}

    except Exception as e:
        print(f"[SIGNUP ERROR] {e}")
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": f"Server error: {str(e)}"
        })


# ─── POST /login ──────────────────────────────────────────────────────────────

@router.post("/login")
def login(data: LoginRequest):
    """
    Authenticate by username + password only.
    Role is NOT required from the client — it is read directly
    from the database and returned in the response.
    """
    try:
        result = supabase.table("users").select("*") \
            .eq("username", data.username) \
            .eq("password", data.password) \
            .execute()

        if not result.data:
            return JSONResponse(status_code=401, content={
                "success": False,
                "message": "Invalid username or password."
            })

        user = result.data[0]
        return {
            "success": True,
            "message": "Login successful!",
            "role": user["role"],
            "username": user["username"]
        }

    except Exception as e:
        print(f"[LOGIN ERROR] {e}")
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": f"Server error: {str(e)}"
        })