// frontend/src/pages/admin/SystemConfig.jsx
// -------------------------------------------
// System Configuration page - system settings.
// -------------------------------------------

import { useState } from "react";
import { Settings, Clock, Calendar, Play, CheckCircle, XCircle } from "lucide-react";
import { saveSimulatedDateTime } from "../../api";
import "./SystemConfig.css";

function SystemConfig() {
  const [sysTime, setSysTime] = useState("");
  const [sysDate, setSysDate] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

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
    const res = await saveSimulatedDateTime(sysDate, sysTime);
    setSimulating(false);
    if (res.success) {
      showToast("Simulation saved! All dashboards will now show the configured date & time.");
    } else {
      showToast(res.message || "Failed to save simulation.", "error");
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
          disabled={simulating}
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "14px 36px", fontSize: "15px", fontWeight: 700,
            borderRadius: "12px", border: "none", cursor: simulating ? "not-allowed" : "pointer",
            background: simulating
              ? "#a5b4fc"
              : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "#fff",
            boxShadow: simulating ? "none" : "0 8px 20px rgba(79,70,229,0.4)",
            transition: "all 0.25s ease",
            transform: simulating ? "scale(0.97)" : "scale(1)",
          }}
        >
          <Play size={18} />
          {simulating ? "Saving Simulation..." : "Simulate"}
        </button>
      </div>

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", marginTop: "12px" }}>
        Clicking <strong>Simulate</strong> will push the selected date &amp; time to all ThinkBus dashboards.
      </p>
    </div>
  );
}

export default SystemConfig;


