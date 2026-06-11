import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Wrench, Edit, Trash2, X, Bell, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';

const Repairs = () => {
    const { formatPrice } = useCurrency();

    // Current user from localStorage
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; }
    })();
    const userRole = (currentUser.role || '').toLowerCase();
    const isTechnician = userRole === 'technician';
    const canCreate  = userRole === 'admin' || userRole === 'sales';
    const canDelete  = userRole === 'admin';

    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRepair, setCurrentRepair] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Technician notification state
    const [assignedRepairs, setAssignedRepairs] = useState([]);
    const [showAssignedBanner, setShowAssignedBanner] = useState(false);

    // Relational States
    const [customers, setCustomers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedDevice, setSelectedDevice] = useState('');

    // Fetch repairs
    const fetchRepairs = async () => {
        try {
            setLoading(true);
            const res = await api.get('/repairs');
            setRepairs(res.data);
        } catch (error) {
            console.error('Error fetching repairs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) { console.error('Error fetching customers:', error); }
    };

    const fetchDevices = async (customerId) => {
        if (!customerId || customerId === 'new') {
            setDevices([]);
            return;
        }
        try {
            const res = await api.get(`/devices/customer/${customerId}`);
            setDevices(res.data);
        } catch (error) { console.error('Error fetching devices:', error); }
    };

    // Fetch assigned repairs for technician notification
    const fetchAssignedRepairs = async () => {
        if (!isTechnician) return;
        try {
            const res = await api.get('/repairs/my-assigned');
            if (res.data && res.data.length > 0) {
                setAssignedRepairs(res.data);
                setShowAssignedBanner(true);
            }
        } catch (error) {
            console.error('Error fetching assigned repairs:', error);
        }
    };

    const fetchTechnicians = async () => {
        try {
            const res = await api.get('/auth');
            const techs = (res.data || []).filter(u =>
                (u.role || '').toLowerCase() === 'technician'
            );
            setTechnicians(techs);
        } catch (error) { console.error('Error fetching technicians:', error); }
    };

    useEffect(() => {
        fetchRepairs();
        fetchCustomers();
        fetchTechnicians();
        fetchAssignedRepairs();
    }, []);

    useEffect(() => {
        if (selectedCustomer) {
            fetchDevices(selectedCustomer);
        } else {
            setDevices([]);
        }
    }, [selectedCustomer]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this repair ticket?')) return;
        try {
            await api.delete(`/repairs/${id}`);
            setRepairs(repairs.filter(r => r._id !== id));
        } catch (error) {
            console.error('Error deleting repair:', error);
        }
    };

    // Helper: extract technician name from notes string
    const getTechnicianFromNotes = (notes) => {
        if (!notes) return '';
        const match = notes.match(/Technician:\s*([^|]+)/);
        return match ? match[1].trim() : '';
    };

    // Helper: get display notes (without the technician tag)
    const getCleanNotes = (notes) => {
        if (!notes) return '';
        return notes.replace(/\s*\|\s*Technician:[^|]*/g, '').replace(/Technician:[^|]*/g, '').trim().replace(/^\|+\s*/, '').replace(/\s*\|+$/, '');
    };

    const handleSaveRepair = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.estimatedCost = Number(data.estimatedCost) || 0;
        data.finalCost = Number(data.finalCost) || 0;

        try {
            let finalCustomerId = data.customer_id;
            let finalDeviceId = data.device_id;

            if (!isTechnician) {
                if (data.customer_id === 'new') {
                    const custRes = await api.post('/customers', {
                        name: data.newCustomerName,
                        phone: data.newCustomerPhone,
                        email: data.newCustomerEmail || ''
                    });
                    finalCustomerId = custRes.data.id;
                    await fetchCustomers();
                }

                if (data.device_id === 'new') {
                    const devRes = await api.post('/devices', {
                        customer_id: finalCustomerId,
                        model: data.newDeviceModel
                    });
                    finalDeviceId = devRes.data.id;
                }
            }

            // Build payload: technicians only send status/cost fields
            const payload = isTechnician
                ? {
                    status: data.status,
                    estimatedCost: data.estimatedCost,
                    finalCost: data.finalCost,
                    notes: data.notes,
                    // Pass through existing IDs to avoid clearing them
                    customer_id: currentRepair?.customer_id,
                    device_id: currentRepair?.device_id,
                    assignedTo: currentRepair?.assignedTo,
                }
                : {
                    newCustomerName: data.newCustomerName,
                    newCustomerPhone: data.newCustomerPhone,
                    newCustomerEmail: data.newCustomerEmail,
                    newDeviceModel: data.newDeviceModel,
                    customer_id: finalCustomerId,
                    device_id: finalDeviceId,
                    issueDescription: data.issueDescription,
                    status: data.status,
                    estimatedCost: data.estimatedCost,
                    finalCost: data.finalCost,
                    assignedTo: data.assignedTo,
                    notes: data.notes,
                };

            if (currentRepair) {
                await api.put(`/repairs/${currentRepair._id}`, payload);
            } else {
                await api.post('/repairs', payload);
            }

            fetchRepairs();
            if (isTechnician) fetchAssignedRepairs();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving repair:', error);
            alert('Failed to save repair. ' + (error.response?.data?.details || error.response?.data?.error || error.message));
        }
    };

    const statusColors = {
        pending: 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
        'in-progress': 'bg-[#7bc24c]/5 border-[#7bc24c]/20 text-[#7bc24c]',
        completed: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        delivered: 'bg-slate-500/5 border-slate-500/20 text-slate-600 dark:text-slate-400'
    };

    const filteredRepairs = repairs.filter(repair => {
        const custName = repair.customers?.name || repair.customerName || '';
        const devModel = repair.devices?.model || repair.deviceModel || '';
        const matchesSearch = custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            devModel.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || repair.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Technician Assigned-Repairs Notification Banner */}
            <AnimatePresence>
                {isTechnician && showAssignedBanner && assignedRepairs.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -20 }}
                        className="bg-white/50 dark:bg-white/[0.02] border border-white/40 dark:border-white/5 backdrop-blur-md rounded-[2rem] p-6 flex gap-6 items-start shadow-xl"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[#7bc24c]/10 flex items-center justify-center shrink-0 shadow-inner">
                            <Bell size={24} className="text-[#7bc24c] animate-bounce" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest mb-2">
                                Deployment Alert: {assignedRepairs.length} Active Assignment{assignedRepairs.length > 1 ? 's' : ''}
                            </h4>
                            <div className="flex flex-wrap gap-3 mt-3">
                                {assignedRepairs.map(r => (
                                    <button
                                        key={r._id}
                                        onClick={() => {
                                            setCurrentRepair(r);
                                            setSelectedCustomer(r.customer_id || '');
                                            setSelectedDevice(r.device_id || '');
                                            setIsModalOpen(true);
                                        }}
                                        className="group inline-flex items-center gap-3 bg-white dark:bg-[#0F111A] hover:bg-[#7bc24c]/5 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 transition-all shadow-sm"
                                    >
                                        <Wrench size={12} className="text-[#7bc24c]" />
                                        <span>{r.devices?.model || r.deviceModel}</span>
                                        <span className={clsx(
                                            'px-2 py-0.5 rounded-md text-[8px] font-black border',
                                            statusColors[r.status] || statusColors.pending
                                        )}>
                                            {r.status?.replace('-', ' ')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAssignedBanner(false)}
                            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/50 dark:bg-white/[0.02] p-6 rounded-3xl border border-white/40 dark:border-white/5 backdrop-blur-md mb-6 gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Wrench className="text-[#7bc24c]" size={28} />
                        Service Department
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {isTechnician
                            ? 'Operations: Active Hardware Assignments'
                            : 'Management: Lifecycle Control for Repair Units'}
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => {
                            setCurrentRepair(null);
                            setSelectedCustomer('');
                            setSelectedDevice('');
                            setIsModalOpen(true);
                        }}
                        className="bg-[#7bc24c] hover:bg-[#6ab33d] text-white px-8 py-3.5 rounded-2xl flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-[#7bc24c]/20 active:scale-95 w-full lg:w-auto justify-center"
                    >
                        <Plus size={18} />
                        Launch Ticket
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white/50 dark:bg-white/[0.02] p-6 rounded-2xl border border-white/40 dark:border-white/5 backdrop-blur-md flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Registry: Customer, Serial, or Hardware Model..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 transition-all text-sm font-medium"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Status Filter</div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-6 py-3 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-xs font-black uppercase tracking-widest appearance-none pr-10"
                    >
                        <option value="all">Universe: All</option>
                        <option value="pending">State: Pending</option>
                        <option value="in-progress">State: In Progress</option>
                        <option value="completed">State: Completed</option>
                        <option value="delivered">State: Delivered</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/5 border border-white/60 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                                <th className="px-8 py-5">Assigned Customer</th>
                                <th className="px-8 py-5">Serial / Hardware Asset</th>
                                <th className="px-8 py-5">Technical Status</th>
                                <th className="px-8 py-5">Allocated Budget</th>
                                <th className="px-8 py-5 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-10 text-center text-slate-500 font-medium">Synchronizing service records...</td>
                                </tr>
                            ) : filteredRepairs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-10 text-center text-slate-500 font-medium">No active maintenance tickets found.</td>
                                </tr>
                            ) : (
                                filteredRepairs.map((repair) => (
                                    <tr key={repair._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all">
                                        <td className="px-8 py-5">
                                            <div className="font-black text-slate-900 dark:text-white group-hover:text-[#7bc24c] transition-colors">{repair.customers?.name || repair.customerName}</div>
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{repair.customers?.phone || repair.customerPhone}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-[#7bc24c]">{repair.devices?.model || repair.deviceModel}</div>
                                            <div className="text-[10px] text-slate-500 font-medium italic truncate max-w-[200px]" title={repair.issueDescription}>
                                                Reported: {repair.issueDescription}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={clsx(
                                                "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border",
                                                statusColors[repair.status] || statusColors.pending
                                            )}>
                                                {repair.status.replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-slate-900 dark:text-white font-black tracking-widest italic">
                                            {formatPrice(repair.estimatedCost || 0)}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => {
                                                        setCurrentRepair(repair);
                                                        setSelectedCustomer(repair.customer_id || '');
                                                        setSelectedDevice(repair.device_id || '');
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-[#7bc24c] hover:bg-[#7bc24c]/10 rounded-xl transition-all"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(repair._id)}
                                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F111A]/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#161925] border border-white/20 dark:border-white/5 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center p-10 border-b border-slate-100 dark:border-white/5">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {currentRepair ? 'Modify Service Ticket' : 'Initialize Service Ticket'}
                                    </h3>
                                    {isTechnician && (
                                        <p className="text-[10px] text-[#7bc24c] mt-1 font-black uppercase tracking-widest">Technician Interface: Status & Cost Control Only</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <X size={28} />
                                </button>
                            </div>
                            <div className="p-10 overflow-y-auto w-full custom-scrollbar">
                                <form id="repairForm" key={currentRepair ? currentRepair._id : 'new-ticket'} onSubmit={handleSaveRepair} className="space-y-8">

                                    {/* ─── Read-only top section for Technician ─── */}
                                    {isTechnician && currentRepair ? (
                                        <div className="bg-slate-50 dark:bg-[#0F111A] rounded-[2rem] border border-slate-200 dark:border-white/5 p-8 space-y-6 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 italic">Read-Only Asset Metadata</p>
                                            <div className="grid grid-cols-2 gap-8 text-sm">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Customer / Entity</span>
                                                    <p className="font-black text-slate-900 dark:text-white">{currentRepair.customers?.name || currentRepair.customerName || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Contact Channel</span>
                                                    <p className="font-black text-slate-900 dark:text-white">{currentRepair.customers?.phone || currentRepair.customerPhone || '—'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Hardware Specification</span>
                                                    <p className="font-black text-[#7bc24c] text-lg">{currentRepair.devices?.model || currentRepair.deviceModel || '—'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Reported Malfunction</span>
                                                    <p className="font-bold text-slate-900 dark:text-white leading-relaxed">{currentRepair.issueDescription || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ─── Full form for Admin / Sales ─── */
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Legal Customer Name</label>
                                                    <input required name="newCustomerName" defaultValue={currentRepair?.customers?.name || currentRepair?.customerName || ''} type="text" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Contact Number</label>
                                                    <input required name="newCustomerPhone" defaultValue={currentRepair?.customers?.phone || currentRepair?.customerPhone || ''} type="text" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Email Hash</label>
                                                    <input name="newCustomerEmail" defaultValue={currentRepair?.customers?.email || ''} type="email" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Device Hardware Model</label>
                                                <input required name="newDeviceModel" defaultValue={currentRepair?.devices?.model || currentRepair?.deviceModel || ''} type="text" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-black text-[#7bc24c]" />
                                                <input type="hidden" name="customer_id" value={currentRepair?.customer_id ? currentRepair.customer_id : 'new'} />
                                                <input type="hidden" name="device_id" value={currentRepair?.device_id ? currentRepair.device_id : 'new'} />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Diagnostic Observation</label>
                                                <textarea required name="issueDescription" defaultValue={currentRepair?.issueDescription || ''} className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold min-h-[100px]" />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Assigned Operative</label>
                                                <select
                                                    name="assignedTo"
                                                    defaultValue={currentRepair?.assignedTo || ''}
                                                    className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-xs font-black uppercase tracking-widest appearance-none"
                                                >
                                                    <option value="">— Unassigned Collective —</option>
                                                    {technicians.map(t => (
                                                        <option key={t.id} value={t.id}>{t.fullName || t.name || t.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* ─── Editable fields for ALL roles (Status, Cost, Notes) ─── */}
                                    <div className="grid grid-cols-2 gap-6 border-t border-slate-100 dark:border-white/5 pt-8">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Current Lifecycle State</label>
                                            <select name="status" defaultValue={currentRepair?.status || 'pending'} className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-[10px] font-black uppercase tracking-widest appearance-none">
                                                <option value="pending">Logic: Pending</option>
                                                <option value="in-progress">Logic: In Progress</option>
                                                <option value="completed">Logic: Completed</option>
                                                <option value="delivered">Logic: Delivered</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Service Logic Notes</label>
                                            <input name="notes" defaultValue={getCleanNotes(currentRepair?.notes || '')} type="text" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Estimated Allocation</label>
                                            <input required name="estimatedCost" defaultValue={currentRepair?.estimatedCost || ''} type="number" step="0.01" min="0" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-black tracking-widest" />
                                        </div>
                                        {currentRepair && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Final Settlement Budget</label>
                                                <input name="finalCost" defaultValue={currentRepair?.finalCost || ''} type="number" step="0.01" min="0" className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 text-sm font-black tracking-widest" />
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="p-10 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A]/50 flex justify-end gap-4 mt-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    form="repairForm"
                                    type="submit"
                                    className="bg-[#7bc24c] hover:bg-[#6ab33d] text-white px-10 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7bc24c]/20"
                                >
                                    {currentRepair ? 'Commit Updates' : 'Initialize Ticket'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #2A2D3A; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Repairs;
