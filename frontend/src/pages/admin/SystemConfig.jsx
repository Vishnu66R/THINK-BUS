// frontend/src/pages/admin/SystemConfig.jsx
// -------------------------------------------
// System Configuration page - system settings + bus tracking controls.
// -------------------------------------------

import { useState, useEffect, useRef } from "react";
import {
  Settings, Clock, Calendar, Play, CheckCircle, XCircle, Brain,
  Bus, MapPin, ArrowRight, Square, Navigation
} from "lucide-react";
import {
  saveSimulatedDateTime,
  fetchAdminBuses,
  startAllBusTracking,
  stopAllBusTracking,
  stopBusTracking,
  fetchTrackingStatus,
  fetchActiveTracking
} from "../../api";
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
  const [toast, setToast] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Bus Tracking State
  const [buses, setBuses] = useState([]);
  const [trackingStates, setTrackingStates] = useState({}); // { busId: { active, direction, ... } }
  const [startingTracking, setStartingTracking] = useState(false);
  const trackingIntervalRef = useRef(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Load buses on mount
  useEffect(() => {
    loadBuses();
    loadActiveTracking();
    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, []);

  // Poll tracking status every 3 seconds for all active buses
  useEffect(() => {
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);

    trackingIntervalRef.current = setInterval(async () => {
      await loadActiveTracking();
    }, 3000);

    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, []);

  async function loadBuses() {
    const res = await fetchAdminBuses();
    if (res.success && res.data) {
      setBuses(res.data);
    }
  }

  async function loadActiveTracking() {
    const res = await fetchActiveTracking();
    if (res.success && res.data) {
      // For each active bus, also fetch detailed position status
      const newStates = {};
      for (const busIdStr of Object.keys(res.data)) {
        const busId = parseInt(busIdStr);
        const statusRes = await fetchTrackingStatus(busId);
        if (statusRes.success) {
          newStates[busId] = statusRes;
        }
      }
      setTrackingStates(newStates);
    }
  }

  async function handleStartTracking(direction) {
    if (!sysDate || !sysTime) {
      showToast("Please set both Date and Time before starting tracking.", "warning");
      return;
    }

    setStartingTracking(true);
    // Auto-save the Date and Time to DB when starting fleet
    const timeRes = await saveSimulatedDateTime(sysDate, sysTime);
    if (!timeRes.success) {
      setStartingTracking(false);
      showToast("Failed to save time constraints to database.", "error");
      return;
    }

    const res = await startAllBusTracking(direction);
    setStartingTracking(false);
    if (res.success) {
      const dirLabel = direction === "to_college" ? "Stops → College" : "College → Stops";
      showToast(`Fleet tracking started: ${dirLabel}`);
      loadActiveTracking();
    } else {
      showToast(res.message || "Failed to start tracking", "error");
    }
  }

  async function handleStopAllTracking() {
    const res = await stopAllBusTracking();
    if (res.success) {
      showToast('All fleet tracking stopped');
      setTrackingStates({});
    } else {
      showToast(res.message || "Failed to stop tracking", "error");
    }
  }

  async function handleStopTracking(busId) {
    const res = await stopBusTracking(busId);
    if (res.success) {
      showToast(`Bus ${busId} tracking stopped`);
      setTrackingStates(prev => {
        const next = { ...prev };
        delete next[busId];
        return next;
      });
    } else {
      showToast(res.message || "Failed to stop tracking", "error");
    }
  }

  async function handleSimulate() {
    if (!sysDate && !sysTime) {
      showToast("Please select at least a date or time before simulating.", "error");
      return;
    }
    setSimulating(true);
    setMlResult(null);

    const res = await saveSimulatedDateTime(sysDate, sysTime);
    setSimulating(false);

    if (res.success) {
      showToast("Simulation saved! Running ML diagnostics...");
    } else {
      showToast(res.message || "Failed to save simulation.", "error");
      return;
    }

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

  const isAnyBusTracked = Object.keys(trackingStates).length > 0;

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
              Manage global settings, bus tracking, and the ThinkBus system.
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

      {/* ─── Bus Tracking Control Panel ─── */}
      <div className="sc-tracking-panel">
        <div className="sc-tracking-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="sc-tracking-icon">
              <Navigation size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "20px", color: "#1e293b" }}>Bus Tracking Control</h3>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>Start real-time bus tracking based on route stop timings</p>
            </div>
          </div>
        </div>

        {/* Start Tracking Buttons */}
        {!isAnyBusTracked ? (
          <div className="sc-tracking-actions">
            <button
              className="sc-track-btn sc-track-btn-to-college"
              onClick={() => handleStartTracking("to_college")}
              disabled={startingTracking}
            >
              <MapPin size={18} />
              <span>Start Fleet: Stops → College</span>
              <ArrowRight size={18} />
            </button>

            <button
              className="sc-track-btn sc-track-btn-to-stop"
              onClick={() => handleStartTracking("to_stop")}
              disabled={startingTracking}
            >
              <Bus size={18} />
              <span>Start Fleet: College → Stops</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="sc-tracking-active-badge">
            <div className="sc-pulse-dot"></div>
            <span>Fleet is currently being tracked in real-time</span>
            <button
              className="sc-stop-track-btn"
              onClick={handleStopAllTracking}
            >
              <Square size={14} />
              Stop All
            </button>
          </div>
        )}

        {/* Active Tracking Status Cards */}
        {Object.keys(trackingStates).length > 0 && (
          <div className="sc-tracking-live-section">
            <h4 style={{ margin: "0 0 16px", color: "#1e293b", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="sc-live-indicator"></span>
              Live Tracking Status
            </h4>
            <div className="sc-tracking-cards">
              {Object.entries(trackingStates).map(([busIdStr, status]) => {
                const busId = parseInt(busIdStr);
                const bus = buses.find(b => b.id === busId);
                if (!status.active) return null;

                const progress = status.total_route_mins > 0
                  ? Math.min((status.elapsed_mins / status.total_route_mins) * 100, 100)
                  : 0;
                const dirLabel = status.direction === "to_college" ? "Stop → College" : "College → Stop";

                return (
                  <div className="sc-tracking-card" key={busId}>
                    <div className="sc-tracking-card-top">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="sc-tracking-card-avatar">
                          <Bus size={18} />
                        </div>
                        <div>
                          <h5 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                            Bus #{busId} — {bus?.registration_number || ""}
                          </h5>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            {dirLabel} • Route: {bus?.routes?.name || "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        className="sc-stop-track-btn-sm"
                        onClick={() => handleStopTracking(busId)}
                        title="Stop Tracking"
                      >
                        <Square size={12} />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="sc-progress-wrapper">
                      <div className="sc-progress-bar">
                        <div
                          className="sc-progress-fill"
                          style={{ width: `${progress}%` }}
                        ></div>
                        <div
                          className="sc-progress-bus-icon"
                          style={{ left: `${Math.min(progress, 96)}%` }}
                        >
                          🚌
                        </div>
                      </div>
                      <div className="sc-progress-labels">
                        <span>{status.from_stop || "Start"}</span>
                        <span style={{ fontWeight: 700, color: "#4f46e5" }}>
                          {Math.round(progress)}%
                        </span>
                        <span>{status.to_stop || "End"}</span>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="sc-tracking-stats">
                      <div className="sc-tracking-stat">
                        <span className="sc-stat-label">Elapsed</span>
                        <span className="sc-stat-value">{status.elapsed_mins?.toFixed(1)} min</span>
                      </div>
                      <div className="sc-tracking-stat">
                        <span className="sc-stat-label">Total</span>
                        <span className="sc-stat-value">{status.total_route_mins} min</span>
                      </div>
                      <div className="sc-tracking-stat">
                        <span className="sc-stat-label">Between</span>
                        <span className="sc-stat-value" style={{ fontSize: "11px" }}>
                          {status.from_stop} → {status.to_stop}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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

          {/* Emergency Rerouting Plan UI */}
          {mlResult.rerouting_plan && mlResult.rerouting_plan.status === "rerouted" && (
            <div style={{ marginTop: "36px", animation: "fadeIn 0.5s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", justifyContent: "center" }}>
                <span style={{ fontSize: "22px" }}>🚨</span>
                <h3 style={{ margin: 0, color: "#e53e3e", fontSize: "18px" }}>Emergency Rerouting Plan</h3>
              </div>
              <div style={{
                background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "10px",
                padding: "16px 20px", marginBottom: "24px", fontSize: "14px", color: "#b91c1c"
              }}>
                <strong style={{ fontSize: "15px" }}>Broken Down Buses:</strong> {mlResult.rerouting_plan.broken_buses.join(", ")}
                <p style={{ margin: "8px 0 0 0", color: "#991b1b" }}>Students from these buses have been reallocated to active buses utilizing Dijkstra's algorithm and local geographic data minimum distance caching.</p>
              </div>

              {mlResult.rerouting_plan.buses.map(route => (
                <div key={route.bus_id} style={{
                  background: "#fff", padding: "20px", borderRadius: "12px", borderLeft: "6px solid #4f46e5",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.06)", marginBottom: "24px"
                }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "17px" }}>
                    Bus #{route.bus_id} ({route.registration})
                    <span style={{ color: "#64748b", fontWeight: 500, fontSize: "14px", marginLeft: "10px" }}>Original: {route.original_route}</span>
                  </h4>
                  <div style={{ display: "flex", gap: "24px", fontSize: "14px", color: "#64748b", marginBottom: "20px", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                    <span>⏳ <strong style={{ color: "#334155" }}>Est. Duration:</strong> <span style={{ color: "#4f46e5", fontWeight: "bold" }}>{route.estimated_duration_mins} mins</span></span>
                    <span>👥 <strong style={{ color: "#334155" }}>Load:</strong> {route.passenger_count} / {route.capacity}</span>
                  </div>
                  <strong style={{ fontSize: "14px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Optimized Dispatch Sequence:</strong>
                  <ol style={{ margin: "14px 0 0 0", paddingLeft: "24px", fontSize: "14px", color: "#475569" }}>
                    {route.stops.map((st, i) => (
                      <li key={st.stop_id} style={{ padding: "8px 0", borderBottom: i !== route.stops.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <strong style={{ color: "#0f172a" }}>{st.stop_name}</strong> 
                        <span style={{ marginLeft: "10px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>{st.demand} Pickups</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
          
          {mlResult.rerouting_plan && mlResult.rerouting_plan.status === "no_rerouting_needed" && (
            <div style={{ marginTop: "36px", textAlign: "center", color: "#059669", background: "#ecfdf5", padding: "18px", borderRadius: "12px", border: "1px solid #a7f3d0", animation: "fadeIn 0.5s ease" }}>
              <span style={{ fontSize: "22px", marginRight: "10px", verticalAlign: "-3px" }}>✅</span>
              <strong style={{ fontSize: "16px" }}>Fleet Status Normal:</strong> No active high-risk buses detected. Normal routes apply.
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default SystemConfig;
