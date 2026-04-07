// frontend/src/pages/admin/PeopleRegistry.jsx
// -------------------------------------------
// People Registry - Central hub for Students and Drivers
// -------------------------------------------

import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  GraduationCap, 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Hash, 
  Route, 
  MapPin, 
  Bus, 
  Phone, 
  CreditCard, 
  Star, 
  AlertTriangle, 
  X,
  CheckCircle,
  XCircle,
  Mail
} from "lucide-react";
import {
  fetchAdminStudents,
  createAdminStudent,
  updateAdminStudent,
  deleteAdminStudent,
  fetchAdminDrivers,
  createAdminDriver,
  updateAdminDriver,
  deleteAdminDriver,
  fetchAdminBuses,
  fetchAdminRoutes,
  fetchAdminParents,
  fetchAdminRouteStops,
  adminSearch
} from "../../api";
import "./PeopleRegistry.css";
// Reuse generic modal/toast logic
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

function PeopleRegistry() {
  const [activeTab, setActiveTab] = useState("students"); // "students" | "drivers"
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Global Data
  const [students, setStudents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [parents, setParents] = useState([]);
  const [stops, setStops] = useState([]);

  // Search Flow
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Flow
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete Flow
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [stRes, drRes, buRes, rtRes, paRes, spRes] = await Promise.all([
        fetchAdminStudents(),
        fetchAdminDrivers(),
        fetchAdminBuses(),
        fetchAdminRoutes(),
        fetchAdminParents(),
        fetchAdminRouteStops()
      ]);

      if (stRes.success) setStudents(stRes.data || []);
      if (drRes.success) setDrivers(drRes.data || []);
      if (buRes.success) setBuses(buRes.data || []);
      if (rtRes.success) setRoutes(rtRes.data || []);
      if (paRes.success) setParents(paRes.data || []);
      if (spRes.success) setStops(spRes.data || []);
    } catch (err) {
      console.error("Setup load failed", err);
      showToast("Error connecting to database", "error");
    }
    setLoading(false);
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // ─── Search Handlers ───
  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
  }

  // ─── Filtered Data ───
  const filteredStudents = students.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.full_name && s.full_name.toLowerCase().includes(q)) ||
           (s.adm_number && s.adm_number.toLowerCase().includes(q)) ||
           (s.department && s.department.toLowerCase().includes(q));
  });

  const filteredDrivers = drivers.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (d.full_name && d.full_name.toLowerCase().includes(q)) ||
           (d.phone_number && d.phone_number.toLowerCase().includes(q)) ||
           (d.license_number && d.license_number.toLowerCase().includes(q));
  });

  // ─── Form Openers ───
  function handleOpenAdd() {
    setModalMode("add");
    if (activeTab === "students") {
      setFormData({
        id: null,
        full_name: "",
        adm_number: "",
        semester: "",
        department: "",
        parent_id: "",
        boarding_stop_id: "",
        default_route_id: "",
        current_bus_id: ""
      });
    } else {
      setFormData({
        id: null,
        full_name: "",
        license_number: "",
        phone_number: "",
        experience_years: ""
      });
    }
    setModalOpen(true);
  }

  function handleOpenEdit(item) {
    setModalMode("edit");
    if (activeTab === "students") {
      setFormData({
        id: item.id || null,
        full_name: item.full_name || "",
        adm_number: item.adm_number || "",
        semester: item.semester || "",
        department: item.department || "",
        parent_id: item.parent_id || "",
        boarding_stop_id: item.boarding_stop_id || "",
        default_route_id: item.default_route_id || "",
        current_bus_id: item.current_bus_id || ""
      });
    } else {
      setFormData({
        id: item.id || null,
        full_name: item.full_name || "",
        license_number: item.license_number || "",
        phone_number: item.phone_number || "",
        experience_years: item.experience_years || ""
      });
    }
    setModalOpen(true);
  }

  // ─── Saving Actions ───
  async function handleSavePerson(e) {
    e.preventDefault();
    setSaving(true);

    try {
      if (activeTab === "students") {
        const payload = {
          full_name: formData.full_name,
          adm_number: formData.adm_number,
          semester: formData.semester,
          department: formData.department,
          parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
          boarding_stop_id: formData.boarding_stop_id ? parseInt(formData.boarding_stop_id) : null,
          default_route_id: formData.default_route_id ? parseInt(formData.default_route_id) : null,
          current_bus_id: formData.current_bus_id ? parseInt(formData.current_bus_id) : null
        };
        
        let res;
        if (modalMode === "add") res = await createAdminStudent(payload);
        else res = await updateAdminStudent(formData.id, payload);

        if (res.success) {
          showToast(`Student ${modalMode === "add" ? 'created' : 'updated'}`);
          loadAllData();
          setModalOpen(false);
        } else showToast(res.message, "error");
      } else {
        const payload = {
          full_name: formData.full_name,
          license_number: formData.license_number || null,
          phone_number: formData.phone_number || null,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null
        };

        let res;
        if (modalMode === "add") res = await createAdminDriver(payload);
        else res = await updateAdminDriver(formData.id, payload);

        if (res.success) {
          showToast(`Driver ${modalMode === "add" ? 'created' : 'updated'}`);
          loadAllData();
          setModalOpen(false);
        } else showToast(res.message, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Unexpected error occurred", "error");
    }
    setSaving(false);
  }

  // ─── Deleting Actions ───
  function handleRequestDelete(item) {
    setPersonToDelete(item);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      let res;
      if (activeTab === "students") {
        res = await deleteAdminStudent(personToDelete.id);
      } else {
        res = await deleteAdminDriver(personToDelete.id);
      }
      
      if (res.success) {
        showToast(`${activeTab === 'students' ? 'Student' : 'Driver'} deleted.`);
        loadAllData();
        setConfirmOpen(false);
      } else {
        showToast(res.message, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting", "error");
    }
    setDeleting(false);
  }

  return (
    <div className="registry-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Search Bar ── */}
      <div className="pr-search-section">
        <div className="pr-search-input-wrapper">
          <span className="pr-search-icon">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            className="pr-search-input" 
            placeholder="Search students (name/adm#) or drivers..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* ── Header Links ── */}
      <div className="pr-header">
        <div className="pr-tabs">
          <button 
            className={`pr-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <GraduationCap size={18} style={{ marginRight: '8px' }} /> 
            Students ({students.length})
          </button>
          <button 
            className={`pr-tab-btn ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            <User size={18} style={{ marginRight: '8px' }} /> 
            Drivers ({drivers.length})
          </button>
        </div>
        <button className="fm-add-btn" onClick={handleOpenAdd}>
          <Plus size={18} style={{ marginRight: '8px' }} /> Add {activeTab === "students" ? "Student" : "Driver"}
        </button>
      </div>

      {/* ── Data Grid ── */}
      {loading ? (
        <div className="rt-loader">Fetching registry data...</div>
      ) : activeTab === "students" ? (
        <div className="pr-grid">
          {filteredStudents.length === 0 && <div className="pr-empty" style={{gridColumn: '1/-1'}}>No students found.</div>}
          {filteredStudents.map(s => (
            <div className="pr-card" key={s.id}>
              <div className="pr-card-header">
                <div className="pr-search-avatar pr-avatar-student">S</div>
                <div className="pr-card-name">
                  <h3>{s.full_name}</h3>
                  <span>#{s.adm_number}</span>
                </div>
              </div>
              <div className="pr-card-body">
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <GraduationCap size={14} />
                  </span>
                  <span>{s.semester} Sem, <span className="pr-detail-value">{s.department}</span></span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <User size={14} />
                  </span>
                  <span>Parent: {s.parent_name ? <span className="pr-detail-value">{s.parent_name}</span> : <i>None</i>}</span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <Route size={14} />
                  </span>
                  <span>Route: {s.route_name ? <span className="pr-detail-value">{s.route_name}</span> : <i>Unassigned</i>}</span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <MapPin size={14} />
                  </span>
                  <span>Stop: {s.stop_name ? <span className="pr-detail-value">{s.stop_name}</span> : <i>Unassigned</i>}</span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <Bus size={14} />
                  </span>
                  <span>Bus: {s.bus_registration ? <span className="pr-detail-value">{s.bus_registration}</span> : <i>Unassigned</i>}</span>
                </div>
              </div>
              <div className="pr-card-footer fm-card-footer">
                <button className="fm-action-btn fm-btn-edit" onClick={() => handleOpenEdit(s)}><Edit2 size={12} style={{marginRight:4}} /> Edit</button>
                <button className="fm-action-btn fm-btn-delete" onClick={() => handleRequestDelete(s)}><Trash2 size={12} style={{marginRight:4}} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pr-grid">
          {filteredDrivers.length === 0 && <div className="pr-empty" style={{gridColumn: '1/-1'}}>No drivers found.</div>}
          {filteredDrivers.map(d => (
            <div className="pr-card" key={d.id}>
              <div className="pr-card-header">
                <div className="pr-search-avatar pr-avatar-driver">D</div>
                <div className="pr-card-name">
                  <h3>{d.full_name}</h3>
                  <span>ID #{d.id}</span>
                </div>
              </div>
              <div className="pr-card-body">
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <Phone size={14} />
                  </span>
                  <span>Phone: <span className="pr-detail-value">{d.phone_number || "N/A"}</span></span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <CreditCard size={14} />
                  </span>
                  <span>License: <span className="pr-detail-value">{d.license_number || "N/A"}</span></span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <Star size={14} />
                  </span>
                  <span>Exp: <span className="pr-detail-value">{d.experience_years ? d.experience_years + ' Yrs' : "Unknown"}</span></span>
                </div>
                <div className="pr-detail-row">
                  <span className="pr-detail-icon">
                    <Bus size={14} />
                  </span>
                  <span>Assigned: {d.bus_registration ? <span className="pr-detail-value">{d.bus_registration}</span> : <i style={{color:'#94a3b8'}}>Free Driver</i>}</span>
                </div>
              </div>
              <div className="pr-card-footer fm-card-footer">
                <button className="fm-action-btn fm-btn-edit" onClick={() => handleOpenEdit(d)}><Edit2 size={12} style={{marginRight:4}} /> Edit</button>
                <button className="fm-action-btn fm-btn-delete" onClick={() => handleRequestDelete(d)}><Trash2 size={12} style={{marginRight:4}} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {modalOpen && (
        <div className="fm-modal-overlay">
          <div className="fm-modal">
            <div className="fm-modal-header">
              <h3>{modalMode === "add" ? `Add New ${activeTab === 'students' ? 'Student' : 'Driver'}` : `Edit ${activeTab === 'students' ? 'Student' : 'Driver'}`}</h3>
              <button className="fm-close-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSavePerson}>
              <div className="fm-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {activeTab === "students" ? (
                  <>
                    <div className="fm-form-group">
                      <label>Full Name *</label>
                      <input type="text" required value={formData.full_name || ""} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                      <div className="fm-form-group">
                        <label>Admission No *</label>
                        <input type="text" required value={formData.adm_number || ""} onChange={e => setFormData({...formData, adm_number: e.target.value})} />
                      </div>
                      <div className="fm-form-group">
                        <label>Semester *</label>
                        <select required value={formData.semester || ""} onChange={e => setFormData({...formData, semester: e.target.value})}>
                          <option value="">--Select--</option>
                          <option value="S1">S1</option><option value="S2">S2</option>
                          <option value="S3">S3</option><option value="S4">S4</option>
                          <option value="S5">S5</option><option value="S6">S6</option>
                          <option value="S7">S7</option><option value="S8">S8</option>
                        </select>
                      </div>
                    </div>
                    <div className="fm-form-group">
                      <label>Department *</label>
                      <input type="text" required value={formData.department || ""} placeholder="e.g. Computer Science" onChange={e => setFormData({...formData, department: e.target.value})} />
                    </div>
                    
                    {/* Relational Dropdowns */}
                    <hr style={{borderTop:'1px solid #f1f5f9', margin:'20px 0'}} />
                    
                    <div className="fm-form-group">
                      <label>Parent Account</label>
                      <select value={formData.parent_id || ""} onChange={e => setFormData({...formData, parent_id: e.target.value})}>
                        <option value="">-- No Parent Linked --</option>
                        {parents.map(p => <option key={p.id} value={p.id}>{p.full_name} (ID: {p.id})</option>)}
                      </select>
                    </div>

                    <div className="fm-form-group">
                      <label>Home Boarding Stop</label>
                      <select value={formData.boarding_stop_id || ""} onChange={e => setFormData({...formData, boarding_stop_id: e.target.value})}>
                        <option value="">-- Unassigned --</option>
                        {stops.map(st => <option key={st.id} value={st.id}>{st.stop_name} ({st.route_name})</option>)}
                      </select>
                    </div>

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                      <div className="fm-form-group">
                        <label>Assigned Route</label>
                        <select value={formData.default_route_id || ""} onChange={e => setFormData({...formData, default_route_id: e.target.value})}>
                          <option value="">-- None --</option>
                          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="fm-form-group">
                        <label>Assigned Bus</label>
                        <select value={formData.current_bus_id || ""} onChange={e => setFormData({...formData, current_bus_id: e.target.value})}>
                          <option value="">-- None --</option>
                          {buses.map(b => <option key={b.id} value={b.id}>{b.registration_number}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="fm-form-group">
                      <label>Driver Full Name *</label>
                      <input type="text" required value={formData.full_name || ""} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div className="fm-form-group">
                      <label>Phone Number</label>
                      <input type="text" value={formData.phone_number || ""} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                      <div className="fm-form-group">
                        <label>License Number</label>
                        <input type="text" value={formData.license_number || ""} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                      </div>
                      <div className="fm-form-group">
                        <label>Experience (Years)</label>
                        <input type="number" value={formData.experience_years || ""} onChange={e => setFormData({...formData, experience_years: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="fm-modal-footer">
                <button type="button" className="fm-btn fm-btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="fm-btn fm-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmOpen && personToDelete && (
        <div className="fm-modal-overlay">
          <div className="fm-modal confirm">
            <div className="fm-modal-body">
              <div className="fm-confirm-icon" style={{ color: '#ef4444' }}>
                <AlertTriangle size={48} />
              </div>
              <h3>Remove Profile</h3>
              <p className="fm-confirm-text">
                Are you sure you want to delete <strong>{personToDelete.full_name}</strong> from the registry? 
                This action is structural and permanent.
              </p>
              
              <div className="fm-form-group" style={{ display: 'flex', gap: '10px' }}>
                <button className="fm-btn fm-btn-cancel" style={{flex: 1}} onClick={() => setConfirmOpen(false)}>
                  Cancel
                </button>
                <button className="fm-btn fm-btn-danger" style={{flex: 1}} onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PeopleRegistry;
