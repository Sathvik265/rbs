import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

// Basic UI Components
const Card = ({ children, className = "" }) => (
  <div className={`border rounded-lg shadow-sm bg-white ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
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
      className={`${baseClasses} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
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
  <div>
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
  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
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
    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
    } ${className}`}
  >
    {children}
  </button>
);

const TabsContent = ({ children, value, activeTab }) =>
  activeTab === value ? <div>{children}</div> : null;

const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    {...props}
  />
);

// Toast notification system
const toast = {
  success: (message) => {
    console.log("Success:", message);
    alert("✅ " + message);
  },
  error: (message) => {
    console.error("Error:", message);
    alert("❌ " + message);
  },
};

// Icons
const LockKeyhole = ({ size = 16 }) => (
  <span style={{ fontSize: size }}>🔒</span>
);
const ChefHat = ({ size = 16 }) => <span style={{ fontSize: size }}>👨‍🍳</span>;
const FileText = ({ size = 16 }) => <span style={{ fontSize: size }}>📄</span>;
const History = ({ size = 16 }) => <span style={{ fontSize: size }}>📊</span>;
const Printer = ({ size = 16 }) => <span style={{ fontSize: size }}>🖨️</span>;
const Plus = ({ size = 16 }) => <span style={{ fontSize: size }}>➕</span>;
const Minus = ({ size = 16 }) => <span style={{ fontSize: size }}>➖</span>;
const Trash2 = ({ size = 16 }) => <span style={{ fontSize: size }}>🗑️</span>;
const Save = ({ size = 16 }) => <span style={{ fontSize: size }}>💾</span>;
const HelpCircle = ({ size = 16 }) => (
  <span style={{ fontSize: size }}>❓</span>
);
const Loader2 = ({ size = 16, className = "" }) => (
  <span
    className={`inline-block animate-spin ${className}`}
    style={{ fontSize: size }}
  >
    ⏳
  </span>
);

// Safe utility functions
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

// ULTRA SAFE BillPrint Component
function BillPrint({ billData = null }) {
  const data =
    billData || (typeof window !== "undefined" && window.printBillData) || null;

  if (!data) {
    console.log("BillPrint: No bill data available");
    return <div style={{ display: "none" }}>No bill data</div>;
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
      <div className="text-center font-bold text-base">{hotelName}</div>
      {address && <div className="text-center text-xs">{address}</div>}
      <div className="text-center text-xs">
        GST Included{gstin ? ` • GSTIN: ${gstin}` : ""}
        {phone ? ` • Ph: ${phone}` : ""}
      </div>
      <div className="divider">{"=".repeat(40)}</div>
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
      <div className="divider">{"=".repeat(40)}</div>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left w-12">No.</th>
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Amt</th>
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
                <td className="text-right">{quantity}</td>
                <td className="text-right">{Number(unitPrice).toFixed(2)}</td>
                <td className="text-right">{Number(lineTotal).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="divider">{"=".repeat(40)}</div>
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>₹ {Number(subtotal).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>SGST (2.5%)</span>
        <span>₹ {Number(sgst).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>CGST (2.5%)</span>
        <span>₹ {Number(cgst).toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>₹ {Math.round(Number(grandTotal)).toFixed(2)}</span>
      </div>
      <div className="text-center mt-2 text-xs">Thank you! Visit again</div>
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
      toast.error("Please select a date and track.");
      return;
    }

    const validTracks = ["", "`", "RBS1", "RBS2"];
    if (
      !validTracks.map((t) => t.toUpperCase()).includes(track.toUpperCase())
    ) {
      toast.error(
        "Invalid track selected. Valid tracks are ' ', '`', 'RBS1', 'RBS2'."
      );
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
      });

      if (onLogin) {
        onLogin(res.data.mode, date, track);
      }

      toast.success(
        res.data.mode && res.data.mode.includes("admin")
          ? `Logged in as ${res.data.mode}`
          : "Clerk mode"
      );
    } catch (e) {
      if (onLogin) {
        onLogin("none", null, null);
      }
      toast.error(safeGet(e, "response.data.detail", "Invalid login"));
    }
  };

  return (
    <Card className="max-w-md mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole size={18} /> Staff Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 items-center gap-3">
          <Label className="text-sm">Credential</Label>
          <Input
            placeholder="Enter credential"
            className="col-span-2"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <Label className="text-sm">Date</Label>
          <Input
            type="date"
            className="col-span-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <Label className="text-sm">Track</Label>
          <Input
            placeholder="e.g., RBS1"
            className="col-span-2"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => submit(false)} className="px-5">
            Enter
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          <p>
            Hint: Use 'CLK' for clerk, 'SHI' for admin, or 'SHI' + Shift+Enter
            for root admin.
          </p>
        </div>
      </CardContent>
    </Card>
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
    <div className="flex flex-col items-center justify-center min-h-50vh">
      <Loader2 size={48} className="text-orange-500 mb-4" />
      <p className="mt-4 text-lg text-gray-600">Verifying Admin Access...</p>
      <p className="text-sm text-gray-500">Press Alt+A now for full access</p>
    </div>
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
      <Card className="shadow-md">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 size={24} className="mr-2" />
          Loading menu...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat size={18} /> Food Menu ({items.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "admin-full" && (
          <div className="grid grid-cols-8 gap-2 mb-4 items-end">
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
            <Button onClick={handleAddItem} disabled={!newItem.name}>
              Add Item
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
                <TableRow key={item.id || Math.random()}>
                  <TableCell>{safeGet(item, "name", "N/A")}</TableCell>
                  <TableCell>{safeGet(item, "alpha_code", "-")}</TableCell>
                  <TableCell>{safeGet(item, "numeric_code", "-")}</TableCell>
                  <TableCell>
                    ₹ {Number(safeGet(item, "price_fixed", 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ₹ {Number(safeGet(item, "price_general", 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ₹ {Number(safeGet(item, "price_ac", 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>{safeGet(item, "category", "-")}</TableCell>
                  {mode === "admin-full" && (
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          track: safeGet(header, "track", track),
          clerk_initials: "CLK",
        },
        item_codes: lines.map((l) => safeGet(l, "code", "")),
        quantities: lines.map((l) => safeGet(l, "quantity", 1)),
        bill_date: billingDate,
        modified_from_bill_id: currentDraft.modified_from_bill_id,
      };

      const res = await axios.post(`${API}/bill`, payload);
      const billData = res.data;

      const billNumber = safeGet(billData, "header.bill_number", "Unknown");
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
    <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-8">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Billing for {billingDate}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div className="grid grid-cols-4 gap-4">
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
                <Input value={displayBillNumber || ""} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-5">
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
              <div className="col-span-2">
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
              <div className="col-span-5 flex gap-2">
                <Button
                  onClick={() => addItem()}
                  disabled={!currentTable || loading}
                  className="w-full"
                >
                  Add Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentTable && setDrafts) {
                      setDrafts((prev) => ({
                        ...safeObject(prev),
                        [currentTable]: {
                          ...currentDraft,
                          lines: [],
                        },
                      }));
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  Clear Items
                </Button>
              </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden">
              <div className="h-full overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12">No.</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right w-48">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeArray(currentDraft.lines).map((l, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          {safeGet(l, "name", "Unknown Item")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateQty(
                                  idx,
                                  Number(safeGet(l, "quantity", 1)) - 1
                                )
                              }
                              disabled={loading}
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="w-8 text-center">
                              {safeGet(l, "quantity", 0)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateQty(
                                  idx,
                                  Number(safeGet(l, "quantity", 1)) + 1
                                )
                              }
                              disabled={loading}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ₹ {Number(safeGet(l, "unit_price", 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹ {Number(safeGet(l, "line_total", 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle size={18} />
              Help
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {!showHelp && (
              <div className="text-sm text-gray-600 my-auto space-y-4">
                <p className="text-center">
                  Press F1 in Item Code to search for items.
                </p>
                <div>
                  <h4 className="font-semibold mb-2 text-center">
                    Keyboard Shortcuts
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>
                      <span className="font-semibold">F1</span>: Open item
                      search in Help Panel
                    </li>
                    <li>
                      <span className="font-semibold">Esc</span>: Close item
                      search in Help Panel
                    </li>
                    <li>
                      <span className="font-semibold">Enter</span>: Move between
                      fields / Add item
                    </li>
                    <li>
                      <span className="font-semibold">Arrow Up/Down</span>:
                      Navigate search results
                    </li>
                    <li>
                      <span className="font-semibold">PageDown</span>: Move from
                      Table No. to Item Code
                    </li>
                    <li>
                      <span className="font-semibold">End / Home</span>:
                      Finalize and Print Bill
                    </li>
                  </ul>
                </div>
              </div>
            )}
            {showHelp && (
              <div className="flex flex-col h-full">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by code or name..."
                  className="mb-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                <div className="flex-1 border rounded-md overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No items found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-50">
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Price</TableHead>
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
                            <TableCell className="text-right">
                              ₹
                              {Number(
                                safeGet(item, "price_general", 0)
                              ).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finalize Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (2.5%):</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (2.5%):</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="h-12 text-lg gap-2 w-full"
              onClick={handlePrintBill}
              disabled={
                loading ||
                !currentTable ||
                safeArray(currentDraft.lines).length === 0
              }
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Printer size={20} /> Print Bill
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="print-area hidden">
        <BillPrint />
      </div>
    </div>
  );
}

function RecentBills({ billingDate }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecentBills = async () => {
    if (!billingDate) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/bills/by_date`, {
        params: { bill_date: billingDate },
      });
      setBills(safeArray(res.data));
    } catch (e) {
      console.error("Failed to load recent bills:", e);
      toast.error("Failed to load recent bills.");
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentBills();
  }, [billingDate]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History size={18} /> Recent Bills for{" "}
          {billingDate || "No Date Selected"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={24} className="mr-2" />
            Loading bills...
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No bills found for this date.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={safeGet(bill, "id", Math.random())}>
                  <TableCell>{safeGet(bill, "bill_number", "N/A")}</TableCell>
                  <TableCell>{safeGet(bill, "table_no", "N/A")}</TableCell>
                  <TableCell>
                    {safeGet(bill, "created_at")
                      ? new Date(bill.created_at).toLocaleTimeString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    ₹ {Number(safeGet(bill, "grand_total", 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
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
        <CardTitle className="flex items-center gap-2">
          <Save size={16} /> Receipt Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
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
        <div className="flex justify-end">
          <Button onClick={save} className="gap-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- ADMIN MODULE COMPONENTS ---

// Enhanced Admin Dashboard Component
function EnhancedAdminDashboard({ mode }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/dashboard`);
      setDashboardData(res.data);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "admin-full") {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  if (mode !== "admin-full") return null;

  if (loading && !dashboardData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 size={24} className="mr-2" />
          Loading dashboard...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Sales</p>
                <p className="text-2xl font-bold">
                  ₹{dashboardData?.totalSales?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="text-green-600 text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bills Generated</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.totalBills || 0}
                </p>
              </div>
              <div className="text-blue-600 text-2xl">📄</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Occupied Tables</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.occupiedTables || 0}
                </p>
              </div>
              <div className="text-orange-600 text-2xl">🪑</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vacant Tables</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.vacantTables || 0}
                </p>
              </div>
              <div className="text-gray-600 text-2xl">🪑</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Best-Selling Items Today</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.topSellingItems?.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No sales data for today
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboardData?.topSellingItems || []).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item.sales.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={loadDashboardData}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "🔄"}
          Refresh Data
        </Button>
      </div>
    </div>
  );
}

// Sales Reports Component
function SalesReports({ mode }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reportType: "daily",
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports/sales`, {
        params: {
          start_date: filters.startDate,
          end_date: filters.endDate,
          report_type: filters.reportType,
        },
      });
      setReportData(res.data);
    } catch (e) {
      console.error("Failed to generate report:", e);
      toast.error("Failed to generate sales report");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    let csvContent = "Sales Report\n\n";
    csvContent += `Period: ${filters.startDate} to ${filters.endDate}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    csvContent += "SUMMARY\n";
    csvContent += `Total Revenue,₹${reportData.summary.totalRevenue.toFixed(
      2
    )}\n`;
    csvContent += `Total Orders,${reportData.summary.totalOrders}\n`;
    csvContent += `Days Covered,${reportData.summary.daysCovered}\n`;
    csvContent += `Average Order Value,₹${reportData.summary.averageOrderValue.toFixed(
      2
    )}\n\n`;

    csvContent += "ITEMS BREAKDOWN\n";
    csvContent += "Item Name,Quantity,Avg Price,Total Sales,Times Ordered\n";
    reportData.itemsBreakdown.forEach((item) => {
      csvContent += `${item.name},${item.quantity},₹${item.avgPrice.toFixed(
        2
      )},₹${item.totalSales.toFixed(2)},${item.timesOrdered}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (mode !== "admin-full") return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Report Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
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
            <div>
              <Label>Report Type</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.reportType}
                onChange={(e) =>
                  setFilters({ ...filters, reportType: e.target.value })
                }
              >
                <option value="daily">Daily Breakdown</option>
                <option value="summary">Summary Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "📊"
                )}
                Generate Report
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setFilters({ ...filters, startDate: today, endDate: today });
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(
                  today.getTime() - 7 * 24 * 60 * 60 * 1000
                );
                setFilters({
                  ...filters,
                  startDate: weekAgo.toISOString().split("T")[0],
                  endDate: today.toISOString().split("T")[0],
                });
              }}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const monthAgo = new Date(
                  today.getTime() - 30 * 24 * 60 * 60 * 1000
                );
                setFilters({
                  ...filters,
                  startDate: monthAgo.toISOString().split("T")[0],
                  endDate: today.toISOString().split("T")[0],
                });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Report Summary</CardTitle>
              <Button
                onClick={exportReport}
                variant="outline"
                className="gap-2"
              >
                📥 Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-xl font-bold">
                    ₹{reportData.summary.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-xl font-bold">
                    {reportData.summary.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                  <p className="text-xl font-bold">
                    ₹{reportData.summary.averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Clerks</p>
                  <p className="text-xl font-bold">
                    {reportData.summary.activeClerks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">Cash</p>
                  <p className="text-lg font-bold">
                    ₹{reportData.paymentSummary.cash.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">60% of total</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">Card</p>
                  <p className="text-lg font-bold">
                    ₹{reportData.paymentSummary.card.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">35% of total</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">UPI</p>
                  <p className="text-lg font-bold">
                    ₹{reportData.paymentSummary.upi.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">5% of total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Times Ordered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.itemsBreakdown.slice(0, 10).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{item.avgPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{item.totalSales.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.timesOrdered}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reportData.itemsBreakdown.length > 10 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Showing top 10 items. Full data available in CSV export.
                </p>
              )}
            </CardContent>
          </Card>

          {filters.reportType === "daily" &&
            reportData.dailyBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Bills</TableHead>
                        <TableHead className="text-right">
                          Total Sales
                        </TableHead>
                        <TableHead className="text-right">
                          Unique Tables
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.dailyBreakdown.map((day, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(day.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.billsCount}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{day.totalSales.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.uniqueTables}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}

// Shift Reconciliation Component
function ShiftReconciliation({ mode }) {
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reconciliation/shifts`, {
        params: { date: selectedDate },
      });
      setShifts(res.data.shifts || []);
    } catch (e) {
      console.error("Failed to load shifts:", e);
      toast.error("Failed to load shift data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "admin-full") {
      loadShifts();
    }
  }, [selectedDate, mode]);

  const submitReconciliation = async (shiftId, actualAmount, notes) => {
    try {
      const res = await axios.post(`${API}/admin/reconciliation/submit`, {
        shift_id: shiftId,
        actual_cash_amount: parseFloat(actualAmount),
        notes: notes,
        reconciled_by: "Admin",
      });

      toast.success("Reconciliation submitted successfully");
      setShowReconciliation(false);
      setSelectedShift(null);
      loadShifts();

      return res.data.reconciliation;
    } catch (e) {
      console.error("Reconciliation error:", e);
      toast.error("Failed to submit reconciliation");
      return null;
    }
  };

  if (mode !== "admin-full") return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shift Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button onClick={loadShifts} disabled={loading} className="gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "🔍"}
              Load Shifts
            </Button>
          </div>
        </CardContent>
      </Card>

      {shifts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              No shifts found for the selected date
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Shifts for {new Date(selectedDate).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clerk</TableHead>
                  <TableHead>Shift Code</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Expected Cash</TableHead>
                  <TableHead className="text-right">Tables Served</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">
                      {shift.clerkInitials}
                    </TableCell>
                    <TableCell>{shift.shiftCode}</TableCell>
                    <TableCell>
                      {new Date(shift.loginTime).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          shift.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {shift.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {shift.totalBills}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{shift.expectedCash.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {shift.tablesServed}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedShift(shift);
                          setShowReconciliation(true);
                        }}
                        disabled={shift.expectedCash === 0}
                      >
                        Reconcile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {showReconciliation && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Cash Reconciliation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Shift Details</p>
                <p className="font-medium">
                  {selectedShift.clerkInitials} - {selectedShift.shiftCode}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  Expected Cash (from bills)
                </p>
                <p className="text-lg font-bold text-green-600">
                  ₹{selectedShift.expectedCash.toFixed(2)}
                </p>
              </div>

              <div>
                <Label>Actual Cash Counted</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  id="actualCash"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Any discrepancies or notes..."
                  id="notes"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReconciliation(false);
                    setSelectedShift(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const actualAmount =
                      document.getElementById("actualCash").value;
                    const notes = document.getElementById("notes").value;

                    if (!actualAmount) {
                      toast.error("Please enter actual cash amount");
                      return;
                    }

                    submitReconciliation(selectedShift.id, actualAmount, notes);
                  }}
                >
                  Submit Reconciliation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Consolidated AdminPanel Component
function AdminPanel({ mode }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState("dashboard");

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
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="gap-1">
                📊 Dashboard
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1">
                📈 Sales Reports
              </TabsTrigger>
              <TabsTrigger value="reconciliation" className="gap-1">
                💰 Reconciliation
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1">
                ⚙️ Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <EnhancedAdminDashboard mode={mode} />
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <SalesReports mode={mode} />
            </TabsContent>

            <TabsContent value="reconciliation" className="mt-6">
              <ShiftReconciliation mode={mode} />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              {loading ? (
                <Card>
                  <CardContent className="flex items-center justify-center p-8">
                    <Loader2 size={24} className="mr-2" />
                    Loading settings...
                  </CardContent>
                </Card>
              ) : (
                <SettingsEditor settings={settings} onChange={setSettings} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
function App() {
  const [mode, setMode] = useState("none");
  const [billingDate, setBillingDate] = useState(null);
  const [track, setTrack] = useState("");
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  const isAdmin = mode && mode.includes("admin");
  const [drafts, setDrafts] = useState({});
  const [currentTable, setCurrentTable] = useState("");
  const [activeTab, setActiveTab] = useState("billing");

  const handleLogin = (newMode, date, newTrack) => {
    setMode(newMode);
    setBillingDate(date);
    setTrack(newTrack);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Udupi Anand Bhavan — Billing System
          </h1>
          {mode !== "none" && billingDate && (
            <p className="text-sm text-gray-600 mt-1">
              Mode: {mode} | Date: {billingDate} | Track: {track || "Default"}
            </p>
          )}
        </div>

        {mode === "none" ? (
          isVerifyingAdmin ? (
            <AdminVerificationScreen
              onVerificationComplete={handleVerificationComplete}
            />
          ) : (
            <div className="max-w-3xl">
              <LoginPanel
                onLogin={handleLogin}
                onStartAdminVerification={handleStartAdminVerification}
              />
            </div>
          )
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="billing" className="gap-1">
                <FileText size={14} /> Billing
              </TabsTrigger>
              <TabsTrigger value="menu" className="gap-1">
                <ChefHat size={14} /> Food Menu
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-1">
                <History size={14} /> Recent Bills
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="gap-1">
                  <LockKeyhole size={14} /> Admin
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="billing" className="mt-4">
              <Billing
                drafts={drafts}
                setDrafts={setDrafts}
                currentTable={currentTable}
                setCurrentTable={setCurrentTable}
                billingDate={billingDate}
                activeTab={activeTab}
                track={track}
              />
            </TabsContent>

            <TabsContent value="menu" className="mt-4">
              <FoodMenu mode={mode} />
            </TabsContent>

            <TabsContent value="recent" className="mt-4">
              <RecentBills billingDate={billingDate} />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="mt-4">
                <AdminPanel mode={mode} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default App;
