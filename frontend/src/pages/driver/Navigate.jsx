// frontend/src/pages/driver/Navigate.jsx
// ----------------------------------------
// Step-by-step navigation view showing route progression.
// Driver can mark stops as reached.
// ----------------------------------------

import { useState, useEffect } from "react";
import { 
  Navigation, 
  Map as MapIcon, 
  CheckCircle, 
  MapPin, 
  Circle,
  AlertTriangle 
} from "lucide-react";
import { fetchDriverNavigation } from "../../api";
import MapView from "../../components/MapView";
import "./DriverPages.css";

function Navigate() {
  const [data, setData] = useState(null);
  const [currentStopIdx, setCurrentStopIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchDriverNavigation(username);
        if (res.success) {
          setData(res);
        } else {
          setError(res.message || "Failed to load navigation");
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
        <p>Loading navigation…</p>
      </div>
    );
  }
  if (error) return <div className="driver-error">{error}</div>;
  if (!data?.route || !data?.stops?.length) {
    return (
      <div className="driver-page">
        <div className="empty-state">
          <span className="empty-icon">
            <Navigation size={48} />
          </span>
          <p>No route data available for navigation.</p>
        </div>
      </div>
    );
  }

  if (data?.bus_status?.includes("Breakdown")) {
    return (
      <div className="driver-page" id="driver-navigate">
        <div className="empty-state" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          <span className="empty-icon" style={{ color: "#ef4444", background: "#fee2e2" }}>
            <AlertTriangle size={56} />
          </span>
          <h2 style={{margin: "15px 0 5px", fontSize: "24px"}}>Navigation Unnecessary</h2>
          <p style={{fontSize: "15px"}}>Your designated vehicle ({data.bus_number}) has been mathematically marked out of service due to diagnostic ML breakdown predictions.</p>
        </div>
      </div>
    );
  }

  const stops = data.stops;
  const currentStop = stops[currentStopIdx];
  const nextStop = stops[currentStopIdx + 1] || null;
  const progress = Math.round(((currentStopIdx + 1) / stops.length) * 100);

  // Move to next stop
  function handleNextStop() {
    if (currentStopIdx < stops.length - 1) {
      setCurrentStopIdx(currentStopIdx + 1);
    }
  }

  // Move to previous stop
  function handlePrevStop() {
    if (currentStopIdx > 0) {
      setCurrentStopIdx(currentStopIdx - 1);
    }
  }

  return (
    <div className="driver-page" id="driver-navigate">
      <div className="driver-page-header">
        <h2>Navigation</h2>
        <p className="driver-page-subtitle">{data.route.name} — Step-by-step</p>
      </div>

      {/* Progress bar */}
      <div className="nav-progress-bar">
        <div className="nav-progress-fill" style={{ width: `${progress}%` }}></div>
        <span className="nav-progress-text">{progress}% Complete</span>
      </div>

      {/* Current stop highlight */}
      <div className="nav-current-card">
        <div className="nav-current-label">CURRENT STOP</div>
        <h3 className="nav-current-name">{currentStop.name}</h3>
        <span className="nav-current-meta">Stop {currentStopIdx + 1} of {stops.length} · {currentStop.time_from_start} min</span>
      </div>

      {/* Next stop */}
      {nextStop && (
        <div className="nav-next-card">
          <span className="nav-next-label">NEXT →</span>
          <span className="nav-next-name">{nextStop.name}</span>
          <span className="nav-next-time">{nextStop.time_from_start - currentStop.time_from_start} min away</span>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="nav-buttons">
        <button
          className="nav-btn nav-btn--prev"
          onClick={handlePrevStop}
          disabled={currentStopIdx === 0}
        >
           Previous
        </button>
        <button
          className="nav-btn nav-btn--next"
          onClick={handleNextStop}
          disabled={currentStopIdx >= stops.length - 1}
        >
          {currentStopIdx >= stops.length - 1 ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Trip Complete <CheckCircle size={18} />
            </span>
          ) : "Next Stop →"}
        </button>
      </div>

      {/* All stops mini list */}
      <h3 className="section-title">All Stops</h3>
      <div className="nav-stops-list">
        {stops.map((stop, idx) => (
          <div
            className={`nav-stop-item ${
              idx < currentStopIdx ? "nav-stop--done" :
              idx === currentStopIdx ? "nav-stop--current" : "nav-stop--upcoming"
            }`}
            key={stop.id}
          >
            <span className="nav-stop-indicator">
              {idx < currentStopIdx ? <CheckCircle size={18} style={{ color: '#10b981' }} /> : idx === currentStopIdx ? <MapPin size={18} style={{ color: '#3b82f6' }} /> : <Circle size={18} style={{ color: '#cbd5e1' }} />}
            </span>
            <span className="nav-stop-name">{stop.name}</span>
            <span className="nav-stop-time">{stop.time_from_start} min</span>
          </div>
        ))}
      </div>

      {/* Live Navigation Map */}
      <h3 className="section-title" style={{ marginTop: '30px', fontSize: '1.2rem', color: '#1e293b' }}>Live Navigation Map</h3>
      <div className="admin-map-card" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        {stops && stops.length > 0 ? (
          <MapView 
            stops={stops.filter(s => s.lat !== 0 || s.lng !== 0)} 
            routeId={data.route?.id}
            height="500px"
            center={stops[currentStopIdx] ? [stops[currentStopIdx].lat, stops[currentStopIdx].lng] : [8.8932, 76.6141]}
            zoom={parseInt(data.map_config?.default_zoom || '13')}
            tileUrl={data.map_config?.osm_tile_url}
          />
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px', color: '#94a3b8' }}>
              <MapIcon size={48} />
            </div>
            <h3 style={{ fontSize: '1.3rem', color: '#1e293b', margin: '0 0 8px' }}>Map Unavailable</h3>
            <p style={{ margin: 0 }}>No GPS coordinates found for this route.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navigate;
