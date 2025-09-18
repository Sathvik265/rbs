const express = require("express");
const InvoiceController = require("../controllers/invoiceController");
const router = express.Router();

// System configuration routes
router.get("/config", InvoiceController.getSystemConfig);
router.put("/config", InvoiceController.updateSystemConfig);

// Parcel rules routes
router.get("/parcel-rules", InvoiceController.getParcelRules);
router.post("/parcel-rules", InvoiceController.createParcelRule);
router.put("/parcel-rules/:id", InvoiceController.updateParcelRule);
router.delete("/parcel-rules/:id", InvoiceController.deleteParcelRule);

// Invoice generation routes
router.get("/bills/:billId/invoice", InvoiceController.generateInvoice);
router.get("/orders/:orderId/parcel-check", InvoiceController.checkParcelSplit);

module.exports = router;
