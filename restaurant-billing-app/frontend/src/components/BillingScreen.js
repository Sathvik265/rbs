
import React, { useState, useEffect, useRef } from "react";
import {
  getNextBillNumber,
  createBill,
  lookupMenuItem,
  createOrder,
  getPendingOrdersByTable,
} from "../services/api";

function BillingScreen({ billingDate, userMode, track, activeShift }) {
  const [billData, setBillData] = useState({
    table_no: "",
    party_no: "1",
    section: "G",
    bill_no: "1",
  });
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ code: "", quantity: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- REFS FOR NAVIGATION ---
  const tableNoRef = useRef(null);
  const partyNoRef = useRef(null);
  const sectionRef = useRef(null);
  const itemCodeRef = useRef(null);
  
  const quantityInputRefs = useRef([]);
  const currentQtyRef = useRef(null);

  // --- GLOBAL SHORTCUTS (Esc, Arrows, etc) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESCAPE -> Focus Table No and Select Text
      if (e.key === "Escape") {
        e.preventDefault();
        if (tableNoRef.current) {
          tableNoRef.current.focus();
          tableNoRef.current.select();
        }
        return;
      }

      // PageDown -> Focus Item Code
      if (e.key === "PageDown") {
        e.preventDefault();
        if (itemCodeRef.current) itemCodeRef.current.focus();
        return;
      }

      // Alt+Q -> Focus Add-Item Quantity
      if (e.altKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        if (currentQtyRef.current) currentQtyRef.current.focus();
        return;
      }

      // Alt+ArrowDown -> Navigate Items Table (Next)
      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        const active = document.activeElement;
        const idx = quantityInputRefs.current.findIndex((el) => el === active);
        const next =
          idx === -1
            ? 0
            : Math.min(quantityInputRefs.current.length - 1, idx + 1);
        if (quantityInputRefs.current[next])
          quantityInputRefs.current[next].focus();
        return;
      }

      // Alt+ArrowUp -> Navigate Items Table (Previous)
      if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        const active = document.activeElement;
        const idx = quantityInputRefs.current.findIndex((el) => el === active);
        const prev =
          idx === -1
            ? quantityInputRefs.current.length - 1
            : Math.max(0, idx - 1);
        if (quantityInputRefs.current[prev])
          quantityInputRefs.current[prev].focus();
        return;
      }
<<<<<<< HEAD
=======

      // PageDown => focus item code textbox
      if (e.key === "PageDown") {
        e.preventDefault();
        const itemCodeEl = document.getElementById("item-code");
        if (itemCodeEl) itemCodeEl.focus();
        return;
      }

      // F1 => Prevent default browser help and open app help
      if (e.key === "F1") {
        e.preventDefault();
        // Logic to open app help can go here if needed, or just prevent default
        console.log("F1 pressed - Browser help suppressed");
        return;
      }
