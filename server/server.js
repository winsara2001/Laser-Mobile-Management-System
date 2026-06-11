const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock connection bypassing MongoMemoryServer (We use Supabase)
const connectDB = async () => {
    console.log('Using Supabase natively. Bypassing MongoDB init to avoid large downloads...');
};
connectDB();

// Static folder for file uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/repairs', require('./routes/repairRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/devices', require('./routes/deviceRoutes'));

app.get('/', (req, res) => {
    res.send('Mobile Management System API Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
