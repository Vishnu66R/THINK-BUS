// frontend/src/api.js
// ------------------------------------------------------------
// Centralizes all API calls to the FastAPI backend.
// Change BASE_URL here if your backend runs on a different port.
// ------------------------------------------------------------

const BASE_URL = "http://localhost:8000";

// POST /signup
export async function signupUser(username, password, role) {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await response.json();
  return data; // { success, message }
}

// POST /login
export async function loginUser(username, password, role) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await response.json();
  return data; // { success, message, role, username }
}
