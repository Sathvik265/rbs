import React, { useEffect, useState } from "react";
import axios from "axios";
import { API, safeGet, safeArray, safeObject } from "../utils/helpers";
import { useUser } from "../context/UserContext";

const BillContent = ({ data, settings }) => {
  const header = safeObject(data.header);
  const items = safeArray(data.items || data.items_json);

  // Merge settings into data for easier access, but prioritize data
  const mergedData = { ...settings, ...data };

  const billNumber =
    safeGet(data, "bill_number") || safeGet(header, "bill_number", "N/A");
  const tableNo =
    safeGet(data, "table_no") || safeGet(header, "table_no", "N/A");
  const partyNo = safeGet(data, "party_no") || safeGet(header, "party_no", "0");

  const hotelName = safeGet(mergedData, "hotel_name", "Restaurant");
  const address = safeGet(mergedData, "address", "");
  const phone = safeGet(mergedData, "phone", "");
  const gstin = safeGet(mergedData, "gstin", "");

  // Use clerk from data, fallback to settings/context or default
  const clerkInitials =
    safeGet(data, "clerk_initials") ||
    safeGet(settings, "clerk_initials") ||
    "CLK";

  const createdAt = safeGet(data, "created_at", null);
  const subtotal = safeGet(data, "subtotal", 0);
  const sgst = safeGet(data, "sgst", 0);
  const cgst = safeGet(data, "cgst", 0);
  const grandTotal = safeGet(data, "grand_total", 0);
  const titleSuffix = safeGet(data, "titleSuffix", "");

  // Format time for printing
  const printTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Format date for printing
  const printDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");

  return (
    <div
      className="print-receipt"
      style={{
        fontFamily: "monospace",
        fontSize: "12px",
        maxWidth: "300px",
        color: "black",
        background: "white",
        padding: "10px",
        position: "relative", // PREVENT OVERLAPPING
        display: "block",
        margin: "0 auto",
      }}
    >
      {/* Header - Hotel Name and GST */}
      <div
        style={{ textAlign: "center", fontWeight: "bold", marginBottom: "2px" }}
      >
        {hotelName} {titleSuffix} ({clerkInitials})
      </div>
      {address && (
        <div
          style={{ textAlign: "center", fontSize: "11px", marginBottom: "2px" }}
        >
          {address}
        </div>
      )}
      <div
        style={{ textAlign: "center", fontSize: "11px", marginBottom: "8px" }}
      >
        {gstin ? `GST:${gstin}` : ""}
      </div>

      {/* Time and Date on same line */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
          fontSize: "11px",
        }}
      >
        <span>
          {printTime} {billNumber !== "N/A" ? `#${billNumber}` : ""}
        </span>
        <span>{printDate}</span>
      </div>

      {/* Separator */}
      <div style={{ borderTop: "1px dashed #000", marginBottom: "4px" }}></div>

      {/* Items List */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", margin: "10px 0" }}>
          No Items Found
        </div>
      ) : (
        items.map((item, i) => {
          let itemName = item.item_name || item.name || "Unknown Item";

          if (typeof itemName === "object") {
            itemName =
              itemName.name || itemName.item_name || JSON.stringify(itemName);
          }
          if (
            typeof itemName === "string" &&
            (itemName.startsWith("[") || itemName.startsWith("{"))
          ) {
            try {
              const parsed = JSON.parse(itemName);
              if (Array.isArray(parsed) && parsed.length > 0)
                itemName = parsed[0].name || parsed[0].item_name;
              else if (typeof parsed === "object")
                itemName = parsed.name || parsed.item_name;
            } catch (e) {
              /* ignore */
            }
          }

          let quantity = item.quantity || item.qty || 0;
          const lineTotal = item.line_total || item.amount || 0;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2px",
              }}
            >
              <span style={{ flex: "1", textAlign: "left" }}>{itemName}</span>
              <span style={{ width: "30px", textAlign: "center" }}>
                {quantity}
              </span>
              <span style={{ width: "60px", textAlign: "right" }}>
                {Number(lineTotal).toFixed(2)}
              </span>
            </div>
          );
        })
      )}

      {/* Separator */}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }}></div>

      {/* Taxes */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "2px",
        }}
      >
        <span>SGST( 2.50%)</span>
        <span>Rs. {Number(sgst).toFixed(2)}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "2px",
        }}
      >
        <span>CGST( 2.50%)</span>
        <span>Rs. {Number(cgst).toFixed(2)}</span>
      </div>

      {/* Separator */}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }}></div>

      {/* Total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          marginBottom: "8px",
        }}
      >
        <span>Payable(Rounded)</span>
        <span>Rs. {Math.round(Number(grandTotal)).toFixed(2)}</span>
      </div>

      {/* Table and Party Info (without Waiter) */}
      <div style={{ textAlign: "center", fontSize: "11px" }}>
        Table:{tableNo} Party: {partyNo || "1"}
      </div>
    </div>
  );
};

export default function BillPrint({ billData = null }) {
  const [fetchedSettings, setFetchedSettings] = useState(null);
  const { userInitials: loggedInClerk } = useUser();

  useEffect(() => {
    // If settings are missing in props, fetch them
    if (!billData?.hotel_name) {
      // Use clerk from bill data if available, otherwise use logged-in clerk
      const clerk = billData?.clerk_initials || loggedInClerk || "CLK";
      axios
        .get(`${API}/settings?clerk=${clerk}`)
        .then((res) => {
          setFetchedSettings(res.data);
        })
        .catch((err) =>
          console.error("Failed to fetch settings for print", err),
        );
    }
  }, [billData, loggedInClerk]);

  const propsData =
    billData || (typeof window !== "undefined" && window.printBillData) || null;

  const data = { ...fetchedSettings, ...propsData };

  if (!data) {
    console.log("BillPrint: No bill data available");
    return <div>No bill data</div>;
  }

  // Use a ref-like approach to decide if we rendering multiple bills
  const bills = safeArray(data.bills);

  if (bills.length > 0) {
    return (
      <div className="print-receipt-container print-area">
        {bills.map((bill, index) => (
          <div key={index}>
            <BillContent data={bill} settings={fetchedSettings || data} />
            {index < bills.length - 1 && (
              <div style={{ height: "40px", width: "100%", clear: "both" }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="print-receipt-container print-area">
      <BillContent data={data} settings={fetchedSettings || data} />
    </div>
  );
}
