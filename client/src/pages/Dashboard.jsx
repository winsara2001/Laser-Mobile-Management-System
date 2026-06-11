import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import {
    DollarSign, Package, ShoppingCart, Users, TrendingUp,
    Smartphone, AlertTriangle, CheckCircle, Scan, History,
    ShoppingBag, Settings, UserPlus, Clock, ArrowRight, Edit2, Star,
    Wrench, X, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../supabaseClient';
import clsx from 'clsx';

const StatCard = ({ title, value, iconType, delay, subtitle, badgeText, badgeColor }) => {

    const config = {
        sales: {
            icon: DollarSign,
            iconBg: 'bg-emerald-500/10 text-emerald-500',
            glow: 'shadow-emerald-500/20'
        },
        repairs: {
            icon: Smartphone,
            iconBg: 'bg-primary-600/10 text-primary-600',
            glow: 'shadow-primary-600/20'
        },
        alerts: {
            icon: AlertTriangle,
            iconBg: 'bg-orange-500/10 text-orange-500',
            glow: 'shadow-orange-500/20'
        },
        fulfilled: {
            icon: CheckCircle,
            iconBg: 'bg-primary-600/10 text-primary-600',
            glow: 'shadow-primary-600/20'
        }
    }[iconType];

    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.1 }}
            className="group relative bg-white/70 dark:bg-[#161925]/60 border border-white/60 dark:border-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 hover:shadow-2xl transition-all overflow-hidden h-full flex flex-col justify-between shadow-lg"
        >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-start justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${config.iconBg} shadow-inner scale-110`}>
                    <Icon size={28} />
                </div>
                {badgeText && (
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 border ${badgeColor} shadow-sm`}>
                        {badgeText}
                    </div>
                )}
            </div>
            
            <div>
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">{title}</h3>
                <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter group-hover:scale-105 origin-left transition-transform">{value}</p>
                {subtitle && <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-3 opacity-70 italic">{subtitle}</p>}
            </div>
        </motion.div>
    );
};

