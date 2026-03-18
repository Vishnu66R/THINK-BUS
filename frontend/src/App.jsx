// frontend/src/App.jsx
// ------------------------------------------------------------
// App manages which "page" is shown:
//   - "login"    → LoginPage
//   - "signup"   → SignupPage
//   - "welcome"  → WelcomePage (after successful login)
// No router needed for this simple skeleton.
// ------------------------------------------------------------

import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import WelcomePage from "./pages/WelcomePage";

function App() {
  // currentPage controls which screen is visible
  const [currentPage, setCurrentPage] = useState("login");

  // After login succeeds, store the user info to show on Welcome page
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Called by LoginPage on success
  function handleLoginSuccess(username, role) {
    setLoggedInUser({ username, role });
    setCurrentPage("welcome");
  }

  return (
    <div>
      {currentPage === "login" && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          goToSignup={() => setCurrentPage("signup")}
        />
      )}

      {currentPage === "signup" && (
        <SignupPage
          goToLogin={() => setCurrentPage("login")}
        />
      )}

      {currentPage === "welcome" && (
        <WelcomePage
          username={loggedInUser?.username}
          role={loggedInUser?.role}
          onLogout={() => setCurrentPage("login")}
        />
      )}
    </div>
  );
}

export default App;
