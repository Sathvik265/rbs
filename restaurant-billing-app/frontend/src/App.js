import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./styles/App.css";

// Import components
import BillingScreen from "./components/BillingScreen";
import AdminDashboard from "./components/AdminDashboard";
import ShiftManagement from "./components/ShiftManagement";

// Import context providers
import { SessionProvider } from "./context/SessionContext";
import { BillingProvider } from "./context/BillingContext";

// Import services
import { checkSession, isAdminMode } from "./services/sessionService";

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for existing session on app load
    const existingSession = checkSession();
    if (existingSession) {
      setSession(existingSession);
      setCurrentView("billing");
    }

    // Check if admin mode is active
    if (isAdminMode()) {
      setIsAdmin(true);
      setCurrentView("admin");
    }

    // Listen for admin trigger
    const handleKeyDown = (event) => {
      if (
        event.ctrlKey &&
        event.altKey &&
        event.shiftKey &&
        event.code === "KeyA"
      ) {
        event.preventDefault();
        setIsAdmin(true);
        setCurrentView("admin");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogin = (sessionData) => {
    setSession(sessionData);
    setCurrentView("billing");
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentView("login");
    localStorage.removeItem("current_session");
  };

  const handleAdminExit = () => {
    setIsAdmin(false);
    setCurrentView(session ? "billing" : "login");
  };

  return (
    <div className="App">
      <SessionProvider>
        <BillingProvider>
          <Router>
            <Routes>
              <Route
                path="/"
                element={
                  isAdmin ? (
                    <AdminDashboard onExit={handleAdminExit} />
                  ) : currentView === "login" ? (
                    <ShiftManagement onLogin={handleLogin} session={session} />
                  ) : (
                    <BillingScreen session={session} onLogout={handleLogout} />
                  )
                }
              />
              <Route
                path="/admin"
                element={
                  isAdmin ? (
                    <AdminDashboard onExit={handleAdminExit} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            </Routes>
          </Router>
        </BillingProvider>
      </SessionProvider>
    </div>
  );
}

export default App;