const statusColors = {
    pending: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', label: 'Pending' },
    'in-progress': { bg: 'bg-primary-600/10', text: 'text-primary-600', border: 'border-primary-600/20', label: 'In Progress' },
    completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Completed' },
    delivered: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', label: 'Delivered' },
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        dailySales: 0,
        pendingRepairsCount: 0,
        stockAlertsCount: 0,
        fulfilledTodayCount: 0,
        paymentMethods: { cash: 0, card: 0, online: 0 },
        recentSales: [],
        recentFeedback: [],
        lowStockItems: []
    });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState(null);
    const { formatPrice } = useCurrency();

    // Low-stock alert states
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockAlertToast, setStockAlertToast] = useState(null);
    const stockAlertShownRef = useRef(false);

    // Technician popup state
    const [showTechPopup, setShowTechPopup] = useState(false);
    const [assignedRepairs, setAssignedRepairs] = useState([]);
    const [techPopupLoading, setTechPopupLoading] = useState(false);

    // Summary Modals State
    const [showDailySalesModal, setShowDailySalesModal] = useState(false);
    const [showPendingRepairsModal, setShowPendingRepairsModal] = useState(false);

    const fetchAssignedRepairs = async () => {
        setTechPopupLoading(true);
        try {
            console.log('[Dashboard] Fetching assigned repairs...');
            const res = await api.get('/repairs/my-assigned');
            console.log('[Dashboard] Assigned repairs response:', res.data);
            const repairs = res.data || [];
            setAssignedRepairs(repairs);
            setShowTechPopup(true);
        } catch (err) {
            console.error('Error fetching assigned repairs for popup:', err?.response?.data || err.message);
            // Still show popup even if fetch fails, so technician sees the dashboard
            setShowTechPopup(true);
        } finally {
            setTechPopupLoading(false);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        let parsedUser = null;
        if (userStr) {
            parsedUser = JSON.parse(userStr);
            setUser(parsedUser);
        }

        fetchStats();

        // Show technician popup every login (always on fresh page load)
        const role = (parsedUser?.role || '').toLowerCase();
        console.log('[Dashboard] Role detected on mount:', role);
        if (role === 'technician') {
            fetchAssignedRepairs();
        }

        // Subscribe to real-time sales updates
        const salesSubscription = supabase
            .channel('public:sales')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sales' },
                (payload) => {
                    console.log('New sale detected in realtime!', payload);
                    fetchStats();
                    setToastMessage('Live Update: New sale recorded!');
                    setTimeout(() => setToastMessage(null), 4000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(salesSubscription);
        };
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/dashboard');
            setStats(res.data);

            // Show low-stock toast notification once on first load
            const items = res.data.lowStockItems || [];
            if (items.length > 0 && !stockAlertShownRef.current) {
                stockAlertShownRef.current = true;
                setStockAlertToast(items);
                setTimeout(() => setStockAlertToast(null), 8000);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setLoading(false);
        }
    };

    if (loading) return <div className="text-slate-500 dark:text-slate-400 flex justify-center py-20">Loading dashboard...</div>;

    const userRole = (user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';
    const isTech = userRole === 'technician';
    const isSales = userRole === 'sales';
    const isInv = userRole.includes('inventory');

    const canViewSales = isAdmin || isSales;
    const canViewRepairs = isAdmin || isTech;
    const canViewInventory = isAdmin || isInv;

    return (
        <div className="space-y-6">
            <div className={`grid grid-cols-1 md:grid-cols-2 ${canViewSales ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
                {canViewSales && (
                    <div className="cursor-pointer" onClick={() => setShowDailySalesModal(true)} title="Click to view today's sales">
                        <StatCard
                            title="Daily Sales"
                            value={formatPrice(stats.dailySales)}
                            iconType="sales"
                            delay={0}
                            badgeText="Today"
                            badgeColor="text-emerald-400 bg-emerald-400/10"
                        />
                    </div>
                )}
                {canViewRepairs && (
                    <div className="cursor-pointer" onClick={() => setShowPendingRepairsModal(true)} title="Click to view pending repairs">
                        <StatCard
                            title="Pending Repairs"
                            value={`${stats.pendingRepairsCount || 0} Devices`}
                            iconType="repairs"
                            delay={1}
                            badgeText="Active"
                            badgeColor="text-slate-700 dark:text-slate-300 bg-slate-700/50"
                        />
                    </div>
                )}
                {canViewInventory && (
                    <div
                        className="cursor-pointer"
                        onClick={() => setShowStockModal(true)}
                        title="Click to view low-stock items"
                    >
                        <StatCard
                            title="Stock Alerts"
                            value={`${stats.stockAlertsCount || 0} Low Items`}
                            iconType="alerts"
                            delay={2}
                            badgeText="Urgent"
                            badgeColor="text-orange-400 bg-orange-400/10"
                        />
                    </div>
                )}
                {canViewSales && (
                    <div className="cursor-pointer" onClick={() => setShowDailySalesModal(true)} title="Click to view today's sales">
                        <StatCard
                            title="Fulfilled Today"
                            value={`${stats.fulfilledTodayCount || 0} Sales`}
                            iconType="fulfilled"
                            delay={3}
                            badgeText="Completed"
                            badgeColor="text-emerald-400 bg-emerald-400/10"
                        />
                    </div>
                )}
            </div>

            {/* Payment Methods Breakdown */}
            {canViewSales && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-[#1E202C] rounded-2xl p-5 flex items-center justify-between"
                    >
                        <div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Cash Payments</h3>
                            <p className="text-2xl font-bold text-emerald-400 tracking-tight">{formatPrice(stats.paymentMethods?.cash)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-[#1E202C] rounded-2xl p-5 flex items-center justify-between"
                    >
                        <div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Card Payments</h3>
                            <p className="text-2xl font-bold text-emerald-400 tracking-tight">{formatPrice(stats.paymentMethods?.card)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-[#1E202C] rounded-2xl p-5 flex items-center justify-between"
                    >
                        <div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Online Payments</h3>
                            <p className="text-2xl font-bold text-purple-400 tracking-tight">{formatPrice(stats.paymentMethods?.online)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">

                    {/* Active Repair Queue */}
                    {canViewRepairs && (
                        <div className="bg-white/70 dark:bg-[#161925]/60 border border-white/60 dark:border-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 overflow-hidden">
                            <div className="flex items-center justify-between p-4 mb-4">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-[0.2em]">Service Registry</h2>
                                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1">Real-time status: 01 Observation</p>
                                </div>
                                <button className="text-primary-600 hover:text-primary-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all p-3 hover:bg-primary-600/10 rounded-xl">
                                    Full Database <ArrowRight size={14} />
                                </button>
                            </div>
 
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                            <th className="px-6 py-4">Hardware Node</th>
                                            <th className="px-6 py-4">Diagnostic</th>
                                            <th className="px-6 py-4">Entity</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Priority</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                                        <tr className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-600 shadow-inner group-hover:scale-110 transition-transform">
                                                        <Smartphone size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white tracking-tight italic">iPhone 15 Pro Max</p>
                                                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">ID: 04X-882-L</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[150px]">Display Fractured: Logic Board Nominal</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Dominic Toretto</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[9px] font-black text-orange-500 bg-orange-500/5 px-3 py-1.5 rounded-lg border border-orange-500/20 uppercase tracking-[0.2em] shadow-sm shadow-orange-500/10">In Lab</span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50 inline-block animate-pulse"></div>
                                            </td>
                                        </tr>
                                        <tr className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-600 shadow-inner group-hover:scale-110 transition-transform">
                                                        <Smartphone size={20} className="rotate-90" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white tracking-tight italic">iPad Pro M2</p>
                                                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">ID: 02M-119-P</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[150px]">Power Input Failure</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Sarah Connor</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[9px] font-black text-primary-600 bg-primary-600/5 px-3 py-1.5 rounded-lg border border-primary-600/20 uppercase tracking-[0.2em] shadow-sm shadow-primary-600/10">Sync Logic</span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 inline-block"></div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-1">
                    <div className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-[#1E202C] rounded-2xl p-6 h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <History size={18} className="text-blue-500" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h2>
                        </div>

                        <div className="flex-1 space-y-6 relative before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-slate-200 dark:bg-[#1E202C]">

                            {canViewSales && stats.recentFeedback && stats.recentFeedback.map(review => (
                                <div key={review.id} className="flex gap-4 relative">
                                    <div className="w-10 h-10 rounded-full border-4 border-[#161925] bg-yellow-500/20 text-yellow-500 flex items-center justify-center relative z-10 shrink-0">
                                        <Star size={14} />
                                    </div>
                                    <div className="pt-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">New Product Review</p>
                                            <div className="flex">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={10} className={i < review.rating ? "text-yellow-500 fill-current" : "text-slate-600"} strokeWidth={i < review.rating ? 0 : 2} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{review.customerName} left a {review.rating}-star review: "{review.message}"</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider">
                                            {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {canViewSales && stats.recentSales.slice(0, 1).map((sale, index) => (
                                <div key={sale._id || index} className="flex gap-4 relative">
                                    <div className="w-10 h-10 rounded-full border-4 border-[#161925] bg-emerald-500/20 text-emerald-500 flex items-center justify-center relative z-10 shrink-0">
                                        <ShoppingBag size={14} />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">New Sale Completed</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sale.customerName || 'Walk-in Customer'} bought items for {formatPrice(sale.totalAmount)}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider">
                                            {new Date(sale.date || Date.now()).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {canViewRepairs && (
                                <div className="flex gap-4 relative">
                                    <div className="w-10 h-10 rounded-full border-4 border-[#161925] bg-primary-600/20 text-primary-600 flex items-center justify-center relative z-10 shrink-0">
                                        <Settings size={14} />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Repair Log Updated</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">iPhone 13 display replacement marked as 'Complete'.</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider">42 mins ago</p>
                                    </div>
                                </div>
                            )}

                            {canViewInventory && (
                                <div className="flex gap-4 relative">
                                    <div className="w-10 h-10 rounded-full border-4 border-[#161925] bg-orange-500/20 text-orange-500 flex items-center justify-center relative z-10 shrink-0">
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="pt-1 flex-1">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Stock Alert</p>
                                        {(stats.lowStockItems || []).length === 0 ? (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All items are sufficiently stocked.</p>
                                        ) : (
                                            <div className="mt-1 space-y-1">
                                                {(stats.lowStockItems || []).slice(0, 3).map(item => (
                                                    <p key={item.id} className="text-xs text-orange-500 font-semibold">
                                                        ⚠ {item.name} — only <span className="font-black">{item.stock}</span> left
                                                    </p>
                                                ))}
                                                {(stats.lowStockItems || []).length > 3 && (
                                                    <button
                                                        onClick={() => setShowStockModal(true)}
                                                        className="text-[10px] font-black text-orange-400 uppercase tracking-wider mt-1 hover:underline"
                                                    >
                                                        +{stats.lowStockItems.length - 3} more — View All
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {canViewSales && (
                                <div className="flex gap-4 relative">
                                    <div className="w-10 h-10 rounded-full border-4 border-[#161925] bg-slate-700/50 text-slate-500 dark:text-slate-400 flex items-center justify-center relative z-10 shrink-0">
                                        <UserPlus size={14} />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">New Client Registered</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sarah Jenkins added to CRM database.</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider">3 hours ago</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="w-full mt-6 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5 rounded-xl transition-colors">
                            Load More History
                        </button>
                    </div>
                </div>

            </div>

            {/* Real-time Toast Notification */}
            {toastMessage && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    className="fixed bottom-10 right-10 bg-white/80 dark:bg-[#161925]/80 backdrop-blur-2xl px-10 py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/5 flex items-center gap-6 z-[100]"
                >
                    <div className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-600 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-primary-600 shadow-lg shadow-primary-600/50"></span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-1">Telemetry Sync Active</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight italic">{toastMessage}</p>
                    </div>
                </motion.div>
            )}

            {/* ── Low Stock Alert Toast (popup on load) ── */}
            <AnimatePresence>
                {stockAlertToast && canViewInventory && (
                    <motion.div
                        initial={{ opacity: 0, x: 60, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 60, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                        className="fixed bottom-8 right-8 z-[120] w-80 bg-white dark:bg-[#161925] border border-orange-400/30 rounded-2xl shadow-2xl shadow-orange-500/10 overflow-hidden"
                    >
                        {/* Colored top bar */}
                        <div className="h-1 bg-gradient-to-r from-orange-400 to-red-500" />
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <AlertTriangle size={16} className="text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Stock Alert</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{stockAlertToast.length} item{stockAlertToast.length > 1 ? 's' : ''} running low!</p>
                                    </div>
                                </div>
                                <button onClick={() => setStockAlertToast(null)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="space-y-1.5 mb-4">
                                {stockAlertToast.slice(0, 3).map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 rounded-lg px-3 py-2">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{item.name}</span>
                                        <span className={`text-xs font-black ml-2 shrink-0 ${
                                            item.stock === 0 ? 'text-red-500' : 'text-orange-500'
                                        }`}>{item.stock === 0 ? 'OUT' : `${item.stock} left`}</span>
                                    </div>
                                ))}
                                {stockAlertToast.length > 3 && (
                                    <p className="text-[10px] text-slate-400 text-center">+{stockAlertToast.length - 3} more items</p>
                                )}
                            </div>
                            <button
                                onClick={() => { setStockAlertToast(null); setShowStockModal(true); }}
                                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all"
                            >
                                View All Low Stock Items
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Technician Welcome Popup ── */}
            <AnimatePresence>
                {showTechPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-[#0F111A]/60 backdrop-blur-md"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowTechPopup(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white dark:bg-[#161925] border border-white/20 dark:border-white/5 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden shadow-black/50"
                        >
                            {/* Header */}
                            <div className="relative bg-gradient-to-br from-slate-900 via-[#161925] to-[#0F111A] p-12 overflow-hidden border-b border-white/5">
                                <div className="absolute top-0 right-0 p-12 text-primary-600/10 pointer-events-none">
                                    <Wrench size={180} className="-mr-20 -mt-20 rotate-12" />
                                </div>
                                
                                <button
                                    onClick={() => setShowTechPopup(false)}
                                    className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-2xl"
                                >
                                    <X size={28} />
                                </button>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary-600/10 border border-primary-600/20 flex items-center justify-center shadow-inner">
                                            <Wrench size={32} className="text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em] mb-2 italic">Operator Identification: Valid</p>
                                            <h2 className="text-3xl font-black text-white italic tracking-tighter">{user?.name || 'Technician'}</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 py-4 px-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] inline-block">
                                        <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                                        <p className="text-sm font-bold text-slate-400">
                                            {assignedRepairs.length > 0
                                                ? `Synchronizing ${assignedRepairs.length} active hardware node${assignedRepairs.length > 1 ? 's' : ''} to workspace...`
                                                : 'Zero active hardware backlogs detected in your perimeter.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 space-y-8">
                                {/* Stat Pills */}
                                {assignedRepairs.length > 0 && (() => {
                                    const counts = assignedRepairs.reduce((acc, r) => {
                                        acc[r.status] = (acc[r.status] || 0) + 1;
                                        return acc;
                                    }, {});
                                    return (
                                        <div className="flex gap-4 flex-wrap">
                                            {Object.entries(counts).map(([status, count]) => {
                                                const sc = statusColors[status] || statusColors.pending;
                                                return (
                                                    <span key={status} className={`inline-flex items-center gap-3 bg-white/5 dark:bg-[#0F111A] border border-white/5 text-[10px] font-black px-5 py-2.5 rounded-2xl shadow-inner uppercase tracking-widest text-slate-300`}>
                                                        <span className={`w-2 h-2 rounded-full ${sc.text.replace('text-', 'bg-')}`} />
                                                        {count} {sc.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Repair List */}
                                <div className="max-h-[300px] overflow-y-auto space-y-4 custom-dash-scroll pr-4">
                                    {techPopupLoading ? (
                                        <p className="text-center text-slate-500 font-black uppercase text-[10px] tracking-widest py-10 italic">Initializing Data Streams...</p>
                                    ) : assignedRepairs.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 dark:bg-[#0F111A]/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/5">
                                            <CheckCircle size={48} className="text-primary-600 mx-auto mb-4 opacity-20" />
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Operational Perimeter Clear</p>
                                        </div>
                                    ) : (
                                        assignedRepairs.map((r) => {
                                            const sc = statusColors[r.status] || statusColors.pending;
                                            return (
                                                <div key={r._id} className="group flex items-center gap-6 bg-white dark:bg-[#0F111A] rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 hover:border-primary-600/30 transition-all cursor-pointer shadow-sm">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary-600/5 flex items-center justify-center shrink-0 border border-primary-600/10 group-hover:scale-110 transition-transform">
                                                        <Smartphone size={24} className="text-primary-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-lg font-black text-slate-900 dark:text-white truncate tracking-tight italic">
                                                            {r.devices?.model || r.deviceModel || 'Unknown Hardware'}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 truncate uppercase tracking-widest mt-1">
                                                            Assignee: {r.customers?.name || r.customerName || 'Entity X'} // {r.issueDescription || 'Diagnostic Pending'}
                                                        </p>
                                                    </div>
                                                    <span className={`shrink-0 text-[9px] font-black px-4 py-2 rounded-xl border ${sc.bg} ${sc.text} ${sc.border} uppercase tracking-[0.2em] shadow-sm`}>
                                                        {sc.label}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="pt-6">
                                    <button
                                        onClick={() => setShowTechPopup(false)}
                                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-5 rounded-[1.5rem] transition-all text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary-600/20 active:scale-[0.98]"
                                    >
                                        Initialize Workspace
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ── Low Stock Items Detail Modal ── */}
            <AnimatePresence>
                {showStockModal && canViewInventory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[115] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowStockModal(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 24 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 24 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <AlertTriangle size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Inventory Alert</p>
                                        <h2 className="text-white font-black text-lg">
                                            {stats.lowStockItems?.length || 0} Low Stock Item{(stats.lowStockItems?.length || 0) !== 1 ? 's' : ''}
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={() => setShowStockModal(false)} className="text-white/70 hover:text-white transition-colors p-1">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="p-6 max-h-[420px] overflow-y-auto custom-dash-scroll">
                                {(stats.lowStockItems || []).length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3 opacity-40" />
                                        <p className="text-slate-500 font-bold text-sm">All items are well stocked!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(stats.lowStockItems || []).map(item => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between bg-slate-50 dark:bg-[#0F111A] border border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                        item.stock === 0
                                                            ? 'bg-red-500/10 text-red-500'
                                                            : 'bg-orange-500/10 text-orange-500'
                                                    }`}>
                                                        <Package size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{item.name}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                                                            {item.category}{item.supplier ? ` · ${item.supplier}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-lg text-xs font-black border ${
                                                    item.stock === 0
                                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                }`}>
                                                    {item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} remaining`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 pb-6">
                                <button
                                    onClick={() => setShowStockModal(false)}
                                    className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Daily Sales Summary Modal ── */}
            <AnimatePresence>
                {showDailySalesModal && canViewSales && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[115] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowDailySalesModal(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 24 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 24 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 shrink-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <DollarSign size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Today's Performance</p>
                                        <h2 className="text-white font-black text-lg">
                                            {stats.todaySales?.length || 0} Sales Completed
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={() => setShowDailySalesModal(false)} className="text-white/70 hover:text-white transition-colors p-1">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-dash-scroll flex-1">
                                {(stats.todaySales || []).length === 0 ? (
                                    <div className="text-center py-12">
                                        <DollarSign size={48} className="text-emerald-500 mx-auto mb-3 opacity-20" />
                                        <p className="text-slate-500 font-bold text-sm">No sales recorded today yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(stats.todaySales || []).map(sale => (
                                            <div
                                                key={sale.id || sale._id}
                                                className="flex items-center justify-between bg-slate-50 dark:bg-[#0F111A] border border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                                        <ShoppingBag size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Sale #{((sale.id || sale._id)+'').substring(0,6)}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                                                            {new Date(sale.date || sale.created_at).toLocaleTimeString()} · {sale.paymentMethod || 'Cash'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1.5 rounded-lg text-xs font-black border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                    {formatPrice(sale.totalAmount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="px-6 pb-6 shrink-0 pt-2 border-t border-slate-100 dark:border-white/5">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Value</span>
                                    <span className="text-lg font-black text-emerald-500">{formatPrice(stats.dailySales)}</span>
                                </div>
                                <button
                                    onClick={() => setShowDailySalesModal(false)}
                                    className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Pending Repairs Summary Modal ── */}
            <AnimatePresence>
                {showPendingRepairsModal && canViewRepairs && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[115] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowPendingRepairsModal(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 24 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 24 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-white/5 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 shrink-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Wrench size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Service Registry</p>
                                        <h2 className="text-white font-black text-lg">
                                            {stats.pendingRepairsList?.length || 0} Pending Repairs
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={() => setShowPendingRepairsModal(false)} className="text-white/70 hover:text-white transition-colors p-1">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-dash-scroll flex-1">
                                {(stats.pendingRepairsList || []).length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircle size={48} className="text-slate-500 mx-auto mb-3 opacity-20" />
                                        <p className="text-slate-500 font-bold text-sm">No pending repairs at the moment.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(stats.pendingRepairsList || []).map(repair => {
                                            const sc = statusColors[repair.status] || statusColors.pending;
                                            return (
                                                <div
                                                    key={repair.id || repair._id}
                                                    className="flex items-center justify-between bg-slate-50 dark:bg-[#0F111A] border border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-500/10 text-slate-500`}>
                                                            <Smartphone size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                                                {repair.deviceModel || repair.devices?.model || 'Unknown Device'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                                                                {repair.customerName || repair.customers?.name || 'Customer'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                        {sc.label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="px-6 pb-6 shrink-0 pt-2 border-t border-slate-100 dark:border-white/5">
                                <button
                                    onClick={() => setShowPendingRepairsModal(false)}
                                    className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-dash-scroll::-webkit-scrollbar { width: 5px; }
                .custom-dash-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-dash-scroll::-webkit-scrollbar-thumb { background: #2A2D3A; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Dashboard;
