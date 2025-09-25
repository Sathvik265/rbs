import React, { useState, useEffect } from "react";
import { getBillsByDate } from "../services/api";

function RecentBills({ billingDate }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    fetchBills();
  }, [billingDate]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await getBillsByDate(billingDate);
      setBills(response || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setError("Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(
    (bill) =>
      bill.bill_number.toString().includes(searchTerm) ||
      bill.table_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="recent-bills-container">
        <div className="system-title">Udupi Anand Bhavan — Billing System</div>
        <div className="nav-section">
          <div className="nav-tabs">
            <div className="nav-tab">📋 Billing</div>
            <div className="nav-tab">🍽️ Food Menu</div>
            <div className="nav-tab active">📄 Recent Bills</div>
            <div className="nav-tab">⚙️ Admin</div>
          </div>
        </div>
        <div className="loading-section">
          <div>Loading bills...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-bills-container">
      <div className="system-title">Udupi Anand Bhavan — Billing System</div>

      <div className="nav-section">
        <div className="nav-tabs">
          <div className="nav-tab">📋 Billing</div>
          <div className="nav-tab">🍽️ Food Menu</div>
          <div className="nav-tab active">📄 Recent Bills</div>
          <div className="nav-tab">⚙️ Admin</div>
        </div>
      </div>

      <div className="bills-main-content">
        <div className="bills-left-panel">
          <div className="bills-header">
            <h2>Billing for {billingDate}</h2>
          </div>

          <div className="search-section">
            <div className="search-group">
              <label>Search Bills</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter bill number or table..."
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="bills-table">
            <div className="table-header">
              <span>Bill No.</span>
              <span>Table</span>
              <span>Party</span>
              <span>Section</span>
              <span>Amount</span>
              <span>Time</span>
            </div>

            {filteredBills.length === 0 ? (
              <div className="empty-table">
                <div className="empty-message">
                  {searchTerm
                    ? `No bills found matching "${searchTerm}"`
                    : `No bills found for ${billingDate}`}
                </div>
              </div>
            ) : (
              filteredBills.map((bill) => (
                <div
                  key={bill.id}
                  className={`table-row ${
                    selectedBill?.id === bill.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedBill(bill)}
                >
                  <span>#{bill.bill_number}</span>
                  <span>{bill.table_no}</span>
                  <span>{bill.party_no}</span>
                  <span>G</span>
                  <span>₹{parseFloat(bill.grand_total).toFixed(2)}</span>
                  <span>
                    {new Date(bill.created_at).toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bills-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span>Total Bills:</span>
                <span>{filteredBills.length}</span>
              </div>
              <div className="stat-item">
                <span>Total Amount:</span>
                <span>
                  ₹
                  {filteredBills
                    .reduce(
                      (sum, bill) => sum + parseFloat(bill.grand_total),
                      0
                    )
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bills-right-panel">
          <div className="help-section">
            <div className="help-header">
              <span>🔍</span> Help
            </div>

            <div className="help-content">
              <p>Click on a bill to view details.</p>
              <p>Use the search box to filter bills by number or table.</p>

              <div className="keyboard-shortcuts">
                <h4>Keyboard Shortcuts</h4>
                <ul>
                  <li>
                    <strong>F3:</strong> Focus search box
                  </li>
                  <li>
                    <strong>Enter:</strong> Select highlighted bill
                  </li>
                  <li>
                    <strong>Esc:</strong> Clear search
                  </li>
                  <li>
                    <strong>Arrow Keys:</strong> Navigate bills
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {selectedBill && (
            <div className="bill-details-section">
              <h3>Bill Details</h3>

              <div className="bill-info">
                <div className="info-row">
                  <span>Bill Number:</span>
                  <span>#{selectedBill.bill_number}</span>
                </div>
                <div className="info-row">
                  <span>Table:</span>
                  <span>{selectedBill.table_no}</span>
                </div>
                <div className="info-row">
                  <span>Party:</span>
                  <span>{selectedBill.party_no}</span>
                </div>
                <div className="info-row">
                  <span>Time:</span>
                  <span>
                    {new Date(selectedBill.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="info-row">
                  <span>Amount:</span>
                  <span>
                    ₹{parseFloat(selectedBill.grand_total).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedBill.items && selectedBill.items.length > 0 && (
                <div className="bill-items">
                  <h4>Items</h4>
                  <div className="items-list">
                    {selectedBill.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <span className="item-name">{item.name}</span>
                        <span className="item-details">
                          {item.quantity} × ₹
                          {parseFloat(item.unit_price).toFixed(2)} = ₹
                          {parseFloat(item.line_total).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecentBills;
