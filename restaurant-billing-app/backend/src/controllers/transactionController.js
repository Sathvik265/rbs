const TransactionModel = require("../models/transactionModel");
const InvoiceModel = require("../models/invoiceModel");
const BillingModel = require("../models/billingModel");

class TransactionController {
  static async createBill(req, res) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({
          error: "Order ID is required",
        });
      }

      // Get order details with total
      const orderTotal = await BillingModel.calculateOrderTotal(orderId);
      const order = await BillingModel.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
        });
      }

      if (orderTotal.active_items === 0) {
        return res.status(400).json({
          error: "Order has no active items",
        });
      }

      // Get system config for tax rates and receipt info
      const config = await InvoiceModel.getSystemConfig();
      if (!config) {
        return res.status(500).json({
          error: "System configuration not found",
        });
      }

      const subtotal = parseFloat(orderTotal.subtotal);
      const sgstAmount = (subtotal * config.sgst_rate) / 100;
      const cgstAmount = (subtotal * config.cgst_rate) / 100;

      const bill = await TransactionModel.createBill(
        orderId,
        order.session_id,
        subtotal,
        sgstAmount,
        cgstAmount,
        config.hotel_name,
        config.gst_number,
        config.footer_text
      );

      res.status(201).json({
        message: "Bill created successfully",
        bill: bill,
      });
    } catch (error) {
      console.error("Error creating bill:", error);
      res.status(500).json({
        error: "Failed to create bill",
      });
    }
  }

  static async printBill(req, res) {
    try {
      const { billId } = req.params;

      if (!billId) {
        return res.status(400).json({
          error: "Bill ID is required",
        });
      }

      const billWithItems = await TransactionModel.assignBillNumberAndPrint(
        billId
      );

      if (!billWithItems) {
        return res.status(404).json({
          error: "Bill not found",
        });
      }

      res.json({
        message: "Bill printed successfully",
        bill: billWithItems,
      });
    } catch (error) {
      console.error("Error printing bill:", error);
      res.status(500).json({
        error: "Failed to print bill",
      });
    }
  }

  static async getBill(req, res) {
    try {
      const { billId } = req.params;
      const bill = await TransactionModel.getBillById(billId);

      if (!bill) {
        return res.status(404).json({
          error: "Bill not found",
        });
      }

      res.json({ bill });
    } catch (error) {
      console.error("Error getting bill:", error);
      res.status(500).json({
        error: "Failed to get bill",
      });
    }
  }

  static async getBillByNumber(req, res) {
    try {
      const { billNumber } = req.params;
      const bill = await TransactionModel.getBillByNumber(billNumber);

      if (!bill) {
        return res.status(404).json({
          error: "Bill not found",
        });
      }

      res.json({ bill });
    } catch (error) {
      console.error("Error getting bill by number:", error);
      res.status(500).json({
        error: "Failed to get bill",
      });
    }
  }

  static async getSessionBills(req, res) {
    try {
      const { sessionId } = req.params;
      const bills = await TransactionModel.getBillsBySession(sessionId);

      res.json({ bills });
    } catch (error) {
      console.error("Error getting session bills:", error);
      res.status(500).json({
        error: "Failed to get session bills",
      });
    }
  }

  static async getBillsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "Start date and end date are required",
        });
      }

      const bills = await TransactionModel.getBillsByDateRange(
        startDate,
        endDate
      );
      res.json({ bills });
    } catch (error) {
      console.error("Error getting bills by date range:", error);
      res.status(500).json({
        error: "Failed to get bills",
      });
    }
  }

  static async getDailySummary(req, res) {
    try {
      const { date } = req.params;
      const summary = await TransactionModel.getDailySummary(date);

      res.json({ summary });
    } catch (error) {
      console.error("Error getting daily summary:", error);
      res.status(500).json({
        error: "Failed to get daily summary",
      });
    }
  }
}

module.exports = TransactionController;
