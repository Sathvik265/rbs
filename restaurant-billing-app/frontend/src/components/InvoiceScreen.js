import React, { useRef, useEffect } from "react";
import "../styles/InvoiceScreen.css";

const InvoiceScreen = ({ bill, onClose }) => {
  const printRef = useRef(null);

  useEffect(() => {
    // Auto-focus for keyboard navigation
    if (printRef.current) {
      printRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "p" || e.key === "P") {
      handlePrint();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    if (!dateString) return new Date().toLocaleTimeString();
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div
      className="invoice-overlay"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={printRef}
    >
      <div className="invoice-container">
        <div className="invoice-header">
          <button onClick={onClose} className="close-btn">
            Close (ESC)
          </button>
          <button onClick={handlePrint} className="print-btn">
            Print (P)
          </button>
        </div>

        <div className="invoice-content" id="invoice-print">
          {/* Receipt Header */}
          <div className="receipt-header">
            <h1>{bill.hotel_name || "Restaurant Name"}</h1>
            <p>GST No: {bill.gst_number || "N/A"}</p>
          </div>

          {/* Bill Metadata */}
          <div className="bill-metadata">
            <div className="bill-info">
              <p>
                <strong>Bill No:</strong> {bill.bill_number}
              </p>
              <p>
                <strong>Date:</strong> {formatDate(bill.print_timestamp)}
              </p>
              <p>
                <strong>Time:</strong> {formatTime(bill.print_timestamp)}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="items-section">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items &&
                  bill.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                      <td>₹{parseFloat(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="totals-section">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>₹{parseFloat(bill.subtotal).toFixed(2)}</span>
            </div>
            <div className="total-line">
              <span>SGST (2.5%):</span>
              <span>₹{parseFloat(bill.sgst_amount).toFixed(2)}</span>
            </div>
            <div className="total-line">
              <span>CGST (2.5%):</span>
              <span>₹{parseFloat(bill.cgst_amount).toFixed(2)}</span>
            </div>
            <div className="total-line grand-total">
              <span>
                <strong>Grand Total:</strong>
              </span>
              <span>
                <strong>₹{parseFloat(bill.grand_total).toFixed(2)}</strong>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="receipt-footer">
            <p>{bill.footer_text || "Thank you! Visit Again"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceScreen;
