// frontend/src/pages/admin/Dashboard.jsx
// ----------------------------------------
// Admin Dashboard — Command Centre
// Search bar, stats, map placeholder, ML alerts.
// ----------------------------------------

import { useEffect, useState, useRef } from "react";
import {
  fetchAdminStats,
  adminSearch,
  fetchAdminBuses,
  fetchAdminBusStops
} from "../../api";
import { useSimulatedDateTime } from "../../hooks/useSimulatedDateTime";
import { 
  LayoutDashboard, 
  Bus, 
  Users, 
  Zap, 
  Search, 
  GraduationCap, 
  User, 
  Map as MapIcon, 
  Bot, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X,
  Clock
} from "lucide-react";
import MapView from "../../components/MapView";
import "./Dashboard.css";



function Dashboard() {
  // ─── State ───
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const simDT = useSimulatedDateTime();

  // Map State
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [mapStops, setMapStops] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  const adminRetryCount = useRef(0);

  // ─── Data Fetching ───
  useEffect(() => {
    loadDashboard();
    loadBuses();
  }, []);

  async function loadBuses() {
    const res = await fetchAdminBuses();
    if (res.success && res.data) {
      setBuses(res.data);
      if (res.data.length > 0) {
        // Try selecting Bus 1 by default, else first bus
        const defaultBus = res.data.find(b => b.id === 1) || res.data[0];
        setSelectedBusId(defaultBus.id);
      }
    }
  }

  useEffect(() => {
    async function loadMapStops() {
      if (!selectedBusId) return;
      const res = await fetchAdminBusStops(selectedBusId);
      if (res.success) {
        setMapStops(res.data || []);
      }
    }
    loadMapStops();
  }, [selectedBusId]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const statsRes = await fetchAdminStats();
      if (statsRes.success) {
        setStats(statsRes.stats);
        adminRetryCount.current = 0;
        setLoading(false);
      } else {
        if (!stats && adminRetryCount.current < 3) {
          adminRetryCount.current++;
          setTimeout(loadDashboard, 2000);
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      if (!stats && adminRetryCount.current < 3) {
        adminRetryCount.current++;
        setTimeout(loadDashboard, 2000);
      } else {
        setLoading(false);
      }
    }
  }

  // ─── Search Handler ───
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const res = await adminSearch(searchQuery);
      if (res.success) {
        setSearchResults(res.results);
        setSearchOpen(true);
      }
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  // Close search results on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Count total search results
  const totalResults = searchResults
    ? searchResults.students.length + searchResults.buses.length + searchResults.drivers.length
    : 0;

  // ─── Stat cards config ───
  const statCards = stats ? [
    { label: "Total Students",  value: stats.totalStudents,  icon: <GraduationCap size={28} />, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { label: "Active Buses",    value: stats.activeBuses,    icon: <Bus size={28} />, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { label: "Total Drivers",   value: stats.totalDrivers,   icon: <User size={28} />, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { label: "Optimization",    value: "94%",                icon: <Zap size={28} />, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  ] : [];

  // ─── Loading ───
  if (loading) {
    return (
      <div className="dashboard-loading" id="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" id="admin-dashboard-page">

      {/* ── Top Bar ── */}
      <div className="dash-topbar" id="dash-topbar">
        {/* Search */}
        <div className="dash-search-wrapper" ref={searchRef}>
          <span className="dash-search-icon">
            <Search size={20} />
          </span>
          <input
            id="global-search"
            type="text"
            className="dash-search-input"
            placeholder="Search students, buses, drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setSearchOpen(true)}
          />

          {/* ── Search Results Popup ── */}
          {searchOpen && searchResults && (
            <div className="search-results-section" id="search-results">
              <div className="search-results-header">
                <h3>Search Results</h3>
                <span className="search-results-count">{totalResults} result{totalResults !== 1 ? "s" : ""} found</span>
                <button className="search-close-btn" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                  <X size={16} style={{ marginRight: '4px' }} /> Clear
                </button>
              </div>

              {totalResults === 0 && (
                <div className="search-no-results">
                  <span className="search-no-icon">
                    <Search size={40} />
                  </span>
                  <p>No results found for "<strong>{searchQuery}</strong>"</p>
                  <p className="search-no-hint">Try a different name, admission number, or registration number</p>
                </div>
              )}

              {/* Student Cards */}
              {searchResults.students.length > 0 && (
                <div className="search-card-group">
                  <h4 className="search-card-group-title">
                    <GraduationCap size={18} style={{ marginRight: '8px' }} /> Students
                  </h4>
                  <div className="search-cards-grid">
                    {searchResults.students.map((s) => (
                      <div className="search-detail-card student-card" key={`s-${s.id}`}>
                        <div className="sdc-avatar">
                          <User size={20} />
                        </div>
                        <div className="sdc-info">
                          <h4 className="sdc-name">{s.full_name}</h4>
                          <div className="sdc-details">
                            <span className="sdc-tag"><strong>Adm:</strong> {s.adm_number}</span>
                            <span className="sdc-tag"><strong>Dept:</strong> {s.department}</span>
                            <span className="sdc-tag"><strong>Sem:</strong> {s.semester}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bus Cards */}
              {searchResults.buses.length > 0 && (
                <div className="search-card-group">
                  <h4 className="search-card-group-title">
                    <Bus size={18} style={{ marginRight: '8px' }} /> Buses
                  </h4>
                  <div className="search-cards-grid">
                    {searchResults.buses.map((b) => (
                      <div className="search-detail-card bus-card" key={`b-${b.id}`}>
                        <div className="sdc-avatar">
                          <Bus size={20} />
                        </div>
                        <div className="sdc-info">
                          <h4 className="sdc-name">{b.registration_number}</h4>
                          <div className="sdc-details">
                            <span className="sdc-tag"><strong>Capacity:</strong> {b.capacity}</span>
                            <span className={`sdc-status status-badge status-${(b.status || 'idle').toLowerCase()}`}>{b.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver Cards */}
              {searchResults.drivers.length > 0 && (
                <div className="search-card-group">
                  <h4 className="search-card-group-title">
                    <User size={18} style={{ marginRight: '8px' }} /> Drivers
                  </h4>
                  <div className="search-cards-grid">
                    {searchResults.drivers.map((d) => (
                      <div className="search-detail-card driver-card" key={`d-${d.id}`}>
                        <div className="sdc-avatar">
                          <User size={20} />
                        </div>
                        <div className="sdc-info">
                          <h4 className="sdc-name">{d.full_name}</h4>
                          <div className="sdc-details">
                            <span className="sdc-tag"><strong>Phone:</strong> {d.phone_number || '—'}</span>
                            <span className="sdc-tag"><strong>License:</strong> {d.license_number || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Welcome */}
        <div className="dash-welcome" id="dash-welcome">
          <span className="dash-welcome-text">Welcome, Admin</span>
          <span className="dash-welcome-date">{simDT.formatted}</span>
        </div>
      </div>

      {/* ── Command Centre ── */}
      <div className="command-centre" id="command-centre">
        <h2 className="section-title">Command Centre</h2>
        <div className="stats-grid">
          {statCards.map((card, i) => (
            <div className="stat-card" key={i} id={`stat-card-${i}`} style={{ background: card.gradient }}>
              <div className="stat-card-icon">{card.icon}</div>
              <div className="stat-card-info">
                <span className="stat-card-label">{card.label}</span>
                <span className="stat-card-value">{card.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Map + ML Alerts Row ── */}
      <div className="map-alerts-row" id="map-alerts-row">
        {/* Live Admin Map Widget */}
        <div className="admin-map-card" id="admin-map-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapIcon size={24} /> Live Bus Tracking
            </h3>
            <select 
              value={selectedBusId} 
              onChange={e => setSelectedBusId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
                fontFamily: 'inherit'
              }}
            >
              {buses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.registration_number} {b.routes ? `(${b.routes.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', minHeight: '500px', width: '100%', border: '1px solid #f1f5f9' }}>
            {selectedBusId && mapStops.length > 0 ? (
              <MapView 
                key={selectedBusId}
                stops={mapStops.filter(s => s.lat !== 0 && s.lng !== 0)} 
                center={[mapStops[0].lat, mapStops[0].lng]}
                height="500px" 
              />
            ) : selectedBusId ? (
              <div style={{ display: 'flex', height: '500px', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                    <Clock size={40} className="spin-slow" />
                  </div>
                  <p>Loading route data for this bus...</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', height: '500px', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                No buses available for tracking
              </div>
            )}
          </div>
        </div>

        {/* ML Alerts Placeholder */}
        <div className="ml-alerts-panel" id="ml-alerts-panel">
          <div className="ml-alerts-header">
            <h3><Bot size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> AI Alerts</h3>
            <span className="ml-badge">ML Engine</span>
          </div>
          <div className="ml-alerts-list">
            <div className="ml-alert-item ml-alert-warning">
              <span className="ml-pulse"></span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-warning, #f59e0b)', flexShrink: 0 }} />
                <div>
                  <p className="ml-alert-title">Route 3 Congestion Predicted</p>
                  <p className="ml-alert-desc">High traffic expected at 8:15 AM on Mevarom route</p>
                </div>
              </div>
            </div>
            <div className="ml-alert-item ml-alert-info">
              <span className="ml-pulse pulse-blue"></span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Info size={20} style={{ color: 'var(--color-info, #3b82f6)', flexShrink: 0 }} />
                <div>
                  <p className="ml-alert-title">Optimization Suggestion</p>
                  <p className="ml-alert-desc">Rerouting Bus 5 can save 12 mins avg travel time</p>
                </div>
              </div>
            </div>
            <div className="ml-alert-item ml-alert-success">
              <span className="ml-pulse pulse-green"></span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <CheckCircle size={20} style={{ color: 'var(--color-success, #10b981)', flexShrink: 0 }} />
                <div>
                  <p className="ml-alert-title">All Routes On-Time</p>
                  <p className="ml-alert-desc">Morning shift completed with 98% punctuality</p>
                </div>
              </div>
            </div>
          </div>
          <div className="ml-coming-soon">
            <span>Full ML pipeline coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
