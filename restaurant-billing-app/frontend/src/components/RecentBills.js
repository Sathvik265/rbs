import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

function RecentBills({ billingDate }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!billingDate) {
      setBills([]);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/bills/by_date`, {
          params: { bill_date: billingDate },
        });
        setBills(res.data || []);
      } catch (e) {
        console.error("Failed to load bills", e);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [billingDate]);

  if (!billingDate)
    return <div>Please select a date to view recent bills.</div>;
  if (loading) return <div>Loading recent bills...</div>;
  if (bills.length === 0) return <div>No bills found for {billingDate}</div>;

  return (
    <div>
      <h2>Recent Bills for {billingDate}</h2>
      <ul>
        {bills.map((b) => (
          <li key={b.id}>
            {b.bill_number} — ₹{b.grand_total}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentBills;
