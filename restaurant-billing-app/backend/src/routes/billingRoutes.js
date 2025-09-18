const express = require("express");
const BillingController = require("../controllers/billingController");
const router = express.Router();

// Billing routes
router.post("/orders", BillingController.createOrder);
router.get("/orders/:orderId", BillingController.getOrder);
router.get("/orders/:orderId/items", BillingController.getOrderItems);
router.get("/orders/:orderId/total", BillingController.getOrderTotal);
router.post("/orders/:orderId/items", BillingController.addItemToOrder);
router.put("/order-items/:orderItemId", BillingController.updateOrderItem);
router.delete("/order-items/:orderItemId", BillingController.cancelOrderItem);
router.get("/sessions/:sessionId/orders", BillingController.getActiveOrders);
router.get(
  "/sessions/:sessionId/tables/:tableNumber/orders",
  BillingController.getOrdersByTable
);

module.exports = router;
