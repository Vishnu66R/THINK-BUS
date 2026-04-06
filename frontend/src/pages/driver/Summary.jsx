// frontend/src/pages/driver/Summary.jsx
// ----------------------------------------
// Trip summary showing stops covered, students,
// route duration, and bus capacity.
// ----------------------------------------

import { useState, useEffect } from "react";
import { 
  Route, 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Map as MapIcon, 
  ClipboardList 
} from "lucide-react";
import { fetchDriverSummary } from "../../api";
import MapView from "../../components/MapView";
import "./DriverPages.css";

function Summary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchDriverSummary(username);
        if (res.success) {
          setSummary({ ...res.summary, map_config: res.map_config });
        } else {
          setError(res.message || "Failed to load summary");
        }
      } catch {
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    }
    if (username) load();
  }, [username]);

  if (loading) {
    return (
      <div className="driver-loading">
        <div className="loading-spinner"></div>
        <p>Loading summary…</p>
      </div>
    );
  }
  if (error) return <div className="driver-error">{error}</div>;
  if (!summary) {
    return (
      <div className="driver-page">
        <div className="empty-state">
          <span className="empty-icon">
            <ClipboardList size={48} />
          </span>
          <p>No trip data available.</p>
        </div>
      </div>
    );
  }

  // Calculate capacity usage percentage
  const capacityPct = Math.round((summary.total_students / summary.bus_capacity) * 100);

  return (
    <div className="driver-page" id="driver-summary">
      <div className="driver-page-header">
        <h2>Trip Summary</h2>
        <p className="driver-page-subtitle">Overview of your current trip</p>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-stat-card">
          <span className="stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <Route size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Route</span>
            <span className="stat-value">{summary.route_name}</span>
          </div>
        </div>

        <div className="summary-stat-card">
          <span className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <Bus size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Bus Number</span>
            <span className="stat-value">{summary.bus_number}</span>
          </div>
        </div>

        <div className="summary-stat-card">
          <span className="stat-icon" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
            <MapPin size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Total Stops</span>
            <span className="stat-value">{summary.total_stops}</span>
          </div>
        </div>

        <div className="summary-stat-card">
          <span className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Users size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Students on Bus</span>
            <span className="stat-value">{summary.total_students}</span>
          </div>
        </div>

        <div className="summary-stat-card">
          <span className="stat-icon" style={{ background: "#fce4ec", color: "#e91e63" }}>
            <Clock size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Route Duration</span>
            <span className="stat-value">{summary.route_duration_mins} min</span>
          </div>
        </div>

        <div className="summary-stat-card">
          <span className="stat-icon" style={{
            background: summary.bus_status === "Active" ? "#dcfce7" : "#fee2e2",
            color: summary.bus_status === "Active" ? "#16a34a" : "#dc2626"
          }}>
            {summary.bus_status === "Active" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          </span>
          <div className="stat-body">
            <span className="stat-label">Bus Status</span>
            <span className="stat-value">{summary.bus_status}</span>
          </div>
        </div>
      </div>

      {/* Capacity bar */}
      <h3 className="section-title">Bus Capacity Usage</h3>
      <div className="capacity-card">
        <div className="capacity-header">
          <span>{summary.total_students} / {summary.bus_capacity} seats</span>
          <span className="capacity-pct">{capacityPct}%</span>
        </div>
        <div className="capacity-bar">
          <div
            className="capacity-fill"
            style={{
              width: `${capacityPct}%`,
              background: capacityPct > 90 ? "#dc2626" : capacityPct > 70 ? "#d97706" : "#16a34a",
            }}
          ></div>
        </div>
      </div>
      {/* Live Route Map */}
      <h3 className="section-title" style={{ marginTop: '32px' }}>Your Assigned Route</h3>
      <div className="admin-map-card" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        {summary.stops && summary.stops.length > 0 ? (
          <MapView 
            stops={summary.stops.filter(s => s.lat !== 0 || s.lng !== 0)} 
            routeId={summary?.route_id}
            height="500px"
            center={summary.stops[0] ? [summary.stops[0].lat, summary.stops[0].lng] : [8.8932, 76.6141]}
            zoom={parseInt(summary.map_config?.default_zoom || '13')}
            tileUrl={summary.map_config?.osm_tile_url}
          />
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px', color: '#94a3b8' }}>
              <MapIcon size={48} />
            </div>
            <h3 style={{ fontSize: '1.3rem', color: '#1e293b', margin: '0 0 8px' }}>Map Unavailable</h3>
            <p style={{ margin: 0 }}>No GPS coordinates found for route <strong>{summary.route_name}</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Summary;
