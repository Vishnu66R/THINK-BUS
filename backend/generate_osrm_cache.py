import os
import json
import requests
import math
import time
from dotenv import load_dotenv

load_dotenv()
from database import supabase

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_cache():
    print("Fetching stop locations from Supabase...")
    res = supabase.table("stop_locations").select("route_stop_id, latitude, longitude").execute()
    stops = res.data
    print(f"Found {len(stops)} stops.")
    
    # Assign an index to each stop
    stops_sorted = sorted(stops, key=lambda x: x['route_stop_id'])
    
    # We will build a matrix mapping from route_stop_id to route_stop_id duration.
    # To do this in OSRM, we send all coords, get NxN matrix.
    # OSRM limits `table` API to 100 coords. We hope len(stops) <= 100.
    
    coords = []
    stop_ids = []
    for s in stops_sorted:
        coords.append((s['longitude'], s['latitude']))
        stop_ids.append(s['route_stop_id'])
        
    coords_str = ";".join([f"{lon},{lat}" for lon, lat in coords])
    url = f"http://router.project-osrm.org/table/v1/driving/{coords_str}?annotations=duration"
    
    headers = {'User-Agent': 'ThinkBus-Routing-Optimizer/1.0'}
    
    durations = None
    try:
        print("Querying OSRM Table API...")
        response = requests.get(url, headers=headers, timeout=30)
        data = response.json()
        if data.get('code') == 'Ok':
            durations = data.get('durations')
            print("Successfully received OSRM graph data.")
        else:
            print("OSRM returned non-Ok code:", data)
    except Exception as e:
        print("Failed to contact OSRM:", e)

    # Fallback to Haversine if OSRM completely failed or rate limits still hit
    if not durations:
        print("Using Haversine formula to build distance graph locally...")
        n = len(coords)
        durations = [[0]*n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i == j: continue
                dist_km = haversine(coords[i][1], coords[i][0], coords[j][1], coords[j][0])
                durations[i][j] = dist_km * 120 # 2 mins per km approx

    # Map matrix back to a dictionary format for fast lookup
    # cache[stop_A][stop_B] = duration_seconds
    cache = {}
    for i in range(len(stop_ids)):
        sid_a = stop_ids[i]
        cache[sid_a] = {}
        for j in range(len(stop_ids)):
            sid_b = stop_ids[j]
            cache[sid_a][sid_b] = durations[i][j]

    with open("osrm_cache.json", "w") as f:
        json.dump(cache, f, indent=2)
    print("Graph successfully saved to osrm_cache.json!")

if __name__ == "__main__":
    generate_cache()
