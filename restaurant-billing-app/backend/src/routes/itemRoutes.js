const express = require("express");
const router = express.Router();
const ItemModel = require("../models/itemModel");
const { requireAdminFull } = require("../middleware/auth");

router.get("/", async (req, res) => {
  try {
    const items = await ItemModel.getAllItems();
    res.json(items);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch items", details: error.message });
  }
});

router.get("/separate", async (req, res) => {
  try {
    const items = await ItemModel.getSeparateItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch separate items",
      details: error.message,
    });
  }
});

router.get("/regular", async (req, res) => {
  try {
    const items = await ItemModel.getRegularItems();
    res.json(items);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch regular items", details: error.message });
  }
});

// Get all unique item names for dropdown (MUST be before /:id)
router.get("/names/all", async (req, res) => {
  try {
    const names = await ItemModel.getAllItemNames();
    res.json(names);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch item names", details: error.message });
  }
});

// Get all unique categories for dropdown (MUST be before /:id)
router.get("/categories/all", async (req, res) => {
  try {
    const categories = await ItemModel.getAllCategories();
    res.json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch categories", details: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await ItemModel.getItemById(req.params.id);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch item", details: error.message });
  }
});

router.post("/", requireAdminFull, async (req, res) => {
  try {
    const item = await ItemModel.createItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create item", details: error.message });
  }
});

router.put("/:id", requireAdminFull, async (req, res) => {
  try {
    const item = await ItemModel.updateItem(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update item", details: error.message });
  }
});

router.patch("/:id/separate", requireAdminFull, async (req, res) => {
  try {
    const { is_separate } = req.body;
    const item = await ItemModel.updateItemSeparate(req.params.id, is_separate);
    res.json(item);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update item separate status",
      details: error.message,
    });
  }
});

router.delete("/:id", requireAdminFull, async (req, res) => {
  try {
    await ItemModel.deleteItem(req.params.id);
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete item", details: error.message });
  }
});

router.get("/search/:term", async (req, res) => {
  try {
    const items = await ItemModel.searchItems(req.params.term);
    res.json(items);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to search items", details: error.message });
  }
});

module.exports = router;
