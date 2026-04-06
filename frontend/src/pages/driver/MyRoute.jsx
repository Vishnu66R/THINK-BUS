// frontend/src/pages/driver/MyRoute.jsx
// ----------------------------------------
// Shows the driver's assigned route with all stops in order.
// Auto-refreshes every 30 seconds.
// ----------------------------------------

import { useState, useEffect, useRef } from "react";
import { 
  Route, 
  GraduationCap, 
  Bus, 
  Clock, 
  MapPin, 
  Flag,
  AlertTriangle 
} from "lucide-react";
import { fetchDriverRoute, fetchDriverSummary } from "../../api";
import { useSimulatedDateTime } from "../../hooks/useSimulatedDateTime";
import "./DriverPages.css";

function MyRoute() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const retryCount = useRef(0);
  const simDT = useSimulatedDateTime();

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  async function loadData(isRetry = false) {
    try {
      const [routeRes, summaryRes] = await Promise.all([
        fetchDriverRoute(username),
        fetchDriverSummary(username)
      ]);
      
      if (routeRes.success && summaryRes.success) {
        setData(routeRes);
        setSummary(summaryRes.summary);
        setError("");
        retryCount.current = 0;
        setLoading(false);
      } else {
        // If we haven't loaded data yet, retry silently
        if (!data && retryCount.current < 3) {
          retryCount.current++;
          setTimeout(() => loadData(true), 2000);
        } else {
          setError(routeRes.message || summaryRes.message || "Failed to load dashboard data");
          setLoading(false);
        }
      }
    } catch {
      // On first load, retry silently instead of showing error
      if (!data && retryCount.current < 3) {
        retryCount.current++;
        setTimeout(() => loadData(true), 2000);
      } else {
        setError("Could not connect to server");
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (username) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [username]);

  if (loading) {
    return (
      <div className="driver-loading">
        <div className="loading-spinner"></div>
        <p>{retryCount.current > 0 ? `Retrying connection (${retryCount.current}/3)...` : "Loading Dashboard..."}</p>
      </div>
    );
  }
  if (error) return <div className="driver-error">{error}</div>;
  if (!data?.route) {
    return (
      <div className="driver-page">
        <div className="empty-state">
          <span className="empty-icon">
            <Route size={48} />
          </span>
          <p>No route assigned yet. Please contact admin.</p>
        </div>
      </div>
    );
  }

  if (data?.bus_status?.includes("Breakdown")) {
    return (
      <div className="driver-page" id="driver-my-route">
        <div className="empty-state" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          <span className="empty-icon" style={{ color: "#ef4444", background: "#fee2e2" }}>
            <AlertTriangle size={56} />
          </span>
          <h2 style={{margin: "15px 0 5px", fontSize: "24px"}}>Bus Out Of Service</h2>
          <p style={{fontSize: "15px"}}>Your vehicle ({data.bus_number}) has been mathematically marked out of service for today due to a predicted mechanical failure.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-page" id="driver-my-route">
      <div className="driver-page-header">
        <h2>Dashboard Overview</h2>
        <p className="driver-page-subtitle">Your live route tracker and passenger count</p>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
          📅 {simDT.date} &nbsp;·&nbsp; 🕐 {simDT.time}
        </p>
      </div>

      {/* Primary Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "25px" }}>
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "2rem", background: "#dbeafe", color: "#1d4ed8", padding: "10px", borderRadius: "12px", width: "50px", height: "50px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <GraduationCap size={28} />
          </div>
          <div>
            <span style={{ display: "block", color: "#64748b", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>Total Students</span>
            <span style={{ display: "block", color: "#0f172a", fontSize: "1.5rem", fontWeight: "700" }}>{summary?.total_students || 0}</span>
          </div>
        </div>
        
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "2rem", background: "#dcfce7", color: "#16a34a", padding: "10px", borderRadius: "12px", width: "50px", height: "50px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Bus size={28} />
          </div>
          <div>
            <span style={{ display: "block", color: "#64748b", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>Bus Capacity</span>
            <span style={{ display: "block", color: "#0f172a", fontSize: "1.5rem", fontWeight: "700" }}>{summary?.bus_capacity || 50}</span>
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "2rem", background: "#fef3c7", color: "#b45309", padding: "10px", borderRadius: "12px", width: "50px", height: "50px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Clock size={28} />
          </div>
          <div>
            <span style={{ display: "block", color: "#64748b", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>Est. Duration</span>
            <span style={{ display: "block", color: "#0f172a", fontSize: "1.5rem", fontWeight: "700" }}>{data.route.estimated_duration}m</span>
          </div>
        </div>
      </div>

      {/* Main Container for Route Stops */}
      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem", fontWeight: "700" }}>Route: {data.route.name}</h3>
            <span style={{ fontSize: "0.9rem", color: "#64748b", display: "flex", gap: "8px", marginTop: "5px" }}>
              <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {data.route.start_point} ➔ <Flag size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} /> {data.route.end_point}
            </span>
          </div>
          <span className={`route-status-badge status--${data.bus_status.toLowerCase()}`}>
            {data.bus_status}
          </span>
        </div>

        {/* Stops list */}
        <h4 style={{ margin: "0 0 15px", color: "#475569", fontSize: "1rem" }}>Scheduled Stops ({data.stops.length})</h4>
        <div className="stops-timeline">
          {data.stops.map((stop, idx) => (
            <div className="stop-item" key={stop.id}>
              <div className="stop-number">{idx + 1}</div>
              <div className="stop-connector">
                <div className="stop-dot"></div>
                {idx < data.stops.length - 1 && <div className="stop-line"></div>}
              </div>
              <div className="stop-info">
                <span className="stop-name">{stop.name}</span>
                <span className="stop-time">{stop.time_from_start} min from departure</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyRoute;
