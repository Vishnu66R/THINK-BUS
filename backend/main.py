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

app = FastAPI(title="ThinkBus API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500"
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
        
    html_content = f"""
    <html>
        <head>
            <title>ThinkBus ML Maintenance Analysis</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px; color: #333; }}
                h1 {{ color: #2c3e50; text-align: center; margin-bottom: 30px; }}
                .summary {{ background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; max-width: 800px; margin: 0 auto 20px auto; }}
                .summary p {{ font-size: 1.1em; margin: 10px 0; }}
                table {{ width: 100%; max-width: 800px; margin: 0 auto; border-collapse: collapse; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }}
                th, td {{ padding: 15px; text-align: center; border-bottom: 1px solid #eee; }}
                th {{ background-color: #4C51BF; color: white; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }}
                tr:hover {{ background-color: #f8fafc; }}
                .tag-nil {{ background-color: #718096; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-low {{ background-color: #48BB78; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-medium {{ background-color: #ECC94B; color: black; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-high {{ background-color: #ED8936; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
                .tag-certain {{ background-color: #E53E3E; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }}
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
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/run-ml")
def run_ml():
    return run_breakdown_analysis()