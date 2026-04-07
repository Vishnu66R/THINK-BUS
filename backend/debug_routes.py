import os, sys
sys.path.insert(0, os.path.abspath('backend'))
from database import supabase

# Check route 2 (Cheerankavu) stops and their coordinates
# The user says route 2 map is wrong
stops_res = supabase.table("route_stops").select(
    "id, stop_name, stop_order, route_id, stop_locations(latitude, longitude)"
).eq("route_id", 2).order("stop_order").execute()

print("Route 2 (Cheerankavu) stops:")
for s in stops_res.data:
    loc = s.get("stop_locations") or {}
    lat = float(loc.get("latitude", 0))
    lng = float(loc.get("longitude", 0))
    print(f"  [{s['stop_order']}] {s['stop_name']}: lat={lat}, lng={lng}")

# Also check: what is Bus 2's route_id?
bus2 = supabase.table("buses").select("id, route_id, registration_number").eq("id", 2).execute()
print(f"\nBus 2: {bus2.data}")

# Check the route name for route_id 2
route2 = supabase.table("routes").select("*").eq("id", 2).execute()
print(f"Route 2: {route2.data}")

# Check what the dropdown option looks like
bus_full = supabase.table("buses").select("id, registration_number, route_id, routes:route_id(name)").eq("id", 2).execute()
print(f"\nBus 2 with route join: {bus_full.data}")
