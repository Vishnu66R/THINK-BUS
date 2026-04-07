import os
import sys
import json

# use backend path
sys.path.insert(0, os.path.abspath('backend'))
from database import supabase

buses_res = supabase.table("buses").select("driver_id, registration_number, route_id, routes:route_id(name)").not_.is_("driver_id", "null").execute()
with open("test_buses.json", "w") as f:
    json.dump(buses_res.data, f)
