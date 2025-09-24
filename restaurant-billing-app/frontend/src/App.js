import React, { useState } from "react";
import "./styles/App.css";
import BillingScreen from "./components/BillingScreen";
import FoodMenu from "./components/FoodMenu";
import RecentBills from "./components/RecentBills";
import AdminDashboard from "./components/AdminDashboard";
import ShiftManagement from "./components/ShiftManagement";

function LoginPanel({ onLogin }) {
  const [credential, setCredential] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const submit = () => {
    const mode = credential.toLowerCase().includes("admin") ? "admin" : "clerk";
    onLogin(mode, date);
  };

  return (
    <div className="login-panel">
      <h2>Staff Login</h2>
      <div>
        <label>Credential</label>
        <input
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
        />
      </div>
      <div>
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button onClick={submit}>Login</button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("none");
  const [billingDate, setBillingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState("billing");

  const handleLogin = (newMode, date) => {
    setMode(newMode || "clerk");
    setBillingDate(date || billingDate);
    setActiveTab("billing");
  };

  const handleLogout = () => {
    setMode("none");
    setActiveTab("login");
  };

  if (mode === "none") return <LoginPanel onLogin={handleLogin} />;

  const isAdmin = mode && mode.includes("admin");

  return (
    <div className="app-root">
      <header>
        <h1>Restaurant Billing</h1>
        <div>
          Mode: {mode} | Date: {billingDate}
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setActiveTab("billing")}>Billing</button>
          <button onClick={() => setActiveTab("menu")}>Food Menu</button>
          <button onClick={() => setActiveTab("bills")}>Recent Bills</button>
          {isAdmin && (
            <button onClick={() => setActiveTab("admin")}>Admin</button>
          )}
          <button onClick={handleLogout} style={{ marginLeft: 8 }}>
            Logout
          </button>
        </div>
      </header>

      <main>
        {activeTab === "billing" && <BillingScreen billingDate={billingDate} />}
        {activeTab === "menu" && <FoodMenu />}
        {activeTab === "bills" && <RecentBills billingDate={billingDate} />}
        {activeTab === "admin" && isAdmin && (
          <div>
            <AdminDashboard />
            <ShiftManagement mode={mode} />
          </div>
        )}
      </main>
    </div>
  );
}
