const express = require('express');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const itemRoutes = require('./routes/itemRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/invoices', invoiceRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});