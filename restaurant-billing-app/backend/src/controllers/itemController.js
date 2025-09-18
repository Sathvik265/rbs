const { ItemModel } = require("../models/itemModel");

class ItemController {
  static async createItem(req, res) {
    try {
      const item = await ItemModel.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getItem(req, res) {
    try {
      const item = await ItemModel.findOne({ code: req.params.code });
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAllItems(req, res) {
    try {
      const items = await ItemModel.find({});
      res.json(items);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async searchItems(req, res) {
    const { query } = req.query;
    try {
      const items = await ItemModel.find({
        $or: [
          { name: new RegExp(query, "i") },
          { code: new RegExp(query, "i") },
          { category: new RegExp(query, "i") },
        ],
      });
      res.json(items);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateItem(req, res) {
    try {
      const item = await ItemModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteItem(req, res) {
    try {
      await ItemModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Additional utility methods:
  static async getCategories(req, res) {
    try {
      const categories = await ItemModel.distinct("category");
      res.json(categories);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getItemGroups(req, res) {
    try {
      const groups = await ItemModel.distinct("item_group");
      res.json(groups);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = ItemController;
