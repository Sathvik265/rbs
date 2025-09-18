const InvoiceModel = require("../models/invoiceModel");
const TransactionModel = require("../models/transactionModel");

class InvoiceController {
  static async getSystemConfig(req, res) {
    try {
      const config = await InvoiceModel.getSystemConfig();

      if (!config) {
        return res.status(404).json({
          error: "System configuration not found",
        });
      }

      res.json({ config });
    } catch (error) {
      console.error("Error getting system config:", error);
      res.status(500).json({
        error: "Failed to get system configuration",
      });
    }
  }

  static async updateSystemConfig(req, res) {
    try {
      const updates = req.body;
      const { updatedBy } = req.body; // Should come from authenticated admin user

      // Remove updatedBy from updates object
      delete updates.updatedBy;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No valid fields to update",
        });
      }

      if (!updatedBy) {
        return res.status(400).json({
          error: "Updated by field is required",
        });
      }

      const config = await InvoiceModel.updateSystemConfig(updates, updatedBy);

      res.json({
        message: "System configuration updated successfully",
        config: config,
      });
    } catch (error) {
      console.error("Error updating system config:", error);
      res.status(500).json({
        error: "Failed to update system configuration",
      });
    }
  }

  static async getParcelRules(req, res) {
    try {
      const rules = await InvoiceModel.getParcelRules();
      res.json({ rules });
    } catch (error) {
      console.error("Error getting parcel rules:", error);
      res.status(500).json({
        error: "Failed to get parcel rules",
      });
    }
  }

  static async createParcelRule(req, res) {
    try {
      const { ruleName, itemGroups, applicableDays } = req.body;

      if (!ruleName || !itemGroups || !applicableDays) {
        return res.status(400).json({
          error: "Rule name, item groups, and applicable days are required",
        });
      }

      if (!Array.isArray(itemGroups) || !Array.isArray(applicableDays)) {
        return res.status(400).json({
          error: "Item groups and applicable days must be arrays",
        });
      }

      const rule = await InvoiceModel.createParcelRule(
        ruleName,
        itemGroups,
        applicableDays
      );

      res.status(201).json({
        message: "Parcel rule created successfully",
        rule: rule,
      });
    } catch (error) {
      console.error("Error creating parcel rule:", error);
      res.status(500).json({
        error: "Failed to create parcel rule",
      });
    }
  }

  static async updateParcelRule(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.created_at;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No valid fields to update",
        });
      }

      const rule = await InvoiceModel.updateParcelRule(id, updates);

      if (!rule) {
        return res.status(404).json({
          error: "Parcel rule not found",
        });
      }

      res.json({
        message: "Parcel rule updated successfully",
        rule: rule,
      });
    } catch (error) {
      console.error("Error updating parcel rule:", error);
      res.status(500).json({
        error: "Failed to update parcel rule",
      });
    }
  }

  static async deleteParcelRule(req, res) {
    try {
      const { id } = req.params;
      const rule = await InvoiceModel.deleteParcelRule(id);

      if (!rule) {
        return res.status(404).json({
          error: "Parcel rule not found",
        });
      }

      res.json({
        message: "Parcel rule deleted successfully",
        rule: rule,
      });
    } catch (error) {
      console.error("Error deleting parcel rule:", error);
      res.status(500).json({
        error: "Failed to delete parcel rule",
      });
    }
  }

  static async generateInvoice(req, res) {
    try {
      const { billId } = req.params;

      const invoiceData = await InvoiceModel.generateInvoiceData(billId);

      res.json({
        message: "Invoice data generated successfully",
        invoice: invoiceData,
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({
        error: "Failed to generate invoice",
      });
    }
  }

  static async checkParcelSplit(req, res) {
    try {
      const { orderId } = req.params;
      const { currentDay } = req.query;

      if (!currentDay) {
        return res.status(400).json({
          error: "Current day is required",
        });
      }

      const splitInfo = await InvoiceModel.checkParcelSplitRequired(
        orderId,
        currentDay
      );

      res.json({ splitInfo });
    } catch (error) {
      console.error("Error checking parcel split:", error);
      res.status(500).json({
        error: "Failed to check parcel split",
      });
    }
  }
}

module.exports = InvoiceController;
