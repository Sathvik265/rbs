import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { updateMenuItem, getShiftStatus } from "./services/api";
import RecentBills from "./components/RecentBills";
import "./styles/App.css";

const BACKEND_URL = "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

// Basic UI Components (unchanged)
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white shadow-md rounded-lg border border-gray-200 ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <div className={`text-lg font-semibold text-gray-900 ${className}`}>
    <h3>{children}</h3>
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black ${className}`}
    {...props}
  />
));

const Button = ({
  children,
  onClick,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
  ...props
}) => {
  const baseClasses =
    "font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  };
  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} {
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Label = ({ children, className = "" }) => (
  <label
    className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
  >
    {children}
  </label>
);

const Table = ({ children, className = "" }) => (
  <div className="overflow-x-auto">
    <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
      {children}
    </table>
  </div>
);

const TableHeader = ({ children }) => (
  <thead className="bg-gray-50">{children}</thead>
);
const TableBody = ({ children }) => (
  <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
);
const TableRow = ({ children, className = "" }) => (
  <tr className={className}>{children}</tr>
);
const TableHead = ({ children, className = "" }) => (
  <th
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);
const TableCell = ({ children, className = "" }) => (
  <td
    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}
  >
    {children}
  </td>
);

const Tabs = ({ children, value, onValueChange }) => (
  <div className="w-full">
    {React.Children.map(
      children,
      (child) =>
        child &&
        React.cloneElement(child, {
          activeTab: value,
          onTabChange: onValueChange,
        })
    )}
  </div>
);

const TabsList = ({ children, activeTab, onTabChange }) => (
  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
    {React.Children.map(
      children,
      (child, index) =>
        child &&
        React.cloneElement(child, {
          isActive: child.props.value === activeTab,
          onClick: () => onTabChange && onTabChange(child.props.value),
        })
    )}
  </div>
);

const TabsTrigger = ({
  children,
  value,
  isActive,
  onClick,
  className = "",
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    } ${className}`}
  >
    {children}
  </button>
);

const TabsContent = ({ children, value, activeTab }) =>
  activeTab === value ? <div>{children}</div> : null;

