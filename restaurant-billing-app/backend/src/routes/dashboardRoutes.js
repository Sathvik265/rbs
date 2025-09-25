const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Middleware to protect admin routes (simple version)
const isAdmin = (req, res, next) => {
    // In a real app, this would check a JWT, session, etc.
    // For now, we'll use a header or query param for simplicity.
    const { authorization } = req.headers;
    if (authorization === 'admin') { // This is NOT secure, for demo only!
        return next();
    }
    res.status(403).json({ detail: 'Forbidden: Admins only' });
};

router.get('/top-items', isAdmin, reportController.getTopItems);

module.exports = router;
