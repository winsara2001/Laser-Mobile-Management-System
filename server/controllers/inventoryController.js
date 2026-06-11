const supabase = require('../config/supabaseClient');
const crypto = require('crypto');

// @desc    Get inventory logs
// @route   GET api/inventory/logs
// @access  Private
exports.getInventoryLogs = async (req, res) => {
    try {
        const { data: logs, error } = await supabase
            .from('inventory_logs')
            .select('*, products(name, id, category)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Fetch profiles separately because user_id references auth.users
        const { data: profiles } = await supabase.from('profiles').select('id, fullName');
        const profileMap = {};
        if (profiles) {
            profiles.forEach(p => {
                profileMap[p.id] = p.fullName;
            });
        }

        const formattedLogs = logs.map(log => ({
            ...log,
            users: log.user_id ? { name: profileMap[log.user_id] || 'Unknown User' } : null
        }));

        res.json(formattedLogs);
    } catch (err) {
        console.error('Error fetching inventory logs:', err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get all products
// @route   GET api/inventory
// @access  Private
exports.getProducts = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Ensure _id maps to id for frontend compatibility which expected Mongoose style _id
        const mappedProducts = products.map(p => ({ ...p, _id: p.id }));
        res.json(mappedProducts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get single product
// @route   GET api/inventory/:id
// @access  Private
exports.getProduct = async (req, res) => {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        product._id = product.id;
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Add new product
// @route   POST api/inventory
// @access  Private (Admin/Manager)
exports.addProduct = async (req, res) => {
    const { name, brand, category, price, costPrice, stock, supplier, description, specifications, sku, barcode, variants, promotion } = req.body;
    let finalImageUrl = req.body.imageUrl || '';
    if (req.files && req.files.length > 0) {
        let categoryFolder = 'Other';
        if (category === 'mobile') categoryFolder = 'Mobile Phones';
        else if (category === 'accessory') categoryFolder = 'Accessory';
        else if (category === 'part') categoryFolder = 'Spare Parts';
        const safeName = (name || 'Unnamed Product').replace(/[<>:"/\\|?*]+/g, '').trim();
        const fileUrls = req.files.map(f => `/src/Images/${categoryFolder}/${safeName}/${f.originalname.replace(/\s+/g, '-')}`);
        finalImageUrl = finalImageUrl ? finalImageUrl + ',' + fileUrls.join(',') : fileUrls.join(',');
    }

    try {
        const { data: product, error } = await supabase
            .from('products')
            .insert([{
                id: crypto.randomUUID(),
                name: name || 'Unnamed Product',
                category: category || 'mobile',
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                supplier: supplier || null,
                imageUrl: finalImageUrl || null,
                barcode: barcode || null,
                description: description || null,
                specifications: specifications || null,
                variants: variants || null,
                promotion: promotion || null
            }])
            .select();

        if (error) throw error;

        if (product && product.length > 0) {
            await supabase.from('inventory_logs').insert([{
                product_id: product[0].id,
                user_id: req.user ? req.user.id : null,
                action: 'ADDED',
                quantity_change: product[0].stock,
                previous_stock: 0,
                new_stock: product[0].stock
            }]);

            product[0]._id = product[0].id;
            res.json(product[0]);
        } else {
            res.status(500).send('Failed to insert product: no rows returned');
        }
    } catch (err) {
        console.error("PRODUCT INSERT ERROR:", err);
        res.status(500).json({ error: err.message, stack: err.stack, details: err });
    }
};

// @desc    Update product
// @route   PUT api/inventory/:id
// @access  Private (Admin/Manager)
exports.updateProduct = async (req, res) => {
    const { name, brand, category, price, costPrice, stock, supplier, description, specifications, sku, barcode, variants, promotion } = req.body;
    let finalImageUrl = req.body.imageUrl || '';
    if (req.files && req.files.length > 0) {
        let categoryFolder = 'Other';
        if (category === 'mobile') categoryFolder = 'Mobile Phones';
        else if (category === 'accessory') categoryFolder = 'Accessory';
        else if (category === 'part') categoryFolder = 'Spare Parts';
        const safeName = (name || 'Unnamed Product').replace(/[<>:"/\\|?*]+/g, '').trim();
        const fileUrls = req.files.map(f => `/src/Images/${categoryFolder}/${safeName}/${f.originalname.replace(/\s+/g, '-')}`);
        finalImageUrl = finalImageUrl ? finalImageUrl + ',' + fileUrls.join(',') : fileUrls.join(',');
    }
    const productFields = {};
    if (name !== undefined) productFields.name = name;
    if (category !== undefined) productFields.category = category;
    if (price !== undefined) productFields.price = parseFloat(price);
    if (stock !== undefined) productFields.stock = parseInt(stock);
    if (supplier !== undefined) productFields.supplier = supplier;
    if (finalImageUrl) productFields.imageUrl = finalImageUrl;
    if (barcode !== undefined) productFields.barcode = barcode;
    if (description !== undefined) productFields.description = description;
    if (specifications !== undefined) productFields.specifications = specifications;
    if (variants !== undefined) productFields.variants = variants;
    if (promotion !== undefined) productFields.promotion = promotion;

    try {
        const { data: oldProduct } = await supabase.from('products').select('stock').eq('id', req.params.id).single();
        const oldStock = oldProduct ? oldProduct.stock : 0;

        const { data: product, error } = await supabase
            .from('products')
            .update(productFields)
            .eq('id', req.params.id)
            .select();

        if (error || !product || product.length === 0) {
            return res.status(404).json({ msg: 'Product not found or update error' });
        }

        const newStock = product[0].stock;
        await supabase.from('inventory_logs').insert([{
            product_id: product[0].id,
            user_id: req.user ? req.user.id : null,
            action: 'UPDATED',
            quantity_change: newStock - oldStock,
            previous_stock: oldStock,
            new_stock: newStock
        }]);

        product[0]._id = product[0].id;
        res.json(product[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Delete product
// @route   DELETE api/inventory/:id
// @access  Private (Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const { data: product } = await supabase.from('products').select('id, stock, name').eq('id', req.params.id).single();
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Insert log with product_id=null so it survives CASCADE
        await supabase.from('inventory_logs').insert([{
            product_id: null,
            user_id: req.user ? req.user.id : null,
            action: 'DELETED',
            quantity_change: -product.stock,
            previous_stock: product.stock,
            new_stock: 0
        }]);

        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
