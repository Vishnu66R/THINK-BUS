// frontend/src/pages/admin/RouteTraffic.jsx
// -------------------------------------------
// Routes & Traffic Management
// Displays ongoing routes, their stops, and full CRUD via modal.
// -------------------------------------------

import { useState, useEffect } from "react";
import { 
  Route, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  AlertTriangle, 
  Globe, 
  Clock, 
  X,
  CheckCircle,
  XCircle,
  Hash
} from "lucide-react";
import {
  fetchAdminRoutesDetailed,
  createAdminRoute,
  updateAdminRoute,
  deleteAdminRoute,
  fetchAdminBuses,
  fetchAdminBusStops
} from "../../api";
import MapView from "../../components/MapView";
import "./RouteTraffic.css";
// We reuse some modal/toast CSS classes from FleetManager.css, so we import it strictly for those generic components if they aren't globally defined.
// Actually, I'll just rely on FleetManager's global classes for Toast/Modal since they are simple.
import "./FleetManager.css";

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fm-toast ${type}`}>
      {type === "success" ? <CheckCircle size={18} style={{ marginRight: '8px' }} /> : <XCircle size={18} style={{ marginRight: '8px' }} />}
      <span>{message}</span>
    </div>
  );
}

function RouteTraffic() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    start_point: "",
    end_point: "",
    estimated_duration_minutes: 60,
    stops: []
  });
  const [saving, setSaving] = useState(false);

  // Confirm Delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Map Tracking State
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [mapStops, setMapStops] = useState([]);

  useEffect(() => {
    loadRoutes();
    loadBuses();
  }, []);

  async function loadBuses() {
    const res = await fetchAdminBuses();
    if (res.success && res.data) {
      setBuses(res.data);
      // Default to global track
      setSelectedBusId('all');
    }
  }

  function handleBusChange(newBusId) {
    if (newBusId === 'all') {
      setSelectedBusId('all');
      setMapStops([]);
    } else {
      const parsedId = parseInt(newBusId, 10);
      setMapStops([]); // Clear old stops immediately to prevent stale map
      setSelectedBusId(parsedId);
    }
  }

  useEffect(() => {
    async function loadMapStops() {
      if (!selectedBusId || selectedBusId === 'all') return;
      const res = await fetchAdminBusStops(selectedBusId);
      if (res.success) {
        setMapStops(res.data || []);
      }
    }
    loadMapStops();
  }, [selectedBusId]);

  async function loadRoutes() {
    setLoading(true);
    try {
      const res = await fetchAdminRoutesDetailed();
      if (res.success) setRoutes(res.data || []);
      else showToast(res.message, "error");
    } catch (err) {
      console.error("Failed to load routes", err);
      showToast("Error connecting to database", "error");
    }
    setLoading(false);
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  function toggleExpand(id) {
    setExpandedRouteId(prev => (prev === id ? null : id));
  }

  // ─── Modal & Form Handlers ───
  function handleOpenAdd() {
    setModalMode("add");
    setFormData({
      id: null,
      name: "",
      start_point: "",
      end_point: "",
      estimated_duration_minutes: 60,
      stops: [
        { stop_name: "", time_from_start_mins: 0 }
      ]
    });
    setModalOpen(true);
  }

  function handleOpenEdit(r, e) {
    e.stopPropagation(); // prevent accordion toggle
    setModalMode("edit");
    
    // Convert route_stops into form state 'stops'
    const routeStops = r.route_stops ? r.route_stops.map(st => ({
      stop_name: st.stop_name,
      time_from_start_mins: st.time_from_start_mins
    })) : [];

    setFormData({
      id: r.id,
      name: r.name,
      start_point: r.start_point,
      end_point: r.end_point,
      estimated_duration_minutes: r.estimated_duration_minutes,
      stops: routeStops
    });
    setModalOpen(true);
  }

  function handleAddStopField() {
    const lastStop = formData.stops[formData.stops.length - 1];
    const newTime = lastStop ? parseInt(lastStop.time_from_start_mins, 10) + 10 : 0;
    
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, { stop_name: "", time_from_start_mins: newTime }]
    }));
  }

  function handleRemoveStopField(index) {
    const newStops = [...formData.stops];
    newStops.splice(index, 1);
    setFormData(prev => ({ ...prev, stops: newStops }));
  }

  function handleStopChange(index, field, value) {
    const newStops = [...formData.stops];
    // if field is time_from_start_mins, parse as int, otherwise string
    newStops[index][field] = field === 'time_from_start_mins' ? (value ? parseInt(value, 10) : 0) : value;
    setFormData(prev => ({ ...prev, stops: newStops }));
  }

  async function handleSaveRoute(e) {
    e.preventDefault();
    if (!formData.name || !formData.start_point || !formData.end_point) {
      showToast("Please fill all required route fields", "error");
      return;
    }
    
    // Prevent empty stop names
    for (let s of formData.stops) {
      if (!s.stop_name.trim()) {
        showToast("Stop names cannot be empty", "error");
        return;
      }
    }

    setSaving(true);
    try {
      if (modalMode === "add") {
        const res = await createAdminRoute(formData);
        if (res.success) {
          showToast("Route created successfully");
          loadRoutes();
          setModalOpen(false);
        } else {
          showToast(res.message || "Failed to create", "error");
        }
      } else {
        const res = await updateAdminRoute(formData.id, formData);
        if (res.success) {
          showToast("Route updated completely");
          loadRoutes();
          setModalOpen(false);
        } else {
          showToast(res.message || "Failed to edit", "error");
        }
      }
    } catch (err) {
      console.error("Save error", err);
      showToast("Unexpected error occurred", "error");
    }
    setSaving(false);
  }

  // ─── Delete Handlers ───
  function handleRequestDelete(r, e) {
    e.stopPropagation();
    setRouteToDelete(r);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      const res = await deleteAdminRoute(routeToDelete.id);
      if (res.success) {
        showToast("Route and all its stops deleted");
        loadRoutes();
        setConfirmOpen(false);
      } else {
        showToast(res.message || "Failed to delete", "error");
      }
    } catch (err) {
      console.error("Delete error", err);
      showToast("Error deleting route", "error");
    }
    setDeleting(false);
  }

  return (
    <div className="route-traffic-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Live Active Map Widget */}
      <div className="rt-map-widget" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'stretch', justifyContent: 'flex-start', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'white', zIndex: 1 }}>
            <Globe size={20} /> Global Tracking & Traffic
          </h3>
          <select 
            value={selectedBusId} 
            onChange={e => handleBusChange(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#333',
              zIndex: 1,
              fontWeight: '600'
            }}
          >
            <option value="all">All Buses (Global Track)</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>
                {b.registration_number} {b.routes ? `(${b.routes.name})` : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', minHeight: '500px', zIndex: 1, width: '100%', border: '1px solid rgba(255,255,255,0.2)' }}>
          {selectedBusId === 'all' ? (
            <MapView 
              key="global-all"
              multiRoutes={buses.filter(b => b.route_id).map(b => {
                const rt = routes.find(r => r.id === b.route_id);
                if (!rt || !rt.stops || rt.stops.length === 0) return null;
                const mappedStops = rt.stops.map(s => ({
                  id: s.id, name: s.stop_name, lat: parseFloat(s.latitude || 0), lng: parseFloat(s.longitude || 0), isBoarding: false
                })).filter(s => s.lat !== 0 && s.lng !== 0);
                return mappedStops.length > 0 ? { routeId: b.route_id, busId: b.id, stops: mappedStops } : null;
              }).filter(Boolean)}
              center={[8.8932, 76.6141]}
              height="500px" 
            />
          ) : selectedBusId && mapStops.length > 0 ? (
            <MapView 
              key={selectedBusId}
              stops={mapStops.filter(s => s.lat !== 0 && s.lng !== 0)} 
              routeId={buses.find(b => b.id == selectedBusId)?.route_id}
              busId={selectedBusId}
              center={[mapStops[0].lat, mapStops[0].lng]}
              height="500px" 
            />
          ) : selectedBusId ? (
            <div style={{ display: 'flex', height: '500px', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                  <Clock size={40} className="animate-spin-slow" />
                </div>
                <p>Establishing connection to live bus GPS...</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '500px', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              No buses available for tracking
            </div>
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="rt-section-header">
        <div className="rt-section-title">
          <div className="rt-section-icon">
            <Route size={28} />
          </div>
          <div>
            <h2>Active Routes & Traffic</h2>
            <span className="rt-badge">{routes.length} Active Routes</span>
          </div>
        </div>
        <button className="fm-add-btn" onClick={handleOpenAdd}>
          <Plus size={18} style={{ marginRight: '8px' }} /> Add Route
        </button>
      </div>

      {/* Routes List */}
      {loading ? (
        <div className="rt-loader">Loading routes from database...</div>
      ) : routes.length === 0 ? (
        <div className="rt-empty">
          <span className="fm-empty-icon">
            <MapPin size={48} />
          </span>
          <h3>No Routes Configured</h3>
          <p>Create your first route to start organizing the bus network.</p>
        </div>
      ) : (
        <div className="rt-list">
          {routes.map(r => (
            <div className={`rt-card ${expandedRouteId === r.id ? 'expanded' : ''}`} key={r.id}>
              
              {/* Card Header (Accordion Toggle) */}
              <div className="rt-card-header" onClick={() => toggleExpand(r.id)}>
                <div className="rt-card-info">
                  <span className="rt-card-icon">
                    <MapPin size={20} />
                  </span>
                  <div>
                    <h3 className="rt-route-name">{r.name}</h3>
                    <p className="rt-route-meta">
                      {r.start_point} ➔ {r.end_point}
                      <span className="rt-meta-dot">●</span>
                      {r.estimated_duration_minutes} mins
                      <span className="rt-meta-dot">●</span>
                      {r.route_stops?.length || 0} stops
                    </p>
                  </div>
                </div>

                <div className="rt-card-controls">
                  <button className="rt-action-btn fm-btn-edit" onClick={(e) => handleOpenEdit(r, e)}>Edit</button>
                  <button className="rt-action-btn rt-action-delete" onClick={(e) => handleRequestDelete(r, e)}>Delete</button>
                  <ChevronDown size={20} className={`rt-expand-icon ${expandedRouteId === r.id ? 'rotated' : ''}`} />
                </div>
              </div>

              {/* Card Body (Stops Timeline) */}
              {expandedRouteId === r.id && (
                <div className="rt-stops-body">
                  {r.route_stops && r.route_stops.length > 0 ? (
                    <div className="rt-timeline">
                      {r.route_stops.map((stop, idx) => (
                        <div className="rt-stop-item" key={stop.id || idx}>
                          <div className="rt-stop-marker"></div>
                          <div className="rt-stop-details">
                            <h4>{stop.stop_name}</h4>
                            <p>{stop.time_from_start_mins === 0 ? "Start Point (0 mins)" : `+${stop.time_from_start_mins} mins from start`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ marginTop: 20, color: '#94a3b8' }}>No stops configured for this route.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fm-modal-overlay" style={{ alignItems: "flex-start", paddingTop: "5vh" }}>
          <div className="fm-modal" style={{ maxWidth: 600 }}>
            <div className="fm-modal-header">
              <h3>{modalMode === "add" ? "Create New Route" : "Edit Route"}</h3>
              <button className="fm-close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveRoute}>
              <div className="fm-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Basic Route Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="fm-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Route Name *</label>
                    <input 
                      type="text" required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Route 3 (Kottarakkara)"
                    />
                  </div>
                  
                  <div className="fm-form-group">
                    <label>Start Point *</label>
                    <input 
                      type="text" required 
                      value={formData.start_point}
                      onChange={e => setFormData({...formData, start_point: e.target.value})}
                      placeholder="e.g. Kottarakkara"
                    />
                  </div>
                  
                  <div className="fm-form-group">
                    <label>Terminal Point *</label>
                    <input 
                      type="text" required 
                      value={formData.end_point}
                      onChange={e => setFormData({...formData, end_point: e.target.value})}
                      placeholder="e.g. College"
                    />
                  </div>

                  <div className="fm-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Estimated Total Duration (Mins) *</label>
                    <input 
                      type="number" required min="5"
                      value={formData.estimated_duration_minutes}
                      onChange={e => setFormData({...formData, estimated_duration_minutes: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                </div>

                {/* Sub-Stops Builder */}
                <div className="rt-stop-builder">
                  <h4>
                    <span><MapPin size={18} style={{verticalAlign:'middle', marginRight:8}} /> Sequence of Stops</span>
                    <button type="button" className="rt-add-stop-btn" onClick={handleAddStopField}>
                      <Plus size={14} style={{marginRight:4}} /> Add Stop
                    </button>
                  </h4>
                  
                  {formData.stops.map((stop, i) => (
                    <div className="rt-stop-row" key={i}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', width: 20 }}>{i+1}.</span>
                      <input 
                        type="text" 
                        required 
                        placeholder="Stop Name" 
                        value={stop.stop_name}
                        onChange={e => handleStopChange(i, 'stop_name', e.target.value)}
                      />
                      <input 
                        type="number" 
                        required 
                        className="rt-stop-time"
                        min="0"
                        title="Minutes from start"
                        value={stop.time_from_start_mins}
                        onChange={e => handleStopChange(i, 'time_from_start_mins', e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>min</span>
                      <button 
                        type="button" 
                        className="rt-remove-stop" 
                        onClick={() => handleRemoveStopField(i)}
                        title="Remove Stop"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {formData.stops.length === 0 && (
                    <p style={{fontSize: '0.85rem', color: '#94a3b8'}}>No stops added yet. Click "+ Add Stop" to start mapping the route.</p>
                  )}
                </div>

              </div>

              <div className="fm-modal-footer">
                <button type="button" className="fm-btn fm-btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="fm-btn fm-btn-primary" disabled={saving}>
                  {saving ? "Deploying Route..." : "Save Route Design"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmOpen && routeToDelete && (
        <div className="fm-modal-overlay">
          <div className="fm-modal confirm">
            <div className="fm-modal-body">
              <div className="fm-confirm-icon" style={{ color: '#ef4444' }}>
                <AlertTriangle size={48} />
              </div>
              <h3>Confirm Deletion</h3>
              <p className="fm-confirm-text">
                Are you sure you want to delete the route <strong>{routeToDelete.name}</strong>? 
                This will automatically remove all associated stops ({routeToDelete.route_stops?.length || 0}) permanently.
              </p>
              
              <div className="fm-form-group" style={{ display: 'flex', gap: '10px' }}>
                <button className="fm-btn fm-btn-cancel" style={{flex: 1}} onClick={() => setConfirmOpen(false)}>
                  Cancel
                </button>
                <button className="fm-btn fm-btn-danger" style={{flex: 1}} onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Route"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default RouteTraffic;
