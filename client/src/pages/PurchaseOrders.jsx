import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShoppingCart, Plus, CheckCircle, XCircle, Package, Calendar, DollarSign, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '../context/CurrencyContext';

const PurchaseOrders = () => {
    const { formatPrice, currency } = useCurrency();
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    
    const [formData, setFormData] = useState({
        supplier_id: '',
        product_id: '',
        quantity: '',
        expected_delivery_date: '',
        total_cost: ''
    });

    useEffect(() => {
        fetchOrders();
        fetchDependencies();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/purchase-orders');
            setOrders(res.data);
        } catch (err) {
            console.error('Error fetching orders', err);
        }
    };

    const fetchDependencies = async () => {
        try {
            const [supRes, prodRes] = await Promise.all([
                api.get('/suppliers'),
                api.get('/inventory')
            ]);
            setSuppliers(supRes.data);
            setProducts(prodRes.data);
        } catch (err) {
            console.error('Error fetching dependencies', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            // Auto-calculate budget allocation when product or quantity changes
            if (name === 'product_id' || name === 'quantity') {
                const productId = name === 'product_id' ? value : prev.product_id;
                const qty = name === 'quantity' ? parseFloat(value) : parseFloat(prev.quantity);
                const selectedProduct = products.find(p => (p.id || p._id) === productId);
                if (selectedProduct && !isNaN(qty) && qty > 0) {
                    updated.total_cost = (selectedProduct.price * qty).toFixed(2);
                } else if (name === 'product_id') {
                    // Reset if product cleared
                    updated.total_cost = '';
                }
            }

            return updated;
        });
    };

    // Get the currently selected product object
    const selectedProduct = products.find(p => (p.id || p._id) === formData.product_id);
    const unitCost = selectedProduct?.price || null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/purchase-orders', formData);
            setShowModal(false);
            setFormData({ supplier_id: '', product_id: '', quantity: '', expected_delivery_date: '', total_cost: '' });
            fetchOrders();
        } catch (err) {
            console.error('Error creating order', err);
        }
    };

    const updateOrderStatus = async (order, status) => {
        try {
            await api.put(`/purchase-orders/${order.id}/status`, { status });
            
            if (status === 'Received') {
                const productName = order.products?.name || 'Unknown Item';
                localStorage.setItem('pendingInventoryToast', JSON.stringify({
                    quantity: order.quantity,
                    productName: productName
                }));
            }
            
            fetchOrders();
        } catch (err) {
            console.error('Error updating status', err);
        }
    };

    return (
        <div className="space-y-10">
            {/* Header Terminal */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white/50 dark:bg-white/[0.02] p-10 rounded-[2.5rem] border border-white/40 dark:border-white/5 backdrop-blur-md shadow-2xl shadow-black/5">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic flex items-center gap-4">
                        <Package className="text-[#7bc24c]" size={36} />
                        Supply Chain Logistics
                    </h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
                        <ShieldCheck size={14} className="text-[#7bc24c]" />
                        Procurement Pipeline Node 04: Synchronized
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#7bc24c] hover:bg-[#6ab33d] text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-[#7bc24c]/20 font-black text-xs uppercase tracking-widest active:scale-95"
                >
                    <Plus size={20} />
                    Initialize Procurement
                </button>
            </div>

            {/* Main Ledger */}
            <div className="bg-white/70 dark:bg-[#161925]/60 border border-white/60 dark:border-white/5 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                <th className="px-8 py-6">Hardware Payload</th>
                                <th className="px-8 py-6">Vendor Entity</th>
                                <th className="px-8 py-6 text-center">Deployment State</th>
                                <th className="px-8 py-6">Arrival Matrix</th>
                                <th className="px-8 py-6 text-right">Command</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <Package size={48} className="text-[#7bc24c]" />
                                            <p className="font-black text-[10px] uppercase tracking-widest text-slate-500">Zero active procurement streams detected.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.map(order => (
                                <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-[#7bc24c]/10 text-[#7bc24c] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white tracking-tight italic text-lg">{order.products?.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase">Qty: {order.quantity}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                    <span className="text-[10px] font-black text-[#7bc24c] tracking-widest">{formatPrice(order.total_cost)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-black text-slate-700 dark:text-slate-300 text-sm italic">{order.suppliers?.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{order.suppliers?.email}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl tracking-[0.2em] border shadow-sm ${
                                            order.status === 'Received' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' :
                                            order.status === 'Not Received' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
                                            order.status === 'Shipped' ? 'bg-[#7bc24c]/5 border-[#7bc24c]/20 text-[#7bc24c]' :
                                            'bg-orange-500/5 border-orange-500/20 text-orange-500'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1.5 font-black text-[10px] uppercase tracking-widest text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span>Sent: {new Date(order.order_date).toLocaleDateString()}</span>
                                            </div>
                                            {order.expected_delivery_date && (
                                                <div className="flex items-center gap-2 text-[#7bc24c]">
                                                    <ShieldCheck size={12} />
                                                    <span>ETA: {new Date(order.expected_delivery_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <AnimatePresence>
                                            {(order.status === 'Shipped' || order.status === 'Pending') && (
                                                <motion.div 
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="flex items-center justify-end gap-3"
                                                >
                                                    <button 
                                                        onClick={() => updateOrderStatus(order, 'Received')}
                                                        className="bg-[#7bc24c]/10 text-[#7bc24c] hover:bg-[#7bc24c] hover:text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#7bc24c]/20 transition-all flex items-center gap-2 shrink-0 group/btn"
                                                    >
                                                        <CheckCircle size={14} className="group-hover/btn:animate-bounce" /> Received
                                                    </button>
                                                    <button 
                                                        onClick={() => updateOrderStatus(order, 'Not Received')}
                                                        className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center gap-2 shrink-0"
                                                    >
                                                        <XCircle size={14} /> Failed
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Procurement Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-[#0F111A]/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white dark:bg-[#161925] border border-white/20 dark:border-white/5 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden shadow-black/50"
                        >
                            <div className="bg-gradient-to-br from-slate-900 via-[#161925] to-[#0F111A] p-10 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#7bc24c]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10 flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-[#7bc24c]/10 flex items-center justify-center shadow-inner">
                                        <ShoppingCart className="text-[#7bc24c]" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic tracking-tight uppercase tracking-widest">Procurement Initiation</h3>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1 italic">Protocol Alpha / System Authorization</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors relative z-10">
                                    <XCircle size={32} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 italic">Authorized Supplier Entity</label>
                                            <select 
                                                name="supplier_id" 
                                                value={formData.supplier_id} 
                                                onChange={handleChange} 
                                                required
                                                className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-[10px] font-black uppercase tracking-widest appearance-none shadow-inner"
                                            >
                                                <option value="">— Select Registered Vendor —</option>
                                                {suppliers.filter(s => s.contract_status === 'Approved').map(s => (
                                                    <option key={s.id || s._id} value={s.id || s._id} className="bg-white dark:bg-[#161925]">{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 italic">Hardware Specification Node</label>
                                            <select 
                                                name="product_id" 
                                                value={formData.product_id} 
                                                onChange={handleChange} 
                                                required
                                                className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-[10px] font-black uppercase tracking-widest appearance-none shadow-inner"
                                            >
                                                <option value="">— Select Target Inventory —</option>
                                                {products.map(p => (
                                                    <option key={p.id || p._id} value={p.id || p._id} className="bg-white dark:bg-[#161925]">
                                                        {(p.name || '').replace(/\s+/g, ' ').trim()} (CUR_STK: {p.stock || '0'}) · {formatPrice(p.price)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 italic">Unit Quantity</label>
                                            <div className="relative group">
                                                <Package size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#7bc24c]" />
                                                <input 
                                                    type="number" 
                                                    name="quantity" 
                                                    value={formData.quantity} 
                                                    onChange={handleChange} 
                                                    required min="1"
                                                    placeholder="00"
                                                    className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl pl-16 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 font-black text-sm shadow-inner"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 italic">Budget Allocation ({currency})</label>
                                            <div className="relative group">
                                                <DollarSign size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#7bc24c]" />
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    name="total_cost" 
                                                    value={formData.total_cost} 
                                                    onChange={handleChange} 
                                                    required min="0"
                                                    placeholder="0.00"
                                                    readOnly={!!selectedProduct && !!formData.quantity}
                                                    className={`w-full border rounded-2xl pl-16 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 font-black text-sm shadow-inner transition-colors ${
                                                        selectedProduct && formData.quantity
                                                            ? 'bg-[#7bc24c]/5 border-[#7bc24c]/30 text-[#7bc24c] dark:text-[#7bc24c] cursor-default'
                                                            : 'bg-slate-50 dark:bg-[#0F111A] border-slate-200 dark:border-white/5 text-slate-900 dark:text-white'
                                                    }`}
                                                />
                                            </div>
                                            {unitCost && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1">
                                                    <span className="text-[#7bc24c]">✦</span>
                                                    Unit price: {formatPrice(unitCost)} × {formData.quantity || '—'} units
                                                </p>
                                            )}
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 italic">Projected Logistic Arrival</label>
                                            <div className="relative group">
                                                <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#7bc24c]" />
                                                <input 
                                                    type="date" 
                                                    name="expected_delivery_date" 
                                                    value={formData.expected_delivery_date} 
                                                    onChange={handleChange} 
                                                    className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl pl-16 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 font-black text-sm uppercase shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                                    >
                                        Abort Stream
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-5 bg-[#7bc24c] hover:bg-[#6ab33d] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-[#7bc24c]/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
                                    >
                                        Deploy Procurement
                                        <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PurchaseOrders;
