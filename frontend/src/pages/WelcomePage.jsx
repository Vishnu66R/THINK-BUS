import React, { useEffect } from "react";

function WelcomePage({ username, role, onLogout }) {
  const roleEmojiMap = {
    Admin: "🛡️",
    Student: "🎓",
    Parent: "👨‍👩‍👧",
    Driver: "🚌",
  };

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
        max-width: 420px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        padding: 2.5rem 1.5rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: cardIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        transform: translateY(50px) scale(0.95);
        opacity: 0;
        text-align: center;
      }

      @media (min-width: 768px) {
        .glass-card {
          max-width: 520px;
          padding: 3.5rem 4rem;
        }
      }
      @keyframes cardIn { to { transform: translateY(0) scale(1); opacity: 1; } }

      .welcome-emoji {
        font-size: 3.5rem;
        margin-bottom: 0.5rem;
      }

      .welcome-heading {
        font-family: 'Syne', sans-serif;
        font-weight: 800;
        font-size: 2rem;
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.5px;
        color: #ffffff;
      }

      .role-text {
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
      }

      .role-text strong {
        color: #ffffff;
        font-weight: 700;
        background: rgba(255,255,255,0.1);
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        margin-left: 0.3rem;
      }

      .placeholder-box {
        background: rgba(255, 171, 0, 0.1);
        border: 1px dashed rgba(255, 171, 0, 0.5);
        border-radius: 12px;
        padding: 1.25rem;
        color: #ffd166;
        margin-bottom: 2rem;
        font-size: 0.95rem;
        line-height: 1.5;
        backdrop-filter: blur(4px);
      }

      .logout-btn {
        background: rgba(255, 59, 48, 0.2);
        color: #ff8a80;
        border: 1px solid rgba(255, 59, 48, 0.3);
        border-radius: 10px;
        padding: 0.8rem 1.5rem;
        font-family: 'DM Sans', sans-serif;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .logout-btn:hover {
        background: rgba(255, 59, 48, 0.4);
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => { document.head.removeChild(styleSheet); };
  }, []);

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
        <div className="welcome-emoji">{roleEmojiMap[role] || "👤"}</div>
        <h1 className="welcome-heading">Welcome, {username}!</h1>
        <p className="role-text">You are logged in as: <strong>{role}</strong></p>
        
        <div className="placeholder-box">
          🚧 This is a placeholder page. <br /> The <strong>{role}</strong> dashboard will go here.
        </div>

        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default WelcomePage;
