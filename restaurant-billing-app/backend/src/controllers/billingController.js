const BillingModel = require('../models/billingModel');

const BillingController = {
    async getAllBills(req, res) {
        try {
            const bills = await BillingModel.getAllBills();
            res.status(200).json(bills);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async createBill(req, res) {
        try {
            const newBill = await BillingModel.createBill(req.body);
            res.status(201).json(newBill);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
};

module.exports = BillingController;