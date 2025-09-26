import React, { useState, useEffect } from "react";
import { getCurrentShifts, manualToggleShift } from "../services/api";

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
      console.log("Fetching shifts...");
      const response = await getCurrentShifts();
      console.log("Shifts response:", response);

      // Handle both array response and object with shifts property
      const shiftsData = Array.isArray(response)
        ? response
        : response.shifts || response;
      setShifts(shiftsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching shifts:", err);
      setError(
        "Failed to fetch shifts: " + (err.response?.data?.detail || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShift = async (shiftId, currentStatus) => {
    const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";

    try {
      setActionLoading(shiftId);
      console.log(
        `Toggling shift ${shiftId} from ${currentStatus} to ${newStatus}`
      );

      await manualToggleShift(shiftId, newStatus);
      await fetchShifts(); // Refresh data
      setError(null);
    } catch (err) {
      console.error("Error toggling shift:", err);
      setError(
        `Failed to ${newStatus.toLowerCase()} shift: ` +
          (err.response?.data?.detail || err.message)
      );
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
      <div className="shift-management" style={{ padding: "20px" }}>
        <h2>Shift Management</h2>
        <div className="loading">Loading shifts...</div>
      </div>
    );
  }

  return (
    <div className="shift-management" style={{ padding: "20px" }}>
      <div className="shift-header">
        <h2>Shift Management</h2>
        <div
          className="shift-date"
          style={{ marginBottom: "20px", color: "#666" }}
        >
          Date: {billingDate}
        </div>
      </div>

      {error && (
        <div
          className="error-message"
          style={{
            color: "red",
            padding: "10px",
            margin: "10px 0",
            border: "1px solid red",
            borderRadius: "4px",
            backgroundColor: "#f8d7da",
          }}
        >
          {error}
        </div>
      )}

      {shifts.length === 0 ? (
        <div
          className="no-shifts"
          style={{
            padding: "20px",
            textAlign: "center",
            border: "1px solid #ccc",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <p>No shifts found for {billingDate}</p>
          <small>
            Shifts are automatically created at the start of each day.
          </small>
        </div>
      ) : (
        <div
          className="shifts-container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {shifts.map((shift) => (
            <div
              key={shift.shift_id}
              className={`shift-card ${shift.status.toLowerCase()}`}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "20px",
                backgroundColor:
                  shift.status === "OPEN" ? "#e8f5e8" : "#f5e8e8",
              }}
            >
              <div
                className="shift-card-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {getShiftDisplayName(shift.shift_name)}
                </h3>
                <span
                  className={`status-badge ${shift.status.toLowerCase()}`}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor:
                      shift.status === "OPEN" ? "#4CAF50" : "#f44336",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {shift.status}
                </span>
              </div>

              <div className="shift-details" style={{ marginBottom: "15px" }}>
                <div className="shift-time" style={{ marginBottom: "8px" }}>
                  <strong>Start Time:</strong>{" "}
                  {new Date(shift.start_time).toLocaleTimeString()}
                </div>
                {shift.end_time && (
                  <div className="shift-time" style={{ marginBottom: "8px" }}>
                    <strong>End Time:</strong>{" "}
                    {new Date(shift.end_time).toLocaleTimeString()}
                  </div>
                )}
                {shift.closed_by && (
                  <div className="shift-time" style={{ marginBottom: "8px" }}>
                    <strong>Closed By:</strong> {shift.closed_by}
                  </div>
                )}
              </div>

              <div className="shift-actions">
                <button
                  onClick={() =>
                    handleToggleShift(shift.shift_id, shift.status)
                  }
                  disabled={actionLoading === shift.shift_id}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor:
                      shift.status === "OPEN" ? "#f44336" : "#4CAF50",
                    color: "white",
                    cursor:
                      actionLoading === shift.shift_id
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {actionLoading === shift.shift_id
                    ? shift.status === "OPEN"
                      ? "Closing..."
                      : "Reopening..."
                    : shift.status === "OPEN"
                    ? "Close Shift"
                    : "Reopen Shift"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="shift-info" style={{ marginTop: "40px" }}>
        <h3>Shift Information</h3>
        <div
          className="shift-schedule"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "15px",
            marginTop: "15px",
          }}
        >
          <div
            className="schedule-item"
            style={{
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>
              Morning Shift (`)
            </h4>
            <p style={{ margin: 0, color: "#666" }}>6:00 AM - 12:00 PM</p>
          </div>
          <div
            className="schedule-item"
            style={{
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>
              Afternoon Shift (``)
            </h4>
            <p style={{ margin: 0, color: "#666" }}>12:00 PM - 6:00 PM</p>
          </div>
          <div
            className="schedule-item"
            style={{
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>
              Evening Shift (RBS1)
            </h4>
            <p style={{ margin: 0, color: "#666" }}>6:00 PM - 10:00 PM</p>
          </div>
          <div
            className="schedule-item"
            style={{
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>
              Night Shift (RBS2)
            </h4>
            <p style={{ margin: 0, color: "#666" }}>10:00 PM - 6:00 AM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShiftManagement;
