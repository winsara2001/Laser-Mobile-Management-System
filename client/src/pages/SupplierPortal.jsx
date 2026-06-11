import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, CheckCircle, Package, Clock, AlertCircle, ShieldCheck, Box, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SupplierPortal = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/purchase-orders');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const filtered = res.data.filter(o => o.suppliers?.email === user.email);
                setOrders(filtered);
            } else {
                setOrders(res.data);
            }
        } catch (err) {
            console.error('Error fetching supplier orders', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsShipped = async (id) => {
        try {
            await api.put(`/purchase-orders/${id}/status`, { status: 'Shipped' });
            fetchOrders();
        } catch (err) {
            console.error('Error updating status', err);
        }
    };

    if (loading) return <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 text-center py-40 animate-pulse italic">Synchronizing Vendor Pipeline...</div>;

    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const historyOrders = orders.filter(o => o.status !== 'Pending');

    return (
        <div className="space-y-12">
            {/* Header Terminal */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white/50 dark:bg-white/[0.02] p-10 rounded-[2.5rem] border border-white/40 dark:border-white/5 backdrop-blur-md shadow-2xl shadow-black/5">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic flex items-center gap-4">
                        <Truck className="text-primary-600" size={36} />
                        Vendor Satellite Uplink
                    </h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
                        <ShieldCheck size={14} className="text-primary-600" />
                        Active Operational Perimeter: Node-S
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                
                {/* Active Orders Queue */}
                <div className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/60 dark:border-white/5 shadow-2xl shadow-black/5">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-3 leading-none">
                                <AlertCircle className="text-orange-500" size={20} />
                                Priority Deployment
                            </h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Awaiting Logistic Injection</p>
                        </div>
                        <span className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
                            {pendingOrders.length} Pending
                        </span>
                    </div>

                    <div className="space-y-6">
                        {pendingOrders.length === 0 ? (
                            <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                                <CheckCircle size={48} className="text-primary-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Operational Runway Clear</p>
                            </div>
                        ) : pendingOrders.map(order => (
                            <motion.div 
                                key={order.id} 
                                initial={{ opacity: 0, scale: 0.98 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="p-8 bg-slate-50/50 dark:bg-[#0F111A]/50 rounded-[2rem] border border-slate-100 dark:border-white/5 group hover:border-primary-600/30 transition-all shadow-sm"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                            <Box size={24} className="text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-xl tracking-tight italic">{order.products?.name}</p>
                                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-1">Allocation: {order.quantity} Units</p>
                                        </div>
                                    </div>
                                    <span className="bg-orange-500/10 text-orange-500 p-2 rounded-lg animate-pulse">
                                        <Clock size={16} />
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-6 border-t border-slate-200/50 dark:border-white/[0.02]">
                                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest space-y-1 w-full sm:w-auto">
                                        <p>Injection Date: {new Date(order.order_date).toLocaleDateString()}</p>
                                        {order.expected_delivery_date && (
                                            <p className="text-primary-600">Required SLA: {new Date(order.expected_delivery_date).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => markAsShipped(order.id)}
                                        className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 group/btn"
                                    >
                                        <Truck size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                        Initialize Shipment
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Secure Order History */}
                <div className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/60 dark:border-white/5 shadow-2xl shadow-black/5 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <Package className="text-slate-500 dark:text-slate-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest italic leading-none">Audit Ledger</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Historical Payload Records</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                        {historyOrders.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 italic opacity-30 text-[10px] font-black uppercase tracking-widest">Archive empty.</div>
                        ) : historyOrders.map(order => (
                            <div key={order.id} className="p-6 bg-slate-50 dark:bg-[#0F111A]/50 rounded-[1.5rem] flex justify-between items-center border border-slate-100 dark:border-white/5 group hover:border-primary-600/20 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:text-primary-600 transition-colors">
                                        <ArrowRight size={16} />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 dark:text-white italic tracking-tight">{order.products?.name}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Q:{order.quantity} • SYNC: {new Date(order.order_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl tracking-widest border shadow-sm ${
                                    order.status === 'Received' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                    order.status === 'Shipped' ? 'bg-primary-600/10 border-primary-600/20 text-primary-600' :
                                    'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A2D3A; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SupplierPortal;
