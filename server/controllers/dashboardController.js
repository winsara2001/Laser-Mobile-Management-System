const supabase = require('../config/supabaseClient');

exports.getDashboardStats = async (req, res) => {
    try {
        const { timeframe } = req.query; // 'day', 'month', 'year', or undefined/all

        // Fetch all sales directly from Supabase
        const { data: allSales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .order('date', { ascending: false });

        if (salesError) throw salesError;

        // Apply Time Filtering to Sales
        let sales = allSales;
        if (timeframe) {
            const now = new Date();
            let cutoffDate = new Date();

            if (timeframe === 'day') {
                cutoffDate.setHours(0, 0, 0, 0); // Start of Today
            } else if (timeframe === 'month') {
                cutoffDate.setDate(1); // 1st of current month
                cutoffDate.setHours(0, 0, 0, 0);
            } else if (timeframe === 'year') {
                cutoffDate.setMonth(0, 1); // Jan 1st of current year
                cutoffDate.setHours(0, 0, 0, 0);
            }

            sales = allSales.filter(s => new Date(s.date || s.created_at) >= cutoffDate);
        }

        // Fetch products for inventory value calculation
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('*');

        if (prodError) throw prodError;

        // Note: For User count, ideally query from 'profiles' or another users table
        // We'll mock user count to 0 or fetch from profiles if it exists
        const { data: profiles, error: profileErr } = await supabase
            .from('profiles')
            .select('id');

        const userCount = profileErr ? 0 : (profiles?.length || 0);

        // Calculate breakdown by payment method
        const paymentMethods = sales.reduce((acc, sale) => {
            const method = sale.paymentMethod || 'other';
            acc[method] = (acc[method] || 0) + (sale.totalAmount || 0);
            return acc;
        }, { cash: 0, card: 0, online: 0 });

        const recentSales = sales.slice(0, 5);

        // --- NEW METRIC CALCULATIONS ---

        // 1. Daily Sales
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todaySales = sales.filter(s => new Date(s.date || s.created_at) >= startOfDay);
        const dailySales = todaySales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const fulfilledTodayCount = todaySales.length;

        // 2. Pending Repairs
        const { data: repairs, error: repairErr } = await supabase
            .from('repairs')
            .select('*')
            .neq('status', 'completed');

        const pendingRepairsCount = repairErr ? 0 : (repairs?.length || 0);
        const pendingRepairsList = repairErr ? [] : repairs;

        // 3. Low Stock Alerts (< 5 items)
        const lowStockCount = products.filter(p => (p.stock || 0) < 5).length;

        let recentFeedback = [];
        try {
            const { data: feedbackData } = await supabase
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);
            if (feedbackData) recentFeedback = feedbackData;
        } catch (fbErr) {
            console.warn("Feedback table might not exist yet:", fbErr.message);
        }

        res.json({
            // Legacy fallbacks (in case other components use them)
            totalSales: sales.length,
            inventoryValue: products.reduce((acc, curr) => acc + (curr.price * (curr.stock || 0)), 0),
            userCount,
            totalRevenue: sales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),

            // New Accurate Metrics
            dailySales,
            pendingRepairsCount,
            stockAlertsCount: lowStockCount,
            fulfilledTodayCount,

            // Low stock item details for popup
            lowStockItems: products
                .filter(p => (p.stock || 0) < 5)
                .map(p => ({
                    id: p.id,
                    name: (p.name || '').replace(/\s+/g, ' ').trim(),
                    stock: p.stock || 0,
                    category: p.category || '',
                    supplier: p.supplier || ''
                })),

            // Lists
            paymentMethods,
            recentSales,
            recentFeedback,
            todaySales,
            pendingRepairsList
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err.message);
        res.status(500).send('Server error');
    }
};
