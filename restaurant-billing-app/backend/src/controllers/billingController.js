const BillingModel = require("../models/billingModel");
const OrderModel = require("../models/orderModel");
const pool = require("../db");

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
      const {
        header,
        item_codes,
        quantities,
        bill_date,
        modified_from_bill_id,
        session_id,
      } = req.body;

      if (!header || !item_codes || !quantities || !bill_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { bill_number } = await BillingModel.getNextBillNumber(bill_date);

      let items = [];
      let subtotal = 0;

      for (let i = 0; i < item_codes.length; i++) {
        const code = item_codes[i];
        const quantity = quantities[i];

        const itemRes = await pool.query(
          "SELECT * FROM items WHERE alpha_code = $1 OR numeric_code = $1",
          [code]
        );

        if (itemRes.rows.length === 0) {
          return res
            .status(400)
            .json({ error: `Item with code ${code} not found` });
        }

        const item = itemRes.rows[0];
        const section = header.section || "G";
        let unit_price;

        switch (section) {
          case "AC":
            unit_price = item.price_ac;
            break;
          case "P":
            unit_price = item.price_fixed;
            break;
          default:
            unit_price = item.price_general;
        }

        const line_total = unit_price * quantity;
        subtotal += line_total;

        items.push({
          item_code: code,
          item_name: item.name,
          quantity: quantity,
          unit_price: unit_price,
          line_total: line_total,
        });
      }

      const sgst = subtotal * 0.025;
      const cgst = subtotal * 0.025;
      const tax_amount = sgst + cgst;
      const grand_total = subtotal + tax_amount;

      const billData = {
        bill_number,
        bill_date,
        table_no: header.table_no,
        party_no: header.party_no,
        section: header.section,
        track: header.track,
        clerk_initials: header.clerk_initials,
        subtotal,
        sgst,
        cgst,
        tax_amount,
        grand_total,
        items,
      };

      const newBill = await BillingModel.createBill(billData);

      // Construct response similar to what frontend expects
      const responseData = {
        header: {
          bill_number: newBill.bill_number,
          table_no: billData.table_no,
        },
        items: items,
        subtotal: billData.subtotal,
        sgst: billData.sgst,
        cgst: billData.cgst,
        grand_total: billData.grand_total,
        hotel_name: "Udupi Anand Bhavan",
        address: "Default Address",
        phone: "123-456-7890",
        gstin: "GST123456789",
        created_at: new Date().toISOString(),
        bill_id: newBill.bill_id,
        detail: newBill.detail,
      };

      res.status(201).json(responseData);
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
