from ml_service import run_breakdown_analysis
from route_optimizer import run_rerouting

print("Running ML...")
ml_res = run_breakdown_analysis()
print("ML finished.")

print("Running Rerouting...")
reroute_res = run_rerouting(ml_res)
print("Reroute finished.")
print(reroute_res)
