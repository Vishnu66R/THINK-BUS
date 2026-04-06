// frontend/src/pages/student/Dashboard.jsx
// -------------------------------------------
// Student Dashboard — shows assigned bus, route, stop, and status.
// Includes auto-refresh polling every 30 seconds for live status.
// -------------------------------------------

import { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, 
  Bus, 
  MapPin, 
  Route, 
  CheckCircle, 
  RefreshCw, 
  Map as MapIcon, 
  User 
} from "lucide-react";
import { fetchStudentDashboard } from "../../api";
import { useSimulatedDateTime } from "../../hooks/useSimulatedDateTime";
import MapView from "../../components/MapView";
import "./StudentDashboard.css";

function Dashboard() {
  const [busInfo, setBusInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const retryCount = useRef(0);
  const simDT = useSimulatedDateTime();

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  // Fetch bus status — runs on mount and every 30 seconds
  async function fetchBusStatus() {
    if (!username) return;
    try {
      const res = await fetchStudentDashboard(username);
      if (res.success) {
        setBusInfo(res.data);
        setError("");
        retryCount.current = 0;
        setLoading(false);
      } else {
        if (!busInfo && retryCount.current < 3) {
          retryCount.current++;
          setTimeout(fetchBusStatus, 2000);
        } else {
          setError(res.message || "Failed to load dashboard data");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      if (!busInfo && retryCount.current < 3) {
        retryCount.current++;
        setTimeout(fetchBusStatus, 2000);
      } else {
        setError("Error connecting to server");
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchBusStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBusStatus, 30000);
    return () => clearInterval(interval);
  }, [username]);

  if (loading) {
    return (
      <div className="student-loading">
        <div className="student-spinner"></div>
        <p>{retryCount.current > 0 ? `Retrying connection (${retryCount.current}/3)...` : "Loading your transport details..."}</p>
      </div>
    );
  }

  if (error || !busInfo) {
    return (
      <div className="student-loading">
        <p style={{ color: "#ef4444", fontWeight: "bold" }}>{error || "Profile not linked"}</p>
      </div>
    );
  }

  const isChanged = busInfo.status === "Rerouted" || busInfo.status === "Changed";

  return (
    <div className="student-dashboard" id="student-dashboard-page">
      {/* Page Header */}
      <div className="student-dash-header">
        <h2 className="student-dash-title">Dashboard</h2>
        <p className="student-dash-desc">
          Welcome, <strong>{busInfo.student_name}</strong>! Here's your transport info.
        </p>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
          📅 {simDT.date} &nbsp;·&nbsp; 🕐 {simDT.time}
        </p>
      </div>

      {/* Alert Banner — only shows when bus is rerouted */}
      {isChanged && busInfo.alert_message && (
        <div className="student-alert-banner" id="reroute-alert">
          <span className="alert-icon">
            <AlertTriangle size={20} />
          </span>
          <span>{busInfo.alert_message}</span>
        </div>
      )}

      {/* Status Cards */}
      <div className="student-cards-grid">
        <div className="student-card">
          <div className="student-card-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            <Bus size={24} />
          </div>
          <div className="student-card-body">
            <span className="student-card-label">Assigned Bus</span>
            <span className="student-card-value">{busInfo.bus_number}</span>
            {busInfo.bus_id && <span className="student-card-sub">Bus #{busInfo.bus_id}</span>}
          </div>
        </div>

        <div className="student-card">
          <div className="student-card-icon" style={{ background: "#dcfce7", color: "#166534" }}>
            <Route size={24} />
          </div>
          <div className="student-card-body">
            <span className="student-card-label">Route</span>
            <span className="student-card-value">{busInfo.route_name}</span>
          </div>
        </div>

        <div className="student-card">
          <div className="student-card-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
            <MapPin size={24} />
          </div>
          <div className="student-card-body">
            <span className="student-card-label">Boarding Stop</span>
            <span className="student-card-value">{busInfo.stop_name}</span>
          </div>
        </div>

        <div className={`student-card ${isChanged ? "status-changed" : ""}`}>
          <div
            className="student-card-icon"
            style={{
              background: isChanged ? "#fee2e2" : "#dcfce7",
              color: isChanged ? "#991b1b" : "#166534",
            }}
          >
            {isChanged ? <RefreshCw size={24} /> : <CheckCircle size={24} />}
          </div>
          <div className="student-card-body">
            <span className="student-card-label">Status</span>
            <span className={`student-card-value ${isChanged ? "text-red" : "text-green"}`}>
              {busInfo.status}
            </span>
          </div>
        </div>
      </div>

      {/* Details Row */}
      <div className="student-details-row">
        {/* Driver Info */}
        <div className="student-detail-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <User size={20} style={{ color: '#64748b' }} />
            <h3 className="detail-card-title" style={{ margin: 0 }}>Driver Details</h3>
          </div>
          <div className="detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">{busInfo.driver_name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Est. Arrival</span>
            <span className="detail-value">{busInfo.estimated_arrival}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Updated</span>
            <span className="detail-value">{busInfo.last_updated}</span>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="student-detail-card">
          <h3 className="detail-card-title">Today's Schedule</h3>
          <div className="schedule-timeline">
            {[
              { time: "7:30 AM", event: "Bus departs from Route Start", done: true },
              { time: "7:40 AM", event: `${busInfo.stop_name} (Your Stop)`, done: true, highlight: true },
              { time: "8:00 AM", event: "Approaching College Area", done: false },
              { time: "8:15 AM", event: "Arrives at College Campus", done: false },
            ].map((item, i) => (
              <div className={`schedule-item ${item.done ? "done" : ""} ${item.highlight ? "highlight" : ""}`} key={i}>
                <span className="schedule-dot"></span>
                <div className="schedule-info">
                  <span className="schedule-time">{item.time}</span>
                  <span className="schedule-event">{item.event}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div style={{ marginTop: '30px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 className="detail-card-title" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Live Bus Tracking</h3>
        
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
        busInfo.stops && busInfo.stops.length > 0 ? (
          <div className="student-map-container" style={{ marginTop: '16px', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--glass-shadow-lg)', border: '1px solid var(--border-glass)' }}>
            <MapView 
              stops={busInfo.stops.filter(s => s.lat !== 0 || s.lng !== 0)} 
              routeId={busInfo.route_id}
              center={
                busInfo.stops.find(s => s.isBoarding && (s.lat !== 0 || s.lng !== 0)) 
                ? [busInfo.stops.find(s => s.isBoarding).lat, busInfo.stops.find(s => s.isBoarding).lng]
                : (busInfo.stops.find(s => s.lat !== 0 || s.lng !== 0) 
                   ? [busInfo.stops.find(s => s.lat !== 0 || s.lng !== 0).lat, busInfo.stops.find(s => s.lat !== 0 || s.lng !== 0).lng]
                   : [8.8932, 76.6141])
              }
              zoom={parseInt(busInfo.map_config?.default_zoom || '13')}
              tileUrl={busInfo.map_config?.osm_tile_url}
            />
          </div>
        ) : (
          <div className="student-map-widget" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '40px',
            textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'var(--glass-shadow)', backdropFilter: 'var(--glass-blur)'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(var(--border-subtle) 2px, transparent 2px)', backgroundSize: '20px 20px', opacity: 0.5, zIndex: 1 }}></div>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px', color: 'var(--text-muted)' }}>
                <MapIcon size={48} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: '0 0 8px' }}>Map Data Unavailable</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>No stop coordinates found for route <strong>{busInfo.route_name}</strong>.</p>
            </div>
          </div>
        )
      )}

    </div>
  );
}

export default Dashboard;
