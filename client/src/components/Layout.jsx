import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Smartphone, ShoppingCart, Users, Truck, MessageSquare,
    LogOut, Package, User, Wrench, BarChart2, Settings, Plus, Search, Bell, HelpCircle, DollarSign, Sun, Moon, Globe
} from 'lucide-react';
import clsx from 'clsx';
import PageTransition from './PageTransition';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../supabaseClient';
import api from '../services/api';

const SidebarItem = ({ icon: Icon, label, to, badge }) => {
    const location = useLocation();
    const isActive = to === '/dashboard' 
        ? location.pathname === '/dashboard' || location.pathname === '/dashboard/'
        : location.pathname.startsWith(to);

    return (
        <Link
            to={to}
            className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-primary-600/10 dark:hover:bg-primary-600/10 hover:text-primary-600'
            )}
        >
            <div className="flex items-center gap-3 z-10 relative">
                <Icon size={20} className={clsx("transition-transform duration-200", isActive ? "" : "group-hover:scale-110")} />
                <span className="font-medium text-sm">{label}</span>
            </div>
            {badge && (
                <span className={clsx(
                    "text-[10px] font-black px-2 py-0.5 rounded-lg z-10 relative uppercase tracking-tighter",
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-[#1E202C] text-slate-700 dark:text-slate-300 group-hover:bg-[#2A2D3A]"
                )}>
                    {badge}
                </span>
            )}
            {isActive && <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/5 dark:bg-white/[0.03] backdrop-blur-sm shadow-inner" />}
        </Link>
    );
};

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const { theme, toggleTheme } = useTheme();
    const { currency, setCurrency, currencies } = useCurrency();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    useEffect(() => {
        const loadUser = () => {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                setUser(JSON.parse(userStr));
            }
        };
        loadUser();

        // Listen for profile changes from Profile.jsx specifically to update the Avatar on the dashboard
        window.addEventListener('authStatusChanged', loadUser);

        const currentUserStr = localStorage.getItem('user');
        const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
        const currentUserRole = (currentUser?.role || '').toLowerCase();
        const isTechnician = currentUserRole === 'technician';

        const fetchInitialNotifications = async () => {
            if (isTechnician) {
                // Technicians: show their assigned repair tickets as notifications
                try {
                    const res = await api.get('/repairs/my-assigned');
                    const repairs = res.data || [];
                    if (repairs.length > 0) {
                        setNotifications(repairs.slice(0, 5).map(r => ({
                            id: r.id,
                            title: 'Assigned Repair',
                            message: `${r.devices?.model || r.deviceModel || 'Device'} for ${r.customers?.name || r.customerName || 'Customer'} — ${(r.status || 'pending').replace('-', ' ')}`,
                            time: new Date(r.created_at),
                            isRead: false,
                            type: 'repair'
                        })));
                        setUnreadCount(repairs.length);
                    }
                } catch (e) {
                    console.error('Failed to fetch assigned repairs for bell:', e?.response?.data || e.message);
                }
            } else {
                // Non-technicians: show inventory stock notifications
                const { data } = await supabase
                    .from('inventory_logs')
                    .select('*, products(name)')
                    .eq('action', 'ADDED')
                    .order('created_at', { ascending: false })
                    .limit(5);
                    
                if (data) {
                    setNotifications(data.map(log => ({
                        id: log.id,
                        title: 'Stock Received',
                        message: `${log.quantity_change}x ${log.products?.name || 'Item'} added to inventory.`,
                        time: new Date(log.created_at),
                        isRead: true
                    })));
                }
            }
        };

        fetchInitialNotifications();

        // Inventory log channel (for non-techs)
        const channel = supabase
            .channel('public:layout_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'inventory_logs' },
                async (payload) => {
                    if (isTechnician) return; // techs don't need inventory notifs
                    const log = payload.new;
                    if (log.action === 'ADDED') {
                        const { data: p } = await supabase.from('products').select('name').eq('id', log.product_id).single();
                        const productName = p ? p.name : 'Unknown Product';
                        
                        const newNotif = {
                            id: log.id,
                            title: 'Stock Received',
                            message: `${log.quantity_change}x ${productName} added to inventory.`,
                            time: new Date(),
                            isRead: false
                        };
                        
                        setNotifications(prev => [newNotif, ...prev].slice(0, 5));
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        // Repair assignment channel (for technicians: real-time new ticket alerts)
        const repairChannel = isTechnician && currentUser?.id
            ? supabase
                .channel('public:layout_repair_assignments')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'repairs' },
                    async (payload) => {
                        if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
                        
                        const r = payload.new;
                        if (!r) return;

                        // Check if it belongs to this technician
                        let isAssignedToMe = false;
                        if (r.assignedTo === currentUser.id) {
                            isAssignedToMe = true;
                        } else if (currentUser.id.startsWith('mock-') && r.notes && r.notes.includes(`Technician: ${currentUser.id}`)) {
                            isAssignedToMe = true;
                        }

                        if (!isAssignedToMe) return;

                        // To avoid spamming on every update, only trigger if it's an INSERT or if it just got assigned
                        // We assume payload.old might not have full data, so we just show the alert
                        // (Ideally we check if old.assignedTo !== new.assignedTo, but Replica Identity might not be FULL)
                        
                        // We'll show the notification
                        const { data: repairFull } = await supabase
                            .from('repairs')
                            .select('*, customers(name), devices(model)')
                            .eq('id', r.id)
                            .single();
                            
                        const deviceName = repairFull?.devices?.model || r.deviceModel || 'Device';
                        const custName = repairFull?.customers?.name || r.customerName || 'Customer';
                        const newNotif = {
                            id: r.id + '-' + Date.now(), // unique ID to prevent React key collisions on multiple updates
                            title: payload.eventType === 'INSERT' ? '🔧 New Repair Assigned' : '🔧 Repair Assignment Updated',
                            message: `${deviceName} for ${custName} — please check your repair queue.`,
                            time: new Date(),
                            isRead: false,
                            type: 'repair'
                        };
                        setNotifications(prev => {
                            // Deduplicate: avoid showing the same notification message multiple times rapidly
                            if (prev.length > 0 && prev[0].id.startsWith(r.id) && Date.now() - prev[0].time.getTime() < 5000) return prev;
                            return [newNotif, ...prev].slice(0, 5);
                        });
                        setUnreadCount(prev => prev + 1);
                    }
                )
                .subscribe()
            : null;

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            supabase.removeChannel(channel);
            if (repairChannel) supabase.removeChannel(repairChannel);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('authStatusChanged', loadUser);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const userRole = (user?.role || '').toLowerCase();
    const isSupplier = userRole === 'supplier';
    const isAdmin = userRole === 'admin';
    const isTech = userRole === 'technician';
    const isSales = userRole === 'sales';
    const isInv = userRole.includes('inventory');

    const canViewSales = isAdmin || isSales;
    const canViewInventory = isAdmin || isInv;
    const canViewRepairs = isAdmin || isTech || isSales;
    const canViewAdmin = isAdmin;

    const getPageTitle = () => {
        const path = location.pathname;
        if (path.endsWith('/sales')) return 'Sales Terminal';
        if (path.endsWith('/payments')) return 'Financial Ledger';
        if (path.endsWith('/repairs')) return 'Service Command';
        if (path.endsWith('/inventory')) return 'Resource Repository';
        if (path.endsWith('/users')) return 'Personnel Registry';
        if (path.endsWith('/purchase-orders')) return 'Procurement Stream';
        if (path.endsWith('/suppliers')) return 'Supply Network';
        if (path.endsWith('/profile')) return 'Identity Core';
        if (path.endsWith('/supplier-portal')) return 'Vendor Satellite';
        if (path.endsWith('/billings')) return 'Invoice Registry';
        return 'Dashboard Overview';
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#0F111A] text-slate-700 dark:text-slate-300 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-50 dark:bg-[#0F111A] border-r border-slate-200 dark:border-[#1E202C] z-20 flex flex-col">
                <div className="p-6 pb-2">
                    <div className="flex items-center justify-center w-full h-16">
                        <Logo />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
                    <div className="mb-6 mt-2">
                        <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-600/10 text-primary-600 hover:bg-primary-600/20 transition-all font-black text-[10px] uppercase tracking-widest border border-primary-600/20">
                            <Globe size={18} />
                            Launch Storefront
                        </Link>
                    </div>

                    {isSupplier ? (
                        <div className="mb-6">
                            <p className="px-4 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Supplier Portal</p>
                            <nav className="space-y-1">
                                <SidebarItem icon={LayoutDashboard} label="My Orders" to="/dashboard/supplier-portal" />
                            </nav>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <p className="px-4 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Main Menu</p>
                                <nav className="space-y-1">
                                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/dashboard" />
                                    {canViewSales && (
                                        <>
                                            <SidebarItem icon={ShoppingCart} label="Sales" to="/dashboard/sales" />
                                            <SidebarItem icon={MessageSquare} label="Billings" to="/dashboard/billings" />
                                            <SidebarItem icon={DollarSign} label="Payments" to="/dashboard/payments" />
                                        </>
                                    )}
                                    {canViewInventory && <SidebarItem icon={Package} label="Inventory" to="/dashboard/inventory" />}
                                    {canViewRepairs && <SidebarItem icon={Wrench} label="Repairs" to="/dashboard/repairs" />}
                                </nav>
                            </div>

                            {canViewInventory && (
                                <div className="mb-6">
                                    <p className="px-4 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">External</p>
                                    <nav className="space-y-1">
                                        <SidebarItem icon={Truck} label="Suppliers" to="/dashboard/suppliers" />
                                        <SidebarItem icon={Package} label="Purchase Orders" to="/dashboard/purchase-orders" />
                                    </nav>
                                </div>
                            )}
                        </>
                    )}

                    {!isSupplier && (
                        <div className="mb-6">
                            <p className="px-4 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Internal</p>
                            <nav className="space-y-1">
                                {canViewAdmin && <SidebarItem icon={Users} label="Staff Members" to="/dashboard/users" />}
                                <SidebarItem icon={Settings} label="Settings" to="/dashboard/profile" />
                            </nav>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-[#1E202C]">

                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200">
                        <LogOut size={16} />
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative bg-slate-50 dark:bg-[#0F111A]">
                <header className="bg-slate-50 dark:bg-[#0F111A] border-b border-slate-200 dark:border-[#1E202C] h-20 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight italic uppercase tracking-widest">
                            {getPageTitle()}
                        </h1>
                        <div className="h-6 w-px bg-slate-200 dark:bg-[#1E202C]"></div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{currentDate}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Access Repository: IMEI or SKU..."
                                className="bg-white dark:bg-[#161925] border border-slate-200 dark:border-[#1E202C] text-sm text-slate-900 dark:text-white placeholder-slate-500 rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-primary-600/50 focus:bg-slate-200 dark:bg-[#1E202C] transition-all font-bold"
                            />
                        </div>

                        <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-200 dark:border-[#1E202C] pr-6">
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    onClick={() => {
                                        setShowNotifications(!showNotifications);
                                        if (!showNotifications) setUnreadCount(0);
                                    }}
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white relative p-1 transition-colors"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 ? (
                                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-slate-50 dark:border-[#0F111A]">
                                            {unreadCount}
                                        </span>
                                    ) : (
                                        <span className="absolute top-0 right-0 w-2 h-2 bg-primary-600 rounded-full border-2 border-slate-50 dark:border-[#0F111A]"></span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#161925] border border-slate-200 dark:border-[#1E202C] shadow-xl rounded-2xl overflow-hidden z-50"
                                        >
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
                                                    {isTech && notifications.filter(n => n.type === 'repair').length > 0 && (
                                                        <p className="text-[10px] text-primary-600 font-black uppercase tracking-[0.1em] mt-0.5">
                                                            {notifications.filter(n => n.type === 'repair').length} Active Assignment{notifications.filter(n => n.type === 'repair').length > 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                {unreadCount > 0 && (
                                                    <span className="bg-primary-600/10 text-primary-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-primary-600/20 uppercase tracking-widest">
                                                        {unreadCount} New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="p-6 text-center text-slate-500 text-sm">
                                                        No recent notifications
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                                                        {notifications.map(notif => (
                                                            <div key={notif.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex gap-3 ${!notif.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${notif.type === 'repair' ? 'bg-primary-600/10' : 'bg-emerald-500/10'}`}>
                                                                    {notif.type === 'repair'
                                                                        ? <Wrench size={14} className="text-primary-600" />
                                                                        : <Package size={14} className="text-emerald-500" />
                                                                    }
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-0.5">{notif.title}</p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{notif.message}</p>
                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">{notif.time.toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-center">
                                                <button className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] w-full transition-all hover:scale-105">
                                                    Archive Retrieval Full Database
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <button className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white">
                                <HelpCircle size={20} />
                            </button>

                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="bg-transparent font-black border border-slate-200 dark:border-[#1E202C] text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-600/50 transition-colors cursor-pointer text-[10px] uppercase tracking-widest"
                            >
                                {currencies.map(c => (
                                    <option key={c} value={c} className="bg-white dark:bg-[#161925] text-slate-900 dark:text-white font-medium">{c}</option>
                                ))}
                            </select>

                            <button
                                onClick={toggleTheme}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white transition-colors"
                                title="Toggle Theme"
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        </div>

                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5 p-1 -m-1 rounded-lg transition-colors">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || 'Alex Rivera'}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{user?.role || 'Store Manager'}</span>
                            </div>
                            <div className="w-10 h-10 rounded bg-[#FFDCA8] flex items-center justify-center text-slate-800 font-bold overflow-hidden">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-[1600px] mx-auto">
                    <PageTransition key={location.pathname}>
                        <Outlet />
                    </PageTransition>
                </div>
            </main>
        </div>
    );
};

export default Layout;
