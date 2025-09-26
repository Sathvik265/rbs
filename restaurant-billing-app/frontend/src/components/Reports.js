import React, { useState } from "react";
import {
  getItemWiseReport,
  getTimeWiseReport,
  getShiftWiseReport,
} from "../services/api";

function Reports({ billingDate }) {
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async (type) => {
    try {
      setLoading(true);
      setReportType(type);
      setReportData(null);
      setError(null);

      console.log(`Generating ${type} report for date: ${billingDate}`);

      let response;
      if (type === "item-wise") {
        response = await getItemWiseReport(billingDate);
      } else if (type === "time-wise") {
        response = await getTimeWiseReport(billingDate);
      } else if (type === "shift-wise") {
        response = await getShiftWiseReport(billingDate);
      }

      console.log(`${type} report response:`, response);
      const reportResult = response.report || response || [];
      setReportData(reportResult);
    } catch (err) {
      console.error(`Error generating ${type} report:`, err);
      setError(
        `Failed to generate ${type} report: ` +
          (err.response?.data?.detail || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div
          className="loading"
          style={{ padding: "20px", textAlign: "center" }}
        >
          Generating report...
        </div>
      );
    }

    if (error) {
      return (
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
      );
    }

    if (!reportData) {
      return (
        <div
          className="no-report"
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#666",
          }}
        >
          <p>Select a report type to generate.</p>
        </div>
      );
    }

    if (reportData.length === 0) {
      return (
        <div
          className="no-data"
          style={{
            padding: "20px",
            textAlign: "center",
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <p>No data available for this report.</p>
        </div>
      );
    }

    // Render different tables based on report type
    if (reportType === "item-wise") {
      return (
        <div style={{ overflowX: "auto" }}>
          <h3>Item-wise Report</h3>
          <table
            className="report-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "left",
                  }}
                >
                  Item Name
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "right",
                  }}
                >
                  Quantity Sold
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "right",
                  }}
                >
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9",
                  }}
                >
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                    {row.item_name}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      textAlign: "right",
                    }}
                  >
                    {row.total_quantity}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      textAlign: "right",
                    }}
                  >
                    ₹{parseFloat(row.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === "time-wise") {
      return (
        <div style={{ overflowX: "auto" }}>
          <h3>Time-wise Report</h3>
          <table
            className="report-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "left",
                  }}
                >
                  Time Slot
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "right",
                  }}
                >
                  Number of Bills
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "right",
                  }}
                >
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9",
                  }}
                >
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                    {row.time_slot}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      textAlign: "right",
                    }}
                  >
                    {row.bill_count}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      textAlign: "right",
                    }}
                  >
                    ₹{parseFloat(row.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === "shift-wise") {
      return (
        <div style={{ overflowX: "auto" }}>
          <h3>Shift-wise Report</h3>
          <table
            className="report-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "left",
                  }}
                >
                  Shift
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "right",
                  }}
                >
                  Number of Bills
                </th>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "12px",
                    textAlign: "right",
                  }}
                >
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9",
                  }}
                >
                  <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                    {row.shift_name}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      textAlign: "right",
                    }}
                  >
                    {row.bill_count}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      textAlign: "right",
                    }}
                  >
                    ₹{parseFloat(row.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="reports" style={{ padding: "20px" }}>
      <div className="reports-header">
        <h2>Reports for {billingDate}</h2>
      </div>

      <div className="report-buttons" style={{ marginBottom: "30px" }}>
        <button
          onClick={() => handleGenerateReport("item-wise")}
          disabled={loading}
          style={{
            marginRight: "15px",
            padding: "12px 20px",
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor:
              loading && reportType === "item-wise" ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {loading && reportType === "item-wise"
            ? "Loading..."
            : "Item-wise Report"}
        </button>
        <button
          onClick={() => handleGenerateReport("time-wise")}
          disabled={loading}
          style={{
            marginRight: "15px",
            padding: "12px 20px",
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor:
              loading && reportType === "time-wise" ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {loading && reportType === "time-wise"
            ? "Loading..."
            : "Time-wise Report"}
        </button>
        <button
          onClick={() => handleGenerateReport("shift-wise")}
          disabled={loading}
          style={{
            marginRight: "15px",
            padding: "12px 20px",
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor:
              loading && reportType === "shift-wise" ? "#ccc" : "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {loading && reportType === "shift-wise"
            ? "Loading..."
            : "Shift-wise Report"}
        </button>
      </div>

      <div className="report-content">{renderReport()}</div>
    </div>
  );
}

export default Reports;
