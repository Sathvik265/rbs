import React, { useState, useEffect } from "react";
import { sessionService } from "../services/sessionService";
import "../styles/ShiftManagement.css";

const ShiftManagement = ({ onLogin, session }) => {
  const [formData, setFormData] = useState({
    clerkInitials: "",
    shiftCode: "",
    sessionDate: new Date().toISOString().split("T")[0],
    terminalId: "POS-001",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResuming, setIsResuming] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "clerkInitials" ? value.toUpperCase() : value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.clerkInitials.trim() || !formData.shiftCode.trim()) {
      setError("Clerk initials and shift code are required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const sessionData = await sessionService.login(
        formData.clerkInitials.trim(),
        formData.shiftCode.trim(),
        formData.sessionDate,
        formData.terminalId
      );

      setIsResuming(!sessionData.isNewSession);
      onLogin(sessionData);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      await sessionService.endShift(session.id);
      onLogin(null); // Clear session
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.target.name === "clerkInitials") {
        document.getElementsByName("shiftCode")[0]?.focus();
      } else if (e.target.name === "shiftCode") {
        document.getElementsByName("sessionDate")[0]?.focus();
      } else if (e.target.name === "sessionDate") {
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="shift-management">
      <div className="login-container">
        <div className="login-header">
          <h1>Restaurant Billing System</h1>
          <h2>Shift Management</h2>
        </div>

        {session ? (
          <div className="active-session">
            <h3>Active Session</h3>
            <div className="session-info">
              <p>
                <strong>Clerk:</strong> {session.clerk_initials}
              </p>
              <p>
                <strong>Shift:</strong> {session.shift_code}
              </p>
              <p>
                <strong>Date:</strong> {session.session_date}
              </p>
              <p>
                <strong>Login Time:</strong>{" "}
                {new Date(session.login_timestamp).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleEndShift}
              disabled={isLoading}
              className="end-shift-btn"
            >
              {isLoading ? "Ending Shift..." : "End Shift (Ctrl+E)"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="clerkInitials">Clerk Initials:</label>
              <input
                type="text"
                id="clerkInitials"
                name="clerkInitials"
                value={formData.clerkInitials}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={10}
                placeholder="Enter your initials"
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="shiftCode">Shift Code:</label>
              <input
                type="text"
                id="shiftCode"
                name="shiftCode"
                value={formData.shiftCode}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={20}
                placeholder="e.g., S, RBS, RBS1"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sessionDate">Date:</label>
              <input
                type="date"
                id="sessionDate"
                name="sessionDate"
                value={formData.sessionDate}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={isLoading} className="login-btn">
              {isLoading ? "Logging in..." : "Start/Resume Shift"}
            </button>

            <div className="keyboard-shortcuts">
              <h4>Keyboard Shortcuts:</h4>
              <ul>
                <li>Enter: Move to next field / Submit</li>
                <li>Tab: Navigate between fields</li>
                <li>Ctrl+Alt+Shift+A: Admin Mode</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ShiftManagement;
