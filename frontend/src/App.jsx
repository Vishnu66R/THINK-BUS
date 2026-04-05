// frontend/src/App.jsx
// -----------------------------------
// Root application component.
// Sets up routing for auth pages, admin panel, student panel, parent, and driver.
// Manages global theme state — default: light (Pearl Neon).
// -----------------------------------

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";

// Auth Pages
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import WelcomePage from "./pages/WelcomePage";

// Admin Layout & Pages
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import FleetManager from "./pages/admin/FleetManager";
import RouteTraffic from "./pages/admin/RouteTraffic";
import PeopleRegistry from "./pages/admin/PeopleRegistry";
import Sustainability from "./pages/admin/Sustainability";
import SystemConfig from "./pages/admin/SystemConfig";
import AdminFees from "./pages/admin/Fees";

// Student Layout & Pages
import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/student/Dashboard";
import MyBusPass from "./pages/student/MyBusPass";
import Planner from "./pages/student/Planner";
import Notifications from "./pages/student/Notifications";
import Profile from "./pages/student/Profile";
import StudentFees from "./pages/student/Fees";

// Parent Layout & Pages
import ParentLayout from "./layouts/ParentLayout";
import ParentDashboard from "./pages/parent/Dashboard";
import ParentBusInfo from "./pages/parent/BusInfo";
import ParentAlerts from "./pages/parent/Alerts";
import ParentFees from "./pages/parent/Fees";
import ParentChildren from "./pages/parent/Children";
import ParentProfile from "./pages/parent/Profile";

// Driver Layout & Pages
import DriverLayout from "./layouts/DriverLayout";
import DriverMyRoute from "./pages/driver/MyRoute";
import DriverNavigate from "./pages/driver/Navigate";
import DriverEmergency from "./pages/driver/Emergency";
import DriverSummary from "./pages/driver/Summary";
import DriverStatus from "./pages/driver/Status";
import DriverProfile from "./pages/driver/Profile";

function AppRoutes({ theme, onToggleTheme }) {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const navigate = useNavigate();

  function handleLoginSuccess(username, role) {
    setLoggedInUser({ username, role });
    localStorage.setItem("thinkbus_user", JSON.stringify({ username, role }));
    if (role === "Admin") navigate("/admin/dashboard");
    else if (role === "Student") navigate("/student/dashboard");
    else if (role === "Parent") navigate("/parent/dashboard");
    else if (role === "Driver") navigate("/driver/route");
    else navigate("/welcome");
  }

  function handleLogout() {
    setLoggedInUser(null);
    localStorage.removeItem("thinkbus_user");
    sessionStorage.clear();
    navigate("/login");
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            goToSignup={() => navigate("/signup")}
          />
        }
      />
      <Route
        path="/signup"
        element={<SignupPage goToLogin={() => navigate("/login")} />}
      />
      <Route
        path="/welcome"
        element={
          <WelcomePage
            username={loggedInUser?.username || "Guest"}
            role={loggedInUser?.role || "User"}
            onLogout={handleLogout}
          />
        }
      />

      {/* ─── Admin Panel ─── */}
      <Route
        path="/admin"
        element={
          <AdminLayout
            onLogout={handleLogout}
            username={loggedInUser?.username || "Admin"}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard"      element={<AdminDashboard />} />
        <Route path="fleet"          element={<FleetManager />} />
        <Route path="routes"         element={<RouteTraffic />} />
        <Route path="people"         element={<PeopleRegistry />} />
        <Route path="sustainability" element={<Sustainability />} />
        <Route path="system"         element={<SystemConfig />} />
        <Route path="fees"           element={<AdminFees />} />
      </Route>

      {/* ─── Student Panel ─── */}
      <Route
        path="/student"
        element={
          <StudentLayout
            onLogout={handleLogout}
            username={loggedInUser?.username || "Student"}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard"     element={<StudentDashboard />} />
        <Route path="pass"          element={<MyBusPass />} />
        <Route path="planner"       element={<Planner />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile"       element={<Profile />} />
        <Route path="fees"          element={<StudentFees />} />
      </Route>

      {/* ─── Parent Panel ─── */}
      <Route
        path="/parent"
        element={
          <ParentLayout
            onLogout={handleLogout}
            username={loggedInUser?.username || "Parent"}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        }
      >
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="bus"       element={<ParentBusInfo />} />
        <Route path="alerts"    element={<ParentAlerts />} />
        <Route path="fees"      element={<ParentFees />} />
        <Route path="children"  element={<ParentChildren />} />
        <Route path="profile"   element={<ParentProfile />} />
      </Route>

      {/* ─── Driver Panel ─── */}
      <Route
        path="/driver"
        element={
          <DriverLayout
            onLogout={handleLogout}
            username={loggedInUser?.username || "Driver"}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        }
      >
        <Route index element={<Navigate to="/driver/route" replace />} />
        <Route path="route"     element={<DriverMyRoute />} />
        <Route path="navigate"  element={<DriverNavigate />} />
        <Route path="emergency" element={<DriverEmergency />} />
        <Route path="summary"   element={<DriverSummary />} />
        <Route path="status"    element={<DriverStatus />} />
        <Route path="profile"   element={<DriverProfile />} />
      </Route>
    </Routes>
  );
}

function App() {
  // Default theme: "light" (Pearl Neon) — persisted in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("thinkbus_theme") || "light";
  });

  // Apply data-theme to <html> on every theme change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("thinkbus_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <Router>
      <AppRoutes theme={theme} onToggleTheme={toggleTheme} />
    </Router>
  );
}

export default App;