>>>>>>> 7b01c6ec3fdea87c7406e635fd3de159629c5952
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [items]); // Added items dependency to keep table nav fresh

  // --- TABLE QUANTITY NAV ---
  const handleQuantityKeyDown = (e, index) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) {
        quantityInputRefs.current[index - 1].focus();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < items.length - 1) {
        quantityInputRefs.current[index + 1].focus();
      }
    }
  };

  useEffect(() => {
    const loadPendingOrders = async () => {
      if (billData.table_no) {
        try {
          const orders = await getPendingOrdersByTable(billData.table_no);
          if (orders.length > 0) {
            setItems(
              orders.map((o, i) => ({
                no: i + 1,
                code: o.item_code,
                name: o.item_name,
                qty: o.quantity,
                rate: o.unit_price,
                amount: o.line_total,
              }))
            );
            setBillData((prev) => ({
              ...prev,
              party_no: orders[0].party_no,
              bill_no: orders[0].bill_number,
            }));
          }
        } catch (err) {
          console.error("Error loading pending orders:", err);
        }
      }
    };
    loadPendingOrders();
  }, [billData.table_no]);

  const fetchNextBillNumber = async () => {
    try {
      const response = await getNextBillNumber(billingDate);
      setBillData((prev) => ({
        ...prev,
        bill_no: response.bill_number.toString(),
      }));
    } catch (err) {
      console.error("Error fetching bill number:", err);
    }
  };

  const handleAddItem = async () => {
    if (!currentItem.code.trim()) {
      setError("Please enter item code");
      return;
    }

    try {
      setLoading(true);
      const item = await lookupMenuItem(currentItem.code);

      const orderData = {
        track: activeShift?.shift_name || track || "`",
        clerk_initials: activeShift?.clerk_initials || "CLK",
        table_no: billData.table_no,
        party_no: billData.party_no,
        bill_number: billData.bill_no,
        item_code: item.alpha_code,
        numeric_item_code: item.numeric_code,
        item_name: item.name,
        quantity: parseInt(currentItem.quantity),
        unit_price: item.price_general || 0,
        line_total: parseInt(currentItem.quantity) * (item.price_general || 0),
      };

      await createOrder(orderData);

      const newItem = {
        no: items.length + 1,
        code: currentItem.code,
        name: item.name,
        qty: parseInt(currentItem.quantity),
        rate: item.price_general || 0,
        amount: parseInt(currentItem.quantity) * (item.price_general || 0),
      };

      setItems((prev) => [...prev, newItem]);
      setCurrentItem({ code: "", quantity: 1 });
      setError(null);
      
      // Keep focus on Item Code for rapid entry
      if (itemCodeRef.current) itemCodeRef.current.focus();

    } catch (err) {
      console.error("Error adding item:", err);
      setError(`Item "${currentItem.code}" not found`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearItems = () => {
    setItems([]);
    setError(null);
    setSuccess(null);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, delta) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              qty: Math.max(1, item.qty + delta),
              amount: Math.max(1, item.qty + delta) * item.rate,
            }
          : item
      )
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const sgst = subtotal * 0.025; // 2.5%
    const cgst = subtotal * 0.025; // 2.5%
    const grandTotal = subtotal + sgst + cgst;
    return { subtotal, sgst, cgst, grandTotal };
  };

  const { subtotal, sgst, cgst, grandTotal } = calculateTotals();

  const handlePrintBill = async () => {
    if (!billData.table_no.trim()) {
      setError("Please enter Table No.");
      if (tableNoRef.current) tableNoRef.current.focus();
      return;
    }

    if (items.length === 0) {
      setError("Please add items to the bill");
      if (itemCodeRef.current) itemCodeRef.current.focus();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const billPayload = {
        bill_number: billData.bill_no,
        bill_date: billingDate,
        table_no: billData.table_no,
        party_no: billData.party_no,
        section: billData.section,
        track: activeShift?.shift_name || track,
        clerk_initials: activeShift?.clerk_initials,
        subtotal,
        sgst,
        cgst,
        tax_amount: sgst + cgst,
        grand_total: grandTotal,
        items: items.map((item) => ({
          item_code: item.code,
          name: item.name,
          quantity: item.qty,
          unit_price: item.rate,
          line_total: item.amount,
        })),
      };

      const response = await createBill(billPayload);

      const billNumber =
        response?.bill_number ||
        response?.header?.bill_number ||
        response?.header?.billnumber ||
        response?.billnumber ||
        response?.header?.billNumber ||
        null;

      if (billNumber) {
        setSuccess(`Bill #${billNumber} created successfully!`);
      } else {
        setSuccess("Bill created successfully!");
      }

      setItems([]);
      setBillData((prev) => ({ ...prev, table_no: "", party_no: "1" }));
      await fetchNextBillNumber();
      
      // Reset focus to Table No for next bill
      if (tableNoRef.current) tableNoRef.current.focus();

    } catch (err) {
      console.error("Error creating bill:", err);
      const errorMessage =
        err.response?.data?.error || err.response?.data?.detail || err.message;
      setError("Failed to create bill: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-screen">
      <div className="billing-header">
        <h2>Billing for {billingDate}</h2>
        {track && <div className="current-track">Current Track: {track}</div>}
      </div>

      <div className="bill-form">
        <div className="form-row">
          <div className="form-group">
            <label>Table No.</label>
            <input
              ref={tableNoRef}
              type="text"
              value={billData.table_no}
              onChange={(e) =>
                setBillData((prev) => ({ ...prev, table_no: e.target.value }))
              }
              placeholder="Type & Enter"
              // ENTER -> Focus Party No
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  partyNoRef.current?.focus();
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>Party No.</label>
            <input
              ref={partyNoRef}
              type="text"
              value={billData.party_no}
              onChange={(e) =>
                setBillData((prev) => ({ ...prev, party_no: e.target.value }))
              }
              // ENTER -> Focus Section
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sectionRef.current?.focus();
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>Section</label>
            <input
              ref={sectionRef}
              type="text"
              value={billData.section}
              onChange={(e) =>
                setBillData((prev) => ({ ...prev, section: e.target.value }))
              }
              // ENTER -> Focus Item Code
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  itemCodeRef.current?.focus();
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>Bill No.</label>
            <input
              type="text"
              value={
                billData.bill_no == 0 || billData.bill_no === "0"
                  ? "Pending"
                  : billData.bill_no
              }
              disabled
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Item Code (F1 for Help)</label>
            <input
              ref={itemCodeRef}
              type="text"
              value={currentItem.code}
              onChange={(e) =>
                setCurrentItem((prev) => ({
                  ...prev,
                  code: e.target.value,
                }))
              }
              placeholder="Enter Item Code"
              // ENTER -> Add Item
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() =>
                  setCurrentItem((p) => ({
                    ...p,
                    quantity: Math.max(1, (parseInt(p.quantity, 10) || 1) - 1),
                  }))
                }
              >
                -
              </button>
              <input
                ref={currentQtyRef}
                type="number"
                min="1"
                value={currentItem.quantity}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                // ENTER -> Add Item
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                style={{ width: 70, textAlign: "center" }}
              />
              <button
                type="button"
                onClick={() =>
                  setCurrentItem((p) => ({
                    ...p,
                    quantity: (parseInt(p.quantity, 10) || 1) + 1,
                  }))
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <button onClick={handleAddItem} disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </button>
          </div>
        </div>
      </div>

      {success && (
        <div
          className="success-message"
          style={{
            color: "green",
            padding: "10px",
            margin: "10px 0",
            border: "1px solid green",
            borderRadius: "4px",
            backgroundColor: "#d4edda",
          }}
        >
          {success}
        </div>
      )}

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

      <div
        className="table-container"
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          marginTop: "20px",
          border: "1px solid #ccc",
        }}
      >
        <table
          className="items-table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>No.</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Item</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Qty</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Rate</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={index}
                className="table-row"
                title="Double-click to remove item"
                onDoubleClick={() => handleRemoveItem(index)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const nextRow = e.currentTarget.nextElementSibling;
                    if (nextRow) nextRow.focus();
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prevRow = e.currentTarget.previousElementSibling;
                    if (prevRow) prevRow.focus();
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {item.no}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {item.name}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <button onClick={() => handleQuantityChange(index, -1)}>
                    -
                  </button>
                  <input
                    ref={(el) => (quantityInputRefs.current[index] = el)}
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                      const newQty = parseInt(e.target.value, 10);
                      setItems((prev) =>
                        prev.map((prevItem, i) =>
                          i === index
                            ? {
                                ...prevItem,
                                qty: newQty,
                                amount: newQty * prevItem.rate,
                              }
                            : prevItem
                        )
                      );
                    }}
                    onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                    style={{ width: "50px", textAlign: "center" }}
                  />
                  <button onClick={() => handleQuantityChange(index, 1)}>
                    +
                  </button>
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  ₹{item.rate.toFixed(2)}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  ₹{item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="no-items"
                  style={{
                    border: "1px solid #ccc",
                    padding: "20px",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  No items added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="form-actions" style={{ marginTop: "20px" }}>
        <button
          onClick={handleClearItems}
          disabled={items.length === 0}
          style={{
            padding: "8px 16px",
            marginRight: "10px",
            cursor: "pointer",
          }}
        >
          Clear All
        </button>

        <div className="help-text">
          🔍 Help
          <div
            className="help-content"
            style={{ fontSize: "12px", marginTop: "5px" }}
          >
            <p>Press F1 to Item Code to search for Items.</p>
            <h4>Keyboard Shortcuts</h4>
            <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
              <li>
                <strong>Esc:</strong> Go to Table No.
              </li>
              <li>
                <strong>F1:</strong> Open Item search in Help Panel
              </li>
              <li>
                <strong>Enter:</strong> Move between fields / Add Item
              </li>
              <li>
                <strong>Arrow Up/Down:</strong> Navigate Item Code
              </li>
              <li>
                <strong>PageDown:</strong> Move from Table No. to Item Code
              </li>
              <li>
                <strong>End / Home:</strong> Finalize and Print Bill
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        className="bill-totals"
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>Finalize Bill</h3>

        <div className="totals-grid">
          <div className="total-row" style={{ marginBottom: "10px" }}>
            <span>Subtotal:</span>
            <span style={{ float: "right", fontWeight: "bold" }}>
              ₹{subtotal.toFixed(2)}
            </span>
          </div>
          <div className="total-row" style={{ marginBottom: "10px" }}>
            <span>SGST (2.5%):</span>
            <span style={{ float: "right", fontWeight: "bold" }}>
              ₹{sgst.toFixed(2)}
            </span>
          </div>
          <div className="total-row" style={{ marginBottom: "10px" }}>
            <span>CGST (2.5%):</span>
            <span style={{ float: "right", fontWeight: "bold" }}>
              ₹{cgst.toFixed(2)}
            </span>
          </div>
          <hr />
          <div
            className="total-row grand-total"
            style={{ marginBottom: "20px" }}
          >
            <span style={{ fontSize: "18px", fontWeight: "bold" }}>
              Grand Total:
            </span>
            <span
              style={{
                float: "right",
                fontSize: "18px",
                fontWeight: "bold",
                color: "#007bff",
              }}
            >
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          className="print-bill-btn"
          onClick={handlePrintBill}
          disabled={loading || items.length === 0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handlePrintBill();
            }
          }}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "bold",
            backgroundColor: items.length === 0 || loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: items.length === 0 || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating Bill..." : "📱 Print Bill"}
        </button>
      </div>
    </div>
  );
}

export default BillingScreen;