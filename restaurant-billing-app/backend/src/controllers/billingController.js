const BillingModel = require("../models/billingModel");
const OrderModel = require("../models/orderModel");
const pool = require("../db");

const billingController = {
  // Get all bills
  async getAllBills(req, res) {
    try {
      const bills = await BillingModel.getAllBills();
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch bills", details: error.message });
    }
  },

  // Get bill by ID
  async getBillById(req, res) {
    try {
      const { billId } = req.params;
      const bill = await BillingModel.getBillById(billId);
      if (bill) {
        res.json(bill);
      } else {
        res.status(404).json({ error: "Bill not found" });
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch bill", details: error.message });
    }
  },

  // Get bill by number and date
  async getBillByNumber(req, res) {
    try {
      const { billNumber, billDate } = req.params;
      const bill = await BillingModel.getBillByNumber(billNumber, billDate);
      if (bill) {
        res.json(bill);
      } else {
        res.status(404).json({ error: "Bill not found" });
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch bill", details: error.message });
    }
  },

  // Get bill items from JSON
  async getBillItems(req, res) {
    try {
      const { billId } = req.params;
      const items = await BillingModel.getBillItems(billId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching bill items:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch bill items", details: error.message });
    }
  },

  // Finalize a bill (formerly createBill)
  async createBill(req, res) {
    try {
      const billData = req.body;

      // Validate required fields
      if (!billData.table_no || !billData.party_no) {
        return res
          .status(400)
          .json({ error: "table_no and party_no are required" });
      }

      // We need to know which bill to finalize.
      // The frontend might not send created_at, so we rely on finding the ACTIVE provisional bill.

      let { table_no, party_no, track, clerk_initials } = billData;

      // IMPORTANT FIX: If orders exist for this table/party, use THEIR track/clerk values
      // because that's what the provisional bill was created with
      const existingOrders = await OrderModel.getPendingOrdersByTableAndParty(
        table_no,
        party_no,
      );

      if (existingOrders && existingOrders.length > 0) {
        // Use the track and clerk_initials from the first order
        track = existingOrders[0].track;
        clerk_initials = existingOrders[0].clerk_initials;
        console.log(
          `Using track="${track}" and clerk="${clerk_initials}" from existing orders`,
        );
      }

      // DEBUG: Log the lookup parameters
      console.log(`Looking for provisional bill with:`, {
        table_no: parseInt(table_no),
        party_no,
        track,
        clerk_initials,
      });

      // Look up the active provisional bill to get the linking 'created_at'
      // Look up the active provisional bill strictly by table/party
      const provisionalRes = await pool.query(
        `SELECT * FROM bills WHERE table_no = $1 AND party_no = $2 AND bill_number = 0 ORDER BY created_at DESC LIMIT 1`,
        [parseInt(table_no), party_no],
      );
      let provisionalBill = provisionalRes.rows[0];

      console.log(`Provisional bill found:`, provisionalBill);

      if (!provisionalBill) {
        // RECOVERY LOGIC: If orders exist but bill is missing, create a new one on the fly.
        if (existingOrders && existingOrders.length > 0) {
          console.log(
            "Orphaned orders found without provisional bill. Attempting recovery...",
          );
          const now = new Date();
          const provisionalBillData = {
            bill_date:
              billData.bill_date || new Date().toISOString().split("T")[0],
            table_no: parseInt(table_no),
            party_no: party_no,
            section: billData.section || "G",
            track: track,
            clerk_initials: clerk_initials,
            created_at: now,
          };

          provisionalBill =
            await BillingModel.createProvisionalBill(provisionalBillData);

          // Update orders to link to this new bill (using created_at as FK)
          await pool.query(
            `UPDATE orders SET created_at = $1 WHERE table_no = $2 AND party_no = $3`,
            [provisionalBill.created_at, parseInt(table_no), party_no],
          );

          console.log(
            "Recovery successful. New provisional bill created and orders linked.",
          );
        } else {
          // ENHANCED ERROR: Query all provisional bills to see what exists
          const allProvisionalBills = await pool.query(
            `SELECT * FROM bills WHERE bill_number = 0 ORDER BY created_at DESC LIMIT 10`,
          );
          console.log(
            `All provisional bills in database:`,
            allProvisionalBills.rows,
          );

          return res.status(404).json({
            error: "No active provisional bill found to finalize.",
            searched_for: {
              table_no: parseInt(table_no),
              party_no,
              track,
              clerk_initials,
            },
            available_provisional_bills: allProvisionalBills.rows.map((b) => ({
              table_no: b.table_no,
              party_no: b.party_no,
              track: b.track,
              clerk_initials: b.clerk_initials,
            })),
          });
        }
      }

      const bill_date = new Date().toISOString().split("T")[0];

      const finalizeData = {
        ...billData,
        bill_date,
        track, // Use the corrected track value
        clerk_initials, // Use the corrected clerk_initials
        created_at: provisionalBill.created_at, // Vital: Pass the key to matching
        order_id: `ORD-${billData.table_no}-${billData.party_no}-${Date.now()}`,
      };

      // Finalize bill
      const result = await BillingModel.finalizeBill(finalizeData);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating bill:", error);
      res
        .status(500)
        .json({ error: "Failed to create bill", details: error.message });
    }
  },

  async getLastBillNumber(req, res) {
    try {
      const { date } = req.params;
      const result = await BillingModel.getLastBillNumber(date);
      res.json(result);
    } catch (error) {
      console.error("Error getting last bill number:", error);
      res.status(500).json({
        error: "Failed to get last bill number",
        details: error.message,
      });
    }
  },

  // Get bills by date range
  async getBillsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.params;
      const bills = await BillingModel.getBillsByDateRange(startDate, endDate);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch bills", details: error.message });
    }
  },

  // === ORDER OPERATIONS ===

  // Get all pending orders
  async getAllPendingOrders(req, res) {
    try {
      const orders = await OrderModel.getAllPendingOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch orders", details: error.message });
    }
  },

  // Get orders by table
  async getOrdersByTable(req, res) {
    try {
      const { tableNo } = req.params;
      const orders = await OrderModel.getPendingOrdersByTable(tableNo);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch orders", details: error.message });
    }
  },

  // Get orders by table and party
  async getOrdersByTableAndParty(req, res) {
    try {
      const { tableNo, partyNo } = req.params;
      const orders = await OrderModel.getPendingOrdersByTableAndParty(
        tableNo,
        partyNo,
      );
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch orders", details: error.message });
    }
  },

  // Create new order
  async createOrder(req, res) {
    try {
      const orderData = req.body;

      // Validate required fields
      if (!orderData.table_no || !orderData.item_name || !orderData.quantity) {
        return res.status(400).json({
          error: "table_no, item_name, and quantity are required",
        });
      }

      // Set defaults
      if (!orderData.party_no) orderData.party_no = "1";
      if (!orderData.track) orderData.track = "TRACK1";
      if (!orderData.clerk_initials) orderData.clerk_initials = "SYS";
      if (!orderData.bill_number) orderData.bill_number = 0; // Always 0 for pending

      // Ensure bill_date is present, default to today if not
      if (!orderData.bill_date) {
        orderData.bill_date = new Date().toISOString().split("T")[0];
      }

      console.log(`Creating order with data:`, {
        table_no: orderData.table_no,
        party_no: orderData.party_no,
        track: orderData.track,
        clerk_initials: orderData.clerk_initials,
      });

      // 1. Find or Create Provisional Bill
      let provisionalBill = await BillingModel.getProvisionalBill(
        orderData.table_no,
        orderData.party_no,
        orderData.track,
        orderData.clerk_initials,
      );

      console.log(`Existing provisional bill:`, provisionalBill);

      if (!provisionalBill) {
        const now = new Date();
        const provisionalBillData = {
          bill_date: orderData.bill_date,
          table_no: orderData.table_no,
          party_no: orderData.party_no,
          section: "G",
          track: orderData.track,
          clerk_initials: orderData.clerk_initials,
          created_at: now,
        };

        console.log(`Creating new provisional bill with:`, provisionalBillData);

        provisionalBill =
          await BillingModel.createProvisionalBill(provisionalBillData);

        console.log(`Created provisional bill:`, provisionalBill);
      }

      // 2. Attach the Bill's 'created_at' to the Order so FK mapping works
      orderData.created_at = provisionalBill.created_at;

      // 3. Create Order
      const order = await OrderModel.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res
        .status(500)
        .json({ error: "Failed to create order", details: error.message });
    }
  },

  // Update order
  async updateOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { quantity, unit_price } = req.body;

      if (!quantity || !unit_price) {
        return res
          .status(400)
          .json({ error: "quantity and unit_price are required" });
      }

      const line_total = quantity * unit_price;
      const updatedOrder = await OrderModel.updateOrderQuantity(
        orderId,
        quantity,
        line_total,
      );

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res
        .status(500)
        .json({ error: "Failed to update order", details: error.message });
    }
  },

  // Delete order
  async deleteOrder(req, res) {
    try {
      const { orderId } = req.params;
      await OrderModel.deleteOrder(orderId);
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting order:", error);
      res
        .status(500)
        .json({ error: "Failed to delete order", details: error.message });
    }
  },

  // Clear orders for table/party
  async clearOrders(req, res) {
    try {
      const { tableNo, partyNo } = req.params;
      await OrderModel.clearOrders(tableNo, partyNo);
      res.json({ message: "Orders cleared successfully" });
    } catch (error) {
      console.error("Error clearing orders:", error);
      res
        .status(500)
        .json({ error: "Failed to clear orders", details: error.message });
    }
  },

  // Get orders total
  async getOrdersTotal(req, res) {
    try {
      const { tableNo, partyNo } = req.params;
      const total = await OrderModel.getOrdersTotal(tableNo, partyNo);
      res.json(total);
    } catch (error) {
      console.error("Error getting orders total:", error);
      res
        .status(500)
        .json({ error: "Failed to get orders total", details: error.message });
    }
  },
  // Purge all bills for a date range
  async purgeBills(req, res) {
    try {
      const { startDate, endDate } = req.body;

      // Default to "today" if no date provided
      let start = startDate;
      let end = endDate;

      if (!start || !end) {
        // Adjust for timezone offset to get local YYYY-MM-DD
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const today = new Date(now.getTime() - offset)
          .toISOString()
          .split("T")[0];
        if (!start) start = today;
        if (!end) end = today;
      }

      const count = await BillingModel.deleteBillsByDateRange(start, end);

      res.status(200).json({
        message: `Purged ${count} bills from ${start} to ${end}`,
        count,
        range: { start, end },
      });
    } catch (error) {
      console.error("Purge error:", error);
      res
        .status(500)
        .json({ error: "Failed to purge bills", details: error.message });
    }
  },
};

module.exports = billingController;
