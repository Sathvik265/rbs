import React, { useState, useEffect, useRef } from "react";
import { useBilling } from "../context/BillingContext";
import { useSession } from "../context/SessionContext";
import { itemService } from "../services/itemService";
import { billingService } from "../services/billingService";
import ItemEntryForm from "./ItemEntryForm";
import InvoiceScreen from "./InvoiceScreen";
import "../styles/BillingScreen.css";

const BillingScreen = ({ session, onLogout }) => {
  const {
    activeOrders,
    currentOrder,
    orderItems,
    createOrder,
    selectOrder,
    addItemToOrder,
    updateOrderItem,
    cancelOrderItem,
    calculateOrderTotal,
  } = useBilling();

  const [tableNumber, setTableNumber] = useState(1);
  const [partyNumber, setPartyNumber] = useState(1);
  const [itemCode, setItemCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  const itemCodeInputRef = useRef(null);
  const totals = calculateOrderTotal();

  useEffect(() => {
    // Focus on item code input when component mounts
    if (itemCodeInputRef.current) {
      itemCodeInputRef.current.focus();
    }
  }, []);

  const handleCreateOrder = async () => {
    try {
      setIsLoading(true);
      const order = await createOrder(tableNumber, partyNumber);
      await selectOrder(order.id);
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = async (orderId) => {
    try {
      await selectOrder(orderId);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAddItem = async () => {
    if (!currentOrder) {
      setError("Please select or create an order first");
      return;
    }

    if (!itemCode.trim()) {
      setError("Please enter an item code");
      return;
    }

    try {
      setIsLoading(true);
      await addItemToOrder(itemCode.trim().toUpperCase(), quantity);
      setItemCode("");
      setQuantity(1);
      setError("");
      // Focus back on item code input
      if (itemCodeInputRef.current) {
        itemCodeInputRef.current.focus();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const items = await itemService.searchItems(searchQuery.trim(), 10);
      setSearchResults(items);
    } catch (error) {
      console.error("Error searching items:", error);
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (item) => {
    setItemCode(item.item_code);
    setShowItemSearch(false);
    setSearchResults([]);
    if (itemCodeInputRef.current) {
      itemCodeInputRef.current.focus();
    }
  };

  const handleUpdateQuantity = async (orderItemId, newQuantity) => {
    try {
      await updateOrderItem(orderItemId, newQuantity);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCancelItem = async (orderItemId) => {
    try {
      await cancelOrderItem(orderItemId, "User cancelled");
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePrintBill = async () => {
    if (!currentOrder) {
      setError("No order selected");
      return;
    }

    try {
      setIsLoading(true);
      // Create bill
      const bill = await billingService.createBill(currentOrder.id);
      // Print bill (assigns bill number)
      const printedBill = await billingService.printBill(bill.id);
      setCurrentBill(printedBill);
      setShowInvoice(true);
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Global keyboard shortcuts
    if (e.ctrlKey && e.key === "e") {
      e.preventDefault();
      onLogout();
    }

    if (e.key === "F1") {
      e.preventDefault();
      setShowItemSearch(!showItemSearch);
    }

    if (e.key === "F2") {
      e.preventDefault();
      handleCreateOrder();
    }

    if (e.key === "F12") {
      e.preventDefault();
      if (currentOrder && orderItems.some((item) => item.status === "active")) {
        handlePrintBill();
      }
    }

    // Navigation shortcuts
    if (e.key === "Enter") {
      if (e.target.name === "itemCode") {
        document.getElementsByName("quantity")[0]?.focus();
      } else if (e.target.name === "quantity") {
        handleAddItem();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentOrder, orderItems]);

  if (showInvoice && currentBill) {
    return (
      <InvoiceScreen
        bill={currentBill}
        onClose={() => {
          setShowInvoice(false);
          setCurrentBill(null);
        }}
      />
    );
  }

  return (
    <div className="billing-screen">
      <div className="billing-header">
        <h1>Restaurant Billing System</h1>
        <div className="session-info">
          <span>Clerk: {session?.clerk_initials}</span>
          <span>Shift: {session?.shift_code}</span>
          <span>Date: {session?.session_date}</span>
          <button onClick={onLogout} className="logout-btn">
            End Shift (Ctrl+E)
          </button>
        </div>
      </div>

      <div className="billing-content">
        {/* Left Panel - Main Interaction */}
        <div className="left-panel">
          {/* Order Details */}
          <div className="order-section">
            <h3>Order Details</h3>
            <div className="order-controls">
              <div className="form-group">
                <label>Table No:</label>
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) =>
                    setTableNumber(parseInt(e.target.value) || 1)
                  }
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Party No:</label>
                <input
                  type="number"
                  value={partyNumber}
                  onChange={(e) =>
                    setPartyNumber(parseInt(e.target.value) || 1)
                  }
                  min="1"
                />
              </div>
              <button
                onClick={handleCreateOrder}
                disabled={isLoading}
                className="create-order-btn"
              >
                Create Order (F2)
              </button>
            </div>
          </div>

          {/* Item Entry */}
          <div className="item-entry-section">
            <h3>Item Entry</h3>
            <div className="item-controls">
              <div className="form-group">
                <label>Item Code:</label>
                <input
                  ref={itemCodeInputRef}
                  type="text"
                  name="itemCode"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                  placeholder="Enter item code or press F1 to search"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Quantity:</label>
                <input
                  type="number"
                  name="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={isLoading || !currentOrder}
                className="add-item-btn"
              >
                Add Item
              </button>
            </div>

            {/* Item Search */}
            {showItemSearch && (
              <ItemEntryForm
                onSearch={handleItemSearch}
                searchResults={searchResults}
                onSelectItem={handleSelectSearchResult}
                onClose={() => setShowItemSearch(false)}
              />
            )}
          </div>

          {/* Live Bill View */}
          <div className="bill-view-section">
            <h3>Current Order Items</h3>
            {currentOrder ? (
              <div className="order-items">
                <div className="order-header">
                  <p>
                    Table: {currentOrder.table_number}, Party:{" "}
                    {currentOrder.party_number}
                  </p>
                </div>
                <div className="items-list">
                  {orderItems.length === 0 ? (
                    <p className="no-items">No items added yet</p>
                  ) : (
                    orderItems.map((item) => (
                      <div
                        key={item.id}
                        className={`item-row ${
                          item.status === "cancelled" ? "cancelled" : ""
                        }`}
                      >
                        <span className="item-name">{item.item_name}</span>
                        <span className="item-qty">
                          {item.status === "active" ? (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              min="1"
                              className="qty-input"
                            />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <span className="item-rate">₹{item.unit_price}</span>
                        <span className="item-total">₹{item.line_total}</span>
                        {item.status === "active" && (
                          <button
                            onClick={() => handleCancelItem(item.id)}
                            className="cancel-item-btn"
                            title="Cancel Item"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="no-order">No order selected</p>
            )}
          </div>
        </div>

        {/* Right Panel - Context & Summary */}
        <div className="right-panel">
          {/* Active Orders */}
          <div className="active-orders-section">
            <h3>Active Orders</h3>
            <div className="orders-list">
              {activeOrders.length === 0 ? (
                <p className="no-orders">No active orders</p>
              ) : (
                activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`order-item ${
                      currentOrder?.id === order.id ? "selected" : ""
                    }`}
                    onClick={() => handleSelectOrder(order.id)}
                  >
                    <span>
                      Table {order.table_number}, Party {order.party_number}
                    </span>
                    <span>₹{order.total_amount}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bill-summary-section">
            <h3>Bill Summary</h3>
            <div className="totals">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal}</span>
              </div>
              <div className="total-row">
                <span>SGST (2.5%):</span>
                <span>₹{totals.sgst}</span>
              </div>
              <div className="total-row">
                <span>CGST (2.5%):</span>
                <span>₹{totals.cgst}</span>
              </div>
              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>₹{totals.total}</span>
              </div>
            </div>

            <button
              onClick={handlePrintBill}
              disabled={
                isLoading ||
                !currentOrder ||
                orderItems.filter((item) => item.status === "active").length ===
                  0
              }
              className="print-bill-btn"
            >
              {isLoading ? "Processing..." : "Print Bill (F12)"}
            </button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="shortcuts-section">
            <h4>Keyboard Shortcuts</h4>
            <ul>
              <li>Enter: Move to next field</li>
              <li>F1: Item search</li>
              <li>F2: Create order</li>
              <li>F12: Print bill</li>
              <li>Ctrl+E: End shift</li>
            </ul>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default BillingScreen;
