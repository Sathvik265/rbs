const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Middleware to protect admin routes (simple version)
const isAdmin = (req, res, next) => {
    const { authorization } = req.headers;
    if (authorization === 'admin') { // This is NOT secure, for demo only!
        return next();
    }
    res.status(403).json({ detail: 'Forbidden: Admins only' });
};

router.get('/unprinted', isAdmin, reportController.getUnprintedBills);

module.exports = router;
