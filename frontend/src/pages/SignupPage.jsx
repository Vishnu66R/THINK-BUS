import React, { useState, useEffect } from "react";
import { signupUser } from "../api";

const ROLES = [
  { id: "Admin", label: "Admin", icon: "⚙️" },
  { id: "Student", label: "Student", icon: "🎒" },
  { id: "Parent", label: "Parent", icon: "👨‍👧" },
  { id: "Driver", label: "Driver", icon: "🚗" },
];

function SignupPage({ goToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@700;800&display=swap');

      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'DM Sans', sans-serif; }

      .login-container {
        position: relative;
        width: 100%;
        min-height: 100vh;
        background: linear-gradient(135deg, #0a1628, #0d2050, #0a3080, #1045b0);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      }

      /* Animated Blobs */
      .blob {
        position: absolute;
        background: rgba(255, 255, 255, 0.06);
        filter: blur(8px);
        animation: morph 15s ease-in-out infinite alternate;
        z-index: 0;
      }
      .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; animation-delay: 0s; }
      .blob-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; animation-delay: -2s; background: rgba(255, 255, 255, 0.04); }
      .blob-3 { top: 40%; left: 30%; width: 40vw; height: 40vw; animation-delay: -4s; background: rgba(255, 255, 255, 0.05); }
      .blob-4 { top: 10%; right: 10%; width: 35vw; height: 35vw; animation-delay: -6s; background: rgba(255, 255, 255, 0.08); }
      .blob-5 { bottom: 10%; left: 10%; width: 45vw; height: 45vw; animation-delay: -8s; background: rgba(255, 255, 255, 0.05); }

      @keyframes morph {
        0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(0deg) scale(1); }
        34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: rotate(120deg) scale(1.05); }
        67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: rotate(240deg) scale(0.95); }
        100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(360deg) scale(1); }
      }

      /* Spinning Rings */
      .ring-container {
        position: absolute;
        top: -100px;
        left: 50%;
        transform: translateX(-50%);
        width: 300px;
        height: 300px;
        z-index: 0;
        pointer-events: none;
      }
      .ring {
        position: absolute;
        border-radius: 50%;
        border: 2px solid transparent;
      }
      .ring-1 {
        top: 20px; left: 20px; right: 20px; bottom: 20px;
        border-top-color: rgba(255,255,255,0.15);
        border-right-color: rgba(255,255,255,0.15);
        animation: spin-clockwise 20s linear infinite;
      }
      .ring-2 {
        top: 40px; left: 40px; right: 40px; bottom: 40px;
        border-bottom-color: rgba(255,255,255,0.1);
        border-left-color: rgba(255,255,255,0.1);
        animation: spin-counter 15s linear infinite;
      }

      @keyframes spin-clockwise { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes spin-counter { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }

      /* Glass Card */
      .glass-card {
        position: relative;
        z-index: 10;
        width: 92vw;
        max-width: 400px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        padding: 2rem 1.5rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: cardIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        transform: translateY(50px) scale(0.95);
        opacity: 0;
      }

      @media (min-width: 768px) {
        .glass-card {
          max-width: 480px;
          padding: 3rem 3.5rem;
        }
      }
      @keyframes cardIn { to { transform: translateY(0) scale(1); opacity: 1; } }

      /* Header */
      .header-row { display: flex; align-items: center; gap: 12px; margin-bottom: 0.5rem; }
      .logo-icon {
        width: 48px; height: 48px; background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px;
        display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
      }
      .brand-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.8rem; margin: 0; letter-spacing: -0.5px; }
      .login-heading { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.4rem; margin: 0 0 1.5rem 0; color: rgba(255, 255, 255, 0.9); }

      /* Inputs */
      .input-group { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 6px; }
      .input-label { font-size: 0.85rem; font-weight: 500; color: rgba(255, 255, 255, 0.9); }
      .input-wrapper { position: relative; display: flex; width: 100%; }
      .glass-input {
        width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px; padding: 0.75rem 1rem; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 1rem; outline: none; transition: all 0.3s ease;
      }
      .glass-input::placeholder { color: rgba(255, 255, 255, 0.5); }
      .glass-input:focus { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.5); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05); }
      .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255, 255, 255, 0.6); cursor: pointer; padding: 0; font-size: 0.9rem; }
      .password-toggle:hover { color: #fff; }

      /* Roles */
      .roles-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 1.5rem; }
      .role-chip {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 0.5rem 0.2rem;
        display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; font-size: 0.7rem; color: rgba(255, 255, 255, 0.8);
      }
      .role-chip:hover { background: rgba(255, 255, 255, 0.1); }
      .role-chip.active { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.6); color: #fff; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .role-icon { font-size: 1.2rem; }

      /* Submit Button */
      .submit-btn {
        width: 100%; background: #1a1a3e; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.85rem;
        font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.2); margin-bottom: 1rem;
      }
      .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.3); background: #232352; }
      .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

      /* Messages */
      .msg-box { border-radius: 8px; padding: 0.6rem; font-size: 0.85rem; text-align: center; margin-bottom: 1rem; backdrop-filter: blur(4px); }
      .msg-error { background: rgba(255, 59, 48, 0.15); border: 1px solid rgba(255, 59, 48, 0.3); color: #ff8a80; }
      .msg-success { background: rgba(52, 199, 89, 0.15); border: 1px solid rgba(52, 199, 89, 0.3); color: #81c784; }

      /* Divider */
      .divider { display: flex; align-items: center; text-align: center; margin: 1.5rem 0; color: rgba(255, 255, 255, 0.5); font-size: 0.8rem; }
      .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.15); }
      .divider::before { margin-right: 10px; } .divider::after { margin-left: 10px; }

      /* Footer */
      .footer-text { text-align: center; font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); margin: 0; }
      .footer-link { color: #fff; font-weight: 700; cursor: pointer; text-decoration: none; transition: opacity 0.2s; }
      .footer-link:hover { opacity: 0.8; }
    `;
    document.head.appendChild(styleSheet);
    
    return () => { document.head.removeChild(styleSheet); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    if (!username || !password) {
      setMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const result = await signupUser(username, password, role);
      setLoading(false);

      if (result && result.success) {
        setIsSuccess(true);
        setMessage(result.message + " You can now log in.");
      } else {
        setIsSuccess(false);
        setMessage((result && result.message) ? result.message : "Signup failed.");
      }
    } catch (err) {
      setLoading(false);
      setIsSuccess(false);
      setMessage("An error occurred during signup.");
    }
  }

  return (
    <div className="login-container">
      {/* Background Elements */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      <div className="blob blob-4"></div>
      <div className="blob blob-5"></div>
      
      <div className="ring-container">
        <div className="ring ring-1"></div>
        <div className="ring ring-2"></div>
      </div>

      {/* Glass Card */}
      <div className="glass-card">
        <div className="header-row">
          <div className="logo-icon">🚌</div>
          <h1 className="brand-title">ThinkBus</h1>
        </div>
        <h2 className="login-heading">Create Account</h2>

        {message && (
          <div className={`msg-box ${isSuccess ? 'msg-success' : 'msg-error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email / Username</label>
            <div className="input-wrapper">
              <input
                className="glass-input"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <input
                className="glass-input"
                type={showPassword ? "text" : "password"}
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label">Select Role</label>
            <div className="roles-grid">
              {ROLES.map((r) => (
                <div 
                  key={r.id} 
                  className={`role-chip ${role === r.id ? 'active' : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  <span className="role-icon">{r.icon}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="footer-text" style={{ marginTop: '1.5rem' }}>
          Already have an account? <span className="footer-link" onClick={goToLogin}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
