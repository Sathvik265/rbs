import api from "./apiService";

export const billingService = {
  // Order management
  async createOrder(sessionId, tableNumber, partyNumber) {
    const response = await api.post("/billing/orders", {
      sessionId,
      tableNumber,
      partyNumber,
    });
    return response.order;
  },

  async getOrder(orderId) {
    const response = await api.get(`/billing/orders/${orderId}`);
    return response.order;
  },

  async getOrderWithItems(orderId) {
    const response = await api.get(`/billing/orders/${orderId}`);
    return response.order;
  },

  async getActiveOrders(sessionId) {
    const response = await api.get(`/billing/sessions/${sessionId}/orders`);
    return response.orders;
  },

  async getOrdersByTable(sessionId, tableNumber) {
    const response = await api.get(
      `/billing/sessions/${sessionId}/tables/${tableNumber}/orders`
    );
    return response.orders;
  },

  // Item management
  async addItemToOrder(orderId, itemCode, quantity = 1) {
    const response = await api.post(`/billing/orders/${orderId}/items`, {
      itemCode,
      quantity,
    });
    return response.orderItem;
  },

  async updateOrderItem(orderItemId, quantity) {
    const response = await api.put(`/billing/order-items/${orderItemId}`, {
      quantity,
    });
    return response.orderItem;
  },

  async cancelOrderItem(orderItemId, cancelledBy, reason = null) {
    const response = await api.delete(`/billing/order-items/${orderItemId}`, {
      data: {
        cancelledBy,
        reason,
      },
    });
    return response.orderItem;
  },

  async getOrderTotal(orderId) {
    const response = await api.get(`/billing/orders/${orderId}/total`);
    return response.total;
  },

  // Bill management
  async createBill(orderId) {
    const response = await api.post("/transactions/bills", {
      orderId,
    });
    return response.bill;
  },

  async printBill(billId) {
    const response = await api.put(`/transactions/bills/${billId}/print`);
    return response.bill;
  },

  async getBill(billId) {
    const response = await api.get(`/transactions/bills/${billId}`);
    return response.bill;
  },

  async getBillByNumber(billNumber) {
    const response = await api.get(`/transactions/bills/number/${billNumber}`);
    return response.bill;
  },

  async getSessionBills(sessionId) {
    const response = await api.get(`/transactions/sessions/${sessionId}/bills`);
    return response.bills;
  },
};
