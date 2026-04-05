// frontend/src/components/Sidebar.jsx
// -----------------------------------
// Reusable fixed sidebar with navigation links and logout button.
// Accepts navItems, brandTitle, and brandSubtitle as props
// so it can be used by both Admin and Student panels.
// -----------------------------------

import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bus, 
  Route, 
  Users, 
  Leaf, 
  Settings, 
  LogOut,
  CreditCard
} from "lucide-react";
import "./Sidebar.css";

// Default nav items (Admin) — used when no navItems prop is passed
const DEFAULT_NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard",          icon: <LayoutDashboard size={20} /> },
  { path: "/admin/fleet",     label: "Fleet Manager",      icon: <Bus size={20} /> },
  { path: "/admin/routes",    label: "Route & Traffic",    icon: <Route size={20} /> },
  { path: "/admin/people",    label: "People Registry",    icon: <Users size={20} /> },
  { path: "/admin/sustainability", label: "Sustainability", icon: <Leaf size={20} /> },
  { path: "/admin/fees",      label: "Fees Management",    icon: <CreditCard size={20} /> },
  { path: "/admin/system",    label: "System Config",      icon: <Settings size={20} /> },
];

function Sidebar({
  onLogout,
  navItems = DEFAULT_NAV_ITEMS,
  brandTitle = "ThinkBus",
  brandSubtitle = "Admin Panel",
}) {
  const navigate = useNavigate();

  // Handle logout: clear any stored auth data and redirect
  function handleLogout() {
    localStorage.removeItem("thinkbus_user");
    sessionStorage.clear();

    if (onLogout) {
      onLogout();
    } else {
      navigate("/login");
    }
  }

  return (
    <aside className="sidebar" id="app-sidebar">
      {/* Brand / Logo */}
      <div className="sidebar-brand">
        <span className="sidebar-logo">
          <Bus size={32} strokeWidth={2.5} />
        </span>
        <h2 className="sidebar-title">{brandTitle}</h2>
        <span className="sidebar-subtitle">{brandSubtitle}</span>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Button (always at the bottom) */}
      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={handleLogout} id="logout-btn">
          <span className="sidebar-link-icon">
            <LogOut size={20} />
          </span>
          <span className="sidebar-link-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
