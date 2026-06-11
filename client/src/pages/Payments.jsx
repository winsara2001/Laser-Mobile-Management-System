import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, DollarSign, Smartphone, Filter, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { supabase } from '../supabaseClient';
import { useCurrency } from '../context/CurrencyContext';

const Payments = () => {
    const { formatPrice } = useCurrency();
    const [filter, setFilter] = useState('all'); // all, cash, card, online
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimer = useRef(null);
    const [filterDate, setFilterDate] = useState('');
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState(null);

    // Debounce search input — only update debouncedSearch 400ms after user stops typing
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value); // update input immediately (no flicker)
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(value);
        }, 400);
    };

    useEffect(() => {
        fetchSales();
    }, [filter, debouncedSearch, filterDate]);

    useEffect(() => {
        // Subscribe to real-time sales updates once on mount
        const paymentsSubscription = supabase
            .channel('payments_public:sales')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sales' },
                (payload) => {
                    console.log('New payment detected in realtime!', payload);
                    fetchSales(); // Refresh payment table instantly
                    setToastMessage('Live Update: New payment received!');
                    setTimeout(() => setToastMessage(null), 4000);
                }
            )
            .subscribe();

        // Show loader only on first mount
        setLoading(true);
        fetchSales(true);

        return () => {
            supabase.removeChannel(paymentsSubscription);
            clearTimeout(debounceTimer.current);
        };
    }, []);

    const fetchSales = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            let startDate = '';
            let endDate = '';
            if (filterDate) {
                const [year, month, day] = filterDate.split('-');
                const localStart = new Date(year, month - 1, day, 0, 0, 0);
                const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
                startDate = localStart.toISOString();
                endDate = localEnd.toISOString();
            }

            const res = await api.get('/payments', {
                params: {
                    method: filter,
                    search: debouncedSearch,
                    startDate,
                    endDate
                }
            });
            setSalesData(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching payments:', err);
            setLoading(false);
        }
    };

    const filteredSales = salesData; // Logic is now handled by the backend

    const getPaymentIcon = (method) => {
        switch (method) {
            case 'card': return <CreditCard size={14} className="text-blue-400 group-hover:rotate-12 transition-transform" />;
            case 'online': return <Smartphone size={14} className="text-purple-400 group-hover:rotate-12 transition-transform" />;
            case 'cash':
            default: return <DollarSign size={14} className="text-primary-600" />
        }
    };

    const getPaymentBadge = (method) => {
        switch (method) {
            case 'card': return 'bg-blue-500/5 border-blue-500/20 text-blue-400';
            case 'online': return 'bg-purple-500/5 border-purple-500/20 text-purple-400';
            case 'cash':
            default: return 'bg-primary-600/5 border-primary-600/20 text-primary-600';
        }
    };

    if (loading) return <div className="text-slate-500 dark:text-slate-400 py-20 text-center">Loading payments...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white/50 dark:bg-white/[0.02] border border-white/40 dark:border-white/5 p-8 rounded-[2.5rem] backdrop-blur-md">
                <div className="flex flex-wrap gap-3">
                    {['all', 'cash', 'card', 'online'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20'
                                : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:text-slate-900 dark:text-white'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center w-full lg:w-auto">
                    <div className="relative w-full md:w-64 group">
                        <label className="absolute -top-6 left-1 text-[8px] font-black text-primary-600 uppercase tracking-widest mb-2 block">Date Range Filter</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-600/50 transition-all w-full"
                        />
                        {filterDate && (
                            <button 
                                onClick={() => setFilterDate('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1"
                                title="Clear Filter"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                
                    <div className="relative w-full md:w-80 group">
                        <label className="absolute -top-6 left-1 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block font-mono tracking-tighter">Live Audit Search</label>
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Customer Name or Phone..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 rounded-2xl pl-14 pr-6 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-600/50 transition-all w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/5 border border-white/60 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100 dark:border-white/5">
                                <th className="px-8 py-5">Ledger ID</th>
                                <th className="px-8 py-5">Beneficiary / Entity</th>
                                <th className="px-8 py-5">Sync Timestamp</th>
                                <th className="px-8 py-5">Financial Output</th>
                                <th className="px-8 py-5">Settlement Channel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                            {filteredSales.map((sale) => (
                                <tr key={sale.id || sale._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="font-mono text-[10px] font-black tracking-widest text-[#7bc24c] bg-[#7bc24c]/5 border border-[#7bc24c]/20 px-3 py-1.5 rounded-lg inline-block">
                                            {(sale.id || sale._id).substring(0, 12).toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-black text-slate-900 dark:text-white group-hover:text-[#7bc24c] transition-colors tracking-tight">{sale.customerName || 'Direct Walk-in'}</p>
                                        {sale.customerPhone && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-0.5">{sale.customerPhone}</p>}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{new Date(sale.date || sale.created_at).toLocaleDateString()}</div>
                                        <div className="text-[8px] font-bold text-slate-400 italic px-0.5">{new Date(sale.date || sale.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-black text-lg text-slate-900 dark:text-white italic tracking-tighter">{formatPrice(sale.totalAmount || 0)}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`group/badge inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${getPaymentBadge(sale.paymentMethod)}`}>
                                            {getPaymentIcon(sale.paymentMethod)}
                                            {sale.paymentMethod || 'cash'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                            <Search size={48} className="mb-4 opacity-20" />
                                            <p className="font-black uppercase tracking-[0.2em] text-[10px]">No matches found in ledger registry</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Real-time Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        className="fixed bottom-10 right-10 bg-[#7bc24c] text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-[#7bc24c]/30 font-black text-xs uppercase tracking-widest flex items-center gap-6 z-[100] border border-white/20 backdrop-blur-xl"
                    >
                        <div className="relative">
                            <div className="w-4 h-4 rounded-full bg-white animate-ping absolute opacity-40"></div>
                            <div className="w-4 h-4 rounded-full bg-white relative shadow-lg"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] opacity-70 mb-0.5">Live Sync Protocol</span>
                            <span>{toastMessage}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Payments;
