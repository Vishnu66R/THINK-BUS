// frontend/src/pages/WelcomePage.jsx
// ------------------------------------------------------------
// Placeholder page shown after a successful login.
// Displays the user's name and role.
// Replace this later with your actual dashboard per role.
// ------------------------------------------------------------

function WelcomePage({ username, role, onLogout }) {
  // Role-specific emoji makes it feel personal
  const roleEmoji = {
    Admin: "🛡️",
    Student: "🎓",
    Parent: "👨‍👩‍👧",
    Driver: "🚌",
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.emoji}>{roleEmoji[role] || "👤"}</div>
        <h1 style={styles.welcome}>Welcome, {username}!</h1>
        <p style={styles.role}>You are logged in as: <strong>{role}</strong></p>
        <p style={styles.placeholder}>
          🚧 This is a placeholder page. The {role} dashboard will go here.
        </p>
        <button style={styles.button} onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ebf8ff",
  },
  card: {
    backgroundColor: "#fff",
    padding: "2.5rem",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
  },
  emoji: { fontSize: "3rem", marginBottom: "0.5rem" },
  welcome: { fontSize: "1.8rem", color: "#1a202c", marginBottom: "0.3rem" },
  role: { color: "#4a5568", marginBottom: "1rem" },
  placeholder: {
    backgroundColor: "#fffbeb",
    border: "1px dashed #f6ad55",
    borderRadius: "8px",
    padding: "0.8rem",
    color: "#744210",
    marginBottom: "1.5rem",
  },
  button: {
    padding: "0.6rem 1.5rem",
    backgroundColor: "#e53e3e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
  },
};

export default WelcomePage;
