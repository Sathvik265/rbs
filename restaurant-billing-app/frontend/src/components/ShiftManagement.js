import React, { useState, useEffect } from "react";
import { getCurrentShifts, closeShift, reopenShift } from "../services/api";

function ShiftManagement({ billingDate }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchShifts();
  }, [billingDate]);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await getCurrentShifts();
      setShifts(response.shifts || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching shifts:", err);
      setError("Failed to fetch shifts");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (shiftName) => {
    try {
      setActionLoading(shiftName);
      await closeShift("ADMIN", shiftName);
      await fetchShifts(); // Refresh data
      setError(null);
    } catch (err) {
      console.error("Error closing shift:", err);
      setError(`Failed to close ${shiftName} shift`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenShift = async (shiftId) => {
    try {
      setActionLoading(shiftId);
      await reopenShift(shiftId, "ADMIN");
      await fetchShifts(); // Refresh data
      setError(null);
    } catch (err) {
      console.error("Error reopening shift:", err);
      setError("Failed to reopen shift");
    } finally {
      setActionLoading(null);
    }
  };

  const getShiftDisplayName = (shiftName) => {
    switch (shiftName) {
      case "`":
        return "Morning Shift";
      case "``":
        return "Afternoon Shift";
      case "RBS1":
        return "Evening Shift (RBS1)";
      case "RBS2":
        return "Night Shift (RBS2)";
      default:
        return shiftName;
    }
  };

  if (loading) {
    return (
      <div className="shift-management">
        <h2>Shift Management</h2>
        <div className="loading">Loading shifts...</div>
      </div>
    );
  }

  return (
    <div className="shift-management">
      <div className="shift-header">
        <h2>Shift Management</h2>
        <div className="shift-date">
          <span>Date: {billingDate}</span>
          <button onClick={fetchShifts} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="shifts-grid">
        {shifts.length === 0 ? (
          <div className="no-shifts">
            <p>No shifts found for {billingDate}</p>
            <p>Shifts are automatically created at the start of each day.</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div
              key={shift.shift_id}
              className={`shift-card ${shift.status.toLowerCase()}`}
            >
              <div className="shift-card-header">
                <h3>{getShiftDisplayName(shift.shift_name)}</h3>
                <span className={`status-badge ${shift.status.toLowerCase()}`}>
                  {shift.status}
                </span>
              </div>

              <div className="shift-details">
                <div className="detail-row">
                  <span>Start Time:</span>
                  <span>{new Date(shift.start_time).toLocaleTimeString()}</span>
                </div>

                {shift.end_time && (
                  <div className="detail-row">
                    <span>End Time:</span>
                    <span>{new Date(shift.end_time).toLocaleTimeString()}</span>
                  </div>
                )}

                {shift.closed_by && (
                  <div className="detail-row">
                    <span>Closed By:</span>
                    <span>{shift.closed_by}</span>
                  </div>
                )}
              </div>

              <div className="shift-actions">
                {shift.status === "OPEN" ? (
                  <button
                    onClick={() => handleCloseShift(shift.shift_name)}
                    disabled={actionLoading === shift.shift_name}
                    className="close-shift-btn"
                  >
                    {actionLoading === shift.shift_name
                      ? "Closing..."
                      : "Close Shift"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopenShift(shift.shift_id)}
                    disabled={actionLoading === shift.shift_id}
                    className="reopen-shift-btn"
                  >
                    {actionLoading === shift.shift_id
                      ? "Reopening..."
                      : "Reopen Shift"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shift-info">
        <h3>Shift Information</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>Morning Shift (`)</h4>
            <p>6:00 AM - 12:00 PM</p>
          </div>
          <div className="info-card">
            <h4>Afternoon Shift (``)</h4>
            <p>12:00 PM - 6:00 PM</p>
          </div>
          <div className="info-card">
            <h4>Evening Shift (RBS1)</h4>
            <p>6:00 PM - 10:00 PM</p>
          </div>
          <div className="info-card">
            <h4>Night Shift (RBS2)</h4>
            <p>10:00 PM - 6:00 AM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShiftManagement;
