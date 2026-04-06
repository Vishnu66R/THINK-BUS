import requests
import math
import json
import os
from database import supabase

CACHE_FILE = os.path.join(os.path.dirname(__file__), "osrm_cache.json")
OSRM_CACHE = {}
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r") as f:
        OSRM_CACHE = json.load(f)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def dijkstra_distances(matrix, start_idx):
    """
    Classic Dijkstra algorithm to find shortest path distances from start_idx
    to all other nodes in a fully connected dense graph.
    """
    n = len(matrix)
    distances = [float('inf')] * n
    visited = [False] * n
    distances[start_idx] = 0

    for _ in range(n):
        # find node with minimum distance
        u = -1
        min_dist = float('inf')
        for i in range(n):
            if not visited[i] and distances[i] < min_dist:
                min_dist = distances[i]
                u = i
                
        if u == -1: break
        visited[u] = True

        for v in range(n):
            if not visited[v] and matrix[u][v] is not None:
                new_dist = distances[u] + matrix[u][v]
                if new_dist < distances[v]:
                    distances[v] = new_dist

    return distances




def run_rerouting(ml_result):
    if "error" in ml_result or "predictions" not in ml_result:
        return {"error": "Invalid ML Result"}

    # 1. Fetch DB data
    students_res = supabase.table("students").select("id, boarding_stop_id, is_active").execute()
    buses_res = supabase.table("buses").select("id, registration_number, capacity, route_id, status").execute()
    route_stops_res = supabase.table("route_stops").select("id, route_id, stop_name, stop_order").execute()
    stop_locations_res = supabase.table("stop_locations").select("id, route_stop_id, latitude, longitude").execute()
    routes_res = supabase.table("routes").select("id, name, start_point").execute()

    students = students_res.data
    buses = buses_res.data
    route_stops = route_stops_res.data
    stop_locations = stop_locations_res.data
    routes_db = routes_res.data

    # Map lookups
    bus_map = {b['id']: b for b in buses}
    stop_map = {s['id']: s for s in route_stops}
    route_map = {r['id']: r for r in routes_db}
    loc_map = {l['route_stop_id']: l for l in stop_locations}

    # Demand per stop
    demand = {}
    for st in students:
        if st.get('is_active', True) and st.get('boarding_stop_id'):
            bsid = st['boarding_stop_id']
            demand[bsid] = demand.get(bsid, 0) + 1

    # 2. Identify Broken vs Active Buses
    broken_buses = []
    active_buses = []
    
    ml_risk_map = {p['bus_id']: p['risk_category'] for p in ml_result.get('predictions', [])}
    
    for b in buses:
        category = ml_risk_map.get(b['id'], 'Nil')
        
        # Consider a bus broken if its status is not Active OR if ML predicts High/Certain breakdown
        if str(b.get('status', 'Active')).lower() != 'active':
            broken_buses.append(b)
        elif category in ["High", "Certain"]:
            broken_buses.append(b)
        else:
            active_buses.append(b)

    if not broken_buses:
        result = {"status": "no_rerouting_needed", "routes": []}
        with open(os.path.join(os.path.dirname(__file__), "latest_simulation.json"), "w") as f:
            json.dump(result, f)
        return result

    if not active_buses:
        result = {"error": "CRITICAL: All buses are flagged for breakdown. No active buses available."}
        with open(os.path.join(os.path.dirname(__file__), "latest_simulation.json"), "w") as f:
            json.dump(result, f)
        return result

    # 3. Identify Stranded Stops
    stranded_stops = []
    for b in broken_buses:
        b_route_id = b['route_id']
        for stop in route_stops:
            if stop['route_id'] == b_route_id and demand.get(stop['id'], 0) > 0:
                stranded_stops.append({
                    "stop_id": stop['id'],
                    "demand": demand[stop['id']],
                    "stop_name": stop['stop_name'],
                    "location": loc_map.get(stop['id'])
                })

    # Normal Stops for Active Buses
    active_bus_loads = {b['id']: 0 for b in active_buses}
    active_bus_stops = {b['id']: [] for b in active_buses}

    for b in active_buses:
        for stop in route_stops:
            if stop['route_id'] == b['route_id'] and demand.get(stop['id'], 0) > 0:
                loc = loc_map.get(stop['id'])
                active_bus_stops[b['id']].append({
                    "stop_id": stop['id'],
                    "demand": demand[stop['id']],
                    "stop_name": stop['stop_name'],
                    "location": loc
                })
                active_bus_loads[b['id']] += demand[stop['id']]

    # 4. Reallocate Stranded Stops (Proximity + Capacity)
    # We find the nearest active bus (based on its existing stops' average center or nearest stop)
    for stranded in stranded_stops:
        sloc = stranded['location']
        if not sloc: continue
        
        s_lat, s_lon = sloc['latitude'], sloc['longitude']
        
        best_bus_id = None
        min_dist = float('inf')
        
        for b in active_buses:
            b_capacity = b['capacity']
            b_load = active_bus_loads[b['id']]
            
            if b_load + stranded['demand'] <= b_capacity:
                # Find min distance to any of this bus's current stops
                bus_dist = float('inf')
                for ast in active_bus_stops[b['id']]:
                    aloc = ast['location']
                    if aloc:
                        d = haversine(s_lat, s_lon, aloc['latitude'], aloc['longitude'])
                        if d < bus_dist: bus_dist = d
                        
                if bus_dist < min_dist:
                    min_dist = bus_dist
                    best_bus_id = b['id']
                    
        if best_bus_id:
            active_bus_stops[best_bus_id].append(stranded)
            active_bus_loads[best_bus_id] += stranded['demand']
        else:
            # Capacity exceeded everywhere
            pass 

    # 5. Routing using Dijkstra
    rerouted_results = []
    
    for b in active_buses:
        stops = active_bus_stops[b['id']]
        if not stops: continue
        
        # Use OSRM cache to build distance matrix for these specific stops
        n = len(stops)
        matrix = [[0]*n for _ in range(n)]
        for i in range(n):
            sid_a = str(stops[i]['stop_id'])
            for j in range(n):
                sid_b = str(stops[j]['stop_id'])
                if i != j:
                    matrix[i][j] = OSRM_CACHE.get(sid_a, {}).get(sid_b, 999999)
        
        # Route Sequence: Nearest Neighbor traversal using Dijkstra distances
        if len(matrix) > 0:
            unvisited = set(range(len(stops)))
            
            # Find a start node: we could use the first standard stop
            # or the one corresponding to route start_point. We'll just use index 0.
            current = 0
            route_sequence = [stops[current]]
            unvisited.remove(current)
            
            total_duration_sec = 0
            
            while unvisited:
                # Dijkstra computes shortest paths from current node
                distances = dijkstra_distances(matrix, current)
                
                # Nearest unvisited node
                nxt = min(unvisited, key=lambda n: distances[n])
                total_duration_sec += distances[nxt]
                
                route_sequence.append(stops[nxt])
                unvisited.remove(nxt)
                current = nxt
                
            orig_route = route_map.get(b['route_id'], {}).get('name', 'Unknown')
            
            rerouted_results.append({
                "bus_id": b['id'],
                "registration": b['registration_number'],
                "original_route": orig_route,
                "passenger_count": active_bus_loads[b['id']],
                "capacity": b['capacity'],
                "estimated_duration_mins": int(total_duration_sec // 60),
                "stops": route_sequence
            })

    result = {
        "status": "rerouted",
        "buses": rerouted_results,
        "broken_buses": [b['registration_number'] for b in broken_buses],
        "broken_bus_ids": [b['id'] for b in broken_buses]
    }
    
    with open(os.path.join(os.path.dirname(__file__), "latest_simulation.json"), "w") as f:
        json.dump(result, f)
        
    return result
