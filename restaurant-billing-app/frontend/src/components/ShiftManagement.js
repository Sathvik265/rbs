import React, { useState, useEffect, useCallback } from "react";
import { getCurrentShifts, manualToggleShift } from "../services/api";

// Show a compact 4-row table for admins, and the existing card/grid view for clerks
function ShiftManagement({ billingDate, mode = "clerk" }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching shifts for date:", billingDate);
      const response = await getCurrentShifts(billingDate);
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
  }, [billingDate]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleToggleShift = async (shiftId, currentStatus) => {
    const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";

    try {
      setActionLoading(shiftId);
      console.log(
        `Toggling shift ${shiftId} from ${currentStatus} to ${newStatus}`
      );

      // pass billingDate so demo or date-aware backend endpoints toggle the correct day's shift
      await manualToggleShift(shiftId, newStatus, billingDate);
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

  // Admin wants a 4-row table with statuses for all shifts
  const isAdmin = mode && mode.toLowerCase().includes("admin");

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
      ) : // If admin mode, render a table with the 4 shifts and their statuses
      isAdmin ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Shift
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Start Time
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  End Time
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Closed By
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {["`", "``", "RBS1", "RBS2"].map((sName) => {
                const shift = shifts.find((x) => x.shift_name === sName) || {};
                return (
                  <tr key={sName}>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {getShiftDisplayName(sName)}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {shift.start_time
                        ? new Date(shift.start_time).toLocaleTimeString()
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {shift.end_time
                        ? new Date(shift.end_time).toLocaleTimeString()
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <strong>
                        {(shift.status || "CLOSED").toUpperCase()}
                      </strong>
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {shift.closed_by || "-"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <button
                        onClick={() =>
                          // only call when we have a valid session id
                          shift.session_id &&
                          handleToggleShift(
                            shift.session_id,
                            shift.status || "CLOSED"
                          )
                        }
                        disabled={
                          !shift.session_id ||
                          actionLoading === shift.session_id
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: 4,
                          border: "none",
                          backgroundColor:
                            shift.status === "OPEN" ? "#f44336" : "#4CAF50",
                          color: "white",
                          cursor:
                            !shift.session_id ||
                            actionLoading === shift.session_id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {actionLoading === shift.session_id
                          ? "Processing..."
                          : shift.status === "OPEN"
                          ? "Close"
                          : "Open"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              key={shift.session_id}
              className={`shift-card ${String(
                shift.status || ""
              ).toLowerCase()}`}
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
                  {shift.start_time
                    ? new Date(shift.start_time).toLocaleTimeString()
                    : "-"}
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
                    // ensure we have a valid session id
                    shift.session_id &&
                    handleToggleShift(shift.session_id, shift.status)
                  }
                  disabled={actionLoading === shift.session_id}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor:
                      shift.status === "OPEN" ? "#f44336" : "#4CAF50",
                    color: "white",
                    cursor:
                      actionLoading === shift.session_id
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {actionLoading === shift.session_id
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
