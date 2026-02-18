import React, { useEffect, useState } from "react";
import { getShiftStatus } from "./services/api";
import RecentBills from "./components/RecentBills";
import { LoginPanel } from "./components/LoginPanel";
import BillPrint from "./components/BillPrint";
import ShiftTab from "./components/ShiftManagement";
import FoodMenu from "./components/FoodMenu";
import Billing from "./components/BillingScreen";
import EnhancedAdminPanel from "./components/AdminPanel";
import PrintPortal from "./components/PrintPortal";
import { useUser } from "./context/UserContext";
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
  // Use global user context
  const {
    userInitials,
    setUserInitials,
    track,
    setTrack,
    billingDate,
    setBillingDate,
    sessionId,
    setSessionId,
  } = useUser();

  const [mode, setMode] = useState(
    () => localStorage.getItem("mode") || "none",
  );

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
    fetchShiftStatus();
  }, [billingDate, track]);

  // State for admin jump target (shortcuts)
  const [adminJumpTarget, setAdminJumpTarget] = useState(null);

  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Admin Main Tabs (Ctrl + Alt + Number)
      if (e.ctrlKey && e.altKey) {
        switch (e.key) {
          case "1":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "dashboard" });
            }
            break;
          case "2":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "reports" });
            }
            break;
          case "3":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "reconciliation" });
            }
            break;
          case "4":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "settings" });
            }
            break;
          default:
            break;
        }
      }
      // Admin Reports Sub-tabs (Ctrl + Shift + Number)
      else if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case "1": // Time Range
          case "!":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "reports", subTab: "time-range" });
            }
            break;
          case "2": // Date Range
          case "@":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "reports", subTab: "date-range" });
            }
            break;
          case "3": // Shift Report
          case "#":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "reports", subTab: "shift-report" });
            }
            break;
          case "4": // Item Report
          case "$":
            if (isAdmin) {
              setActiveTab("admin");
              setAdminJumpTarget({ tab: "reports", subTab: "item-report" });
            }
            break;
          default:
            break;
        }
      }
      // Main Tabs (Alt + Number)
      else if (e.altKey) {
        switch (e.key) {
          case "1":
            setActiveTab("billing");
            break;
          case "2":
            setActiveTab("recent-bills");
            break;
          case "3":
            setActiveTab("shifts");
            break;
          case "4":
            setActiveTab("menu");
            break;
          case "5":
            if (isAdmin) setActiveTab("admin");
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [isAdmin]);

  const handleLogin = (
    newMode,
    date,
    newTrack,
    newSessionId,
    initials = "CLK",
  ) => {
    setMode(newMode);
    setBillingDate(date);
    setTrack(newTrack);
    setSessionId(newSessionId);
    setUserInitials(initials);
    localStorage.setItem("mode", newMode);
  };

  const handleLogout = () => {
    setMode("none");
    setBillingDate(null);
    setTrack("");
    setSessionId(null);
    setUserInitials("CLK");
    setDrafts({});
    setCurrentTable("");
    setActiveTab("billing");
    localStorage.removeItem("mode");
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Kamalanatha Vitthala Prasid
          </h1>
          {mode !== "none" && billingDate && (
            <div className="mt-2 text-sm text-gray-300">
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
          <div className="flex-1 flex items-center justify-center">
            <LoginPanel onLogin={handleLogin} />
          </div>
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
                  userInitials={userInitials} // Passed prop
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
                  <EnhancedAdminPanel
                    mode={mode}
                    sessionId={sessionId}
                    jumpTarget={adminJumpTarget}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>

      {/* Hidden print area */}
      <div className="hidden">
        <PrintPortal>
          <div className="bill-print-area print-receipt print-area">
            <BillPrint billData={printData} />
          </div>
        </PrintPortal>
      </div>
    </div>
  );
}

export default App;
