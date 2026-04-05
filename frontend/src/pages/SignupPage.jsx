import React, { useState, useEffect } from "react";
import { Bus, MapPin, ChevronDown, User, Mail, Phone, BookOpen, GraduationCap, Layers } from "lucide-react";
import { studentSignup, fetchRoutes, fetchRouteStops } from "../api";

const DEPARTMENTS = ["Computer Science", "Electronics & Communication", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Information Technology"];
const SEMESTERS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

function SignupPage({ goToLogin }) {
  const [formData, setFormData] = useState({
    full_name: "",
    adm_number: "",
    class_section: "",
    semester: "",
    department: "",
    boarding_stop_id: "",
    email: "",
    mobile_no: "",
  });

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stopsLoading, setStopsLoading] = useState(false);

  // Inject styles
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.id = "signup-styles";
    styleSheet.innerText = `
      /* ... same styles as before ... */
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@700;800&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'DM Sans', sans-serif; }

      .signup-container {
        position: relative; width: 100%; min-height: 100vh;
        background: var(--bg-main, #f8fafc);
        overflow-x: hidden; overflow-y: auto;
        display: flex; align-items: center; justify-content: center;
        color: var(--text-primary, #0f172a); padding: 2rem 1rem;
      }

      .blob {
        position: fixed;
        background: rgba(var(--color-primary-rgb, 37,99,235), 0.05);
        filter: blur(12px);
        animation: morph 15s ease-in-out infinite alternate;
        z-index: 0;
      }
      .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; animation-delay: 0s; }
      .blob-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; animation-delay: -2s; background: rgba(var(--color-secondary-rgb, 124,58,237), 0.04); }
      .blob-3 { top: 40%; left: 30%; width: 40vw; height: 40vw; animation-delay: -4s; background: rgba(var(--color-primary-rgb, 37,99,235), 0.06); }
      @keyframes morph {
        0%   { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(0deg) scale(1); }
        34%  { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: rotate(120deg) scale(1.05); }
        67%  { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: rotate(240deg) scale(0.95); }
        100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(360deg) scale(1); }
      }

      .glass-card-signup {
        position: relative; z-index: 10; width: 100%; max-width: 680px;
        background: var(--bg-card, rgba(255,255,255,0.85));
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1.5px solid var(--border-glass, rgba(0,0,0,0.1));
        border-radius: 24px; padding: 2.5rem 2rem;
        box-shadow: var(--glass-shadow, 0 25px 50px -12px rgba(0,0,0,0.15));
        animation: cardIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        transform: translateY(30px) scale(0.98); opacity: 0;
      }
      @media (min-width: 768px) { .glass-card-signup { padding: 3rem 4rem; } }
      @keyframes cardIn { to { transform: translateY(0) scale(1); opacity: 1; } }

      .header-row { display: flex; align-items: center; gap: 12px; margin-bottom: 0.5rem; }
      .logo-icon {
        width: 44px; height: 44px;
        background: rgba(var(--color-primary-rgb, 37,99,235), 0.1);
        border: 1px solid rgba(var(--color-primary-rgb, 37,99,235), 0.2);
        border-radius: 12px; display: flex; align-items: center; justify-content: center;
        color: var(--color-primary, #2563eb);
      }
      .brand-title {
        font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.8rem; margin: 0;
        background: linear-gradient(135deg, var(--color-primary, #2563eb), var(--color-secondary, #7c3aed));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .signup-heading { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.45rem; margin: 0 0 0.25rem; color: var(--text-primary, #0f172a); }
      .signup-subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0 0 1.5rem; }

      .section-label {
        font-family: 'Syne', sans-serif; font-size: 0.75rem; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase; color: var(--color-primary, #2563eb);
        margin: 1.25rem 0 0.75rem; padding-bottom: 0.4rem;
        border-bottom: 1.5px solid rgba(var(--color-primary-rgb, 37,99,235), 0.15);
      }

      .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem 1.25rem; }
      @media (min-width: 600px) {
        .form-grid { grid-template-columns: 1fr 1fr; }
        .full-width { grid-column: span 2; }
      }

      .input-group { display: flex; flex-direction: column; gap: 6px; }
      .input-label {
        font-size: 0.78rem; font-weight: 700; color: var(--text-secondary, #475569);
        text-transform: uppercase; letter-spacing: 0.5px;
        display: flex; align-items: center; gap: 5px;
      }
      .input-label svg { opacity: 0.6; }
      .input-wrapper { position: relative; display: flex; width: 100%; }
      .glass-input {
        width: 100%;
        background: var(--bg-input, rgba(248,250,252,0.8));
        border: 1.5px solid var(--border-input, rgba(0,0,0,0.12));
        border-radius: 12px; padding: 0.75rem 1rem;
        color: var(--text-primary, #0f172a);
        font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
        outline: none; transition: all 0.3s ease;
        appearance: none; -webkit-appearance: none;
      }
      .glass-input::placeholder { color: var(--text-muted, #94a3b8); }
      .glass-input:focus {
        border-color: var(--color-primary, #2563eb);
        background: var(--bg-card, #ffffff);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 37,99,235), 0.15);
      }

      .select-wrapper { position: relative; width: 100%; }
      .select-wrapper .glass-input { padding-right: 2.5rem; cursor: pointer; }
      .select-arrow {
        position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
        pointer-events: none; color: var(--text-muted, #94a3b8);
        display: flex; align-items: center;
      }

      .default-pass-notice {
        display: flex; align-items: center; gap: 10px;
        background: rgba(var(--color-primary-rgb, 37,99,235), 0.07);
        border: 1.5px dashed rgba(var(--color-primary-rgb, 37,99,235), 0.3);
        border-radius: 12px; padding: 0.75rem 1rem;
        font-size: 0.88rem; color: var(--text-secondary, #475569); margin-top: 0.5rem;
      }
      .default-pass-notice strong { color: var(--color-primary, #2563eb); font-family: monospace; font-size: 0.95rem; }

      .submit-btn {
        width: 100%;
        background: linear-gradient(135deg, var(--color-primary, #2563eb), var(--color-secondary, #7c3aed));
        color: #fff; border: none; border-radius: 12px; padding: 1rem;
        font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 1.05rem;
        cursor: pointer; transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(var(--color-primary-rgb, 37,99,235), 0.35);
        margin-top: 1.5rem; letter-spacing: 0.5px;
      }
      .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(var(--color-primary-rgb, 37,99,235), 0.45); }
      .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      .msg-box { border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.9rem; text-align: center; margin-top: 1rem; font-weight: 500; }
      .msg-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; }
      .msg-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #16a34a; }

      .footer-text { text-align: center; font-size: 0.9rem; color: var(--text-secondary, #475569); margin: 1.25rem 0 0; }
      .footer-link { color: var(--color-primary, #2563eb); font-weight: 700; cursor: pointer; text-decoration: none; transition: opacity 0.2s; }
      .footer-link:hover { opacity: 0.8; }
    `;
    document.head.appendChild(styleSheet);
    
    // Load routes
    async function loadRoutes() {
      const res = await fetchRoutes();
      if (res.success) setRoutes(res.routes || []);
    }
    loadRoutes();

    return () => {
      const el = document.getElementById("signup-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);

  // Fetch stops when route changes
  useEffect(() => {
    async function loadStops() {
      if (!selectedRouteId) {
        setStops([]);
        return;
      }
      setStopsLoading(true);
      const res = await fetchRouteStops(selectedRouteId);
      if (res.success) {
        setStops(res.stops || []);
      }
      setStopsLoading(false);
    }
    loadStops();
    // Clear stop selection when route changes
    setFormData(prev => ({ ...prev, boarding_stop_id: "" }));
  }, [selectedRouteId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    if (!formData.full_name || !formData.email || !formData.adm_number || !formData.boarding_stop_id) {
      setMessage("Please fill in all required fields and select a boarding stop.");
      setLoading(false);
      return;
    }

    const payload = {
      full_name: formData.full_name,
      email: formData.email,
      mobile_no: formData.mobile_no || null,
      adm_number: formData.adm_number,
      semester: formData.semester || null,
      department: formData.department || null,
      class_section: formData.class_section || null,
      boarding_stop_id: parseInt(formData.boarding_stop_id),
    };

    const result = await studentSignup(payload);

    if (result.success) {
      setIsSuccess(true);
      setMessage(result.message || "Account created! Log in with your admission number and password 'student@123'.");
      setFormData({ full_name: "", adm_number: "", class_section: "", semester: "", department: "", boarding_stop_id: "", email: "", mobile_no: "" });
    } else {
      setIsSuccess(false);
      setMessage(result.message || "An error occurred during signup.");
    }
    setLoading(false);
  }

  return (
    <div className="signup-container">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="glass-card-signup">
        <div className="header-row">
          <div className="logo-icon"><Bus size={28} /></div>
          <h1 className="brand-title">ThinkBus</h1>
        </div>
        <h2 className="signup-heading">Create a Student Account</h2>
        <p className="signup-subtitle">Register for the college transport network</p>

        <form onSubmit={handleSubmit}>

          {/* ── Personal Info ── */}
          <div className="section-label">Personal Information</div>
          <div className="form-grid">

            <div className="input-group full-width">
              <label className="input-label"><User size={13} /> Full Name *</label>
              <div className="input-wrapper">
                <input id="signup-full-name" name="full_name" className="glass-input" type="text"
                  placeholder="e.g. John Doe" value={formData.full_name} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label"><Mail size={13} /> Email Address *</label>
              <div className="input-wrapper">
                <input id="signup-email" name="email" className="glass-input" type="email"
                  placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label"><Phone size={13} /> Mobile No.</label>
              <div className="input-wrapper">
                <input id="signup-mobile" name="mobile_no" className="glass-input" type="tel"
                  placeholder="+91 9876543210" value={formData.mobile_no} onChange={handleChange} />
              </div>
            </div>

          </div>

          {/* ── Academic Info ── */}
          <div className="section-label">Academic Details</div>
          <div className="form-grid">

            <div className="input-group">
              <label className="input-label"><BookOpen size={13} /> Admission No. *</label>
              <div className="input-wrapper">
                <input id="signup-adm-number" name="adm_number" className="glass-input" type="text"
                  placeholder="e.g. CE241000" value={formData.adm_number} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label"><Layers size={13} /> Semester</label>
              <div className="input-wrapper select-wrapper">
                <select id="signup-semester" name="semester" className="glass-input"
                  value={formData.semester} onChange={handleChange}>
                  <option value="">Select semester</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="select-arrow"><ChevronDown size={16} /></span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label"><GraduationCap size={13} /> Department</label>
              <div className="input-wrapper select-wrapper">
                <select id="signup-department" name="department" className="glass-input"
                  value={formData.department} onChange={handleChange}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="select-arrow"><ChevronDown size={16} /></span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label"><BookOpen size={13} /> Class / Section</label>
              <div className="input-wrapper">
                <input id="signup-class" name="class_section" className="glass-input" type="text"
                  placeholder="e.g. CS-A" value={formData.class_section} onChange={handleChange} />
              </div>
            </div>

          </div>

          {/* ── Boarding Stop ── */}
          <div className="section-label">Transport Details</div>
          <div className="form-grid">

            <div className="input-group">
              <label className="input-label"><Bus size={13} /> Bus Route *</label>
              <div className="input-wrapper select-wrapper">
                <select id="signup-route" className="glass-input"
                  value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)} required>
                  <option value="">Select bus route</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <span className="select-arrow"><ChevronDown size={16} /></span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label"><MapPin size={13} /> Boarding Stop *</label>
              <div className="input-wrapper select-wrapper">
                <select
                  id="signup-boarding-stop"
                  name="boarding_stop_id"
                  className="glass-input"
                  value={formData.boarding_stop_id}
                  onChange={handleChange}
                  required
                  disabled={!selectedRouteId || stopsLoading}
                >
                  <option value="">{stopsLoading ? "Loading stops..." : (selectedRouteId ? "Select your nearest stop" : "Select route first")}</option>
                  {stops.map(stop => (
                    <option key={stop.id} value={stop.id}>
                      {stop.stop_name}
                    </option>
                  ))}
                </select>
                <span className="select-arrow"><ChevronDown size={16} /></span>
              </div>
            </div>

          </div>

          {/* Default password notice */}
          <div className="default-pass-notice">
            🔑 Your default password will be set to <strong>student@123</strong>. You can change it after logging in.
          </div>

          {message && (
            <div className={`msg-box ${isSuccess ? "msg-success" : "msg-error"}`}>
              {message}
            </div>
          )}

          <button id="signup-submit-btn" className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Student Account"}
          </button>

        </form>

        <p className="footer-text">
          Already have an account?{" "}
          <span className="footer-link" onClick={goToLogin}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
