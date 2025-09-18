const express = require("express");
const ItemController = require("../controllers/itemController");
const router = express.Router();

// Item management routes
router.post("/", ItemController.createItem);
router.get("/", ItemController.getAllItems);
router.get("/search", ItemController.searchItems);
router.get("/categories", ItemController.getCategories);
router.get("/groups", ItemController.getItemGroups);
router.get("/:code", ItemController.getItem);
router.put("/:id", ItemController.updateItem);
router.delete("/:id", ItemController.deleteItem);

module.exports = router;
