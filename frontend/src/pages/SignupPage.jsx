// frontend/src/pages/SignupPage.jsx
// ------------------------------------------------------------
// Signup form: username + password + role dropdown
// On submit → calls /signup API → shows success/failure message
// ------------------------------------------------------------

import { useState } from "react";
import { signupUser } from "../api";

const ROLES = ["Admin", "Student", "Parent", "Driver"];

function SignupPage({ goToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    // Basic client-side validation
    if (!username || !password) {
      setMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    const result = await signupUser(username, password, role);
    setLoading(false);

    if (result.success) {
      setIsSuccess(true);
      setMessage(result.message + " You can now log in.");
    } else {
      setIsSuccess(false);
      setMessage(result.message || "Signup failed.");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚌 ThinkBus</h1>
        <h2 style={styles.subtitle}>Create Account</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Choose a password"
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
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        {/* Success (green) or error (red) message */}
        {message && (
          <p style={{ ...styles.message, color: isSuccess ? "#276749" : "#e53e3e" }}>
            {message}
          </p>
        )}

        <p style={styles.switchText}>
          Already have an account?{" "}
          <span style={styles.link} onClick={goToLogin}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

// ---- Inline styles ----
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
    backgroundColor: "#38a169",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  message: { marginTop: "0.8rem", textAlign: "center" },
  switchText: { textAlign: "center", marginTop: "1rem", color: "#4a5568" },
  link: { color: "#3182ce", cursor: "pointer", fontWeight: "600" },
};

export default SignupPage;
