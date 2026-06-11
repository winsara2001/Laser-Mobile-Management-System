import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Phone, Mail, MapPin, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMPTY_FORM = { name: '', contactPerson: '', phone: '', email: '', address: '' };

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null); // null = adding, object = editing
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        }
    };

    const openAddModal = () => {
        setEditingSupplier(null);
        setFormData(EMPTY_FORM);
        setShowModal(true);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name || '',
            contactPerson: supplier.contact || supplier.contactPerson || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || ''
        });
        setShowModal(true);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateContract = async (id, status) => {
        try {
            await api.put(`/suppliers/${id}`, { contract_status: status });
            fetchSuppliers();
        } catch (err) {
            console.error('Error updating contract:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id || editingSupplier._id}`, formData);
            } else {
                await api.post('/suppliers', formData);
            }
            setShowModal(false);
            setEditingSupplier(null);
            fetchSuppliers();
            setFormData(EMPTY_FORM);
        } catch (err) {
            console.error('Error saving supplier:', err);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;
        try {
            await api.delete(`/suppliers/${editingSupplier.id || editingSupplier._id}`);
            setShowModal(false);
            setEditingSupplier(null);
            fetchSuppliers();
            setFormData(EMPTY_FORM);
        } catch (err) {
            console.error('Error deleting supplier:', err);
            alert(err.response?.data?.msg || 'Failed to delete supplier');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/50 dark:bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/40 dark:border-white/5 backdrop-blur-md mb-8 gap-6 shadow-2xl shadow-black/5">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
                        <MapPin className="text-primary-600" size={32} />
                        Global Procurement
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Management: Verified Supply Chain & Logistics Partners
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-600/20 active:scale-95 w-full lg:w-auto justify-center"
                >
                    <Plus size={20} />
                    Onboard Partner
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {suppliers.map(supplier => (
                    <motion.div
                        key={supplier.id || supplier._id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative bg-white/70 dark:bg-[#161925]/60 border border-white/60 dark:border-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-black/10 transition-all overflow-hidden shadow-sm"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                                onClick={() => openEditModal(supplier)}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-[#0F111A] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors shadow-lg"
                            >
                                <Pencil size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-3.5 rounded-2xl bg-primary-600/10 text-primary-600 shadow-inner mb-4 scale-110">
                                    <MapPin size={24} />
                                </div>
                                <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border ${
                                    supplier.contract_status === 'Approved' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 shadow-sm shadow-emerald-500/10' :
                                    supplier.contract_status === 'Rejected' ? 'bg-red-500/5 border-red-500/20 text-red-500 shadow-sm shadow-red-500/10' :
                                    'bg-amber-500/5 border-amber-500/20 text-amber-500 shadow-sm shadow-amber-500/10'
                                }`}>
                                    {supplier.contract_status || 'Pending'}
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-primary-600 transition-colors">
                                {supplier.name}
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                                Rep: {supplier.contact || supplier.contactPerson || 'Unknown Entity'}
                            </p>

                            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/5 mt-auto">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#0F111A] flex items-center justify-center text-slate-400 group-hover/item:text-primary-600 transition-colors border border-slate-100 dark:border-white/5">
                                        <Phone size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{supplier.phone || '—'}</span>
                                </div>
                                {supplier.email && (
                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#0F111A] flex items-center justify-center text-slate-400 group-hover/item:text-primary-600 transition-colors border border-slate-100 dark:border-white/5">
                                            <Mail size={16} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate pr-4">{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center gap-4 group/item">
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#0F111A] flex items-center justify-center text-slate-400 group-hover/item:text-primary-600 transition-colors border border-slate-100 dark:border-white/5 shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-500 leading-relaxed italic">{supplier.address}</span>
                                    </div>
                                )}
                            </div>

                            {(!supplier.contract_status || supplier.contract_status === 'Pending') && (
                                <div className="mt-8 pt-8 flex gap-3">
                                    <button
                                        onClick={() => handleUpdateContract(supplier.id || supplier._id, 'Approved')}
                                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-500/20 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                                    >
                                        Authorize
                                    </button>
                                    <button
                                        onClick={() => handleUpdateContract(supplier.id || supplier._id, 'Rejected')}
                                        className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-500/20 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#0F111A]/60 backdrop-blur-md flex items-center justify-center p-4 z-[70]"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white dark:bg-[#161925] rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 max-w-lg w-full overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-10 border-b border-slate-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {editingSupplier ? 'Modify Partner Profile' : 'Register New Partner'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="space-y-6">
                                    {[
                                        { label: 'Company Entity Name', name: 'name', required: true, icon: <MapPin size={14} /> },
                                        { label: 'Primary Liaison / Contact', name: 'contactPerson', icon: <Mail size={14} /> },
                                        { label: 'Global Phone Line', name: 'phone', required: true, icon: <Phone size={14} /> },
                                        { label: 'Official Correspondence Email', name: 'email', type: 'email', icon: <Mail size={14} /> },
                                    ].map(({ label, name, required, type, icon }) => (
                                        <div key={name}>
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                                                {icon}
                                                {label}
                                            </label>
                                            <input
                                                type={type || 'text'}
                                                name={name}
                                                value={formData[name]}
                                                 onChange={handleChange}
                                                required={required}
                                                className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 transition-all shadow-inner"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                                            <MapPin size={14} />
                                            Registered Logistic Address
                                        </label>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 transition-all shadow-inner resize-none"
                                            rows="3"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-slate-100 dark:border-white/5 gap-4">
                                    <div className="w-full sm:w-auto">
                                        {editingSupplier && (
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="w-full sm:w-auto px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                                            >
                                                Sever Connection
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-4 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 sm:flex-none px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 sm:flex-none px-10 py-3.5 text-[10px] font-black uppercase tracking-widest bg-primary-600 hover:bg-primary-700 text-white rounded-2xl transition-all shadow-xl shadow-primary-600/20"
                                        >
                                            {editingSupplier ? 'Commit Updates' : 'Authorize Partner'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Suppliers;
