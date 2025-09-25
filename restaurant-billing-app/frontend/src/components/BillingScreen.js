import React, { useState, useEffect } from "react";
import { getNextBillNumber, createBill, lookupMenuItem } from "../services/api";

function BillingScreen({ billingDate, userMode, track }) {
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

  useEffect(() => {
    fetchNextBillNumber();
  }, [billingDate]);

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

      const newItem = {
        no: items.length + 1,
        item: item.name,
        qty: parseInt(currentItem.quantity),
        rate: item.price_general || 0,
        amount: parseInt(currentItem.quantity) * (item.price_general || 0),
      };

      setItems((prev) => [...prev, newItem]);
      setCurrentItem({ code: "", quantity: 1 });
      setError(null);
    } catch (err) {
      console.error("Error adding item:", err);
      setError(`Item "${currentItem.code}" not found`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearItems = () => {
    setItems([]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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
      return;
    }

    if (items.length === 0) {
      setError("Please add items to the bill");
      return;
    }

    try {
      setLoading(true);

      const billPayload = {
        header: {
          table_no: billData.table_no,
          party_no: billData.party_no,
          section: billData.section,
          clerk_initials: "CLK",
          track: track || "DINE_IN",
        },
        item_codes: items.map((_, index) => `ITEM${index + 1}`),
        quantities: items.map((item) => item.qty),
        bill_date: billingDate,
        grand_total: grandTotal,
        session_id: sessionStorage.getItem('session_id'),
        subtotal: subtotal,
        sgst: sgst,
        cgst: cgst,
        tax_amount: sgst + cgst,
      };

      await createBill(billPayload);

      // Reset form
      setItems([]);
      setBillData((prev) => ({ ...prev, table_no: "", party_no: "1" }));
      fetchNextBillNumber();
    } catch (err) {
      console.error("Error creating bill:", err);
      setError("Failed to create bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-container">
      <div className="billing-left-panel">
        <div className="billing-header">
          <h2>Billing for {billingDate}</h2>
        </div>

        <div className="billing-form">
          <div className="form-row">
            <div className="form-group">
              <label>Table No.</label>
              <input
                type="text"
                value={billData.table_no}
                onChange={(e) =>
                  setBillData((prev) => ({ ...prev, table_no: e.target.value }))
                }
                placeholder="Type & Enter"
              />
            </div>

            <div className="form-group">
              <label>Party No.</label>
              <input
                type="text"
                value={billData.party_no}
                onChange={(e) =>
                  setBillData((prev) => ({ ...prev, party_no: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Section</label>
              <input
                type="text"
                value={billData.section}
                onChange={(e) =>
                  setBillData((prev) => ({ ...prev, section: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Bill No.</label>
              <input type="text" value={billData.bill_no} readOnly />
            </div>
          </div>

          <div className="item-entry-section">
            <div className="form-row">
              <div className="form-group">
                <label>Item Code (F1 for Help)</label>
                <input
                  type="text"
                  value={currentItem.code}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      code: e.target.value,
                    }))
                  }
                  placeholder="Enter Item Code"
                  onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <button
                  onClick={handleAddItem}
                  disabled={loading}
                  className="add-item-btn"
                >
                  Add Item
                </button>

                <button onClick={handleClearItems} className="clear-items-btn">
                  Clear Items
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="items-table">
            <div className="table-header">
              <span>No.</span>
              <span>Item</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Amount</span>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="table-row"
                onClick={() => handleRemoveItem(index)}
              >
                <span>{item.no}</span>
                <span>{item.item}</span>
                <span>{item.qty}</span>
                <span>₹{item.rate.toFixed(2)}</span>
                <span>₹{item.amount.toFixed(2)}</span>
              </div>
            ))}

            {items.length === 0 && (
              <div className="empty-table">
                <div className="empty-message">No items added yet</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="billing-right-panel">
        <div className="help-section">
          <div className="help-header">
            <span>🔍</span> Help
          </div>

          <div className="help-content">
            <p>Press F1 to Item Code to search for Items.</p>

            <div className="keyboard-shortcuts">
              <h4>Keyboard Shortcuts</h4>
              <ul>
                <li>
                  <strong>F1:</strong> Open Item search in Help Panel
                </li>
                <li>
                  <strong>Esc:</strong> Clear Item search in Help Panel
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

        <div className="finalize-section">
          <h3>Finalize Bill</h3>

          <div className="bill-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>SGST (2.5%):</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>CGST (2.5%):</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
          </div>

          <div className="grand-total">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handlePrintBill}
            disabled={loading || items.length === 0}
            className="print-bill-btn"
          >
            🖨️ Print Bill
          </button>

          <div className="made-with-error">
            <span>📱 Made with Error</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingScreen;
