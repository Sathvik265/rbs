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

      let response;
      if (type === "item-wise") {
        response = await getItemWiseReport(billingDate);
      } else if (type === "time-wise") {
        response = await getTimeWiseReport(billingDate);
      } else if (type === "shift-wise") {
        response = await getShiftWiseReport(billingDate);
      }

      setReportData(response.report || []);
    } catch (err) {
      console.error(`Error generating ${type} report:`, err);
      setError(`Failed to generate ${type} report`);
    } finally {
      setLoading(false);
    }
  };

  const renderReport = () => {
    if (loading) {
      return <div className="loading">Generating report...</div>;
    }

    if (error) {
      return (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="no-report">
          <p>Select a report type to generate.</p>
        </div>
      );
    }

    if (reportData.length === 0) {
      return (
        <div className="no-data">
          <p>No data available for this report.</p>
        </div>
      );
    }

    // Render different tables based on report type
    if (reportType === "item-wise") {
      return (
        <div className="report-table">
          <div className="table-header">
            <span>Item Name</span>
            <span>Quantity Sold</span>
            <span>Total Amount</span>
          </div>
          {reportData.map((row, index) => (
            <div key={index} className="table-row">
              <span>{row.item_name}</span>
              <span>{row.total_quantity}</span>
              <span>₹{row.total_amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (reportType === "time-wise") {
      return (
        <div className="report-table">
          <div className="table-header">
            <span>Time Slot</span>
            <span>Number of Bills</span>
            <span>Total Amount</span>
          </div>
          {reportData.map((row, index) => (
            <div key={index} className="table-row">
              <span>{row.time_slot}</span>
              <span>{row.bill_count}</span>
              <span>₹{row.total_amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (reportType === "shift-wise") {
      return (
        <div className="report-table">
          <div className="table-header">
            <span>Shift</span>
            <span>Number of Bills</span>
            <span>Total Amount</span>
          </div>
          {reportData.map((row, index) => (
            <div key={index} className="table-row">
              <span>{row.shift_name}</span>
              <span>{row.bill_count}</span>
              <span>₹{row.total_amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Reports for {billingDate}</h2>
      </div>

      <div className="report-controls">
        <button
          onClick={() => handleGenerateReport("item-wise")}
          disabled={loading}
          className={reportType === "item-wise" ? "active" : ""}
        >
          Item Wise Report
        </button>
        <button
          onClick={() => handleGenerateReport("time-wise")}
          disabled={loading}
          className={reportType === "time-wise" ? "active" : ""}
        >
          Time Wise Report
        </button>
        <button
          onClick={() => handleGenerateReport("shift-wise")}
          disabled={loading}
          className={reportType === "shift-wise" ? "active" : ""}
        >
          Shift Wise Report
        </button>
      </div>

      <div className="report-content">{renderReport()}</div>
    </div>
  );
}

export default Reports;
