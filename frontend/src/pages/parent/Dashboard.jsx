// frontend/src/pages/parent/Dashboard.jsx
// ----------------------------------------
// Parent Dashboard — overview of all children,
// their bus status, route, and stop information.
// Auto-refreshes every 30 seconds.
// ----------------------------------------

import { useState, useEffect, useRef } from "react";
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Map as MapIcon 
} from "lucide-react";
import { fetchParentDashboard } from "../../api";
import { useSimulatedDateTime } from "../../hooks/useSimulatedDateTime";
import MapView from "../../components/MapView";
import "./ParentPages.css";

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const retryCount = useRef(0);
  const simDT = useSimulatedDateTime();

  // Get username from localStorage (set during login)
  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  // Fetch dashboard data
  async function loadDashboard() {
    try {
      const res = await fetchParentDashboard(username);
      if (res.success) {
        setData(res);
        if (res.children && res.children.length > 0 && !selectedChildId) {
          setSelectedChildId(res.children[0].id);
        }
        setError("");
        retryCount.current = 0;
        setLoading(false);
      } else {
        if (!data && retryCount.current < 3) {
          retryCount.current++;
          setTimeout(loadDashboard, 2000);
        } else {
          setError(res.message || "Failed to load dashboard");
          setLoading(false);
        }
      }
    } catch (e) {
      if (!data && retryCount.current < 3) {
        retryCount.current++;
        setTimeout(loadDashboard, 2000);
      } else {
        setError("Could not connect to server");
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (username) {
      loadDashboard();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [username]);

  if (loading) {
    return (
      <div className="parent-loading">
        <div className="loading-spinner"></div>
        <p>{retryCount.current > 0 ? `Retrying connection (${retryCount.current}/3)...` : "Loading dashboard..."}</p>
      </div>
    );
  }

  if (error) {
    return <div className="parent-error">{error}</div>;
  }

  return (
    <div className="parent-page" id="parent-dashboard">
      {/* Welcome heading */}
      <div className="parent-page-header">
        <h2>Welcome, {data.parent_name}</h2>
        <p className="parent-page-subtitle">Here's an overview of your children's transport status</p>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
          📅 {simDT.date} &nbsp;·&nbsp; 🕐 {simDT.time}
        </p>
      </div>

      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <Users size={24} />
          </span>
          <div className="summary-body">
            <span className="summary-label">Total Children</span>
            <span className="summary-value">{data.total_children}</span>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <CheckCircle size={24} />
          </span>
          <div className="summary-body">
            <span className="summary-label">Active</span>
            <span className="summary-value">{data.active_children}</span>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon" style={{ background: data.rerouted_buses > 0 ? "#fee2e2" : "#f0fdf4", color: data.rerouted_buses > 0 ? "#dc2626" : "#16a34a" }}>
            {data.rerouted_buses > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </span>
          <div className="summary-body">
            <span className="summary-label">Rerouted Buses</span>
            <span className="summary-value">{data.rerouted_buses}</span>
          </div>
        </div>
      </div>

      {/* Children overview cards */}
      <h3 className="section-title">Children Overview</h3>
      <div className="children-grid">
        {data.children.map((child) => {
          const isNormal = child.bus_status === "Active" || child.bus_status === "Normal";
          return (
            <div
              className={`child-card ${isNormal ? "" : "child-card--alert"}`}
              key={child.id}
            >
              {/* Status indicator */}
              <span className={`status-dot ${isNormal ? "status-dot--green" : "status-dot--red"}`}></span>

              <div className="child-card-header">
                <h4>{child.full_name}</h4>
                <span className={`status-badge ${isNormal ? "badge--green" : "badge--red"}`}>
                  {isNormal ? "Normal" : child.bus_status}
                </span>
              </div>

              <div className="child-card-details">
                <div className="detail-row">
                  <span className="detail-label">Bus</span>
                  <span className="detail-value">{child.bus_number}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Route</span>
                  <span className="detail-value">{child.route_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Stop</span>
                  <span className="detail-value">{child.stop_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Dept</span>
                  <span className="detail-value">{child.department} — {child.semester}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Bus Tracking Map */}
      <div style={{ marginTop: '30px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Live Bus Tracking</h3>
          {data.children.length > 1 && (
            <select 
              value={selectedChildId} 
              onChange={e => setSelectedChildId(parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
              {data.children.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          )}
        </div>
        
        <button 
          onClick={() => setShowMap(!showMap)}
          className="neon-button"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 'bold', boxShadow: 'var(--glow-primary)', transition: 'all 0.3s ease' }}
        >
          <MapIcon size={20} />
          {showMap ? "Hide Map & Location" : "View Map & Assigned Location"}
        </button>
      </div>

      {showMap && (
        <div className="admin-map-card" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-glass)', width: '100%', boxSizing: 'border-box', overflow: 'hidden', boxShadow: 'var(--glass-shadow-lg)' }}>
          {selectedChildId ? (
            (() => {
              const childData = data.children.find(c => c.id === selectedChildId);
              const stops = childData?.stops || [];
              const validStops = stops.filter(s => s.lat !== 0 || s.lng !== 0);
              const boardingStop = validStops.find(s => s.isBoarding);
              
              return validStops.length > 0 ? (
                <MapView 
                  key={selectedChildId}
                  stops={validStops} 
                  height="500px"
                  center={boardingStop ? [boardingStop.lat, boardingStop.lng] : [validStops[0].lat, validStops[0].lng]}
                  zoom={parseInt(data.map_config?.default_zoom || '13')}
                  tileUrl={data.map_config?.osm_tile_url}
                />
              ) : (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px', color: 'var(--text-muted)' }}>
                    <MapIcon size={48} />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: '0 0 8px' }}>Map Data Unavailable</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No GPS coordinates found for <strong>{childData?.full_name}</strong>'s route.</p>
                </div>
              );
            })()
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
               No children linked to this account for tracking.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
