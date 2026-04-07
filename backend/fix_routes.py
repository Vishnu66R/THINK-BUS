import os
import sys

sys.path.insert(0, os.path.abspath('backend'))
from database import supabase

# Correct mappings based on route_stops
correct_mapping = {
    1: {"name": "Karunagapally", "start_point": "Karunagapally"},
    2: {"name": "Cheerankavu", "start_point": "Neduvathoor"},
    3: {"name": "Kottarakkara", "start_point": "Kottarakkara"},
    4: {"name": "Kottiyam", "start_point": "Kottiyam"},
    5: {"name": "Paravoor", "start_point": "Paravoor"},
    6: {"name": "Mevarom", "start_point": "Mevarom"},
    7: {"name": "Paripally", "start_point": "Paripally"}
}

# 1. Append temp suffix to avoid UNIQUE constraint violation
for i in range(1, 8):
    supabase.table("routes").update({"name": f"Temp_{i}"}).eq("id", i).execute()

# 2. Update to correct names
for route_id, data in correct_mapping.items():
    supabase.table("routes").update({
        "name": data["name"],
        "start_point": data["start_point"],
        "end_point": "College Of Engineering Perumon"
    }).eq("id", route_id).execute()

print("Routes successfully corrected!")
