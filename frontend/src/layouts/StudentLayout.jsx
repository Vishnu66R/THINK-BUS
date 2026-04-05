// frontend/src/layouts/StudentLayout.jsx
// ----------------------------------------
// Layout wrapper for the student panel.
// ----------------------------------------

import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import "../layouts/AdminLayout.css";

import { 
  LayoutDashboard, 
  Ticket, 
  Map, 
  Bell, 
  User,
  CreditCard
} from "lucide-react";

const STUDENT_NAV_ITEMS = [
  { path: "/student/dashboard",     label: "Dashboard",     icon: <LayoutDashboard size={20} /> },
  { path: "/student/pass",          label: "My Bus Pass",   icon: <Ticket size={20} /> },
  { path: "/student/planner",       label: "Planner",       icon: <Map size={20} /> },
  { path: "/student/fees",          label: "Fees",          icon: <CreditCard size={20} /> },
  { path: "/student/notifications", label: "Notifications", icon: <Bell size={20} /> },
  { path: "/student/profile",       label: "Profile",       icon: <User size={20} /> },
];

function StudentLayout({ onLogout, username, theme, onToggleTheme }) {
  return (
    <div className="admin-layout" id="student-layout">
      <Sidebar
        onLogout={onLogout}
        navItems={STUDENT_NAV_ITEMS}
        brandTitle="ThinkBus"
        brandSubtitle="Student Panel"
      />
      <div className="admin-main">
        <Header
          title="Student Portal"
          username={username}
          role="Student"
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default StudentLayout;
