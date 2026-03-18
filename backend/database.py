# backend/database.py

import os
from dotenv import load_dotenv

# Force load .env before anything else
load_dotenv()

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing from .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)