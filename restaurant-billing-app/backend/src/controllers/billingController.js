const BillingModel = require("../models/billingModel");

const BillingController = {
  // GET /api/bill/all
  async getAllBills(req, res) {
    try {
      const bills = await BillingModel.getAllBills();
      res.status(200).json(bills);
    } catch (error) {
      console.error("Get all bills error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/bill
  async createBill(req, res) {
    try {
      console.log("Creating bill with data:", req.body);
      const newBill = await BillingModel.createBill(req.body);
      console.log("Bill created successfully:", newBill);
      res.status(201).json(newBill);
    } catch (error) {
      console.error("Create bill error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/bill/last?table_no=&bill_date=
  async getLastBill(req, res) {
    try {
      const { table_no, bill_date } = req.query;
      if (!table_no || !bill_date) {
        return res
          .status(400)
          .json({ error: "table_no and bill_date are required" });
      }
      const bill = await BillingModel.getLastBill(table_no, bill_date);
      res.status(200).json(bill);
    } catch (error) {
      console.error("Get last bill error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/bill/by_date?bill_date=
  async getBillsByDate(req, res) {
    try {
      const { bill_date } = req.query;
      if (!bill_date) {
        return res.status(400).json({ error: "bill_date is required" });
      }
      const bills = await BillingModel.getBillsByDate(bill_date);
      res.status(200).json(bills);
    } catch (error) {
      console.error("Get bills by date error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/bill/next_number?bill_date=
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
};

module.exports = BillingController;
