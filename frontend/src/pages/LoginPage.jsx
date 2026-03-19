import React, { useState, useEffect } from "react";
import { loginUser } from "../api";

const ROLES = [
  { id: "Admin", label: "Admin", icon: "⚙️" },
  { id: "Student", label: "Student", icon: "🎒" },
  { id: "Parent", label: "Parent", icon: "👨‍👧" },
  { id: "Driver", label: "Driver", icon: "🚗" },
];

function LoginPage({ onLoginSuccess, goToSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@700;800&display=swap');

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: 'DM Sans', sans-serif;
      }

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

      @keyframes spin-clockwise {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes spin-counter {
        0% { transform: rotate(360deg); }
        100% { transform: rotate(0deg); }
      }

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

      @keyframes cardIn {
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      /* Header */
      .header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 0.5rem;
      }
      .logo-icon {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }
      .brand-title {
        font-family: 'Syne', sans-serif;
        font-weight: 800;
        font-size: 1.8rem;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .login-heading {
        font-family: 'Syne', sans-serif;
        font-weight: 700;
        font-size: 1.4rem;
        margin: 0 0 1.5rem 0;
        color: rgba(255, 255, 255, 0.9);
      }

      /* Inputs */
      .input-group {
        margin-bottom: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .input-label {
        font-size: 0.85rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
      }
      .input-wrapper {
        position: relative;
        display: flex;
        width: 100%;
      }
      .glass-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        padding: 0.75rem 1rem;
        color: #fff;
        font-family: 'DM Sans', sans-serif;
        font-size: 1rem;
        outline: none;
        transition: all 0.3s ease;
      }
      .glass-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
      .glass-input:focus {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
      }
      .password-toggle {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 0;
        font-size: 0.9rem;
      }
      .password-toggle:hover {
        color: #fff;
      }

      /* Forgot Password Link */
      .forgot-link {
        display: block;
        text-align: right;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        margin-top: -0.5rem;
        margin-bottom: 1.25rem;
        cursor: pointer;
        transition: color 0.2s;
      }
      .forgot-link:hover {
        color: #fff;
      }

      /* Roles */
      .roles-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 1.5rem;
      }
      .role-chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.5rem 0.2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.8);
      }
      .role-chip:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .role-chip.active {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.6);
        color: #fff;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .role-icon {
        font-size: 1.2rem;
      }

      /* Submit Button */
      .submit-btn {
        width: 100%;
        background: #1a1a3e;
        color: #fff;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 0.85rem;
        font-family: 'DM Sans', sans-serif;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        margin-bottom: 1rem;
      }
      .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 15px rgba(0,0,0,0.3);
        background: #232352;
      }
      .submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      /* Error Message */
      .error-msg {
        background: rgba(255, 59, 48, 0.15);
        border: 1px solid rgba(255, 59, 48, 0.3);
        border-radius: 8px;
        padding: 0.6rem;
        color: #ff8a80;
        font-size: 0.85rem;
        text-align: center;
        margin-bottom: 1rem;
        backdrop-filter: blur(4px);
      }

      /* Divider */
      .divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 1.5rem 0;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.8rem;
      }
      .divider::before, .divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      }
      .divider::before { margin-right: 10px; }
      .divider::after { margin-left: 10px; }

      /* Social Buttons */
      .social-row {
        display: flex;
        gap: 10px;
        margin-bottom: 1.5rem;
      }
      .social-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
        color: #fff;
      }
      .social-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .social-icon {
        width: 20px;
        height: 20px;
      }

      /* Footer */
      .footer-text {
        text-align: center;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
      }
      .footer-link {
        color: #fff;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        transition: opacity 0.2s;
      }
      .footer-link:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!username || !password) {
      setMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const result = await loginUser(username, password, role);
      setLoading(false);

      if (result && result.success) {
        if (onLoginSuccess) {
          onLoginSuccess(result.username || username, result.role || role);
        }
      } else {
        setMessage((result && result.message) ? result.message : "Login failed.");
      }
    } catch (err) {
      setLoading(false);
      setMessage("An error occurred during login.");
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
        <h2 className="login-heading">Login</h2>

        {message && <div className="error-msg">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email / Username</label>
            <div className="input-wrapper">
              <input
                className="glass-input"
                type="text"
                placeholder="Enter your email or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: "0.5rem" }}>
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <input
                className="glass-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
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
          
          <a className="forgot-link">Forgot Password?</a>

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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="divider">or continue with</div>

        <div className="social-row">
          <button type="button" className="social-btn">
            {/* Google Logo SVG */}
            <svg className="social-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button type="button" className="social-btn">
            {/* GitHub Logo SVG */}
            <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
          </button>
          <button type="button" className="social-btn">
            {/* Facebook Logo SVG */}
            <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
            </svg>
          </button>
        </div>

        <p className="footer-text">
          Don't have an account yet? <span className="footer-link" onClick={goToSignup}>Register for free</span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
