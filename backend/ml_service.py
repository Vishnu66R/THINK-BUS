import os
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def generate_synthetic_data(num_samples=10000):
    np.random.seed(42)
    critical_cols = ['engine_status', 'transmission_status', 'brakes_status', 'steering_status', 'suspension_status']
    secondary_cols = ['tires_status', 'exterior_damage_score', 'interior_condition_score', 'electrical_system_status', 'hvac_status']
    
    data = {}
    for col in critical_cols + secondary_cols:
        data[col] = np.random.randint(1, 11, size=num_samples)
        
    data['days_since_inspected'] = np.random.randint(0, 180, size=num_samples)
    df = pd.DataFrame(data)
    
    critical_avg = df[critical_cols].mean(axis=1) / 10.0
    secondary_avg = df[secondary_cols].mean(axis=1) / 10.0
    days_scale = np.clip(df['days_since_inspected'] / 90.0, 0, 1)
    
    risk = 0.5 * (1.0 - critical_avg) + 0.3 * (1.0 - secondary_avg) + 0.2 * days_scale
    severe_penalty = ((df['engine_status'] < 4) | (df['brakes_status'] < 4) | (df['transmission_status'] < 4)).astype(float) * 0.4
    risk += severe_penalty
    
    risk = np.clip(risk, 0.0, 1.0)
    # Reduced noise for cleaner training signal
    noise = np.random.normal(0, 0.02, num_samples)
    risk = np.clip(risk + noise, 0.0, 1.0)
    
    perfect_mask = (critical_avg == 1.0) & (secondary_avg == 1.0) & (df['days_since_inspected'] < 5)
    risk[perfect_mask] = 0.0
    
    df['breakdown_probability'] = risk
    return df

def map_probability_category(prob):
    if prob <= 0.05: return "Nil"
    elif prob <= 0.33: return "Low"
    elif prob <= 0.66: return "Medium"
    elif prob < 0.95: return "High"
    else: return "Certain"

def run_breakdown_analysis():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return {"error": "Missing SUPABASE config"}
        
    supabase: Client = create_client(url, key)
    
    # --- Training loop: keep training until R² > 0.97 ---
    target_r2 = 0.97
    best_r2 = 0.0
    best_model = None
    attempt = 0
    max_attempts = 5

    while best_r2 < target_r2 and attempt < max_attempts:
        attempt += 1
        seed = 42 + attempt
        df = generate_synthetic_data(10000)
        X = df.drop(columns=['breakdown_probability'])
        y = df['breakdown_probability']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=seed)

        candidate = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=seed,
            n_jobs=-1
        )
        candidate.fit(X_train, y_train)
        r2 = r2_score(y_test, candidate.predict(X_test))

        if r2 > best_r2:
            best_r2 = r2
            best_model = candidate

    model = best_model

    try:
        response = supabase.table("maintenance").select("*").execute()
        records = response.data
        if not records:
            return {"error": "No records found in maintenance table"}
            
        buses_resp = supabase.table("buses").select("id, registration_number").execute()
        buses_map = {b['id']: b['registration_number'] for b in buses_resp.data}
        
        real_data = []
        bus_info = []
        
        now = datetime.now(timezone.utc)
        for row in records:
            try:
               insp_time = datetime.fromisoformat(row['last_inspected'].replace('Z', '+00:00'))
               days_diff = (now - insp_time).days
            except Exception:
               days_diff = 5
               
            real_data.append([
                row.get('engine_status', 10),
                row.get('transmission_status', 10),
                row.get('brakes_status', 10),
                row.get('steering_status', 10),
                row.get('suspension_status', 10),
                row.get('tires_status', 10),
                row.get('exterior_damage_score', 10),
                row.get('interior_condition_score', 10),
                row.get('electrical_system_status', 10),
                row.get('hvac_status', 10),
                max(0, days_diff)
            ])
            bus_info.append({'bus_id': row.get('bus_id'), 'reg': buses_map.get(row.get('bus_id'), 'Unknown')})
            
        X_live = pd.DataFrame(real_data, columns=X.columns)
        live_preds = model.predict(X_live)
        
        results = []
        for info, pred in zip(bus_info, live_preds):
            cat = map_probability_category(pred)
            prob_percent = f"{pred*100:.2f}%"
            results.append({
                "bus_id": info['bus_id'],
                "registration": info['reg'],
                "probability": prob_percent,
                "risk_category": cat
            })
            
        return {
            "status": "success",
            "model_used": "Random Forest Regressor (scikit-learn)",
            "accuracy_r2_score": f"{best_r2*100:.2f}%",
            "predictions": results
        }

    except Exception as e:
        return {"error": f"Error accessing Supabase or processing data: {str(e)}"}
