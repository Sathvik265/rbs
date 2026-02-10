import React, { useEffect, useState } from "react";
import axios from "axios";
import { API, safeGet, safeArray, safeObject } from "../utils/helpers";

export default function BillPrint({ billData = null }) {
  const [fetchedSettings, setFetchedSettings] = useState(null);

  useEffect(() => {
    // If settings are missing in props, fetch them
    if (!billData?.hotel_name) {
      const clerk = billData?.clerk_initials || "CLK";
      axios
        .get(`${API}/settings?clerk=${clerk}`)
        .then((res) => setFetchedSettings(res.data))
        .catch((err) =>
          console.error("Failed to fetch settings for print", err),
        );
    }
  }, [billData]);

  const propsData =
    billData || (typeof window !== "undefined" && window.printBillData) || null;

  const data = { ...fetchedSettings, ...propsData };

  if (!data) {
    console.log("BillPrint: No bill data available");
    return <div>No bill data</div>;
  }

  const header = safeObject(data.header);
  const items = safeArray(data.items || data.items_json);
  const billNumber =
    safeGet(data, "bill_number") || safeGet(header, "bill_number", "N/A");
  const tableNo =
    safeGet(data, "table_no") || safeGet(header, "table_no", "N/A");
  const partyNo = safeGet(data, "party_no") || safeGet(header, "party_no", "0");
  const hotelName = safeGet(data, "hotel_name", "Restaurant");
  const address = safeGet(data, "address", "");
  const phone = safeGet(data, "phone", "");
  const gstin = safeGet(data, "gstin", "");
  const clerkInitials = safeGet(data, "clerk_initials", "CLK"); // Added clerk initials
  const createdAt = safeGet(data, "created_at", null);
  const subtotal = safeGet(data, "subtotal", 0);
  const sgst = safeGet(data, "sgst", 0);
  const cgst = safeGet(data, "cgst", 0);
  const grandTotal = safeGet(data, "grand_total", 0);

  return (
    <div
      className="print-receipt"
      style={{
        fontFamily: "monospace",
        fontSize: "12px",
        maxWidth: "300px",
        color: "black",
        background: "white",
      }}
    >
      <div className="text-center font-bold">{hotelName}</div>
      {address && <div className="text-center text-xs">{address}</div>}
      <div className="text-center text-xs">
        {gstin ? ` GSTIN: ${gstin}` : ""}
        {phone ? `  Ph: ${phone}` : ""}
      </div>
      <div className="text-center">{"=".repeat(40)}</div>
      <div className="flex justify-between">
        <span>Bill No</span>
        <span>{billNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{createdAt ? new Date(createdAt).toLocaleString() : "N/A"}</span>
      </div>
      <div className="flex justify-between">
        <span>Table</span>
        <span>
          {tableNo} {partyNo && partyNo !== "0" ? `(Party ${partyNo})` : ""}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Server</span>
        <span>{clerkInitials}</span>
      </div>
      <div>{"=".repeat(40)}</div>

      <table className="w-full" style={{ width: "100%", color: "black" }}>
        <thead>
          <tr>
            <th className="text-left">No.</th>
            <th className="text-left">Item</th>
            <th className="text-left">Qty</th>
            <th className="text-left">Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center">
                No Items Found
              </td>
            </tr>
          ) : (
            items.map((item, i) => {
              let itemName = item.item_name || item.name || "Unknown Item";

              if (typeof itemName === "object") {
                itemName =
                  itemName.name ||
                  itemName.item_name ||
                  JSON.stringify(itemName);
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
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{itemName}</td>
                  <td>{quantity}</td>
                  <td>{Number(lineTotal).toFixed(2)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div>{"=".repeat(40)}</div>
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span> {Number(subtotal).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>SGST (2.5%)</span>
        <span> {Number(sgst).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>CGST (2.5%)</span>
        <span> {Number(cgst).toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span> {Math.round(Number(grandTotal)).toFixed(2)}</span>
      </div>
      <div className="text-center text-xs mt-2">Thank you! Visit again</div>
    </div>
  );
}
