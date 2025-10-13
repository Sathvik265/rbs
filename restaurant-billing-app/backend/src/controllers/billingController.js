const BillingModel = require("../models/billingModel");
const OrderModel = require("../models/orderModel");

const BillingController = {
  async createOrder(req, res) {
    try {
      const newOrder = await OrderModel.createOrder(req.body);
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getPendingOrdersByTable(req, res) {
    try {
      const { table_no } = req.params;
      const orders = await OrderModel.getPendingOrdersByTable(table_no);
      res.status(200).json(orders);
    } catch (error) {
      console.error("Get pending orders error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async createBill(req, res) {
    try {
      const { bill_date } = req.body;
      const { bill_number } = await BillingModel.getNextBillNumber(bill_date);
      const newBill = await BillingModel.createBill({
        ...req.body,
        bill_number,
      });
      res.status(201).json(newBill);
    } catch (error) {
      console.error("Create bill error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getNextBillNumber(req, res) {
    try {
      const { bill_date } = req.query;
      if (!bill_date) {
        return res.status(400).json({ error: "bill_date is required" });
      }
      const nextBillNumber = await BillingModel.getNextBillNumber(bill_date);
      res.status(200).json(nextBillNumber);
    } catch (error) {
      console.error("Get next bill number error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getAllBills(req, res) {
    try {
      const bills = await BillingModel.getAllBills();
      res.status(200).json(bills);
    } catch (error) {
      console.error("Get all bills error:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = BillingController;
