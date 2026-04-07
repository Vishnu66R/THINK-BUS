// frontend/src/components/Header.jsx
// -----------------------------------
// Reusable top header bar.
// Accepts title, username, role, theme, and onToggleTheme as props.
// -----------------------------------

import { useState, useEffect } from "react";
import { Sun, Moon, User, Calendar, Clock } from "lucide-react";
import "./Header.css";

const BASE_URL = "http://localhost:8000";

function Header({
  title = "Think-Bus",
  username = "User",
  role = "Admin",
  theme = "light",
  onToggleTheme,
}) {
  const [simDate, setSimDate] = useState("");
  const [simTime, setSimTime] = useState("");

  // Periodically fetch simulation time for real-time tracking display
  useEffect(() => {
    function fetchSimTime() {
      fetch(`${BASE_URL}/admin/simulate-datetime`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSimDate(data.data.sim_date);
            setSimTime(data.data.sim_time);
          }
        })
        .catch(() => {});
    }
    fetchSimTime();
    const int = setInterval(fetchSimTime, 60000); // refresh every minute
    return () => clearInterval(int);
  }, []);

  // Pick badge class based on role
  let badgeClass = "topbar-role-badge";
  if (role === "Student") badgeClass += " student";
  else if (role === "Parent") badgeClass += " parent";
  else if (role === "Driver") badgeClass += " driver";

  const isDark = theme === "dark";

  return (
    <header className="admin-topbar" id="app-header">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-center" style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(79, 70, 229, 0.1)', padding: '6px 16px', borderRadius: '20px', color: '#4f46e5', fontWeight: 600, fontSize: '14px' }}>
        {simDate && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {simDate}</div>}
        {simTime && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {simTime}</div>}
        {(!simDate && !simTime) && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}><Clock size={16} /> Live Data</div>}
      </div>

      <div className="topbar-right">
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
            id="theme-toggle-btn"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        {/* User Info */}
        <div className="topbar-user">
          <div className="topbar-avatar">
            <User size={20} />
          </div>
          <span className="topbar-username">{username}</span>
          <span className={badgeClass}>{role}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
