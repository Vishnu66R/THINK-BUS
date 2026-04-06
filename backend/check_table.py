import os
from dotenv import load_dotenv

load_dotenv()
from database import supabase

def check():
    try:
        # Check alerts table
        res = supabase.table("alerts").select("*").limit(1).execute()
        print("Alerts table exists! Columns:", list(res.data[0].keys()) if res.data else "Empty")
    except Exception as e:
        print("Alerts table error:", e)
        
    try:
        # Check notifications table
        res = supabase.table("notifications").select("*").limit(1).execute()
        print("Notifications table exists! Columns:", list(res.data[0].keys()) if res.data else "Empty")
    except Exception as e:
        print("Notifications table error:", e)

if __name__ == "__main__":
    check()
