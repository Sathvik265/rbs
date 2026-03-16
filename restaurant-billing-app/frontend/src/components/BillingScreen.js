import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Label,
  Loader2,
} from "./ui/UIComponents";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/Table";
import {
  createOrder,
  createBill as createBillAPI,
  getBillById,
  getPendingOrdersByTableAndParty,
  getAllPendingOrders,
  getLastBillNumber,
} from "../services/api";
import { API, toast, safeGet, safeArray, safeObject } from "../utils/helpers";

export default function Billing({
  drafts = {},
  setDrafts,
  currentTable = "",
  setCurrentTable,
  billingDate,
  activeTab,
  track = "",
  sessionId = null,
  activeShift,
  userInitials, // New prop
  isShiftLoading,
  setPrintData,
}) {
  const [entryCode, setEntryCode] = useState("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSplitBillMode, setIsSplitBillMode] = useState(false);
  const [nextBillNumber, setNextBillNumber] = useState(null);

  // --- REFS FOR NAVIGATION ---
  const tableNoRef = useRef(null);
  const partyNoRef = useRef(null);
  const sectionRef = useRef(null);
  const itemCodeRef = useRef(null);
  const qtyRef = useRef(null);
  const searchInputRef = useRef(null);

  // Array ref for item quantity inputs
  const itemQtyRefs = useRef([]);
  // Array ref for item rows (navigation mode)
  const itemRowRefs = useRef([]);

  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedHelpIndex, setSelectedHelpIndex] = useState(0);

  // Dynamic GST percentages
  const [sgstPercentage, setSgstPercentage] = useState(2.5);
  const [cgstPercentage, setCgstPercentage] = useState(2.5);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const clerk =
          userInitials || (activeShift && activeShift.clerk_initials) || "CLK";
        const res = await axios.get(`${API}/settings?clerk=${clerk}`);
        if (res.data) {
          setSgstPercentage(parseFloat(res.data.sgst_percentage) || 0);
          setCgstPercentage(parseFloat(res.data.cgst_percentage) || 0);
        }
      } catch (err) {
        console.error("Failed to load settings for taxes:", err);
      }
    };
    fetchSettings();
  }, [userInitials, activeShift]);

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
    const fetchLastBillNumber = async () => {
      try {
        console.log("Fetching last bill number for date:", billingDate);
        const res = await getLastBillNumber(billingDate);
        console.log("Last bill number response:", res);

        // The API returns the *last* bill number. We want to show the *next* one.
        const lastNum = parseInt(res.last_bill_number, 10);
        console.log("Parsed last number:", lastNum);

        if (!isNaN(lastNum)) {
          setNextBillNumber(lastNum + 1);
        } else {
          setNextBillNumber(1); // Default to 1 if no bills exist
        }
      } catch (e) {
        console.error("Failed to fetch last bill number:", e);
        // Fallback or leave as null
      }
    };

    if (activeTab === "billing" || activeTab === "home") {
      fetchLastBillNumber();
    }
  }, [billingDate, activeTab, drafts]); // Re-fetch when drafts change (bill created) or tab/date changes

  useEffect(() => {
    if (activeTab === "billing" && tableNoRef.current) {
      tableNoRef.current.focus();
    }
  }, [activeTab]);

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

  const getSectionForTable = (tableNo) => {
    const table = parseInt(tableNo, 10);
    if (isNaN(table)) return "G";
    if (table === 1) return "P";
    if (table >= 15 && table <= 30) return "AC";
    return "G";
  };

  const setSectionByTable = (tableNo) => {
    const section = getSectionForTable(tableNo);
    // Ensure we trigger the update on the CURRENT draft if it exists
    if (onHeaderChange) {
      onHeaderChange({ section });
    }
  };

  const loadDataForTable = async (tableNo) => {
    if (!tableNo || !setDrafts) return;

    // First, try to update existing draft if any (might be redundant if we overwrite below, but good for UI consistency)
    setSectionByTable(tableNo);

    if (drafts && drafts[tableNo]) return;

    let initialLines = [];
    let modifiedFromBillId = null;

    // Calculate section for new draft
    const initialSection = getSectionForTable(tableNo);

    try {
      const pendingOrders = await getPendingOrdersByTableAndParty(tableNo, "1");
      if (pendingOrders && pendingOrders.length > 0) {
        initialLines = pendingOrders.map((order) => ({
          code: order.item_code || order.numeric_item_code,
          name: order.item_name,
          quantity: order.quantity,
          unit_price: order.unit_price,
          line_total: order.line_total,
          numeric_code: order.numeric_item_code,
          alpha_code: order.item_code,
          is_separate: !!order.is_separate,
        }));
        toast.success(
          `Loaded ${pendingOrders.length} pending items for Table ${tableNo}`,
        );
      }
    } catch (error) {
      console.error("Failed to load pending orders:", error);
      toast.error("Failed to load pending orders for this table.");
    }

    setDrafts((prev) => ({
      ...safeObject(prev),
      [tableNo]: {
        header: {
          table_no: tableNo,
          party_no: "1",
          section: initialSection, // Use the correct section
          bill_number: null,
        },
        lines: initialLines,
        modified_from_bill_id: modifiedFromBillId,
      },
    }));
  };

  // --- NAVIGATION HANDLERS ---
  const handleTableNoKeyDown = (event) => {
    if (event.key === "PageDown") {
      event.preventDefault();
      if (itemCodeRef.current) itemCodeRef.current.focus();
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const newTableNo = event.target.value;
      if (setCurrentTable) {
        setCurrentTable(newTableNo);
      }
      loadDataForTable(newTableNo);
      if (partyNoRef.current) partyNoRef.current.focus();
    }
  };

  const handlePartyNoKeyDown = (event) => {
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      // Skip Section, go to Item Code
      if (itemCodeRef.current) itemCodeRef.current.focus();
    }
  };

  const handleSectionKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (itemCodeRef.current) itemCodeRef.current.focus();
    }
  };

  const handleItemCodeKeyDown = (e) => {
    if (e.key === "F1") {
      e.preventDefault();
      setShowHelp(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowHelp(false);
      if (tableNoRef.current) {
        tableNoRef.current.focus();
      }
    } else if (e.key === "Enter" && entryCode) {
      e.preventDefault();
      const item = menuItems.find(
        (i) =>
          safeGet(i, "numeric_code") === entryCode ||
          safeGet(i, "alpha_code", "").toLowerCase() ===
            entryCode.toLowerCase(),
      );
      if (item) {
        if (qtyRef.current) {
          qtyRef.current.focus();
          qtyRef.current.select();
        }
      } else {
        setShowHelp(true);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Focus first row if exists
      if (itemRowRefs.current[0]) {
        itemRowRefs.current[0].focus();
      }
    }
  };

  const handleQtyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const handleTableQtyKeyDown = (e, index) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) {
        itemQtyRefs.current[index - 1]?.focus();
        itemQtyRefs.current[index - 1]?.select();
      } else {
        qtyRef.current?.focus();
        qtyRef.current?.select();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < safeArray(currentDraft.lines).length - 1) {
        itemQtyRefs.current[index + 1]?.focus();
        itemQtyRefs.current[index + 1]?.select();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Move to next input or just handle confirm?
      // Default behavior: cycle down
      if (index < safeArray(currentDraft.lines).length - 1) {
        itemQtyRefs.current[index + 1]?.focus();
        itemQtyRefs.current[index + 1]?.select();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Switch back to Nav Mode (Focus Row)
      itemRowRefs.current[index]?.focus();
    }
  };

  const handleRowKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Switch to Edit Mode (Focus Input)
      itemQtyRefs.current[index]?.focus();
      itemQtyRefs.current[index]?.select();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = index + 1;
      if (itemRowRefs.current[next]) {
        itemRowRefs.current[next].focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = index - 1;
      if (prev >= 0 && itemRowRefs.current[prev]) {
        itemRowRefs.current[prev].focus();
      } else if (prev < 0) {
        // Back to item code
        if (itemCodeRef.current) itemCodeRef.current.focus();
      }
    }
  };

  const updateQty = (index, val) => {
    if (!setDrafts || !currentTable) return;

    let newQty = val;
    if (val !== "") {
      newQty = Number(val);
      if (newQty <= 0) {
        removeLine(index);
        return;
      }
    }

    const lines = safeArray(currentDraft.lines);
    const updatedLines = lines.map((l, i) => {
      if (i !== index) return l;
      return {
        ...l,
        quantity: newQty,
        line_total: Number(
          (safeGet(l, "unit_price", 0) * (Number(newQty) || 0)).toFixed(2),
        ),
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

  const sgst = useMemo(
    () => Number((subtotal * (sgstPercentage / 100)).toFixed(2)),
    [subtotal, sgstPercentage],
  );
  const cgst = useMemo(
    () => Number((subtotal * (cgstPercentage / 100)).toFixed(2)),
    [subtotal, cgstPercentage],
  );
  const total = useMemo(
    () => Number((subtotal + sgst + cgst).toFixed(2)),
    [subtotal, sgst, cgst],
  );

  const createBill = useCallback(
    async (lines) => {
      if (!lines || lines.length === 0) {
        toast.error("No items to bill");
        return;
      }
      setLoading(true);
      const header = safeObject(currentDraft.header);

      try {
        const payload = {
          table_no: safeGet(header, "table_no", currentTable),
          party_no: safeGet(header, "party_no", "1"),
          section: safeGet(header, "section", "G"),
          track: activeShift?.shift_name || track || "`",
          clerk_initials: userInitials || activeShift?.clerk_initials || "CLK",
          subtotal: subtotal,
          sgst: sgst,
          cgst: cgst,
          tax_amount: sgst + cgst,
          grand_total: total,
          bill_date: billingDate,
          modified_from_bill_id: currentDraft.modified_from_bill_id,
          session_id: sessionId,
        };

        const createdBill = await createBillAPI(payload);
        const billId = createdBill?.bill_id;
        const billNumber = createdBill?.bill_number || "Unknown";

        toast.success(`Bill #${billNumber} created`);

        if (billId) {
          const fullBillData = await getBillById(billId);

          // --- SPLIT BILL PRINTING LOGIC ---
          let printPayload = fullBillData;

          if (isSplitBillMode) {
            const allItems = safeArray(
              fullBillData.items_json || fullBillData.items,
            );
            const splitItems = allItems.filter(
              (i) =>
                i.is_separate === true ||
                String(i.is_separate) === "true" ||
                i.is_separate === 1,
            );
            const regularItems = allItems.filter(
              (i) =>
                !i.is_separate ||
                String(i.is_separate) === "false" ||
                i.is_separate === 0,
            );

            if (splitItems.length > 0 || regularItems.length > 0) {
              // Changed condition
              const billsToPrint = [];

              if (regularItems.length > 0) {
                billsToPrint.push({
                  ...fullBillData,
                  split: false,
                  bills: null,
                  items: regularItems,
                  items_json: regularItems,
                  titleSuffix: splitItems.length > 0 ? "(Main)" : "", // Add suffix only if there are split items
                  subtotal: regularItems.reduce(
                    (s, i) => s + Number(i.line_total || 0),
                    0,
                  ),
                  grand_total: regularItems.reduce(
                    (s, i) => s + Number(i.line_total || 0),
                    0,
                  ),
                  sgst: 0,
                  cgst: 0,
                });
              }

              if (splitItems.length > 0) {
                billsToPrint.push({
                  ...fullBillData,
                  split: false,
                  bills: null,
                  items: splitItems,
                  items_json: splitItems,
                  titleSuffix: regularItems.length > 0 ? "(Split)" : "", // Add suffix only if there are regular items
                  subtotal: splitItems.reduce(
                    (s, i) => s + Number(i.line_total || 0),
                    0,
                  ),
                  grand_total: splitItems.reduce(
                    (s, i) => s + Number(i.line_total || 0),
                    0,
                  ),
                  sgst: 0,
                  cgst: 0,
                });
              }

              printPayload = {
                ...fullBillData,
                split: true,
                bills: billsToPrint,
              };
            }
          }
          // ---------------------------------

          if (typeof window !== "undefined") {
            window.printBillData = printPayload;
          }
          if (setPrintData) {
            setPrintData(printPayload);
          }
          setTimeout(() => {
            const iframe = document.getElementById("print-iframe");
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.print();
            } else {
              window.print();
            }
            if (tableNoRef.current) {
              tableNoRef.current.focus();
            }
          }, 500);
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

        // Refresh numbers
        fetchLastBillNumber();
        fetchActiveTables();

        setEntryCode("");
        setQty(1);
      } catch (e) {
        console.error("Bill creation error:", e);
        toast.error(
          safeGet(e, "response.data.detail", "Failed to create bill"),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      currentDraft,
      currentTable,
      activeShift,
      track,
      userInitials,
      subtotal,
      sgst,
      cgst,
      total,
      billingDate,
      sessionId,
      setDrafts,
      setCurrentTable,
      setEntryCode,
      setQty,
      tableNoRef,
      setPrintData,
      isSplitBillMode,
    ],
  );

  const addItem = useCallback(
    async (focusItemCode = true) => {
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

        const safeExtract = (val, key) => {
          if (val && typeof val === "object") {
            return val[key] || val.name || val.item_name || "";
          }
          return val;
        };

        const itemName = safeExtract(
          safeGet(item, "name", "Unknown Item"),
          "name",
        );
        const itemAlphaCode = safeExtract(
          safeGet(item, "alpha_code", ""),
          "alpha_code",
        );
        const itemNumericCode = safeExtract(
          safeGet(item, "numeric_code", ""),
          "numeric_code",
        );

        // Prompt for dynamic price if item price is 0 or name contains MISC
        if (
          Number(unitPrice) === 0 ||
          (typeof itemName === "string" &&
            itemName.toUpperCase().includes("MISC"))
        ) {
          const customPriceStr = window.prompt(
            `Enter amount for ${itemName}:`,
            "",
          );
          if (customPriceStr === null) {
            // User cancelled
            if (itemCodeRef.current) itemCodeRef.current.focus();
            return null;
          }
          const customPrice = parseFloat(customPriceStr);
          if (isNaN(customPrice) || customPrice < 0) {
            toast.error("Invalid amount entered. Please enter a valid number.");
            if (itemCodeRef.current) itemCodeRef.current.focus();
            return null;
          }
          unitPrice = customPrice;
        }

        const newLine = {
          code: entryCode.toUpperCase(),
          name: itemName,
          quantity: qty || 1,
          unit_price: Number(unitPrice),
          line_total: Number((unitPrice * (qty || 1)).toFixed(2)),
          numeric_code: itemNumericCode,
          alpha_code: itemAlphaCode,
          is_separate: !!item.is_separate,
        };

        const payload = {
          table_no: currentTable,
          party_no: safeGet(currentDraft, "header.party_no", "1"),
          item_name: newLine.name,
          quantity: newLine.quantity,
          unit_price: newLine.unit_price,
          line_total: newLine.line_total,
          track: activeShift?.shift_name || track || "SYS",
          clerk_initials: userInitials || activeShift?.clerk_initials || "CLK",
          bill_number: 0,
          item_code: newLine.alpha_code,
          numeric_item_code: newLine.numeric_code,
          bill_date: billingDate, // Use the session date for the order
        };

        await createOrder(payload);

        // Refresh active tables to update sequences
        fetchActiveTables();

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
    },
    [
      entryCode,
      currentTable,
      currentDraft,
      qty,
      activeShift,
      track,
      userInitials,
      setDrafts,
      setEntryCode,
      setQty,
      itemCodeRef,
    ],
  );

  const handlePrintBill = useCallback(async () => {
    if (!currentTable) {
      toast.error("Please enter a table number before printing.");
      return;
    }

    const billIdToPrint =
      safeGet(currentDraft, "modified_from_bill_id") ||
      safeGet(currentDraft, "header.bill_id");

    if (billIdToPrint) {
      try {
        setLoading(true);
        const fullBillData = await getBillById(billIdToPrint);

        // --- SPLIT BILL PRINTING LOGIC ---
        let printPayload = fullBillData;

        if (isSplitBillMode) {
          const allItems = safeArray(
            fullBillData.items_json || fullBillData.items,
          );
          const splitItems = allItems.filter(
            (i) =>
              i.is_separate === true ||
              String(i.is_separate) === "true" ||
              i.is_separate === 1,
          );
          const regularItems = allItems.filter(
            (i) =>
              !i.is_separate ||
              String(i.is_separate) === "false" ||
              i.is_separate === 0,
          );

          if (splitItems.length > 0 || regularItems.length > 0) {
            const billsToPrint = [];

            if (regularItems.length > 0) {
              billsToPrint.push({
                ...fullBillData,
                split: false,
                bills: null,
                items: regularItems,
                items_json: regularItems,
                titleSuffix: splitItems.length > 0 ? "(Main)" : "",
                subtotal: regularItems.reduce(
                  (s, i) => s + Number(i.line_total || 0),
                  0,
                ),
                grand_total: regularItems.reduce(
                  (s, i) => s + Number(i.line_total || 0),
                  0,
                ),
                sgst: 0,
                cgst: 0,
              });
            }

            if (splitItems.length > 0) {
              billsToPrint.push({
                ...fullBillData,
                split: false,
                bills: null,
                items: splitItems,
                items_json: splitItems,
                titleSuffix: regularItems.length > 0 ? "(Split)" : "",
                subtotal: splitItems.reduce(
                  (s, i) => s + Number(i.line_total || 0),
                  0,
                ),
                grand_total: splitItems.reduce(
                  (s, i) => s + Number(i.line_total || 0),
                  0,
                ),
                sgst: 0,
                cgst: 0,
              });
            }

            printPayload = {
              ...fullBillData,
              split: true,
              bills: billsToPrint,
            };
          }
        }
        // ---------------------------------

        if (typeof window !== "undefined") {
          window.printBillData = printPayload;
        }
        if (setPrintData) {
          setPrintData(printPayload);
        }
        setTimeout(() => {
          const iframe = document.getElementById("print-iframe");
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
          } else {
            window.print();
          }
          if (tableNoRef.current) {
            tableNoRef.current.focus();
          }
        }, 500);
      } catch (e) {
        console.error("Error fetching bill for reprint:", e);
        toast.error("Failed to load bill for printing");
      } finally {
        setLoading(false);
      }
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
  }, [
    currentTable,
    currentDraft,
    entryCode,
    qtyRef,
    addItem,
    createBill,
    setLoading,
    tableNoRef,
    isSplitBillMode,
  ]);

  // --- Active Bills Logic ---
  const [helpTab, setHelpTab] = useState("shortcuts");
  const [activeTables, setActiveTables] = useState([]);
  const [now, setNow] = useState(new Date());
  const [lastBillNumber, setLastBillNumber] = useState(0);

  const fetchLastBillNumber = useCallback(async () => {
    try {
      const res = await getLastBillNumber(billingDate);
      // res is { last_bill_number: ... }
      setLastBillNumber(parseInt(safeGet(res, "last_bill_number", 0)) || 0);
    } catch (e) {
      console.error("Failed to fetch last bill number", e);
    }
  }, [billingDate]);

  const fetchActiveTables = useCallback(async () => {
    try {
      const orders = await getAllPendingOrders();
      const groups = {};
      orders.forEach((o) => {
        // Filter by billing date to exclude stale orders from previous days
        // Note: o.bill_date might be ISO string or date object depending on driver, usually string YYYY-MM-DD or full ISO
        if (billingDate) {
          let rawDate = safeGet(o, "bill_date");
          let orderDateStr = "";

          if (rawDate) {
            const d = new Date(rawDate);
            // Construct local YYYY-MM-DD
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            orderDateStr = `${year}-${month}-${day}`;
          }

          // If we have a valid order date string, compare it
          if (orderDateStr && orderDateStr !== billingDate) {
            return;
          }
        }

        const key = `${o.table_no}-${o.party_no}`;
        if (!groups[key]) {
          groups[key] = {
            table_no: o.table_no,
            party_no: o.party_no,
            first_order_at: new Date(o.created_at),
            last_order_at: new Date(o.created_at),
            item_count: 0,
            total_amount: 0,
          };
        }
        const g = groups[key];
        const orderTime = new Date(o.created_at);
        if (orderTime < g.first_order_at) g.first_order_at = orderTime;
        if (orderTime > g.last_order_at) g.last_order_at = orderTime;

        if (o.updated_at) {
          const updateTime = new Date(o.updated_at);
          if (updateTime > g.last_order_at) g.last_order_at = updateTime;
        }

        g.item_count += 1;
        g.total_amount += parseFloat(o.line_total || 0);
      });
      // Sort by first_order_at to ensure consistent temporary bill numbering
      const sortedTables = Object.values(groups).sort(
        (a, b) => a.first_order_at - b.first_order_at,
      );
      setActiveTables(sortedTables);
    } catch (err) {
      console.error("Failed to fetch active tables", err);
    }
  }, []);

  // Initial load and Polling
  useEffect(() => {
    fetchActiveTables();
    fetchLastBillNumber();

    const interval = setInterval(() => {
      setNow(new Date());
      // Poll every 5 seconds for updates
      if (new Date().getSeconds() % 5 === 0) {
        fetchActiveTables();
        fetchLastBillNumber();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchActiveTables, fetchLastBillNumber]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        setShowHelp((prev) => {
          if (!prev) {
            setHelpTab("active");
            return true;
          }
          if (helpTab === "active") return false;
          setHelpTab("active");
          return true;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpTab]);

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (tableNoRef.current) {
          tableNoRef.current.focus();
          tableNoRef.current.select();
        }
      } else if (event.key === "End" || event.key === "Home") {
        event.preventDefault();
        handlePrintBill();
      } else if (event.key === "PageDown") {
        event.preventDefault();
        if (itemCodeRef.current) {
          itemCodeRef.current.focus();
        }
      } else if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "f" || event.code === "KeyF")
      ) {
        // Override standard ctrl+f
        event.preventDefault();
        setShowHelp(true);
      } else if (event.key === "F3") {
        event.preventDefault();
        setIsSplitBillMode((prev) => {
          const newState = !prev;
          toast.success(`Split Bill Mode ${newState ? "Enabled" : "Disabled"}`);
          return newState;
        });
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [handlePrintBill]);

  const tempBillNumber = useMemo(() => {
    const existingBillNum = safeGet(currentDraft, "header.bill_number");
    if (existingBillNum !== null && existingBillNum !== undefined)
      return existingBillNum;

    // Calculate temporary number
    // Logic: lastBillNumber + position_of_current_table_in_activeTables + 1
    // Position is 0-indexed, so +1

    // Identify current table in activeTables
    const idx = activeTables.findIndex(
      (t) =>
        String(t.table_no) === String(currentTable) &&
        String(t.party_no) ===
          String(safeGet(currentDraft, "header.party_no", "1")),
    );

    if (idx !== -1) {
      return lastBillNumber + idx + 1;
    }

    // If not found in active tables (newly started draft), assume it comes next
    return lastBillNumber + activeTables.length + 1;
  }, [currentDraft, activeTables, lastBillNumber, currentTable]);

  const displayBillNumber =
    safeGet(currentDraft, "header.bill_number") !== null
      ? safeGet(currentDraft, "header.bill_number")
      : nextBillNumber || "...";

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
        safeGet(item, "alpha_code", "").toLowerCase().includes(lowercasedQuery),
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
            safeGet(selectedItem, "alpha_code", ""),
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
    <div className="grid grid-cols-12 gap-6 pb-4">
      <div className="col-span-8 flex flex-col h-full">
        <Card className="flex flex-col h-full">
          <CardHeader className="flex-none">
            <CardTitle className="flex justify-between items-center">
              <span>Billing for {billingDate}</span>
              <div className="flex items-center whitespace-nowrap">
                <Input
                  type="checkbox"
                  id="splitBillModeHeader"
                  checked={isSplitBillMode}
                  onChange={(e) => setIsSplitBillMode(e.target.checked)}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded !w-auto cursor-pointer ${
                    isSplitBillMode ? "bg-orange-500 border-orange-500" : ""
                  }`}
                />
                <Label
                  htmlFor="splitBillModeHeader"
                  className={`!mb-0 cursor-pointer text-xs font-medium ${
                    isSplitBillMode ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  SPLIT BILL
                </Label>

                {isSplitBillMode && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-200 animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-none space-y-4 mb-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Table No</Label>
                  <Input
                    ref={tableNoRef}
                    placeholder="Type & Enter"
                    value={currentTable}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        if (setCurrentTable) setCurrentTable("");
                        return;
                      }

                      const num = parseInt(val, 10);

                      // Validation: Allow only numbers, max 30
                      if (!isNaN(num) && num >= 1 && num <= 30) {
                        if (setCurrentTable) setCurrentTable(val);
                        // Trigger section update IMMEDIATELY on change
                        setSectionByTable(val);
                      } else {
                        // Optional: Show toast or just ignore invalid input
                        // toast.error("Table number must be between 1 and 30");
                      }
                    }}
                    onKeyDown={handleTableNoKeyDown}
                  />
                </div>
                <div>
                  <Label>Party No.</Label>
                  <Input
                    ref={partyNoRef}
                    value={safeGet(currentDraft, "header.party_no", "")}
                    onChange={(e) =>
                      onHeaderChange({ party_no: e.target.value })
                    }
                    onKeyDown={handlePartyNoKeyDown}
                  />
                </div>
                <div>
                  <Label>Section</Label>
                  <Input
                    ref={sectionRef}
                    value={safeGet(currentDraft, "header.section", "G")}
                    readOnly
                    onKeyDown={handleSectionKeyDown}
                  />
                </div>
                <div>
                  <Label>Bill No.</Label>
                  <Input value={displayBillNumber || "..."} readOnly />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 flex-none">
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

            <div
              className="overflow-y-auto border rounded-md relative bg-white"
              style={{ height: "500px", minHeight: "300px" }}
            >
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-lg font-bold py-3 text-black">
                      No.
                    </TableHead>
                    <TableHead className="text-lg font-bold py-3 text-black">
                      Item
                    </TableHead>
                    <TableHead className="text-lg font-bold py-3 text-black">
                      Qty
                    </TableHead>
                    <TableHead className="text-lg font-bold py-3 text-black">
                      Rate
                    </TableHead>
                    <TableHead className="text-lg font-bold py-3 text-black">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeArray(currentDraft.lines).map((l, idx) => (
                    <TableRow
                      key={idx}
                      ref={(el) => (itemRowRefs.current[idx] = el)}
                      tabIndex={0}
                      onKeyDown={(e) => handleRowKeyDown(e, idx)}
                      className="focus:bg-blue-50 outline-none ring-2 ring-transparent focus:ring-blue-300 border-b border-gray-200"
                    >
                      <TableCell className="!py-4 text-xl font-bold text-gray-800">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="!py-4">
                        <div className="flex items-center">
                          <span className="mr-3 text-2xl font-bold text-black tracking-wide">
                            {safeGet(l, "name", "Unknown Item")}
                          </span>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-10 w-10 p-0 text-xl font-bold"
                              onClick={() => removeLine(idx)}
                              title="Remove Line"
                            >
                              -
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0 bg-green-50 text-green-700 border-green-300 hover:bg-green-100 text-xl font-bold"
                              onClick={() =>
                                updateQty(
                                  idx,
                                  (Number(safeGet(l, "quantity", 0)) || 0) + 1,
                                )
                              }
                              title="Increase Quantity"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="!py-4">
                        <Input
                          ref={(el) => (itemQtyRefs.current[idx] = el)}
                          type="number"
                          min="1"
                          className="w-24 h-12 text-2xl font-bold text-center border-2 border-gray-300 focus:border-blue-500"
                          value={safeGet(l, "quantity", "")}
                          onChange={(e) => updateQty(idx, e.target.value)}
                          onKeyDown={(e) => handleTableQtyKeyDown(e, idx)}
                        />
                      </TableCell>
                      <TableCell className="!py-4 text-xl font-semibold text-gray-700">
                        {Number(safeGet(l, "unit_price", 0)).toFixed(2)}
                      </TableCell>
                      <TableCell className="!py-4 text-xl font-bold text-black">
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
        <div className={`help-panel ${showHelp ? "visible" : ""}`}>
          <div className="help-header">
            <div className="help-tabs">
              <button
                className={`help-tab-btn ${
                  helpTab === "shortcuts" ? "active" : ""
                }`}
                onClick={() => setHelpTab("shortcuts")}
              >
                Shortcuts
              </button>
              <button
                className={`help-tab-btn ${
                  helpTab === "active" ? "active" : ""
                }`}
                onClick={() => setHelpTab("active")}
              >
                Active Bills ({activeTables.length})
              </button>
            </div>
            <button className="close-help" onClick={() => setShowHelp(false)}>
              ×
            </button>
          </div>

          <div className="help-content">
            {helpTab === "shortcuts" ? (
              <>
                <p className="help-hint">
                  Press F1 in Item Code to search for items.
                </p>
                {showHelp && (
                  <div className="mb-4">
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by code or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                    {searchQuery && filteredItems.length > 0 && (
                      <div className="search-results-table">
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
                                  selectedHelpIndex === index
                                    ? "bg-blue-100"
                                    : ""
                                }`}
                                onClick={() => {
                                  setEntryCode(
                                    safeGet(item, "numeric_code", "") ||
                                      safeGet(item, "alpha_code", ""),
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
                                  {Number(
                                    safeGet(item, "price_general", 0),
                                  ).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {searchQuery && filteredItems.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No items found
                      </div>
                    )}
                  </div>
                )}
                <h3>Keyboard Shortcuts</h3>
                <ul className="shortcut-list">
                  <li>
                    <kbd>F1</kbd>: Open item search in Help Panel
                  </li>
                  <li>
                    <kbd>F2</kbd>: Toggle Active Bills
                  </li>
                  <li>
                    <kbd>F3</kbd>: Toggle Split Bill Mode
                  </li>
                  <li>
                    <kbd>Esc</kbd>: Go to Table No.
                  </li>
                  <li>
                    <kbd>Enter</kbd>: Move between fields / Add item
                  </li>
                  <li>
                    <kbd>Arrow Up/Down</kbd>: Navigate search results
                  </li>
                  <li>
                    <kbd>PageDown</kbd>: Move from Table No. to Item Code
                  </li>
                  <li>
                    <kbd>End</kbd> / <kbd>Home</kbd>: Finalize and Print Bill
                  </li>
                </ul>
              </>
            ) : (
              <div className="active-bills-list">
                {activeTables.length === 0 ? (
                  <div className="no-active-bills">No active bills</div>
                ) : (
                  <table className="active-bills-table">
                    <thead>
                      <tr>
                        <th>Table</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Running For</th>
                        <th>Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTables.map((t) => (
                        <tr key={`${t.table_no}-${t.party_no}`}>
                          <td>
                            {t.table_no}{" "}
                            {t.party_no !== "1" ? `(${t.party_no})` : ""}
                          </td>
                          <td>{t.item_count}</td>
                          <td>₹{t.total_amount.toFixed(2)}</td>
                          <td className="time-running">
                            {formatDuration(now - t.first_order_at)}
                          </td>
                          <td className="time-ago">
                            {formatDuration(now - t.last_order_at)} ago
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

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
                <span>SGST ({sgstPercentage}%):</span>
                <span>{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST ({cgstPercentage}%):</span>
                <span>{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 my-2">
                <span>Grand Total:</span>
                <span>{total.toFixed(2)}</span>
              </div>
              <Button
                onClick={handlePrintBill}
                disabled={
                  loading ||
                  isShiftLoading ||
                  safeArray(currentDraft.lines).length === 0
                }
                className="w-full"
                size="lg"
              >
                {isShiftLoading ? (
                  <Loader2 size={16} className="mr-2" />
                ) : loading ? (
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
