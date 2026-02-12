import React, { useEffect, useState } from "react";
import PrintPortal from "./components/PrintPortal";
import { getShiftStatus } from "./services/api";
import RecentBills from "./components/RecentBills";
import { LoginPanel, AdminVerificationScreen } from "./components/LoginPanel";
import BillPrint from "./components/BillPrint";
import ShiftTab from "./components/ShiftManagement";
import FoodMenu from "./components/FoodMenu";
import Billing from "./components/BillingScreen";
import EnhancedAdminPanel from "./components/AdminPanel";
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./components/ui/UIComponents";
import { toast } from "./utils/helpers";
import "./styles/App.css";

function App() {
  const [mode, setMode] = useState(
    () => localStorage.getItem("mode") || "none",
  );
  const [billingDate, setBillingDate] = useState(
    () => localStorage.getItem("billingDate") || null,
  );
  const [track, setTrack] = useState(() => localStorage.getItem("track") || "");
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem("sessionId") || null,
  );
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  const isAdmin = mode && mode.includes("admin");

  const [drafts, setDrafts] = useState({});
  const [currentTable, setCurrentTable] = useState("");
  const [activeTab, setActiveTab] = useState("billing");
  const [activeShift, setActiveShift] = useState(null);
  const [isShiftLoading, setIsShiftLoading] = useState(true);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    const fetchShiftStatus = async () => {
      if (billingDate && track) {
        setIsShiftLoading(true);
        try {
          const status = await getShiftStatus(billingDate);
          const openShift = status.find(
            (s) => s.status === "OPEN" && s.shift_name === track,
          );
          setActiveShift(openShift || status.find((s) => s.status === "OPEN"));
        } catch (err) {
          console.error("Error fetching shift status:", err);
        } finally {
          setIsShiftLoading(false);
        }
      }
    };
    fetchShiftStatus();
  }, [billingDate, track]);

  const handleLogin = (newMode, date, newTrack, newSessionId) => {
    setMode(newMode);
    setBillingDate(date);
    setTrack(newTrack);
    setSessionId(newSessionId);
    setIsVerifyingAdmin(false);
    localStorage.setItem("mode", newMode);
    localStorage.setItem("billingDate", date);
    localStorage.setItem("track", newTrack);
    localStorage.setItem("sessionId", newSessionId);
  };

  const handleStartAdminVerification = (date, newTrack) => {
    setBillingDate(date);
    setTrack(newTrack);
    setIsVerifyingAdmin(true);
  };

  const handleVerificationComplete = (adminMode) => {
    setMode(adminMode);
    setIsVerifyingAdmin(false);
    toast.success(`Logged in as ${adminMode}`);
  };

  const handleLogout = () => {
    setMode("none");
    setBillingDate(null);
    setTrack("");
    setSessionId(null);
    setDrafts({});
    setCurrentTable("");
    setActiveTab("billing");
    localStorage.removeItem("mode");
    localStorage.removeItem("billingDate");
    localStorage.removeItem("track");
    localStorage.removeItem("sessionId");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="max-w-7xl mx-auto no-print">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Udupi Anand Bhavan — Billing System
          </h1>
          {mode !== "none" && billingDate && (
            <div className="mt-2 text-sm text-gray-600">
              Mode: {mode} | Date: {billingDate} | Track: {track || "Default"}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="ml-4"
              >
                Logout
              </Button>
            </div>
          )}
        </div>

        {mode === "none" ? (
          isVerifyingAdmin ? (
            <AdminVerificationScreen
              onVerificationComplete={handleVerificationComplete}
            />
          ) : (
            <div className="flex justify-center">
              <LoginPanel
                onLogin={handleLogin}
                onStartAdminVerification={handleStartAdminVerification}
              />
            </div>
          )
        ) : (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="recent-bills">Recent Bills</TabsTrigger>
                <TabsTrigger value="shifts">Shifts</TabsTrigger>
                <TabsTrigger value="menu">Food Menu</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
              </TabsList>

              <TabsContent value="billing">
                <Billing
                  drafts={drafts}
                  setDrafts={setDrafts}
                  currentTable={currentTable}
                  setCurrentTable={setCurrentTable}
                  billingDate={billingDate}
                  activeTab={activeTab}
                  track={track}
                  sessionId={sessionId}
                  activeShift={activeShift}
                  isShiftLoading={isShiftLoading}
                  setPrintData={setPrintData}
                />
              </TabsContent>

              <TabsContent value="recent-bills">
                <RecentBills billingDate={billingDate} />
              </TabsContent>

              <TabsContent value="shifts">
                <ShiftTab
                  mode={mode}
                  sessionId={sessionId}
                  currentShift={track}
                  currentDate={billingDate}
                />
              </TabsContent>

              <TabsContent value="menu">
                <FoodMenu mode={mode} />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="admin">
                  <EnhancedAdminPanel mode={mode} sessionId={sessionId} />
                </TabsContent>
              )}
            </Tabs>
            {/* Print area - Rendered via Portal outside main root */}
            <PrintPortal>
              <div className="bill-print-area">
                <BillPrint billData={printData} />
              </div>
            </PrintPortal>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