const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black ${className}`}
    {...props}
  />
);

// Toast notification system
const toast = {
  success: (message) => {
    console.log("Success:", message);
    alert(message);
  },
  error: (message) => {
    console.error("Error:", message);
    alert(message);
  },
};

const LockKeyhole = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const ChefHat = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const FileText = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const History = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Printer = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Plus = ({ size = 16 }) => <span style={{ fontSize: size }}>+</span>;
const Minus = ({ size = 16 }) => <span style={{ fontSize: size }}>-</span>;
const Trash2 = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Save = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Settings = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Users = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Clock = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const HelpCircle = ({ size = 16 }) => <span style={{ fontSize: size }}></span>;
const Loader2 = ({ size = 16, className = "" }) => (
  <span
    className={`inline-block animate-spin ${className}`}
    style={{ fontSize: size }}
  >
    l
  </span>
);

// Safe utility functions (unchanged)
const safeGet = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return defaultValue;
      current = current[key];
    }
    return current === undefined ? defaultValue : current;
  } catch (e) {
    console.warn(`Safe get failed for path: ${path}`, e);
    return defaultValue;
  }
};

const safeArray = (arr, defaultValue = []) => {
  return Array.isArray(arr) ? arr : defaultValue;
};

const safeObject = (obj, defaultValue = {}) => {
  return obj && typeof obj === "object" && !Array.isArray(obj)
    ? obj
    : defaultValue;
};

// ULTRA SAFE BillPrint Component (unchanged)
function BillPrint({ billData = null }) {
  const data =
    billData || (typeof window !== "undefined" && window.printBillData) || null;

  if (!data) {
    console.log("BillPrint: No bill data available");
    return <div>No bill data</div>;
  }

  const header = safeObject(data.header);
  const items = safeArray(data.items);
  const billNumber = safeGet(header, "bill_number", "N/A");
  const tableNo = safeGet(header, "table_no", "N/A");
  const hotelName = safeGet(data, "hotel_name", "Restaurant");
  const address = safeGet(data, "address", "");
  const phone = safeGet(data, "phone", "");
  const gstin = safeGet(data, "gstin", "");
  const createdAt = safeGet(data, "created_at", null);
  const subtotal = safeGet(data, "subtotal", 0);
  const sgst = safeGet(data, "sgst", 0);
  const cgst = safeGet(data, "cgst", 0);
  const grandTotal = safeGet(data, "grand_total", 0);

  return (
    <div
      className="print-receipt"
      style={{ fontFamily: "monospace", fontSize: "12px", maxWidth: "300px" }}
    >
      <div className="text-center font-bold">{hotelName}</div>
      {address && <div className="text-center text-xs">{address}</div>}
      <div className="text-center text-xs">
        GST Included{gstin ? ` GSTIN: ${gstin}` : ""}
        {phone ? `  Ph: ${phone}` : ""}
      </div>
      <div className="text-center">{"=".repeat(40)}</div>
      <div className="flex justify-between">
        <span>Bill No</span>
        <span>{billNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{createdAt ? new Date(createdAt).toLocaleString() : "N/A"}</span>
      </div>
      <div className="flex justify-between">
        <span>Table</span>
        <span>{tableNo}</span>
      </div>
      <div>{"=".repeat(40)}</div>

      <table className="w-full">
        <thead>
          <tr>
            <th>No.</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const itemName = safeGet(item, "name", "Unknown Item");
            const quantity = safeGet(item, "quantity", 0);
            const unitPrice = safeGet(item, "unit_price", 0);
            const lineTotal = safeGet(item, "line_total", 0);
            return (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{itemName}</td>
                <td>{quantity}</td>
                <td>{Number(unitPrice).toFixed(2)}</td>
                <td>{Number(lineTotal).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div>{"=".repeat(40)}</div>
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span> {Number(subtotal).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>SGST (2.5%)</span>
        <span> {Number(sgst).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>CGST (2.5%)</span>
        <span> {Number(cgst).toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span> {Math.round(Number(grandTotal)).toFixed(2)}</span>
      </div>
      <div className="text-center text-xs mt-2">Thank you! Visit again</div>
    </div>
  );
}

function LoginPanel({ onLogin, onStartAdminVerification }) {
  const [credential, setCredential] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [track, setTrack] = useState("");

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit(event.shiftKey);
    }
  };

  const submit = async (isRoot = false) => {
    if (!date || !track) {
      toast.error("Please enter date and track.");
      return;
    }

    const validTracks = ["`", "``", "RBS1", "RBS2"];
    if (!validTracks.includes(track)) {
      toast.error("Invalid track. Valid tracks are '`', '``', 'RBS1', 'RBS2'.");
      return;
    }

    if (credential.toUpperCase() === "SHI" && isRoot) {
      if (onStartAdminVerification) {
        onStartAdminVerification(date, track);
      }
      return;
    }

    try {
      const res = await axios.post(`${API}/auth/login`, {
        staff_code: credential,
        is_root: isRoot,
        date: date,
        track: track,
      });

      if (onLogin) {
        onLogin(
          res.data.mode,
          date,
          track,
          res.data.session_id,
          res.data.shift_id
        );
      }

      toast.success(
        res.data.mode && res.data.mode.includes("admin")
          ? `Logged in as ${res.data.mode}`
          : "Clerk mode"
      );
    } catch (e) {
      if (onLogin) {
        onLogin("none", null, null, null, null);
      }
      toast.error(safeGet(e, "response.data.detail", "Invalid login"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Staff Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Credential</Label>
              <Input
                placeholder="Enter credential"
                className="col-span-2"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Date</Label>
              <Input
                type="date"
                className="col-span-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Track</Label>
              <Input
                type="text"
                placeholder="Enter track"
                className="col-span-2"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => submit(false)} className="w-full">
                Login
              </Button>
            </div>
            <div className="text-xs text-gray-600 text-center">
              Hint: Use 'CLK' for clerk, 'SHI' for admin. Track: '`', '``',
              'RBS1', 'RBS2'
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function AdminVerificationScreen({ onVerificationComplete }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (onVerificationComplete) {
          onVerificationComplete("admin-full");
        }
      }
    };

    const timer = setTimeout(() => {
      if (onVerificationComplete) {
        onVerificationComplete("admin-limited");
      }
    }, 5000);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onVerificationComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
      <Card>
        <CardContent className="text-center p-8">
          <div className="animate-spin inline-block mb-4">
            <Loader2 size={32} />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            Verifying Admin Access...
          </h2>
          <p className="text-sm text-gray-600">
            Press Alt+A now for full access
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
// ================== NEW SHIFT MANAGEMENT TAB ==================

function ShiftTab({ mode, sessionId, currentShift, currentDate }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isAdmin = mode && mode.includes("admin");
  const isClerk = mode === "clerk";

  // Load shift status for admin
  const loadShiftStatus = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/shifts/status`, {
        headers: { Authorization: "admin" },
      });
      setShifts(safeArray(res.data));
    } catch (e) {
      console.error("Failed to load shift status:", e);
      toast.error("Failed to load shift status");
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadShiftStatus();
      // Refresh every 30 seconds
      const interval = setInterval(loadShiftStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Close shift
  const handleCloseShift = async () => {
    if (!sessionId) return;

    try {
      const res = await axios.post(`${API}/shifts/close`, {
        session_id: sessionId,
      });

      toast.success(`Shift ${res.data.shift_name} closed successfully`);

      // Log out user
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error("Failed to close shift:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to close shift"));
    }

    setShowCloseConfirm(false);
  };

  // Toggle shift status (for admin)
  const handleToggleShift = async (shiftId, currentStatus) => {
    if (!isAdmin) return;

    const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";

    try {
      await axios.post(
        `${API}/shifts/manual-toggle`,
        {
          shift_id: shiftId,
          new_status: newStatus,
        },
        { headers: { Authorization: "admin" } }
      );

      toast.success(`Shift ${newStatus.toLowerCase()} successfully`);
      loadShiftStatus();
    } catch (e) {
      console.error("Failed to toggle shift:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to toggle shift"));
    }
  };

  const ClerkView = () => (
    <div className="text-center p-6 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Current Shift: {currentShift || "Unknown"}
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        You are currently working in shift {currentShift} on {currentDate}
      </p>
      <Button
        variant="destructive"
        onClick={() => setShowCloseConfirm(true)}
        className="w-full max-w-xs"
      >
        Close Shift & Logout
      </Button>
    </div>
  );

  const AdminView = () => (
    <>
      {loading ? (
        <div className="text-center py-8">
          <Loader2 size={24} className="mb-2" />
          <p>Loading shift status...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadShiftStatus} variant="outline" size="sm">
              Refresh Status
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.shift_id}>
                  <TableCell className="font-medium">
                    {shift.shift_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        shift.status === "OPEN"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {shift.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {shift.start_time
                      ? new Date(shift.start_time).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {shift.end_time
                      ? new Date(shift.end_time).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={
                        shift.status === "OPEN" ? "destructive" : "success"
                      }
                      onClick={() =>
                        handleToggleShift(shift.shift_id, shift.status)
                      }
                    >
                      {shift.status === "OPEN" ? "Close" : "Re-open"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {shifts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No shifts found for this date
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shift Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <div className="mb-4">
              <Button
                onClick={() => setShowCloseConfirm(true)}
                variant="destructive"
                size="sm"
              >
                Close Current Shift & Logout
              </Button>
            </div>
          )}
          {isClerk ? (
            <ClerkView />
          ) : isAdmin ? (
            <AdminView />
          ) : (
            <p>Access Denied</p>
          )}
        </CardContent>
      </Card>

      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Close Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Are you sure you want to close this shift? This will log you
                out.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCloseShift}
                  className="flex-1"
                >
                  Yes, Close Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// ================== FIXED REPORTING COMPONENTS ==================

function TimeRangeReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "21:00",
  });

  const generateReport = async () => {
    if (!sessionId) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/time-range`, {
        params: {
          date: filters.date,
          startTime: filters.startTime,
          endTime: filters.endTime,
        },
        headers: { Authorization: "admin" },
      });

      setReport(res.data);
      toast.success("Time range report generated successfully");
    } catch (e) {
      console.error("Failed to generate time range report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report")
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Range Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={filters.startTime}
                onChange={(e) =>
                  setFilters({ ...filters, startTime: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={filters.endTime}
                onChange={(e) =>
                  setFilters({ ...filters, endTime: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report && (
            <div className="mt-6 space-y-4">
              {report.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_number}</TableCell>
                        <TableCell>{bill.table_no}</TableCell>
                        <TableCell>
                          {Number(bill.grand_total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(bill.created_at).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bills found for the selected time range
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DateRangeReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const generateReport = async () => {
    if (!sessionId) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/date-range`, {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        headers: { Authorization: "admin" },
      });

      setReport(res.data);
      toast.success("Date range report generated successfully");
    } catch (e) {
      console.error("Failed to generate date range report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report")
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Range Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report && (
            <div className="mt-6 space-y-4">
              {report.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_number}</TableCell>
                        <TableCell>
                          {new Date(bill.bill_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{bill.table_no}</TableCell>
                        <TableCell>
                          {Number(bill.grand_total).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bills found for the selected date range
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ShiftReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    shiftName: "`",
  });

  const generateReport = async () => {
    if (!sessionId) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/by-shift`, {
        params: {
          date: filters.date,
          shift_name: filters.shiftName,
        },
        headers: { Authorization: "admin" },
      });

      setReport(res.data);
      toast.success("Shift report generated successfully");
    } catch (e) {
      console.error("Failed to generate shift report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report")
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Input
                type="text"
                value={filters.shiftName}
                onChange={(e) =>
                  setFilters({ ...filters, shiftName: e.target.value })
                }
                placeholder="`, ``, RBS1, RBS2"
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report && (
            <div className="mt-6 space-y-4">
              {report.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_number}</TableCell>
                        <TableCell>{bill.table_no}</TableCell>
                        <TableCell>
                          {Number(bill.grand_total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(bill.created_at).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bills found for the selected shift
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ItemReport({ sessionId }) {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const generateReport = async () => {
    if (!sessionId) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/by-item`, {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        headers: { Authorization: "admin" },
      });

      setReport(safeArray(res.data));
      toast.success("Item report generated successfully");
    } catch (e) {
      console.error("Failed to generate item report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report")
      );
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Sales Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-4">Item Sales Breakdown</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Morning (`)</TableHead>
                    <TableHead>Afternoon (``)</TableHead>
                    <TableHead>Evening (RBS1)</TableHead>
                    <TableHead>Night (RBS2)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.itemName}
                      </TableCell>
                      <TableCell className="font-bold">
                        {item.totalQuantity}
                      </TableCell>
                      <TableCell>{item.soldInShifts["`"] || 0}</TableCell>
                      <TableCell>{item.soldInShifts["``"] || 0}</TableCell>
                      <TableCell>{item.soldInShifts["RBS1"] || 0}</TableCell>
                      <TableCell>{item.soldInShifts["RBS2"] || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {report.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No data available for the selected date range
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EnhancedReconciliation({ sessionId, mode }) {
  const [unprintedBills, setUnprintedBills] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUnprintedBills = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/reconciliation/unprinted`, {
        headers: { Authorization: "admin" },
      });

      setUnprintedBills(safeArray(res.data));
    } catch (e) {
      console.error("Failed to load unprinted bills:", e);
      toast.error("Failed to load unprinted bills");
      setUnprintedBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode && mode.includes("admin")) {
      loadUnprintedBills();
    }
  }, [sessionId, mode]);

  if (!mode || !mode.includes("admin")) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation - Unprinted Bills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={loadUnprintedBills} variant="outline" size="sm">
            Refresh List
          </Button>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="mb-2" />
              <p>Loading unprinted bills...</p>
            </div>
          ) : unprintedBills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created in Shift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unprintedBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.bill_number}</TableCell>
                    <TableCell>
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{bill.table_no}</TableCell>
                    <TableCell>{Number(bill.grand_total).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {bill.shift_name}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No unprinted bills found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TopItemsDashboard({ sessionId }) {
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTopItems = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/dashboard/top-items`, {
        headers: { Authorization: "admin" },
      });

      setTopItems(safeArray(res.data));
    } catch (e) {
      console.error("Failed to load top items:", e);
      toast.error("Failed to load top items");
      setTopItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopItems();
    const interval = setInterval(loadTopItems, 300000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Best-Selling Items Today</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 size={24} className="mb-2" />
            <p>Loading top items...</p>
          </div>
        ) : topItems.length > 0 ? (
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{item.item_name}</h4>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.total_quantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sales data available for today
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FoodMenu({ mode }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    alpha_code: "",
    numeric_code: "",
    price_fixed: "",
    price_general: "",
    price_ac: "",
    category: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/menu`);
      setItems(safeArray(res.data));
    } catch (e) {
      console.error("Menu load error:", e);
      toast.error("Failed to load menu");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Edit modal state & handlers (admin only)
  const [editingItem, setEditingItem] = useState(null);
  const saveEditedItem = async () => {
    if (!editingItem) return;
    try {
      const payload = {
        name: editingItem.name,
        alpha_code: editingItem.alpha_code,
        numeric_code: editingItem.numeric_code,
        price_fixed: editingItem.price_fixed,
        price_general: editingItem.price_general,
        price_ac: editingItem.price_ac,
        category: editingItem.category,
      };
      await updateMenuItem(editingItem.id, payload);
      toast.success("Item updated");
      setEditingItem(null);
      // reload items
      load();
    } catch (e) {
      // Detailed error logging to help diagnose why the PUT did not reach/accept
      console.error("Failed to update item:", e);
      console.error("Error response:", e?.response);
      let userMessage = "Failed to update item";
      if (e?.response) {
        try {
          const status = e.response.status;
          const data = e.response.data;
          userMessage =
            (data && data.detail) ||
            (data && JSON.stringify(data)) ||
            `${e.message} (status ${status})`;
        } catch (inner) {
          userMessage = e.message;
        }
      } else {
        userMessage = e.message || userMessage;
      }
      toast.error(userMessage);
    }
  };

  const renderEditModal = () => {
    console.log("renderEditModal called", editingItem);
    if (!editingItem) return null;

    const overlayStyle = {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2147483647,
      padding: 12,
    };

    const cardStyle = {
      maxWidth: 560,
      width: "100%",
      zIndex: 2147483648,
    };

    const modal = (
      <div style={overlayStyle} aria-modal="true" role="dialog">
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle>Edit Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <Label>Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Alpha Code</Label>
                <Input
                  value={editingItem.alpha_code}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      alpha_code: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Numeric Code</Label>
                <Input
                  value={editingItem.numeric_code}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      numeric_code: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Fixed Price</Label>
                <Input
                  type="number"
                  value={editingItem.price_fixed}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price_fixed: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>General Price</Label>
                <Input
                  type="number"
                  value={editingItem.price_general}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price_general: e.target.value,
                    })
                  }
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={saveEditedItem}>Save</Button>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );

    // Render into document.body to avoid clipping/overflow issues and ensure it's on top
    return ReactDOM.createPortal(modal, document.body);
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async () => {
    if (!newItem.name || (!newItem.alpha_code && !newItem.numeric_code)) {
      toast.error("Please provide item name and at least one code");
      return;
    }

    try {
      await axios.post(`${API}/menu`, {
        ...newItem,
        price_fixed: parseFloat(newItem.price_fixed) || 0,
        price_general: parseFloat(newItem.price_general) || 0,
        price_ac: parseFloat(newItem.price_ac) || 0,
      });

      toast.success("Item added successfully");
      setNewItem({
        name: "",
        alpha_code: "",
        numeric_code: "",
        price_fixed: "",
        price_general: "",
        price_ac: "",
        category: "",
      });
      load();
    } catch (e) {
      console.error("Add item error:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to add item"));
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      await axios.delete(`${API}/menu/${itemId}`);
      toast.success("Item deleted successfully");
      load();
    } catch (e) {
      console.error("Delete item error:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to delete item"));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 size={24} className="mb-2" />
          <span>Loading menu...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food Menu ({items.length} items)</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "admin-full" && (
          <div className="grid grid-cols-7 gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
            <Input
              name="name"
              placeholder="Item Name"
              value={newItem.name}
              onChange={handleNewItemChange}
            />
            <Input
              name="alpha_code"
              placeholder="Alpha Code"
              value={newItem.alpha_code}
              onChange={handleNewItemChange}
            />
            <Input
              name="numeric_code"
              placeholder="Numeric Code"
              value={newItem.numeric_code}
              onChange={handleNewItemChange}
            />
            <Input
              name="price_fixed"
              type="number"
              step="0.01"
              placeholder="Fixed Price"
              value={newItem.price_fixed}
              onChange={handleNewItemChange}
            />
            <Input
              name="price_general"
              type="number"
              step="0.01"
              placeholder="General Price"
              value={newItem.price_general}
              onChange={handleNewItemChange}
            />
            <Input
              name="price_ac"
              type="number"
              step="0.01"
              placeholder="AC Price"
              value={newItem.price_ac}
              onChange={handleNewItemChange}
            />
            <Input
              name="category"
              placeholder="Category"
              value={newItem.category}
              onChange={handleNewItemChange}
            />
            <Button onClick={handleAddItem} className="col-span-7">
              + Add Item
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items found.{" "}
            {mode === "admin-full" && "Add some items above to get started."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Alpha Code</TableHead>
                <TableHead>Numeric Code</TableHead>
                <TableHead>Fixed Price</TableHead>
                <TableHead>General Price</TableHead>
                <TableHead>AC Price</TableHead>
                <TableHead>Category</TableHead>
                {mode === "admin-full" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={safeGet(item, "id", Math.random())}>
                  <TableCell>{safeGet(item, "name", "N/A")}</TableCell>
                  <TableCell>{safeGet(item, "alpha_code", "-")}</TableCell>
                  <TableCell>{safeGet(item, "numeric_code", "-")}</TableCell>
                  <TableCell>
                    {Number(safeGet(item, "price_fixed", 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {Number(safeGet(item, "price_general", 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {Number(safeGet(item, "price_ac", 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>{safeGet(item, "category", "-")}</TableCell>
                  {mode === "admin-full" && (
                    <TableCell>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // open edit modal
                            console.log("Edit clicked", safeGet(item, "id"));
                            setEditingItem({
                              id: safeGet(item, "id"),
                              name: safeGet(item, "name", ""),
                              alpha_code: safeGet(item, "alpha_code", ""),
                              numeric_code: safeGet(item, "numeric_code", ""),
                              price_fixed: safeGet(item, "price_fixed", 0),
                              price_general: safeGet(item, "price_general", 0),
                              price_ac: safeGet(item, "price_ac", 0),
                              category: safeGet(item, "category", ""),
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(safeGet(item, "id"))}
                        >
                          X
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {renderEditModal()}
        {/* DEBUG: Visible badge to show editingItem is set (temporary) */}
        {editingItem && (
          <div
            style={{
              position: "fixed",
              right: 12,
              bottom: 12,
              background: "rgba(220,38,38,0.9)",
              color: "white",
              padding: "8px 12px",
              borderRadius: 6,
              zIndex: 99999,
            }}
          >
            DEBUG: editingItem {editingItem.id}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Billing({
  drafts = {},
  setDrafts,
  currentTable = "",
  setCurrentTable,
  billingDate,
  activeTab,
  track = "",
  sessionId = null,
  activeShift,
}) {
  const [entryCode, setEntryCode] = useState("");
  const [qty, setQty] = useState(1);
  const [nextBillNumber, setNextBillNumber] = useState(null);
  const [loading, setLoading] = useState(false);

  const tableNoRef = useRef(null);
  const itemCodeRef = useRef(null);
  const qtyRef = useRef(null);

  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedHelpIndex, setSelectedHelpIndex] = useState(0);
  const searchInputRef = useRef(null);

  const currentDraft = useMemo(() => {
    const defaultDraft = {
      header: {
        table_no: currentTable || "",
        party_no: "1",
        section: "G",
        track: track || "",
        bill_number: null,
      },
      lines: [],
      modified_from_bill_id: null,
    };

    if (!drafts || !currentTable) {
      return defaultDraft;
    }

    const draft = drafts[currentTable];
    if (!draft) {
      return defaultDraft;
    }

    return {
      header: safeObject(draft.header, defaultDraft.header),
      lines: safeArray(draft.lines, []),
      modified_from_bill_id: draft.modified_from_bill_id || null,
    };
  }, [drafts, currentTable, track]);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await axios.get(`${API}/menu`);
        const items = safeArray(res.data);
        setMenuItems(items);
        setFilteredItems(items);
      } catch (e) {
        console.error("Failed to load menu for help:", e);
        toast.error("Failed to load menu for help panel");
        setMenuItems([]);
        setFilteredItems([]);
      }
    };
    loadMenu();
  }, []);

  useEffect(() => {
    if (activeTab === "billing" && tableNoRef.current) {
      tableNoRef.current.focus();
    }
  }, [activeTab]);

  const handlePrintBill = async () => {
    if (!currentTable) {
      toast.error("Please enter a table number before printing.");
      return;
    }

    let finalLines = safeArray(currentDraft.lines);
    if (document.activeElement === qtyRef.current && entryCode) {
      const newItem = await addItem(false);
      if (newItem) {
        finalLines = [...finalLines, newItem];
      } else {
        return;
      }
    }

    if (finalLines.length === 0) {
      toast.error("Please add at least one item to the bill.");
      return;
    }

    await createBill(finalLines);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key === "End" || event.key === "Home") {
        event.preventDefault();
        handlePrintBill();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [currentTable, entryCode, qty, currentDraft.lines]);

  useEffect(() => {
    if (billingDate) {
      const fetchNextBillNumber = async () => {
        try {
          const res = await axios.get(`${API}/bill/next_number`, {
            params: { bill_date: billingDate },
          });
          setNextBillNumber(safeGet(res, "data.bill_number", 1));
        } catch (e) {
          console.error("Failed to fetch bill number:", e);
          toast.error("Failed to fetch next bill number.");
          setNextBillNumber(1);
        }
      };
      fetchNextBillNumber();
    }
  }, [billingDate]);

  const onHeaderChange = (patch) => {
    if (!currentTable || !setDrafts) return;

    const newHeader = {
      ...safeObject(currentDraft.header),
      ...patch,
    };

    const newDraft = {
      ...currentDraft,
      header: newHeader,
    };

    setDrafts((prev) => ({
      ...safeObject(prev),
      [currentTable]: newDraft,
    }));
  };

  const setSectionByTable = (tableNo) => {
    const table = parseInt(tableNo, 10);
    if (isNaN(table)) return;

    let section = "G";
    if (table === 1) {
      section = "P";
    } else if (table >= 15 && table <= 30) {
      section = "AC";
    }
    onHeaderChange({ section });
  };

  const loadDataForTable = async (tableNo) => {
    if (!tableNo || !setDrafts) return;
    setSectionByTable(tableNo);
    if (drafts && drafts[tableNo]) return;

    try {
      const res = await axios.get(`${API}/bill/last`, {
        params: { table_no: tableNo, bill_date: billingDate },
      });

      const lastBill = res.data;
      setDrafts((prev) => ({
        ...safeObject(prev),
        [tableNo]: {
          header: safeObject(lastBill.header, {
            table_no: tableNo,
            party_no: "1",
            section: "G",
            bill_number: null,
          }),
          lines: safeArray(lastBill.items),
          modified_from_bill_id: lastBill.id,
        },
      }));
      toast.success(`Loaded last bill for table ${tableNo}`);
    } catch (e) {
      console.error("Error loading table data:", e);
      setDrafts((prev) => ({
        ...safeObject(prev),
        [tableNo]: {
          header: {
            table_no: tableNo,
            party_no: "1",
            section: "G",
            bill_number: null,
          },
          lines: [],
        },
      }));
    }
  };

  const handleTableNoKeyDown = (event) => {
    if (event.key === "PageDown") {
      if (itemCodeRef.current) {
        itemCodeRef.current.focus();
      }
    } else if (event.key === "Enter") {
      const newTableNo = event.target.value;
      if (setCurrentTable) {
        setCurrentTable(newTableNo);
      }
      loadDataForTable(newTableNo);
    }
  };

  const addItem = async (focusItemCode = true) => {
    if (!entryCode || !currentTable) return null;

    try {
      const res = await axios.get(`${API}/menu/lookup/${entryCode}`);
      const item = res.data;

      if (!item) {
        toast.error("Item not found");
        return null;
      }

      const section = safeGet(currentDraft, "header.section", "G");
      let unitPrice;

      switch (section) {
        case "AC":
          unitPrice = safeGet(item, "price_ac", 0);
          break;
        case "P":
          unitPrice = safeGet(item, "price_fixed", 0);
          break;
        default:
          unitPrice = safeGet(item, "price_general", 0);
      }

      const newLine = {
        code: entryCode.toUpperCase(),
        name: safeGet(item, "name", "Unknown Item"),
        quantity: qty || 1,
        unit_price: Number(unitPrice),
        line_total: Number((unitPrice * (qty || 1)).toFixed(2)),
      };

      if (focusItemCode && setDrafts) {
        const updatedLines = [...safeArray(currentDraft.lines), newLine];
        setDrafts((prev) => ({
          ...safeObject(prev),
          [currentTable]: {
            ...currentDraft,
            lines: updatedLines,
          },
        }));
        setEntryCode("");
        setQty(1);
        if (itemCodeRef.current) {
          itemCodeRef.current.focus();
        }
      }

      return newLine;
    } catch (e) {
      console.error("Add item error:", e);
      toast.error(safeGet(e, "response.data.detail", "Item not found"));
      return null;
    }
  };

  const handleItemCodeKeyDown = (e) => {
    if (e.key === "F1") {
      e.preventDefault();
      setShowHelp(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowHelp(false);
      if (itemCodeRef.current) {
        itemCodeRef.current.focus();
      }
    } else if (e.key === "Enter" && entryCode) {
      e.preventDefault();
      const item = menuItems.find(
        (i) =>
          safeGet(i, "numeric_code") === entryCode ||
          safeGet(i, "alpha_code", "").toLowerCase() === entryCode.toLowerCase()
      );
      if (item) {
        if (qtyRef.current) {
          qtyRef.current.focus();
          qtyRef.current.select();
        }
      } else {
        setShowHelp(true);
      }
    }
  };

  const handleQtyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const updateQty = (index, newQty) => {
    if (!setDrafts || !currentTable) return;
    if (newQty <= 0) {
      removeLine(index);
      return;
    }

    const lines = safeArray(currentDraft.lines);
    const updatedLines = lines.map((l, i) => {
      if (i !== index) return l;
      return {
        ...l,
        quantity: newQty,
        line_total: Number((safeGet(l, "unit_price", 0) * newQty).toFixed(2)),
      };
    });

    setDrafts((prev) => ({
      ...safeObject(prev),
      [currentTable]: {
        ...currentDraft,
        lines: updatedLines,
      },
    }));
  };

  const removeLine = (index) => {
    if (!setDrafts || !currentTable) return;
    const lines = safeArray(currentDraft.lines);
    const updatedLines = lines.filter((_, i) => i !== index);
    setDrafts((prev) => ({
      ...safeObject(prev),
      [currentTable]: {
        ...currentDraft,
        lines: updatedLines,
      },
    }));
  };

  const subtotal = useMemo(() => {
    const lines = safeArray(currentDraft.lines);
    return lines.reduce((s, l) => s + Number(safeGet(l, "line_total", 0)), 0);
  }, [currentDraft.lines]);

  const sgst = useMemo(() => Number((subtotal * 0.025).toFixed(2)), [subtotal]);
  const cgst = useMemo(() => Number((subtotal * 0.025).toFixed(2)), [subtotal]);
  const total = useMemo(
    () => Number((subtotal + sgst + cgst).toFixed(2)),
    [subtotal, sgst, cgst]
  );

  const createBill = async (lines) => {
    if (!lines || lines.length === 0) {
      toast.error("No items to bill");
      return;
    }

    setLoading(true);
    const header = safeObject(currentDraft.header);

    try {
      const payload = {
        header: {
          table_no: safeGet(header, "table_no", currentTable),
          party_no: safeGet(header, "party_no", "1"),
          section: safeGet(header, "section", "G"),
          track: activeShift?.shift_name || track || "`",
          clerk_initials: activeShift?.clerk_initials || "CLK",
        },
        item_codes: lines.map((l) => safeGet(l, "code", "")),
        quantities: lines.map((l) => safeGet(l, "quantity", 1)),
        bill_date: billingDate,
        modified_from_bill_id: currentDraft.modified_from_bill_id,
        session_id: sessionId,
      };

      const res = await axios.post(`${API}/bill`, payload);
      const billData = res.data;
      const billNumber = billData?.bill_number || "Unknown";

      toast.success(`Bill #${billNumber} created`);

      if (typeof window !== "undefined") {
        window.printBillData = billData;
      }

      if (setDrafts) {
        setDrafts((prev) => {
          const newDrafts = { ...safeObject(prev) };
          delete newDrafts[currentTable];
          return newDrafts;
        });
      }

      if (setCurrentTable) {
        setCurrentTable("");
      }

      setEntryCode("");
      setQty(1);
      setNextBillNumber(Number(safeGet(billData, "header.bill_number", 0)) + 1);

      setTimeout(() => {
        window.print();
        if (tableNoRef.current) {
          tableNoRef.current.focus();
        }
      }, 200);
    } catch (e) {
      console.error("Bill creation error:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to create bill"));
    } finally {
      setLoading(false);
    }
  };

  const displayBillNumber =
    safeGet(currentDraft, "header.bill_number") !== null
      ? safeGet(currentDraft, "header.bill_number")
      : nextBillNumber;

  useEffect(() => {
    if (showHelp) {
      setSearchQuery("");
      setFilteredItems([...menuItems]);
      setSelectedHelpIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 0);
    }
  }, [showHelp, menuItems]);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = menuItems.filter(
      (item) =>
        safeGet(item, "name", "").toLowerCase().includes(lowercasedQuery) ||
        safeGet(item, "numeric_code", "")
          .toLowerCase()
          .includes(lowercasedQuery) ||
        safeGet(item, "alpha_code", "").toLowerCase().includes(lowercasedQuery)
    );
    setFilteredItems(filtered);
    setSelectedHelpIndex(0);
  }, [searchQuery, menuItems]);

  const handleSearchKeyDown = (e) => {
    const itemsLength = filteredItems.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedHelpIndex((prev) => (prev + 1) % itemsLength);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedHelpIndex((prev) => (prev - 1 + itemsLength) % itemsLength);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedHelpIndex]) {
        const selectedItem = filteredItems[selectedHelpIndex];
        setEntryCode(
          safeGet(selectedItem, "numeric_code", "") ||
            safeGet(selectedItem, "alpha_code", "")
        );
        setShowHelp(false);
        if (qtyRef.current) {
          qtyRef.current.focus();
          qtyRef.current.select();
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowHelp(false);
      if (itemCodeRef.current) {
        itemCodeRef.current.focus();
      }
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing for {billingDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <Label>Table No</Label>
                <Input
                  ref={tableNoRef}
                  placeholder="Type & Enter"
                  value={currentTable}
                  onChange={(e) =>
                    setCurrentTable && setCurrentTable(e.target.value)
                  }
                  onKeyDown={handleTableNoKeyDown}
                />
              </div>
              <div>
                <Label>Party No.</Label>
                <Input
                  value={safeGet(currentDraft, "header.party_no", "")}
                  onChange={(e) => onHeaderChange({ party_no: e.target.value })}
                />
              </div>
              <div>
                <Label>Section</Label>
                <Input
                  value={safeGet(currentDraft, "header.section", "G")}
                  readOnly
                />
              </div>
              <div>
                <Label>Bill No.</Label>
                <Input value={displayBillNumber || "..."} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Item Code (F1 for Help)</Label>
                <Input
                  ref={itemCodeRef}
                  type="text"
                  placeholder="Enter Item Code"
                  value={entryCode}
                  onChange={(e) => setEntryCode(e.target.value)}
                  onKeyDown={handleItemCodeKeyDown}
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  ref={qtyRef}
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || 1)}
                  onKeyDown={handleQtyKeyDown}
                />
              </div>
            </div>

            <div className="mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeArray(currentDraft.lines).map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        {safeGet(l, "name", "Unknown Item")}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                          onClick={() => removeLine(idx)}
                        >
                          -
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          className="w-16"
                          value={safeGet(l, "quantity", 0)}
                          onChange={(e) =>
                            updateQty(idx, Number(e.target.value) || 1)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {Number(safeGet(l, "unit_price", 0)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {Number(safeGet(l, "line_total", 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-4 space-y-6 sticky-sidebar">
        <Card>
          <CardHeader>
            <CardTitle>Help</CardTitle>
          </CardHeader>
          <CardContent>
            {!showHelp && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Press F1 in Item Code to search for items.
                </p>
                <div>
                  <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li> F1: Open item search in Help Panel</li>
                    <li> Esc: Close item search in Help Panel</li>
                    <li> Enter: Move between fields / Add item</li>
                    <li> Arrow Up/Down: Navigate search results</li>
                    <li> PageDown: Move from Table No. to Item Code</li>
                    <li> End / Home: Finalize and Print Bill</li>
                  </ul>
                </div>
              </div>
            )}

            {showHelp && (
              <div>
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by code or name..."
                  className="mb-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />

                {filteredItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No items found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item, index) => (
                        <TableRow
                          key={safeGet(item, "id", Math.random())}
                          className={`cursor-pointer hover:bg-gray-100 ${
                            selectedHelpIndex === index ? "bg-blue-100" : ""
                          }`}
                          onClick={() => {
                            setEntryCode(
                              safeGet(item, "numeric_code", "") ||
                                safeGet(item, "alpha_code", "")
                            );
                            setShowHelp(false);
                            if (qtyRef.current) {
                              qtyRef.current.focus();
                              qtyRef.current.select();
                            }
                          }}
                        >
                          <TableCell>
                            {safeGet(item, "numeric_code", "") ||
                              safeGet(item, "alpha_code", "") ||
                              "-"}
                          </TableCell>
                          <TableCell>
                            {safeGet(item, "name", "Unknown")}
                          </TableCell>
                          <TableCell>
                            {" "}
                            {Number(safeGet(item, "price_general", 0)).toFixed(
                              2
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finalize Bill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (2.5%):</span>
                <span>{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (2.5%):</span>
                <span>{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total:</span>
                <span>{total.toFixed(2)}</span>
              </div>
              <Button
                onClick={handlePrintBill}
                disabled={loading || safeArray(currentDraft.lines).length === 0}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <Loader2 size={16} className="mr-2" />
                ) : (
                  "Print Bill"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsEditor({ settings, onChange }) {
  const [form, setForm] = useState(safeObject(settings));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(safeObject(settings));
  }, [settings]);

  const save = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API}/settings`, form);
      if (onChange) {
        onChange(res.data);
      }
      toast.success("Settings saved");
    } catch (e) {
      console.error("Settings save error:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to save settings")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Hotel Name</TableCell>
              <TableCell>
                <Input
                  value={safeGet(form, "hotel_name", "")}
                  onChange={(e) =>
                    setForm({ ...form, hotel_name: e.target.value })
                  }
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Phone</TableCell>
              <TableCell>
                <Input
                  value={safeGet(form, "phone", "")}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>GSTIN</TableCell>
              <TableCell>
                <Input
                  value={safeGet(form, "gstin", "")}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell>
                <Textarea
                  rows={2}
                  value={safeGet(form, "address", "")}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="mt-4">
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="mr-2" /> : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EnhancedAdminPanel({ mode, sessionId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState("dashboard");
  // local state for the nested Reports tabs so clicking triggers switches properly
  const [reportsInnerTab, setReportsInnerTab] = useState("time-range");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(safeObject(res.data));
    } catch (e) {
      console.error("Failed to load settings:", e);
      toast.error("Failed to load settings");
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "admin-full") {
      loadSettings();
    }
  }, [mode]);

  const isAdmin = mode && mode.includes("admin");

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="space-y-6">
            <TopItemsDashboard sessionId={sessionId} />
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            <Tabs value={reportsInnerTab} onValueChange={setReportsInnerTab}>
              <TabsList>
                <TabsTrigger value="time-range">Time Range</TabsTrigger>
                <TabsTrigger value="date-range">Date Range</TabsTrigger>
                <TabsTrigger value="shift-report">Shift Report</TabsTrigger>
                <TabsTrigger value="item-report">Item Report</TabsTrigger>
              </TabsList>

              <TabsContent value="time-range">
                <TimeRangeReport sessionId={sessionId} />
              </TabsContent>

              <TabsContent value="date-range">
                <DateRangeReport sessionId={sessionId} />
              </TabsContent>

              <TabsContent value="shift-report">
                <ShiftReport sessionId={sessionId} />
              </TabsContent>

              <TabsContent value="item-report">
                <ItemReport sessionId={sessionId} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="reconciliation">
          <EnhancedReconciliation sessionId={sessionId} mode={mode} />
        </TabsContent>

        <TabsContent value="settings">
          {loading ? (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 size={24} className="mb-2" />
                <span>Loading settings...</span>
              </CardContent>
            </Card>
          ) : (
            <SettingsEditor settings={settings} onChange={setSettings} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState("none");
  const [billingDate, setBillingDate] = useState(null);
  const [track, setTrack] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [shiftId, setShiftId] = useState(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  const isAdmin = mode && mode.includes("admin");
  const isClerk = mode === "clerk";

  const [drafts, setDrafts] = useState({});
  const [currentTable, setCurrentTable] = useState("");
  const [activeTab, setActiveTab] = useState("billing");
  const [activeShift, setActiveShift] = useState(null);

  useEffect(() => {
    const fetchShiftStatus = async () => {
      if (billingDate) {
        try {
          const status = await getShiftStatus(billingDate);
          const openShift = status.find((s) => s.status === "OPEN");
          setActiveShift(openShift);
        } catch (err) {
          console.error("Error fetching shift status:", err);
        }
      }
    };
    fetchShiftStatus();
  }, [billingDate]);

  const handleLogin = (newMode, date, newTrack, newSessionId, newShiftId) => {
    setMode(newMode);
    setBillingDate(date);
    setTrack(newTrack);
    setSessionId(newSessionId);
    setShiftId(newShiftId);
    setIsVerifyingAdmin(false);
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
    setShiftId(null);
    setDrafts({});
    setCurrentTable("");
    setActiveTab("billing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="max-w-7xl mx-auto">
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
          </div>
        )}
      </div>

      {/* Hidden print area */}
      <div className="hidden">
        <BillPrint />
      </div>
    </div>
  );
}
export default App;
