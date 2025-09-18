import React, { useState, useEffect } from "react";
import { itemService } from "../services/itemService";
import { sessionService } from "../services/sessionService";
import "../styles/AdminDashboard.css";

const AdminDashboard = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    billsGenerated: 0,
    itemsCancelled: 0,
    activeSessions: 0,
  });
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simple authentication - in production this would be more secure
  const handleAuth = (e) => {
    e.preventDefault();
    if (authCode === "ADMIN123") {
      // This should be from environment variable
      setIsAuthenticated(true);
      loadDashboardData();
    } else {
      alert("Invalid admin code");
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load summary data
      const today = new Date().toISOString().split("T")[0];
      const sessionsData = await sessionService.getSessionsByDateRange(
        today,
        today
      );
      setSessions(sessionsData);

      // Calculate totals
      const totalRevenue = sessionsData.reduce(
        (sum, session) => sum + parseFloat(session.total_amount || 0),
        0
      );
      const billsGenerated = sessionsData.reduce(
        (sum, session) => sum + parseInt(session.total_bills || 0),
        0
      );
      const activeSessions = sessionsData.filter(
        (session) => session.is_active
      ).length;

      setDashboardData({
        totalRevenue: totalRevenue.toFixed(2),
        billsGenerated,
        itemsCancelled: 0, // This would need a separate query
        activeSessions,
      });

      // Load items
      const itemsData = await itemService.getAllItems(100);
      setItems(itemsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onExit();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="admin-auth">
        <div className="auth-container">
          <h2>Admin Authentication</h2>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Enter admin code"
              autoFocus
            />
            <button type="submit">Login</button>
          </form>
          <button onClick={onExit} className="exit-btn">
            Exit (ESC)
          </button>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="dashboard-content">
      <h2>Dashboard Overview</h2>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Revenue</h3>
          <p className="metric-value">₹{dashboardData.totalRevenue}</p>
        </div>
        <div className="metric-card">
          <h3>Bills Generated</h3>
          <p className="metric-value">{dashboardData.billsGenerated}</p>
        </div>
        <div className="metric-card">
          <h3>Items Cancelled</h3>
          <p className="metric-value">{dashboardData.itemsCancelled}</p>
        </div>
        <div className="metric-card">
          <h3>Active Sessions</h3>
          <p className="metric-value">{dashboardData.activeSessions}</p>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Sessions</h3>
        <div className="sessions-table">
          <table>
            <thead>
              <tr>
                <th>Clerk</th>
                <th>Shift</th>
                <th>Date</th>
                <th>Bills</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map((session) => (
                <tr key={session.id}>
                  <td>{session.clerk_initials}</td>
                  <td>{session.shift_code}</td>
                  <td>{session.session_date}</td>
                  <td>{session.total_bills || 0}</td>
                  <td>₹{parseFloat(session.total_amount || 0).toFixed(2)}</td>
                  <td>
                    <span
                      className={`status ${
                        session.is_active ? "active" : "closed"
                      }`}
                    >
                      {session.is_active ? "Active" : "Closed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMenuManagement = () => (
    <div className="menu-content">
      <h2>Menu Management</h2>
      <div className="menu-actions">
        <button className="action-btn">Add New Item</button>
        <button className="action-btn">Import Items</button>
        <button className="action-btn">Export Menu</button>
      </div>
      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Group</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.item_code}</td>
                <td>{item.item_name}</td>
                <td>{item.category}</td>
                <td>₹{item.unit_price}</td>
                <td>{item.item_group}</td>
                <td>
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="reports-content">
      <h2>Reports</h2>
      <div className="report-types">
        <button className="report-btn">Daily Summary</button>
        <button className="report-btn">Weekly Report</button>
        <button className="report-btn">Monthly Report</button>
        <button className="report-btn">Cancellation Log</button>
        <button className="report-btn">Shift Summary</button>
      </div>
      <div className="report-filters">
        <input type="date" placeholder="Start Date" />
        <input type="date" placeholder="End Date" />
        <button className="generate-btn">Generate Report</button>
        <button className="export-btn">Export CSV</button>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="settings-content">
      <h2>System Settings</h2>
      <div className="settings-form">
        <div className="form-group">
          <label>Hotel Name:</label>
          <input type="text" defaultValue="Anandabhavan Restaurant" />
        </div>
        <div className="form-group">
          <label>GST Number:</label>
          <input type="text" defaultValue="29ABCDE1234F1Z5" />
        </div>
        <div className="form-group">
          <label>SGST Rate (%):</label>
          <input type="number" defaultValue="2.5" step="0.1" />
        </div>
        <div className="form-group">
          <label>CGST Rate (%):</label>
          <input type="number" defaultValue="2.5" step="0.1" />
        </div>
        <div className="form-group">
          <label>Footer Text:</label>
          <textarea defaultValue="Thank you! Visit Again"></textarea>
        </div>
        <button className="save-btn">Save Settings</button>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={onExit} className="exit-admin-btn">
          Exit (ESC)
        </button>
      </div>

      <div className="admin-nav">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          Menu
        </button>
        <button
          className={activeTab === "reports" ? "active" : ""}
          onClick={() => setActiveTab("reports")}
        >
          Reports
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "menu" && renderMenuManagement()}
            {activeTab === "reports" && renderReports()}
            {activeTab === "settings" && renderSystemSettings()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
