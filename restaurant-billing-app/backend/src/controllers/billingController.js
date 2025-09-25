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
    async getLastBill(req, res) {
        try {
            const { table_no, bill_date } = req.query;
            const bill = await BillingModel.getLastBill(table_no, bill_date);
            res.status(200).json(bill);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getBillsByDate(req, res) {
        try {
            const { bill_date } = req.query;
            const bills = await BillingModel.getBillsByDate(bill_date);
            res.status(200).json(bills);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getLastBill(req, res) {
        try {
            const { table_no, bill_date } = req.query;
            const bill = await BillingModel.getLastBill(table_no, bill_date);
            res.status(200).json(bill);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getBillsByDate(req, res) {
        try {
            const { bill_date } = req.query;
            const bills = await BillingModel.getBillsByDate(bill_date);
            res.status(200).json(bills);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getLastBill(req, res) {
        try {
            const { table_no, bill_date } = req.query;
            const bill = await BillingModel.getLastBill(table_no, bill_date);
            res.status(200).json(bill);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getBillsByDate(req, res) {
        try {
            const { bill_date } = req.query;
            const bills = await BillingModel.getBillsByDate(bill_date);
            res.status(200).json(bills);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getLastBill(req, res) {
        try {
            const { table_no, bill_date } = req.query;
            const bill = await BillingModel.getLastBill(table_no, bill_date);
            res.status(200).json(bill);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getBillsByDate(req, res) {
        try {
            const { bill_date } = req.query;
            const bills = await BillingModel.getBillsByDate(bill_date);
            res.status(200).json(bills);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    async getNextBillNumber(req, res) {
        try {
            const { bill_date } = req.query;
            const nextBillNumber = await BillingModel.getNextBillNumber(bill_date);
            res.status(200).json(nextBillNumber);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
};

module.exports = BillingController;