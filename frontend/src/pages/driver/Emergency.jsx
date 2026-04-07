// frontend/src/pages/driver/Emergency.jsx
// ----------------------------------------
// Emergency reporting page with large buttons
// for breakdown, delay, and traffic issues.
// Includes confirmation popup before sending.
// ----------------------------------------

import { useState } from "react";
import { 
  ShieldAlert, 
  Truck, 
  Clock, 
  TrafficCone, 
  CheckCircle, 
  XCircle, 
  Building2, 
  Ambulance, 
  Shield 
} from "lucide-react";
import { reportEmergency } from "../../api";
import "./DriverPages.css";

// Emergency types with styling
const EMERGENCY_TYPES = [
  {
    type: "breakdown",
    label: "Bus Breakdown",
    icon: <Truck size={32} />,
    color: "#dc2626",
    bg: "#fee2e2",
    description: "Bus cannot move. Needs immediate attention.",
  },
  {
    type: "delay",
    label: "Delay",
    icon: <Clock size={32} />,
    color: "#d97706",
    bg: "#fef3c7",
    description: "Running behind schedule due to unforeseen reasons.",
  },
  {
    type: "traffic",
    label: "Traffic Issue",
    icon: <TrafficCone size={32} />,
    color: "#ea580c",
    bg: "#fff7ed",
    description: "Heavy traffic causing significant delays.",
  },
];

function Emergency() {
  const [confirming, setConfirming] = useState(null); // which type is being confirmed
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { success, message }
  const [delayMins, setDelayMins] = useState(0);

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  // Show confirmation popup
  function handleClick(type) {
    setConfirming(type);
    setResult(null);
    setDelayMins(0);
  }

  // Cancel confirmation
  function handleCancel() {
    setConfirming(null);
    setDelayMins(0);
  }

  // Send emergency report
  async function handleConfirm() {
    if (!confirming) return;
    setSending(true);
    try {
      const res = await reportEmergency(username, confirming.type, confirming.description, delayMins);
      setResult(res);
    } catch {
      setResult({ success: false, message: "Could not connect to server" });
    } finally {
      setSending(false);
      setConfirming(null);
      setDelayMins(0);
    }
  }

  return (
    <div className="driver-page" id="driver-emergency">
      <div className="driver-page-header">
        <h2>
          <ShieldAlert size={28} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Emergency Report
        </h2>
        <p className="driver-page-subtitle">Tap a button to report an issue immediately</p>
      </div>

      {/* Result message */}
      {result && (
        <div className={`emergency-result ${result.success ? "result--success" : "result--error"}`}>
          <span>{result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}</span>
          <span>{result.message}</span>
        </div>
      )}

      {/* Emergency buttons */}
      <div className="emergency-grid">
        {EMERGENCY_TYPES.map((item) => (
          <button
            key={item.type}
            className="emergency-btn"
            style={{ borderColor: item.color, background: item.bg }}
            onClick={() => handleClick(item)}
          >
            <span className="emergency-btn-icon">{item.icon}</span>
            <span className="emergency-btn-label" style={{ color: item.color }}>
              {item.label}
            </span>
            <span className="emergency-btn-desc">{item.description}</span>
          </button>
        ))}
      </div>

      {/* Emergency Contacts */}
      <h3 className="section-title" style={{ marginTop: '35px', fontSize: '1.2rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Direct Contact Lines</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '20px' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '50%', color: '#64748b' }}>
            <Building2 size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontWeight: 'bold', color: '#0f172a' }}>Transport Office</span>
            <span style={{ display: 'block', color: '#4f46e5', fontWeight: '600', cursor: 'pointer', marginTop:'4px' }} onClick={()=>alert("Initiating call to Transport Office...")}>+91 98765 43210</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '50%', color: '#dc2626' }}>
            <Ambulance size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontWeight: 'bold', color: '#0f172a' }}>College Medical Team</span>
            <span style={{ display: 'block', color: '#dc2626', fontWeight: '600', cursor: 'pointer', marginTop:'4px' }} onClick={()=>alert("Initiating call to Medical Team...")}>+91 11223 34455</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '50%', color: '#2563eb' }}>
            <Shield size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontWeight: 'bold', color: '#0f172a' }}>Highway Police</span>
            <span style={{ display: 'block', color: '#2563eb', fontWeight: '600', cursor: 'pointer', marginTop:'4px' }} onClick={()=>alert("Initiating call to Police...")}>100 / 112</span>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirming && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">{confirming.icon}</div>
            <h3 className="modal-title">Confirm Emergency Report</h3>
            <p className="modal-message">
              Are you sure you want to report a <strong>{confirming.label}</strong>?
              This will notify the admin immediately.
            </p>

            {(confirming.type === "delay" || confirming.type === "traffic") && (
              <div style={{ margin: "20px 0", textAlign: "left" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#374151" }}>
                  Estimated Delay (Minutes):
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {[5, 10, 15, 30].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setDelayMins(mins)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: delayMins === mins ? `2px solid ${confirming.color}` : "1px solid #d1d5db",
                        background: delayMins === mins ? confirming.bg : "#ffffff",
                        color: delayMins === mins ? confirming.color : "#374151",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  min="1"
                  placeholder="Or enter custom minutes"
                  value={delayMins || ""}
                  onChange={(e) => setDelayMins(parseInt(e.target.value) || 0)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", outline: "none" }}
                />
              </div>
            )}

            <div className="modal-buttons">
              <button className="modal-btn modal-btn--cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="modal-btn modal-btn--confirm"
                onClick={handleConfirm}
                disabled={sending || ((confirming.type === "delay" || confirming.type === "traffic") && !delayMins)}
                style={{ background: confirming.color }}
              >
                {sending ? "Sending…" : "Yes, Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Emergency;
