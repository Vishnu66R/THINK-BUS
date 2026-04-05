// frontend/src/pages/admin/SystemConfig.jsx
// -------------------------------------------
// System Configuration page - system settings.
// -------------------------------------------

import { useState } from "react";
import { Settings, Clock, Calendar, Play, CheckCircle, XCircle, Brain } from "lucide-react";
import { saveSimulatedDateTime } from "../../api";
import "./SystemConfig.css";

const RISK_COLORS = {
  Nil: { bg: "#718096", color: "#fff" },
  Low: { bg: "#48BB78", color: "#fff" },
  Medium: { bg: "#ECC94B", color: "#000" },
  High: { bg: "#ED8936", color: "#fff" },
  Certain: { bg: "#E53E3E", color: "#fff" },
};

function SystemConfig() {
  const [sysTime, setSysTime] = useState("");
  const [sysDate, setSysDate] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSimulate() {
    if (!sysDate && !sysTime) {
      showToast("Please select at least a date or time before simulating.", "error");
      return;
    }
    setSimulating(true);
    setMlResult(null);

    // Step 1: Save the simulated date/time
    const res = await saveSimulatedDateTime(sysDate, sysTime);
    setSimulating(false);

    if (res.success) {
      showToast("Simulation saved! Running ML diagnostics...");
    } else {
      showToast(res.message || "Failed to save simulation.", "error");
      return;
    }

    // Step 2: Run the ML model
    setMlLoading(true);
    try {
      const mlRes = await fetch("http://127.0.0.1:8000/run-ml");
      const data = await mlRes.json();
      setMlResult(data);
    } catch (err) {
      showToast("ML model failed to respond. Is the backend running?", "error");
    } finally {
      setMlLoading(false);
    }
  }

  return (
    <div className="system-config-page" id="system-config-page">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 9999,
          background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "#fff", padding: "14px 20px", borderRadius: "12px",
          display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)", fontWeight: 600, fontSize: "14px",
          animation: "fadeIn 0.3s ease"
        }}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="sc-header">
        <div className="sc-title">
          <div className="sc-title-icon">
            <Settings size={28} />
          </div>
          <div>
            <h2>System Configuration</h2>
            <p style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}>
              Manage global settings, dates, and times for the ThinkBus system.
            </p>
          </div>
        </div>
      </div>

      <div className="sc-grid">
        {/* Time Selection Section */}
        <div className="sc-card">
          <div className="sc-card-header">
            <div className="sc-card-icon">
              <Clock size={20} />
            </div>
            <h3>System Time</h3>
          </div>
          <div className="sc-form-group">
            <label htmlFor="system-time">Default System Time</label>
            <input
              type="time"
              id="system-time"
              value={sysTime}
              onChange={(e) => setSysTime(e.target.value)}
            />
          </div>
        </div>

        {/* Date Selection Section */}
        <div className="sc-card">
          <div className="sc-card-header">
            <div className="sc-card-icon">
              <Calendar size={20} />
            </div>
            <h3>System Date</h3>
          </div>
          <div className="sc-form-group">
            <label htmlFor="system-date">Active Academic/Operational Date</label>
            <input
              type="date"
              id="system-date"
              value={sysDate}
              onChange={(e) => setSysDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Simulate Button */}
      <div style={{ marginTop: "28px", display: "flex", justifyContent: "center" }}>
        <button
          id="simulate-btn"
          onClick={handleSimulate}
          disabled={simulating || mlLoading}
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "14px 36px", fontSize: "15px", fontWeight: 700,
            borderRadius: "12px", border: "none", cursor: (simulating || mlLoading) ? "not-allowed" : "pointer",
            background: (simulating || mlLoading)
              ? "#a5b4fc"
              : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "#fff",
            boxShadow: (simulating || mlLoading) ? "none" : "0 8px 20px rgba(79,70,229,0.4)",
            transition: "all 0.25s ease",
            transform: (simulating || mlLoading) ? "scale(0.97)" : "scale(1)",
          }}
        >
          <Play size={18} />
          {simulating ? "Saving Simulation..." : mlLoading ? "Running ML Analysis..." : "Simulate"}
        </button>
      </div>

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", marginTop: "12px" }}>
        Clicking <strong>Simulate</strong> will push the selected date &amp; time to all ThinkBus dashboards and run the ML breakdown model.
      </p>

      {/* ML Results Table */}
      {mlLoading && (
        <div style={{ textAlign: "center", marginTop: "32px", color: "#6b7280", fontSize: "15px" }}>
          <Brain size={22} style={{ verticalAlign: "middle", marginRight: "8px", color: "#7c3aed" }} />
          Training ML model and fetching live diagnostics...
        </div>
      )}

      {mlResult && !mlLoading && (
        <div style={{ marginTop: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", justifyContent: "center" }}>
            <Brain size={22} color="#7c3aed" />
            <h3 style={{ margin: 0, color: "#2c3e50", fontSize: "18px" }}>ML Breakdown Diagnostics</h3>
          </div>

          {/* Model info bar */}
          <div style={{
            background: "#f0f0ff", border: "1px solid #c7d2fe", borderRadius: "10px",
            padding: "12px 20px", marginBottom: "18px", display: "flex",
            justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
            fontSize: "13px", color: "#4338ca"
          }}>
            <span>🧠 <strong>Model:</strong> {mlResult.model_used}</span>
            <span>🎯 <strong>Accuracy (R²):</strong> {mlResult.accuracy_r2_score}</span>
          </div>

          <div style={{ overflowX: "auto", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", color: "#fff" }}>
                  <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, letterSpacing: "0.04em", fontSize: "13px" }}>Bus ID</th>
                  <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, letterSpacing: "0.04em", fontSize: "13px" }}>Registration</th>
                  <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, letterSpacing: "0.04em", fontSize: "13px" }}>Breakdown Probability</th>
                  <th style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, letterSpacing: "0.04em", fontSize: "13px" }}>Risk Category</th>
                </tr>
              </thead>
              <tbody>
                {mlResult.predictions && mlResult.predictions.map((bus, idx) => {
                  const style = RISK_COLORS[bus.risk_category] || { bg: "#718096", color: "#fff" };
                  return (
                    <tr key={bus.bus_id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8faff", transition: "background 0.2s" }}>
                      <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, fontSize: "15px" }}>#{bus.bus_id}</td>
                      <td style={{ padding: "14px 18px", textAlign: "center", color: "#374151" }}>{bus.registration}</td>
                      <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 600, color: "#1f2937" }}>{bus.probability}</td>
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <span style={{
                          background: style.bg, color: style.color,
                          padding: "5px 14px", borderRadius: "20px",
                          fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em"
                        }}>
                          {bus.risk_category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemConfig;

