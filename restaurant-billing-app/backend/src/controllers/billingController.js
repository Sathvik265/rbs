const { OrderModel, OrderItemModel } = require("../models/billingModel");

class BillingController {
  static async createOrder(req, res) {}
  static async getOrder(req, res) {}
  static async getOrderItems(req, res) {}
  static async getOrderTotal(req, res) {}
  static async addItemToOrder(req, res) {}
  static async updateOrderItem(req, res) {}
  static async cancelOrderItem(req, res) {}
  static async getActiveOrders(req, res) {}
  static async getOrdersByTable(req, res) {}
}

module.exports = BillingController;
