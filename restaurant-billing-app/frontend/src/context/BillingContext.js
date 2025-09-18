import React, { createContext, useContext, useState, useEffect } from "react";
import { billingService } from "../services/billingService";
import { useSession } from "./SessionContext";

const BillingContext = createContext();

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return context;
};

export const BillingProvider = ({ children }) => {
  const { currentSession } = useSession();
  const [activeOrders, setActiveOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load active orders when session changes
  useEffect(() => {
    if (currentSession) {
      loadActiveOrders();
    } else {
      setActiveOrders([]);
      setCurrentOrder(null);
      setOrderItems([]);
    }
  }, [currentSession]);

  const loadActiveOrders = async () => {
    if (!currentSession) return;

    setIsLoading(true);
    try {
      const orders = await billingService.getActiveOrders(currentSession.id);
      setActiveOrders(orders);
    } catch (error) {
      console.error("Error loading active orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (tableNumber, partyNumber) => {
    if (!currentSession) throw new Error("No active session");

    try {
      const order = await billingService.createOrder(
        currentSession.id,
        tableNumber,
        partyNumber
      );
      await loadActiveOrders();
      return order;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  };

  const selectOrder = async (orderId) => {
    setIsLoading(true);
    try {
      const order = await billingService.getOrderWithItems(orderId);
      setCurrentOrder(order);
      setOrderItems(order.items || []);
    } catch (error) {
      console.error("Error selecting order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToOrder = async (itemCode, quantity = 1) => {
    if (!currentOrder) throw new Error("No order selected");

    try {
      await billingService.addItemToOrder(currentOrder.id, itemCode, quantity);
      await selectOrder(currentOrder.id); // Refresh order items
      await loadActiveOrders(); // Refresh order list
    } catch (error) {
      console.error("Error adding item to order:", error);
      throw error;
    }
  };

  const updateOrderItem = async (orderItemId, quantity) => {
    try {
      await billingService.updateOrderItem(orderItemId, quantity);
      await selectOrder(currentOrder.id); // Refresh order items
      await loadActiveOrders(); // Refresh order list
    } catch (error) {
      console.error("Error updating order item:", error);
      throw error;
    }
  };

  const cancelOrderItem = async (orderItemId, reason = "") => {
    if (!currentSession) throw new Error("No active session");

    try {
      await billingService.cancelOrderItem(
        orderItemId,
        currentSession.clerk_initials,
        reason
      );
      await selectOrder(currentOrder.id); // Refresh order items
      await loadActiveOrders(); // Refresh order list
    } catch (error) {
      console.error("Error cancelling order item:", error);
      throw error;
    }
  };

  const calculateOrderTotal = () => {
    if (!orderItems || orderItems.length === 0) {
      return {
        subtotal: 0,
        sgst: 0,
        cgst: 0,
        total: 0,
      };
    }

    const subtotal = orderItems
      .filter((item) => item.status === "active")
      .reduce((sum, item) => sum + parseFloat(item.line_total), 0);

    const sgst = subtotal * 0.025; // 2.5%
    const cgst = subtotal * 0.025; // 2.5%
    const total = subtotal + sgst + cgst;

    return {
      subtotal: subtotal.toFixed(2),
      sgst: sgst.toFixed(2),
      cgst: cgst.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const value = {
    activeOrders,
    currentOrder,
    orderItems,
    isLoading,
    createOrder,
    selectOrder,
    addItemToOrder,
    updateOrderItem,
    cancelOrderItem,
    calculateOrderTotal,
    refreshOrders: loadActiveOrders,
  };

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
};
