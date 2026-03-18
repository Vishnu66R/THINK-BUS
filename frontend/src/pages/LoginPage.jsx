// frontend/src/pages/LoginPage.jsx
// ------------------------------------------------------------
// Login form: username + password + role dropdown
// On submit → calls /login API → on success, notifies App.jsx
// ------------------------------------------------------------

import { useState } from "react";
import { loginUser } from "../api";

const ROLES = ["Admin", "Student", "Parent", "Driver"];

function LoginPage({ onLoginSuccess, goToSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();       // Prevent page reload
    setLoading(true);
    setMessage("");

    // Basic client-side check
    if (!username || !password) {
      setMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    const result = await loginUser(username, password, role);
    setLoading(false);

    if (result.success) {
      // Pass username and role up to App.jsx
      onLoginSuccess(result.username, result.role);
    } else {
      setMessage(result.message || "Login failed.");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚌 ThinkBus</h1>
        <h2 style={styles.subtitle}>Login</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label style={styles.label}>Role</label>
          <select
            style={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Error or info message */}
        {message && <p style={styles.message}>{message}</p>}

        <p style={styles.switchText}>
          Don't have an account?{" "}
          <span style={styles.link} onClick={goToSignup}>
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}

// ---- Inline styles (easy to read, no CSS file needed) ----
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4f8",
  },
  card: {
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "380px",
  },
  title: { textAlign: "center", marginBottom: "0.2rem", color: "#1a202c" },
  subtitle: { textAlign: "center", marginBottom: "1.5rem", color: "#4a5568" },
  form: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  label: { fontWeight: "600", color: "#2d3748", fontSize: "0.9rem" },
  input: {
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid #cbd5e0",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    marginTop: "0.8rem",
    padding: "0.7rem",
    backgroundColor: "#3182ce",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  message: { color: "#e53e3e", marginTop: "0.8rem", textAlign: "center" },
  switchText: { textAlign: "center", marginTop: "1rem", color: "#4a5568" },
  link: { color: "#3182ce", cursor: "pointer", fontWeight: "600" },
};

export default LoginPage;
