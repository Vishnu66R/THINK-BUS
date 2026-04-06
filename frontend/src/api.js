// frontend/src/api.js
// ------------------------------------------------------------
// Centralizes all API calls to the FastAPI backend.
// Change BASE_URL here if your backend runs on a different port.
// ------------------------------------------------------------

const BASE_URL = "http://localhost:8000";

// GET /routes — fetch all available routes for signup selection
export async function fetchRoutes() {
  try {
    const response = await fetch(`${BASE_URL}/routes`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, routes: [], message: "Network error. Please check if backend is running." };
  }
}

// GET /route-stops?route_id=routeId — fetch all stops for a specific route
export async function fetchRouteStops(routeId = 1) {
  try {
    const response = await fetch(`${BASE_URL}/route-stops?route_id=${routeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, stops: [], message: "Network error. Please check if backend is running." };
  }
}

// POST /signup/student — full student self-registration
export async function studentSignup(payload) {
  try {
    const response = await fetch(`${BASE_URL}/signup/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: "Network error. Please check if backend is running." };
  }
}

// POST /signup
export async function signupUser(username, password, role) {
  try {
    const response = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return { success: false, message: errorData.message || typeof errorData.detail === 'string' ? errorData.detail : "Server Error " + response.status };
      } catch (e) {
        return { success: false, message: "Server returned " + response.status };
      }
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: "Network error. Please check if backend is running." };
  }
}

// POST /login — role is determined by the backend from the DB
export async function loginUser(username, password) {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return { success: false, message: errorData.message || (typeof errorData.detail === 'string' ? errorData.detail : "Server Error " + response.status) };
      } catch (e) {
        return { success: false, message: "Server returned " + response.status };
      }
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: "Network error. Please check if backend is running." };
  }
}

// ─── Parent Panel API ───

