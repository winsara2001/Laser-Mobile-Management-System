import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users as UsersIcon, Shield, UserPlus, Trash2, Edit2, CheckCircle, XCircle, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const Users = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'customer'
    });
    const [showModal, setShowModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: '', role: 'customer' });
    const [viewMode, setViewMode] = useState('grid');
    const [filterRole, setFilterRole] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth');
            const sanitized = res.data.map(u => ({
                ...u,
                role: (!u.role || String(u.role).toLowerCase() === 'user') ? 'customer' : u.role
            }));
            setUsers(sanitized);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', formData);
            setShowModal(false);
            fetchUsers();
            setFormData({ name: '', email: '', password: '', role: 'customer' });
        } catch (err) {
            console.error('Error adding user:', err);
            alert('Failed to add user');
        }
    };

    const handleDeleteClick = (id) => {
        setUserToDelete(id);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/auth/${userToDelete}`);
            setUserToDelete(null);
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user', err);
            const msg = err.response?.data?.msg || 'Failed to delete user';
            alert(msg);
        }
    };

    const handleEditClick = (user) => {
        setUserToEdit(user.id || user._id);
        setEditFormData({
            name: user.fullName || user.name || '',
            role: user.role || 'customer'
        });
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/auth/${userToEdit}`, editFormData);
            setShowEditModal(false);
            setUserToEdit(null);
            fetchUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            alert('Failed to update user');
        }
    };

    const handleToggleStatus = async (user) => {
        const currentIsActive = user.is_active !== false; // default true
        try {
            await api.put(`/auth/${user.id || user._id}`, {
                name: user.fullName || user.name,
                role: user.role,
                isActive: !currentIsActive
            });
            fetchUsers();
        } catch (err) {
            console.error('Error toggling status:', err);
            const errorMsg = err.response?.data?.details || err.response?.data?.msg || err.message;
            if (errorMsg && errorMsg.includes('is_active')) {
                alert('Failed: The "is_active" column is missing in your Supabase database. Please add it via the Supabase Dashboard as a Boolean with a default value of TRUE.');
            } else {
                alert(`Failed to update user status: ${errorMsg}`);
            }
        }
    };

    const filteredUsers = users.filter((u) => {
        if (filterRole === 'all') return true;
        
        const internalRoles = ['admin', 'technician', 'inventory_manager', 'inventory manager', 'sales'];
        const currentRole = String(u.role).toLowerCase();
        
        if (filterRole === 'internal') {
            return internalRoles.includes(currentRole);
        }
        if (filterRole === 'customers') {
            return currentRole === 'customer';
        }
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/50 dark:bg-white/[0.02] p-6 rounded-3xl border border-white/40 dark:border-white/5 backdrop-blur-md mb-6 gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Control system access levels and team permissions</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="relative">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="bg-white/50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-xs font-black uppercase tracking-widest rounded-2xl px-5 py-3 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-600/50 shadow-sm appearance-none pr-10"
                        >
                            <option value="all">Universe: All</option>
                            <option value="internal">Squad: Internal</option>
                            <option value="customers">Squad: Customers</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-white/50 dark:bg-[#0F111A] rounded-2xl border border-slate-200 dark:border-white/5 p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-xl flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2 rounded-xl flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-600/20 active:scale-95"
                    >
                        <UserPlus size={18} />
                        Add Operator
                    </button>
                </div>
            </div>

            {viewMode === 'table' ? (
                <div className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/5 border border-white/60 dark:border-white/5 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                        <tr>
                            <th className="px-8 py-5">System Entity / Operator</th>
                            <th className="px-8 py-5">Role Permission</th>
                            <th className="px-8 py-5">Access Since</th>
                            <th className="px-8 py-5">Activity Status</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                        {filteredUsers.map((user) => (
                            <tr key={user.id || user._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 flex items-center justify-center text-primary-600 font-black text-lg shadow-inner">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                (user.fullName || user.name || 'U').charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{user.fullName || user.name || 'Unnamed Operator'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-500 font-medium">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                                        <Shield size={12} className="text-primary-600" />
                                        {user.role}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-400 dark:text-slate-500">
                                    {new Date(user.created_at || user.updated_at || user.createdAt || Date.now()).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                        user.is_active !== false 
                                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                            : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                        {user.is_active !== false ? 'Operational' : 'Restricted'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <button onClick={() => handleToggleStatus(user)} className={`${user.is_active !== false ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-red-500 hover:bg-red-500/10'} p-2 rounded-xl transition-all`} title={user.is_active !== false ? 'Deactivate' : 'Activate'}>
                                            {user.is_active !== false ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                        </button>
                                        <button onClick={() => handleEditClick(user)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-600/10 rounded-xl transition-all">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteClick(user.id || user._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredUsers.map((user) => (
                        <div key={user.id || user._id} className="group bg-white/70 dark:bg-[#161925]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-2xl shadow-black/5 relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-primary-600/5">
                            <div className={`absolute top-0 inset-x-0 h-1.5 ${user.is_active !== false ? 'bg-primary-600 shadow-[0_0_15px_rgba(123,194,76,0.4)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            
                            <div className="relative mt-4 mb-6">
                                <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-[#0F111A] border-4 border-white dark:border-[#1E202C] flex items-center justify-center text-primary-600 text-3xl font-black uppercase shadow-2xl group-hover:rotate-3 transition-transform">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        (user.fullName || user.name || 'U').charAt(0)
                                    )}
                                </div>
                                <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-2xl border-4 border-white dark:border-[#161925] ${user.is_active !== false ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} title={user.is_active !== false ? 'Operational' : 'Restricted'}></span>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white truncate w-full px-2 tracking-tight">
                                {user.fullName || user.name || 'Unnamed Operator'}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-500 truncate w-full px-2 mb-6 font-medium">
                                {user.email}
                            </p>

                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-8 border border-slate-200 dark:border-white/5 shadow-inner">
                                <Shield size={12} className="text-primary-600" />
                                {user.role}
                            </div>

                            <div className="flex items-center justify-center gap-2 mt-auto w-full pt-6 border-t border-slate-100 dark:border-white/5">
                                <button 
                                    onClick={() => handleToggleStatus(user)} 
                                    className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${user.is_active !== false ? 'text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white' : 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10'}`}
                                >
                                    {user.is_active !== false ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                    {user.is_active !== false ? 'Deactivate' : 'Activate'}
                                </button>
                                <button 
                                    onClick={() => handleEditClick(user)} 
                                    className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-600/10 rounded-2xl transition-all"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteClick(user.id || user._id)} 
                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F111A]/60 backdrop-blur-md">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        className="bg-white dark:bg-[#161925] border border-white/20 dark:border-white/5 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden shadow-black/50"
                    >
                        <div className="flex justify-between items-center p-10 border-b border-slate-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight italic">Initialize Operator</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle size={28} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Legal Identity Name</label>
                                    <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-600/50 outline-none transition-all font-bold" placeholder="e.g. John Doe" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Access Email Hash</label>
                                    <input name="email" value={formData.email} onChange={handleChange} required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-600/50 outline-none transition-all font-bold" placeholder="name@domain.com" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Secure Passphrase</label>
                                    <input name="password" type="password" value={formData.password} onChange={handleChange} required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-600/50 outline-none transition-all font-bold" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">System Authority Role</label>
                                    <select name="role" value={formData.role} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-600/50 outline-none transition-all font-black uppercase tracking-widest text-xs appearance-none">
                                        <option value="customer">External: Customer</option>
                                        <option value="sales">Team: Sales Representative</option>
                                        <option value="inventory_manager">Team: Inventory Specialist</option>
                                        <option value="technician">Team: Hardware Technician</option>
                                        <option value="admin">Root: Administrator</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all">Abort</button>
                                <button type="submit" className="px-10 py-3 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 active:scale-95">Execute Deployment</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {userToDelete && (
                <div className="fixed inset-0 bg-[#0F111A]/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-[#161925] rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 max-w-sm w-full p-10 text-center"
                    >
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Terminate Access?</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">This will permanently revoke all system permissions for this operator. This action is irreversible.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95">Yes, Terminate</button>
                            <button onClick={() => setUserToDelete(null)} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all">Cancel Request</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-[#0F111A]/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white dark:bg-[#161925] rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 max-w-md w-full p-10"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Modify Permissions</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Operator Name</label>
                                <input name="name" value={editFormData.name} onChange={handleEditChange} required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-600/50 outline-none transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">System Role</label>
                                <select name="role" value={editFormData.role} onChange={handleEditChange} className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-600/50 outline-none transition-all font-black uppercase tracking-widest text-xs appearance-none">
                                    <option value="customer">External: Customer</option>
                                    <option value="sales">Team: Sales Representative</option>
                                    <option value="inventory_manager">Team: Inventory Specialist</option>
                                    <option value="technician">Team: Hardware Technician</option>
                                    <option value="admin">Root: Administrator</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
                                <button type="submit" className="px-8 py-3 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 active:scale-95">Commit Changes</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Users;
