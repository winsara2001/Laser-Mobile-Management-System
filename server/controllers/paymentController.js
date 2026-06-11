const supabase = require('../config/supabaseClient');

// @desc    Get all payments (filtered sales)
// @route   GET api/payments
// @access  Private
exports.getPayments = async (req, res) => {
    try {
        const { method, search, startDate, endDate } = req.query;

        let query = supabase
            .from('sales')
            .select('*')
            .order('date', { ascending: false });

        // Apply payment method filter
        if (method && method !== 'all') {
            query = query.eq('paymentMethod', method);
        }

        // Apply exact date filter using localized bounds
        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        // Apply search filter (customer name or phone)
        if (search) {
            query = query.or(`customerName.ilike.%${search}%,customerPhone.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching payments:', err.message);
        res.status(500).send('Server error');
    }
};