// GET /parent/dashboard
export async function fetchParentDashboard(username) {
  const response = await fetch(`${BASE_URL}/parent/dashboard?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /parent/children
export async function fetchParentChildren(username) {
  const response = await fetch(`${BASE_URL}/parent/children?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /parent/bus-info
export async function fetchParentBusInfo(username) {
  const response = await fetch(`${BASE_URL}/parent/bus-info?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /parent/alerts
export async function fetchParentAlerts(username) {
  const response = await fetch(`${BASE_URL}/parent/alerts?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /parent/fees
export async function fetchParentFees(username) {
  const response = await fetch(`${BASE_URL}/parent/fees?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /parent/profile
export async function fetchParentProfile(username) {
  const response = await fetch(`${BASE_URL}/parent/profile?username=${encodeURIComponent(username)}`);
  return response.json();
}

// ─── Driver Panel API ───

// GET /driver/profile
export async function fetchDriverProfile(username) {
  const response = await fetch(`${BASE_URL}/driver/profile?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /driver/my-route
export async function fetchDriverRoute(username) {
  const response = await fetch(`${BASE_URL}/driver/my-route?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /driver/navigate
export async function fetchDriverNavigation(username) {
  const response = await fetch(`${BASE_URL}/driver/navigate?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /driver/summary
export async function fetchDriverSummary(username) {
  const response = await fetch(`${BASE_URL}/driver/summary?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /driver/status
export async function fetchDriverStatus(username) {
  const response = await fetch(`${BASE_URL}/driver/status?username=${encodeURIComponent(username)}`);
  return response.json();
}

// POST /driver/emergency
export async function reportEmergency(username, type, message) {
  const response = await fetch(`${BASE_URL}/driver/emergency?username=${encodeURIComponent(username)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, message }),
  });
  return response.json();
}

// POST /driver/status
export async function updateDriverStatus(username, status) {
  const response = await fetch(`${BASE_URL}/driver/status?username=${encodeURIComponent(username)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return response.json();
}

// ─── Admin Panel API ───

// GET /admin/stats
export async function fetchAdminStats() {
  const response = await fetch(`${BASE_URL}/admin/stats`);
  return response.json();
}

// GET /admin/students
export async function fetchAdminStudents() {
  const response = await fetch(`${BASE_URL}/admin/students`);
  return response.json();
}

// POST /admin/students
export async function createAdminStudent(data) {
  const response = await fetch(`${BASE_URL}/admin/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// PUT /admin/students/:id
export async function updateAdminStudent(id, data) {
  const response = await fetch(`${BASE_URL}/admin/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// DELETE /admin/students/:id
export async function deleteAdminStudent(id) {
  const response = await fetch(`${BASE_URL}/admin/students/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

// GET /admin/buses
export async function fetchAdminBuses() {
  const response = await fetch(`${BASE_URL}/admin/buses`);
  return response.json();
}

// GET /admin/buses/:bus_id/stops
export async function fetchAdminBusStops(busId) {
  const response = await fetch(`${BASE_URL}/admin/buses/${busId}/stops`);
  return response.json();
}

// POST /admin/buses
export async function createAdminBus(data) {
  const response = await fetch(`${BASE_URL}/admin/buses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// PUT /admin/buses/:id
export async function updateAdminBus(id, data) {
  const response = await fetch(`${BASE_URL}/admin/buses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// DELETE /admin/buses/:id
export async function deleteAdminBus(id) {
  const response = await fetch(`${BASE_URL}/admin/buses/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

// GET /admin/drivers
export async function fetchAdminDrivers() {
  const response = await fetch(`${BASE_URL}/admin/drivers`);
  return response.json();
}

// POST /admin/drivers
export async function createAdminDriver(data) {
  const response = await fetch(`${BASE_URL}/admin/drivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// PUT /admin/drivers/:id
export async function updateAdminDriver(id, data) {
  const response = await fetch(`${BASE_URL}/admin/drivers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// DELETE /admin/drivers/:id
export async function deleteAdminDriver(id) {
  const response = await fetch(`${BASE_URL}/admin/drivers/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

// GET /admin/search?q=query
export async function adminSearch(query) {
  const response = await fetch(`${BASE_URL}/admin/search?q=${encodeURIComponent(query)}`);
  return response.json();
}

// GET /admin/routes
export async function fetchAdminRoutes() {
  const response = await fetch(`${BASE_URL}/admin/routes`);
  return response.json();
}

// GET /admin/routes/details
export async function fetchAdminRoutesDetailed() {
  const response = await fetch(`${BASE_URL}/admin/routes/details`);
  return response.json();
}

// POST /admin/routes
export async function createAdminRoute(data) {
  const response = await fetch(`${BASE_URL}/admin/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// PUT /admin/routes/:id
export async function updateAdminRoute(id, data) {
  const response = await fetch(`${BASE_URL}/admin/routes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// DELETE /admin/routes/:id
export async function deleteAdminRoute(id) {
  const response = await fetch(`${BASE_URL}/admin/routes/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

// GET /admin/parents
export async function fetchAdminParents() {
  const response = await fetch(`${BASE_URL}/admin/parents`);
  return response.json();
}

// GET /admin/route_stops
export async function fetchAdminRouteStops() {
  const response = await fetch(`${BASE_URL}/admin/route_stops`);
  return response.json();
}

// GET /admin/fees
export async function fetchAdminFees() {
  const response = await fetch(`${BASE_URL}/admin/fees`);
  return response.json();
}

// ─── Student Panel API ───

// GET /student/dashboard
export async function fetchStudentDashboard(username) {
  const response = await fetch(`${BASE_URL}/student/dashboard?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /student/fees
export async function fetchStudentFees(username) {
  const response = await fetch(`${BASE_URL}/student/fees?username=${encodeURIComponent(username)}`);
  return response.json();
}

// GET /student/profile
export async function fetchStudentProfile(username) {
  const response = await fetch(`${BASE_URL}/student/profile?username=${encodeURIComponent(username)}`);
  return response.json();
}


// POST /student/pay-fee
export async function payStudentFee(payload) {
  const response = await fetch(`${BASE_URL}/student/pay-fee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

// ─── Simulated DateTime API ───

// POST /admin/simulate-datetime — save simulated date + time
export async function saveSimulatedDateTime(sim_date, sim_time) {
  try {
    const response = await fetch(`${BASE_URL}/admin/simulate-datetime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sim_date, sim_time }),
    });
    return response.json();
  } catch {
    return { success: false, message: "Network error." };
  }
}

// GET /admin/simulate-datetime — fetch current simulated date/time
export async function fetchSimulatedDateTime() {
  try {
    const response = await fetch(`${BASE_URL}/admin/simulate-datetime`);
    return response.json();
  } catch {
    return { success: false, data: null };
  }
}
