# backend/main.py

from dotenv import load_dotenv
load_dotenv()  # ← must be the very first thing, before importing database

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.parent import router as parent_router
from routes.driver import router as driver_router
from routes.admin import router as admin_router
from routes.student import router as student_router
from ml_service import run_breakdown_analysis
from route_optimizer import run_rerouting

app = FastAPI(title="ThinkBus API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://192.168.18.134:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(parent_router)
app.include_router(driver_router)
app.include_router(admin_router)
app.include_router(student_router)

from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
def root():
    ml_result = run_breakdown_analysis()
    
    if "error" in ml_result:
        return f"<html><body><h1>Error: {ml_result['error']}</h1></body></html>"
        
    reroute_result = run_rerouting(ml_result)
    
    html_content = f"""
    <html>
        <head>
            <title>ThinkBus ML Maintenance Analysis</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px; color: #333; }}
                h1 {{ color: #2c3e50; text-align: center; margin-bottom: 30px; }}
                h2 {{ color: #e53e3e; text-align: center; margin-top: 50px; }}
                .summary {{ background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; max-width: 800px; margin: 0 auto 20px auto; }}
                .summary p {{ font-size: 1.1em; margin: 10px 0; }}
                table {{ width: 100%; max-width: 800px; margin: 0 auto 30px auto; border-collapse: collapse; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }}
                th, td {{ padding: 15px; text-align: center; border-bottom: 1px solid #eee; }}
                th {{ background-color: #4C51BF; color: white; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }}
                tr:hover {{ background-color: #f8fafc; }}
                .tag-nil {{ background-color: #718096; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-low {{ background-color: #48BB78; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-medium {{ background-color: #ECC94B; color: black; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-high {{ background-color: #ED8936; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-certain {{ background-color: #E53E3E; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .route-card {{ background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; max-width: 800px; margin: 0 auto 20px auto; border-left: 5px solid #4C51BF; }}
                .route-card h3 {{ margin-top: 0; color: #2c3e50; }}
                .stops-list {{ list-style-type: decimal; padding-left: 20px; }}
                .stops-list li {{ padding: 5px 0; border-bottom: 1px solid #f0f0f0; }}
            </style>
        </head>
        <body>
            <h1>🚌 ThinkBus - Maintenance ML Diagnostics</h1>
            <div class="summary">
                <p>🧑‍💻 <strong>Model Active:</strong> {ml_result.get('model_used', 'N/A')}</p>
                <p>🎯 <strong>Accuracy (R² Score):</strong> {ml_result.get('accuracy_r2_score', 'N/A')}</p>
            </div>
            <table>
                <tr>
                    <th>Bus ID</th>
                    <th>Registration</th>
                    <th>Breakdown Probability</th>
                    <th>Risk Category</th>
                </tr>
    """
    
    for bus in ml_result.get('predictions', []):
        cat = bus['risk_category']
        badge_class = f"tag-{cat.lower()}"
        html_content += f"""
                <tr>
                    <td><strong>#{bus['bus_id']}</strong></td>
                    <td>{bus['registration']}</td>
                    <td>{bus['probability']}</td>
                    <td><span class="{badge_class}">{cat}</span></td>
                </tr>
        """
        
    html_content += """
            </table>
    """
    
    # Emergency Rerouting Plan
    if reroute_result.get("status") == "rerouted":
        broken_str = ", ".join(reroute_result.get("broken_buses", []))
        html_content += f"""
            <h2>🚨 Emergency Rerouting Plan</h2>
            <div class="summary" style="border-left: 5px solid #e53e3e;">
                <p><strong>Broken Down Buses:</strong> {broken_str}</p>
                <p>Students from these buses have been reallocated to active buses based on capacity and dynamic routing utilizing Dijkstra's shortest paths and OpenStreetMap data.</p>
            </div>
        """
        for route in reroute_result.get("buses", []):
            stops_html = "".join([f"<li><strong>{st['stop_name']}</strong> (Demand: {st['demand']})</li>" for st in route['stops']])
            html_content += f"""
            <div class="route-card">
                <h3>Bus #{route['bus_id']} ({route['registration']}) - Original Route: {route['original_route']}</h3>
                <p><strong>Estimated Duration:</strong> {route.get('estimated_duration_mins', 'N/A')} mins</p>
                <p><strong>Passenger Load:</strong> {route['passenger_count']} / {route['capacity']}</p>
                <h4>Optimized Dispatch Sequence:</h4>
                <ul class="stops-list">
                    {stops_html}
                </ul>
            </div>
            """
    elif reroute_result.get("status") == "no_rerouting_needed":
         html_content += f"""
            <h2>✅ Fleet Status Normal</h2>
            <div class="summary" style="border-left: 5px solid #48BB78;">
                <p>No high-risk buses detected. Standard routes apply.</p>
            </div>
        """
    else:
        html_content += f"""
            <h2>⚠️ Rerouting Error</h2>
            <div class="summary" style="border-left: 5px solid #e53e3e;">
                <p>{reroute_result.get('error', 'Unknown error during rerouting.')}</p>
            </div>
        """
        
    html_content += """
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/run-ml")
def run_ml():
    ml_result = run_breakdown_analysis()
    if "error" not in ml_result:
        reroute_result = run_rerouting(ml_result)
        ml_result["rerouting_plan"] = reroute_result
    return ml_result