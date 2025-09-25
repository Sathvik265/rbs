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

router.get('/time-range', isAdmin, reportController.getTimeRangeReport);
router.get('/date-range', isAdmin, reportController.getDateRangeReport);
router.get('/by-shift', isAdmin, reportController.getShiftReport);


router.get('/item-wise', isAdmin, reportController.getItemWiseReport);
router.get('/time-wise', isAdmin, reportController.getTimeWiseReport);
router.get('/shift-wise', isAdmin, reportController.getShiftWiseReport);

module.exports = router;
