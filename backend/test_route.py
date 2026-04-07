from route_optimizer import run_rerouting
import json

test_ml = {
    "predictions": [
        {"bus_id": 2, "risk_category": "Certain"}
    ]
}

res = run_rerouting(test_ml)
for b in res.get("buses", []):
    if b["bus_id"] == 5:
        print("Bus 5 stops:")
        for s in b["stops"]:
            print(f"- {s['stop_name']} (Demand: {s['demand']})")
