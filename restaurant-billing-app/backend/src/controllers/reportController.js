const pool = require('../db');

// GET /api/reports/time-range
exports.getTimeRangeReport = async (req, res) => {
    try {
        const { date, startTime, endTime } = req.query;
        if (!date || !startTime || !endTime) {
            return res.status(400).json({ detail: 'date, startTime, and endTime are required' });
        }

        const startTimestamp = `${date} ${startTime}`;
        const endTimestamp = `${date} ${endTime}`;

        const result = await pool.query(
            `SELECT * FROM bills WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`,
            [startTimestamp, endTimestamp]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Time range report error:', error);
        res.status(500).json({ detail: 'Failed to generate time range report' });
    }
};

// GET /api/reports/date-range
exports.getDateRangeReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ detail: 'startDate and endDate are required' });
        }

        const result = await pool.query(
            `SELECT * FROM bills WHERE bill_date >= $1 AND bill_date <= $2 ORDER BY bill_date, bill_number`,
            [startDate, endDate]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Date range report error:', error);
        res.status(500).json({ detail: 'Failed to generate date range report' });
    }
};

// GET /api/reports/by-shift
exports.getShiftReport = async (req, res) => {
    try {
        const { date, shift_name: shiftName } = req.query;
        if (!date || !shiftName) {
            return res.status(400).json({ detail: 'date and shiftName are required' });
        }

        const result = await pool.query(
            `SELECT b.* FROM bills b JOIN shifts s ON b.shift_id = s.shift_id WHERE s.date = $1 AND s.shift_name = $2 ORDER BY b.bill_number`,
            [date, shiftName]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Shift report error:', error);
        res.status(500).json({ detail: 'Failed to generate shift report' });
    }
};



exports.getShiftWiseReport = async (req, res) => {
    try {
        const { bill_date } = req.query;
        if (!bill_date) {
            return res.status(400).json({ detail: 'bill_date is required' });
        }

        const result = await pool.query(
            `SELECT 
                s.shift_name, 
                COUNT(b.id) as bill_count,
                SUM(b.total_amount) as total_amount
             FROM bills b
             JOIN shifts s ON b.shift_id = s.shift_id
             WHERE b.bill_date = $1
             GROUP BY s.shift_name
             ORDER BY s.shift_name`,
            [bill_date]
        );

        res.json({ report: result.rows });
    } catch (error) {
        console.error('Shift wise report error:', error);
        res.status(500).json({ detail: 'Failed to generate shift wise report' });
    }
};

exports.getTimeWiseReport = async (req, res) => {
    try {
        const { bill_date } = req.query;
        if (!bill_date) {
            return res.status(400).json({ detail: 'bill_date is required' });
        }

        const result = await pool.query(
            `SELECT 
                TO_CHAR(created_at, 'HH24:00') as time_slot,
                COUNT(id) as bill_count,
                SUM(total_amount) as total_amount
             FROM bills
             WHERE bill_date = $1
             GROUP BY time_slot
             ORDER BY time_slot`,
            [bill_date]
        );

        res.json({ report: result.rows });
    } catch (error) {
        console.error('Time wise report error:', error);
        res.status(500).json({ detail: 'Failed to generate time wise report' });
    }
};

exports.getItemWiseReport = async (req, res) => {
    try {
        const { bill_date } = req.query;
        if (!bill_date) {
            return res.status(400).json({ detail: 'bill_date is required' });
        }

        const result = await pool.query(
            `SELECT 
                bi.item_name, 
                SUM(bi.quantity) as total_quantity,
                SUM(bi.quantity * bi.rate) as total_amount
             FROM bill_items bi
             JOIN bills b ON bi.bill_id = b.id
             WHERE b.bill_date = $1
             GROUP BY bi.item_name
             ORDER BY total_quantity DESC`,
            [bill_date]
        );

        res.json({ report: result.rows });
    } catch (error) {
        console.error('Item wise report error:', error);
        res.status(500).json({ detail: 'Failed to generate item wise report' });
    }
};

// GET /api/reconciliation/unprinted
exports.getUnprintedBills = async (req, res) => {
    try {
        // Assuming "not printed" or "running" status is determined by a flag,
        // or perhaps by being very recent and not explicitly marked.
        // For this example, let's find bills from the last 24 hours that haven't been modified.
        // A real implementation might have a `status` column on the bills table.
        const result = await pool.query(
            `SELECT 
                b.*, 
                s.shift_name 
             FROM bills b
             JOIN shifts s ON b.shift_id = s.shift_id
             WHERE b.created_at > NOW() - INTERVAL '24 hours' AND b.modified_from_bill_id IS NULL
             ORDER BY b.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Unprinted bills error:', error);
        res.status(500).json({ detail: 'Failed to fetch unprinted bills' });
    }
};

// GET /api/dashboard/top-items
exports.getTopItems = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await pool.query(
            `SELECT 
                bi.item_name, 
                SUM(bi.quantity) as total_quantity
             FROM bill_items bi
             JOIN bills b ON bi.bill_id = b.id
             WHERE b.bill_date = $1
             GROUP BY bi.item_name
             ORDER BY total_quantity DESC
             LIMIT 5`,
            [today]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Top items error:', error);
        res.status(500).json({ detail: 'Failed to fetch top items' });
    }
};
