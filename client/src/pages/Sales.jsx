import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, ShoppingCart, Plus, Minus, Trash2, Scan, Wrench, X, CheckCircle, Smartphone, Watch, Headphones, Speaker, Laptop, Tablet, HardDrive, Cpu, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductImages } from '../utils/productImages';
import { useCurrency } from '../context/CurrencyContext';

const Sales = () => {
    const { formatPrice } = useCurrency();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [customer, setCustomer] = useState({ name: '', phone: '', paymentMethod: 'cash' });

    // Repair ticket modal
    const [showRepairModal, setShowRepairModal] = useState(false);
    const [repairForm, setRepairForm] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        deviceModel: '',
        issueDescription: '',
        estimatedCost: '',
        notes: '',
    });
    const [technicians, setTechnicians] = useState([]);
    const [assignedTo, setAssignedTo] = useState('');
    const [repairLoading, setRepairLoading] = useState(false);
    const [repairSuccess, setRepairSuccess] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchTechnicians();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/inventory');
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchTechnicians = async () => {
        try {
            const res = await api.get('/auth');
            const techs = (res.data || []).filter(u =>
                (u.role || '').toLowerCase() === 'technician'
            );
            setTechnicians(techs);
        } catch (err) {
            console.error('Error fetching technicians:', err);
        }
    };

    const openRepairModal = () => {
        // Pre-fill from current sale customer info
        setRepairForm(prev => ({
            ...prev,
            customerName: customer.name || '',
            customerPhone: customer.phone || '',
            customerEmail: '',
            deviceModel: '',
            issueDescription: '',
            estimatedCost: '',
            notes: '',
        }));
        setAssignedTo('');
        setRepairSuccess(false);
        setShowRepairModal(true);
    };

    const handleRepairSubmit = async (e) => {
        e.preventDefault();
        setRepairLoading(true);
        try {
            const payload = {
                newCustomerName: repairForm.customerName,
                newCustomerPhone: repairForm.customerPhone,
                newCustomerEmail: repairForm.customerEmail,
                newDeviceModel: repairForm.deviceModel,
                issueDescription: repairForm.issueDescription,
                estimatedCost: Number(repairForm.estimatedCost) || 0,
                notes: repairForm.notes,
                assignedTo: assignedTo || null,
                status: 'pending',
                customer_id: 'new',
                device_id: 'new',
            };
            await api.post('/repairs', payload);
            setRepairSuccess(true);
            setTimeout(() => setShowRepairModal(false), 1800);
        } catch (err) {
            console.error('Repair ticket error:', err);
            alert('Failed to create repair ticket: ' + (err.response?.data?.msg || err.message));
        } finally {
            setRepairLoading(false);
        }
    };

    const addToCart = (product) => {
        const promotion = product.promotion;
        const hasPromotion = promotion && promotion.discountPercent > 0;
        const finalPrice = hasPromotion 
            ? product.price * (1 - promotion.discountPercent / 100) 
            : product.price;

        const existingItem = cart.find(item => item._id === product._id);
        if (existingItem) {
            if (existingItem.quantity + 1 > product.stock) return alert('Not enough stock');
            setCart(cart.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1, price: finalPrice, originalPrice: product.price, promotionLabel: promotion?.label }]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item._id !== id));
    };

    const updateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item._id === id) {
                const newQty = item.quantity + delta;
                const product = products.find(p => p._id === id);
                if (newQty < 1) return item;
                if (newQty > (product?.stock || 0)) { alert('Not enough stock'); return item; }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return alert('Cart is empty');
        const saleData = {
            products: cart.map(item => ({ 
                product: item._id, 
                quantity: item.quantity, 
                price: item.price,
                originalPrice: item.originalPrice,
                promotionLabel: item.promotionLabel
            })),
            customerName: customer.name,
            customerPhone: customer.phone,
            paymentMethod: customer.paymentMethod
        };
        try {
            await api.post('/sales', saleData);
            alert('Sale completed successfully!');
            setCart([]);
            setCustomer({ name: '', phone: '', paymentMethod: 'cash' });
            fetchProducts();
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Checkout failed');
        }
    };

    const filteredProducts = products.filter(p => {
        const search = searchTerm.toLowerCase();
        return (
            (p.name || '').toLowerCase().includes(search) ||
            String(p.sku || '').toLowerCase().includes(search) ||
            String(p.barcode || '').toLowerCase().includes(search)
        );
    });

    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const product = products.find(p => p.barcode === barcodeInput || p.sku === barcodeInput);
            if (product) { addToCart(product); setBarcodeInput(''); }
            else { alert('Product not found for barcode: ' + barcodeInput); setBarcodeInput(''); }
        }
    };

    return (
        <>
        <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-140px)]">
            {/* Terminal: Product Catalog */}
            <div className="xl:col-span-2 flex-1 bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-black/5 border border-white/60 dark:border-white/5 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-6 items-center bg-white/30 dark:bg-white/[0.02]">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7bc24c] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Universal Search: Variants, Models, or SKU ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 transition-all font-bold"
                        />
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Scan className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500 animate-pulse" size={20} />
                        <input
                            type="text"
                            placeholder="Awaiting Scan: Barcode..."
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyDown={handleBarcodeScan}
                            className="w-full pl-14 pr-6 py-4 rounded-2xl border border-orange-200/50 dark:border-orange-500/20 bg-orange-50/10 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-black tracking-widest uppercase text-xs"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 custom-scrollbar">
                    {filteredProducts.map(product => {
                        const promotion = product.promotion;
                        const hasPromotion = promotion && promotion.discountPercent > 0;
                        const discountedPrice = hasPromotion 
                            ? product.price * (1 - promotion.discountPercent / 100) 
                            : product.price;

                        return (
                            <motion.div
                                whileHover={{ y: -8, scale: 1.02 }}
                                key={product._id}
                                className="group bg-white dark:bg-[#0F111A]/40 border border-slate-100 dark:border-white/5 rounded-3xl p-4 cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-black/10 transition-all relative flex flex-col"
                                onClick={() => addToCart(product)}
                            >
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#7bc24c]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                {/* Image Container */}
                                <div className="h-44 bg-slate-50 dark:bg-[#0F111A] rounded-2xl mb-4 flex items-center justify-center text-slate-200 dark:text-slate-800 border border-slate-100 dark:border-white/5 shadow-inner overflow-hidden relative group-hover:bg-white dark:group-hover:bg-[#161925] transition-colors">
                                    {(() => {
                                        const imageUrl = product.imageUrl || '';
                                        const imgs = imageUrl
                                            ? imageUrl.split(',').map(s => s.trim()).filter(Boolean)
                                            : getProductImages((product.name || '').replace(/\s+/g, ' ').trim());
                                        const thumb = imgs[0] || null;
                                        return thumb ? (
                                            <img src={thumb} alt={product.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <ShoppingCart size={40} className="group-hover:scale-110 group-hover:rotate-6 transition-transform opacity-20" />
                                        );
                                    })()}

                                    {/* Stock Badge */}
                                    {product.stock < 5 && (
                                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg animate-pulse shadow-lg shadow-red-500/20 z-10">Critical Stock</div>
                                    )}

                                    {/* Promotion Badge */}
                                    {hasPromotion && (
                                        <div className="absolute top-3 left-3 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg shadow-orange-500/20 z-10 flex items-center gap-1">
                                            <span className="w-1 h-1 bg-white rounded-full animate-ping" />
                                            {promotion.label || 'OFFER'}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-black text-slate-900 dark:text-white truncate mb-0.5 text-sm tracking-tight group-hover:text-[#7bc24c] transition-colors">{product.name}</h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">{product.brand || 'NO BRAND'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                                        <span className="text-[10px] font-bold text-slate-400 capitalize">{product.category?.replace(/_/g, ' ')}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50 dark:border-white/[0.02]">
                                    <div className="flex flex-col">
                                        {hasPromotion && (
                                            <span className="text-[10px] font-bold text-slate-400 line-through decoration-orange-500/30">{formatPrice(product.price)}</span>
                                        )}
                                        <span className={`font-black tracking-tight italic ${hasPromotion ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                                            {formatPrice(discountedPrice)}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${product.stock > 10 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                                        {product.stock}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Terminal: Checkout Control */}
            <div className="xl:w-[400px] bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-black/5 border border-white/60 dark:border-white/5 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02] flex justify-between items-center">
                    <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white tracking-tight">
                        <ShoppingCart size={24} className="text-[#7bc24c]" />
                        Active Manifest
                    </h2>
                    <button onClick={() => setCart([])} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors">Clear All</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                            <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-[#0F111A] border-2 border-dashed border-slate-200 dark:border-white/5 flex items-center justify-center mb-4">
                                <ShoppingCart size={32} className="opacity-20" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest opacity-40">Awaiting Assets</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item._id} className="group flex justify-between items-center bg-white dark:bg-[#0F111A] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all">
                                <div className="flex-1">
                                    <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1 tracking-tight">{item.name}</h4>
                                    <p className="text-[10px] font-black text-[#7bc24c] uppercase tracking-widest italic">{formatPrice(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-50 dark:bg-[#161925] rounded-xl p-1 border border-slate-200 dark:border-white/5">
                                        <button onClick={() => updateQuantity(item._id, -1)} className="p-2 hover:text-[#7bc24c] text-slate-400 transition-colors"><Minus size={14} /></button>
                                        <span className="text-xs font-black w-8 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item._id, 1)} className="p-2 hover:text-[#7bc24c] text-slate-400 transition-colors"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item._id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02] space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Customer Name</label>
                            <input
                                placeholder="Verified Identity..."
                                value={customer.name}
                                onChange={e => setCustomer({ ...customer, name: e.target.value })}
                                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0F111A] text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Phone Line</label>
                                <input
                                    placeholder="07xxxxxxxx"
                                    value={customer.phone}
                                    onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0F111A] text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 focus:outline-none transition-all"
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Channel</label>
                                <select
                                    value={customer.paymentMethod}
                                    onChange={e => setCustomer({ ...customer, paymentMethod: e.target.value })}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0F111A] text-[10px] font-black uppercase tracking-widest text-[#7bc24c] focus:ring-2 focus:ring-[#7bc24c]/50 focus:outline-none transition-all appearance-none"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Settlement Total</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-[#7bc24c] italic tracking-tight">{formatPrice(calculateTotal())}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={openRepairModal} className="text-[9px] font-black text-[#7bc24c] uppercase tracking-widest border-b border-[#7bc24c]/30 hover:border-[#7bc24c] transition-all flex items-center gap-1">
                                <Wrench size={10} /> Raise Repair Ticket
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full bg-[#7bc24c] hover:bg-[#6ab33d] disabled:opacity-20 disabled:grayscale text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#7bc24c]/20 transform active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        Execute Transaction
                    </button>
                </div>
            </div>
        </div>

            {/* ── Repair Ticket Modal ── */}
            <AnimatePresence>
                {showRepairModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F111A]/60 backdrop-blur-md"
                        onClick={e => { if (e.target === e.currentTarget) setShowRepairModal(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white dark:bg-[#161925] border border-white/20 dark:border-white/5 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-10 border-b border-slate-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#7bc24c]/10 flex items-center justify-center shadow-inner">
                                        <Wrench size={24} className="text-[#7bc24c]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Generate Service Link</h3>
                                        <p className="text-[10px] font-black text-[#7bc24c] uppercase tracking-widest mt-1">Direct Sale-to-Repair Injection</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRepairModal(false)}
                                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                                {/* Success State */}
                                <AnimatePresence>
                                    {repairSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center justify-center py-20 gap-6"
                                        >
                                            <div className="w-24 h-24 rounded-full bg-[#7bc24c]/10 flex items-center justify-center shadow-2xl shadow-[#7bc24c]/20">
                                                <CheckCircle size={48} className="text-[#7bc24c] animate-bounce" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black text-slate-900 dark:text-white text-2xl tracking-tight mb-2">Protocol Successful</p>
                                                <p className="text-slate-500 font-medium text-sm">Service ticket has been injected into the registry.</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Form */}
                                {!repairSuccess && (
                                    <form onSubmit={handleRepairSubmit} className="p-10 space-y-10">
                                        <div className="space-y-8">
                                            {/* Customer section */}
                                            <div className="bg-slate-50 dark:bg-[#0F111A] rounded-[2rem] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic border-l-2 border-[#7bc24c] pl-3">Entity Identification</p>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="col-span-2">
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Legal Customer Name</label>
                                                        <input
                                                            required
                                                            value={repairForm.customerName}
                                                            onChange={e => setRepairForm({ ...repairForm, customerName: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold shadow-sm"
                                                            placeholder="e.g. John Silva"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Contact Line</label>
                                                        <input
                                                            required
                                                            value={repairForm.customerPhone}
                                                            onChange={e => setRepairForm({ ...repairForm, customerPhone: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold shadow-sm"
                                                            placeholder="077xxxxxxx"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Email Hash</label>
                                                        <input
                                                            type="email"
                                                            value={repairForm.customerEmail}
                                                            onChange={e => setRepairForm({ ...repairForm, customerEmail: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold shadow-sm"
                                                            placeholder="Optional"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Device section */}
                                            <div className="bg-slate-50 dark:bg-[#0F111A] rounded-[2rem] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic border-l-2 border-[#7bc24c] pl-3">Hardware Logic</p>
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Hardware Specification</label>
                                                        <input
                                                            required
                                                            value={repairForm.deviceModel}
                                                            onChange={e => setRepairForm({ ...repairForm, deviceModel: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-[#7bc24c] rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-black uppercase tracking-tight shadow-sm"
                                                            placeholder="e.g. iPhone 15 Pro Max"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Diagnostic Observation</label>
                                                        <textarea
                                                            required
                                                            rows={3}
                                                            value={repairForm.issueDescription}
                                                            onChange={e => setRepairForm({ ...repairForm, issueDescription: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold resize-none shadow-sm"
                                                            placeholder="Describe hardware failure..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Assignment & Cost */}
                                            <div className="bg-slate-50 dark:bg-[#0F111A] rounded-[2rem] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic border-l-2 border-[#7bc24c] pl-3">Deployment Params</p>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Assigned Operative</label>
                                                        <select
                                                            value={assignedTo}
                                                            onChange={e => setAssignedTo(e.target.value)}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-[10px] font-black uppercase tracking-widest appearance-none shadow-sm"
                                                        >
                                                            <option value="">— Unassigned —</option>
                                                            {technicians.map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    {t.fullName || t.name || t.email}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Projected Budget</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={repairForm.estimatedCost}
                                                            onChange={e => setRepairForm({ ...repairForm, estimatedCost: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-black tracking-widest shadow-sm"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Service Logic Notes</label>
                                                        <input
                                                            value={repairForm.notes}
                                                            onChange={e => setRepairForm({ ...repairForm, notes: e.target.value })}
                                                            className="w-full bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold shadow-sm"
                                                            placeholder="Internal documentation..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer buttons */}
                                        <div className="flex gap-4 pt-6">
                                            <button
                                                type="button"
                                                onClick={() => setShowRepairModal(false)}
                                                className="flex-1 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 transition-all"
                                            >
                                                Abort Protocol
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={repairLoading}
                                                className="flex-1 bg-[#7bc24c] hover:bg-[#6ab33d] disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-[#7bc24c]/20 flex items-center justify-center gap-3"
                                            >
                                                {repairLoading ? (
                                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Wrench size={16} />
                                                )}
                                                {repairLoading ? 'Injecting...' : 'Initialize Link'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-repair-scroll::-webkit-scrollbar { width: 5px; }
                .custom-repair-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-repair-scroll::-webkit-scrollbar-thumb { background: #2A2D3A; border-radius: 10px; }
            `}</style>
        </>
    );
};

export default Sales;
