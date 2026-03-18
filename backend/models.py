# backend/models.py
# ------------------------------------------------------------
# Pydantic models define the shape of data coming into the API
# FastAPI uses these to validate request bodies automatically
# ------------------------------------------------------------

from pydantic import BaseModel

VALID_ROLES = ["Admin", "Student", "Parent", "Driver"]

class SignupRequest(BaseModel):
    username: str
    password: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str
