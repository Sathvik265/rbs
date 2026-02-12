import React, { useEffect, useState } from "react";
import axios from "axios";
import { API, safeGet, safeArray, safeObject } from "../utils/helpers";

// Removed missing UserContext import
// import { useUser } from "../context/UserContext"; 

const BillContent = ({ data, settings }) => {
  const header = safeObject(data.header);
  const items = safeArray(data.items || data.items_json);
  const billNumber = safeGet(data, "bill_number") || safeGet(header, "bill_number", "N/A");
  const tableNo = safeGet(data, "table_no") || safeGet(header, "table_no", "N/A");
  const partyNo = safeGet(data, "party_no") || safeGet(header, "party_no", "0");

  // Use settings if available, otherwise data
  const hotelName = safeGet(settings, "hotel_name") || safeGet(data, "hotel_name", "Restaurant");
  const address = safeGet(settings, "address") || safeGet(data, "address", "");
  const phone = safeGet(settings, "phone") || safeGet(data, "phone", "");
  const gstin = safeGet(settings, "gstin") || safeGet(data, "gstin", "");

  // Clerk fallback
  const clerkInitials = safeGet(data, "clerk_initials", "CLK");
  const createdAt = safeGet(data, "created_at", null);
  const subtotal = safeGet(data, "subtotal", 0);
  const sgst = safeGet(data, "sgst", 0);
  const cgst = safeGet(data, "cgst", 0);
  const grandTotal = safeGet(data, "grand_total", 0);

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
        display: "block",
        position: "relative",
        clear: "both",
        fontFamily: "monospace",
        fontSize: "12px",
        maxWidth: "300px",
        height: "auto",
        overflow: "visible",
        color: "black",
        background: "white",
        padding: "10px",
        marginBottom: "20px",
        pageBreakInside: "avoid"
      }}
    >
      {/* Header - Hotel Name and GST */}
      <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "2px" }}>
        {hotelName} {data.titleSuffix || ""} ({clerkInitials})
      </div>
      {address && (
        <div style={{ textAlign: "center", fontSize: "11px", marginBottom: "2px" }}>
          {address}
        </div>
      )}
      <div style={{ textAlign: "center", fontSize: "11px", marginBottom: "8px" }}>
        {gstin ? `GST:${gstin}` : ""}
      </div>

      {/* Time and Date on same line */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span>{printTime}</span>
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
            itemName = itemName.name || itemName.item_name || JSON.stringify(itemName);
          }
          if (typeof itemName === "string" && (itemName.startsWith("[") || itemName.startsWith("{"))) {
            try {
              const parsed = JSON.parse(itemName);
              if (Array.isArray(parsed) && parsed.length > 0)
                itemName = parsed[0].name || parsed[0].item_name;
              else if (typeof parsed === "object")
                itemName = parsed.name || parsed.item_name;
            } catch (e) { /* ignore */ }
          }

          let quantity = item.quantity || item.qty || 0;
          const lineTotal = item.line_total || item.amount || 0;

          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ flex: "1", textAlign: "left" }}>{itemName}</span>
              <span style={{ width: "30px", textAlign: "center" }}>{quantity}</span>
              <span style={{ width: "60px", textAlign: "right" }}>{Number(lineTotal).toFixed(2)}</span>
            </div>
          );
        })
      )}

      {/* Separator */}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }}></div>

      {/* Taxes */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
        <span>SGST( 2.50%)</span>
        <span>Rs. {Number(sgst).toFixed(2)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
        <span>CGST( 2.50%)</span>
        <span>Rs. {Number(cgst).toFixed(2)}</span>
      </div>

      {/* Separator */}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }}></div>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginBottom: "8px" }}>
        <span>Payable(Rounded)</span>
        <span>Rs. {Math.round(Number(grandTotal)).toFixed(2)}</span>
      </div>

      {/* Table and Party Info */}
      <div style={{ textAlign: "center", fontSize: "11px" }}>
        Table:{tableNo} Party: {partyNo || "1"}
      </div>
    </div>
  );
};

export default function BillPrint({ billData = null }) {
  const [fetchedSettings, setFetchedSettings] = useState(null);

  // Hardcoded fallback since UserContext is missing
  const loggedInClerk = "CLK";

  useEffect(() => {
    // If settings are missing in props, fetch them
    if (!billData?.hotel_name) {
      const clerk = billData?.clerk_initials || loggedInClerk;
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

  const propsData = billData || (typeof window !== "undefined" && window.printBillData) || null;
  const data = { ...fetchedSettings, ...propsData };

  if (!data) {
    return <div>No bill data</div>;
  }

  // --- RESTORED SPLIT BILL LOGIC ---
  if (data.split && data.bills) {
    return (
      <div style={{ display: "block", width: "100%", position: "relative", clear: "both" }}>
        {data.bills.map((bill, index) => (
          <React.Fragment key={index}>
            <BillContent data={bill} settings={fetchedSettings || data} />
            {index < data.bills.length - 1 && (
              <div style={{
                textAlign: "center",
                margin: "20px 0",
                borderBottom: "1px dashed black",
                paddingBottom: "10px",
                fontSize: "12px"
              }}>
                ✂ CUT HERE ✂
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return <BillContent data={data} settings={fetchedSettings || data} />;
}