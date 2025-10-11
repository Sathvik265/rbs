import React, { useState, useEffect } from "react";
import { getBillsByDate } from "../services/api";

function RecentBills({ billingDate }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBills();
  }, [billingDate]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await getBillsByDate(billingDate);
      setBills(response);
      setError(null);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setError("Failed to fetch recent bills.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recent-bills">
      <h2>Recent Bills for {billingDate}</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      <table className="bills-table">
        <thead>
          <tr>
            <th>Bill No.</th>
            <th>Table No.</th>
            <th>Amount</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id}>
              <td>{bill.bill_number}</td>
              <td>{bill.table_no}</td>
              <td>₹{bill.grand_total.toFixed(2)}</td>
              <td>{new Date(bill.created_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecentBills;
