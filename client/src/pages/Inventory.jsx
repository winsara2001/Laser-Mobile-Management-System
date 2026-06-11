import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, ClipboardList, ImageOff } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageCheck, X, Banknote } from 'lucide-react';
import { getProductImages } from '../utils/productImages';

const DEFAULT_CATEGORIES = [
    'Network', 'Launch', 'Body', 'Display', 'Platform', 
    'Memory', 'Main Camera', 'Selfie camera', 'Sound', 
    'Comms', 'Features', 'Battery', 'Misc'
];

const SpecEditor = ({ value, onChange }) => {
    let specs = [];
    try {
        specs = value ? JSON.parse(value) : [];
        if (!Array.isArray(specs)) specs = [];
    } catch (e) {}

    if (specs.length === 0) {
        specs = DEFAULT_CATEGORIES.map(cat => ({ category: cat, items: [{ label: '', value: '' }] }));
    }

    const updateSpecs = (newSpecs) => onChange(JSON.stringify(newSpecs));
    const addCategory = () => updateSpecs([...specs, { category: '', items: [{ label: '', value: '' }] }]);
    const removeCategory = (idx) => updateSpecs(specs.filter((_, i) => i !== idx));
    const updateCategoryName = (idx, name) => {
        const next = [...specs];
        next[idx].category = name;
        updateSpecs(next);
    };
    const addItem = (catIdx) => {
        const next = [...specs];
        next[catIdx].items.push({ label: '', value: '' });
        updateSpecs(next);
    };
    const updateItem = (catIdx, itemIdx, field, val) => {
        const next = [...specs];
        next[catIdx].items[itemIdx][field] = val;
        updateSpecs(next);
    };
    const removeItem = (catIdx, itemIdx) => {
        const next = [...specs];
        next[catIdx].items = next[catIdx].items.filter((_, i) => i !== itemIdx);
        updateSpecs(next);
    };

    return (
        <div className="space-y-6">
            {specs.map((cat, catIdx) => (
                <div key={catIdx} className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 relative group/cat transition-all hover:border-[#7bc24c]/30">
                    <button 
                        type="button" 
                        onClick={() => removeCategory(catIdx)}
                        className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover/cat:opacity-100 transition-all p-1 hover:bg-red-500/10 rounded-lg"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-6 bg-[#7bc24c] rounded-full" />
                        <input 
                            placeholder="Category Name (e.g., Display, Battery)"
                            value={cat.category}
                            onChange={(e) => updateCategoryName(catIdx, e.target.value)}
                            className="flex-1 bg-transparent border-b border-transparent focus:border-[#7bc24c] outline-none font-black text-slate-800 dark:text-white pb-1 text-xs uppercase tracking-widest transition-all"
                        />
                    </div>
                    <div className="space-y-3 pl-4 border-l border-slate-100 dark:border-white/5">
                        {cat.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex gap-4 items-center group/item">
                                <div className="w-1/3 flex flex-col">
                                    <input 
                                        placeholder="Label" value={item.label}
                                        onChange={(e) => updateItem(catIdx, itemIdx, 'label', e.target.value)}
                                        className="w-full px-0 py-1 text-[10px] font-black text-slate-400 dark:text-slate-500 bg-transparent border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 outline-none uppercase tracking-tighter transition-all"
                                    />
                                </div>
                                <div className="flex-1">
                                    <input 
                                        placeholder="Value" value={item.value}
                                        onChange={(e) => updateItem(catIdx, itemIdx, 'value', e.target.value)}
                                        className="w-full px-0 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent border-b border-transparent focus:border-[#7bc24c] outline-none transition-all"
                                    />
                                </div>
                                <button type="button" onClick={() => removeItem(catIdx, itemIdx)} className="text-slate-300 dark:text-slate-700 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => addItem(catIdx)} className="text-[10px] font-black text-[#7bc24c] hover:text-[#6ab33d] flex items-center gap-1.5 mt-2 ml-4 px-2 py-1 hover:bg-[#7bc24c]/5 rounded-lg transition-all uppercase tracking-wider">
                        <Plus size={12} /> Add Property
                    </button>
                </div>
            ))}
            <button 
                type="button" onClick={addCategory}
                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-slate-400 dark:text-slate-600 hover:text-[#7bc24c] hover:border-[#7bc24c] hover:bg-[#7bc24c]/5 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest"
            >
                <Plus size={20} /> Add New Specification Category
            </button>
        </div>
    );
};

const VariantEditor = ({ value, onChange }) => {
    let variants = { colors: '', storages: [] };
    try {
        if (value) {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            variants = { colors: parsed.colors || '', storages: parsed.storages || [] };
        }
    } catch (e) {}

    const updateVariants = (newVariants) => {
        onChange(newVariants);
    };

    const addStorage = () => {
        const newStorages = [...variants.storages, { capacity: '', price: '' }];
        updateVariants({ ...variants, storages: newStorages });
    };

    const removeStorage = (idx) => {
        const newStorages = variants.storages.filter((_, i) => i !== idx);
        updateVariants({ ...variants, storages: newStorages });
    };

    const updateStorage = (idx, field, val) => {
        const newStorages = [...variants.storages];
        newStorages[idx][field] = val;
        updateVariants({ ...variants, storages: newStorages });
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 transition-all">
                <div className="flex flex-col mb-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Available Colors (Comma Separated)</label>
                    <input 
                        placeholder=""
                        value={variants.colors}
                        onChange={(e) => updateVariants({ ...variants, colors: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F111A] text-slate-900 dark:text-white focus:outline-none transition-all font-medium text-sm"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Storage Capacities & Prices</label>
                    {variants.storages.map((storage, idx) => (
                        <div key={idx} className="flex gap-4 items-center group/storage">
                            <div className="w-1/3">
                                <input 
                                    placeholder="" value={storage.capacity}
                                    onChange={(e) => updateStorage(idx, 'capacity', e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:border-[#7bc24c] outline-none transition-all"
                                />
                            </div>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Banknote size={16} /></span>
                                <input 
                                    placeholder="" type="number" value={storage.price}
                                    onChange={(e) => updateStorage(idx, 'price', e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:border-[#7bc24c] outline-none transition-all"
                                />
                            </div>
                            <button type="button" onClick={() => removeStorage(idx)} className="text-slate-300 dark:text-slate-700 hover:text-red-400 opacity-0 group-hover/storage:opacity-100 transition-all p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    
                    <button type="button" onClick={addStorage} className="text-[10px] font-black text-[#7bc24c] hover:text-[#6ab33d] flex items-center gap-1.5 mt-3 px-3 py-2 bg-[#7bc24c]/5 hover:bg-[#7bc24c]/10 rounded-xl transition-all uppercase tracking-wider w-full justify-center border border-dashed border-[#7bc24c]/30">
                        <Plus size={14} /> Add Storage Option
                    </button>
                </div>
            </div>
        </div>
    );
};

const Inventory = () => {
    const { formatPrice } = useCurrency();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logsData, setLogsData] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logFilter, setLogFilter] = useState({ category: '', action: '', startDate: '', endDate: '' });
    const [liveToast, setLiveToast] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: 'mobile',
        price: '',
        costPrice: '',
        stock: '',
        sku: '',
        barcode: '',
        description: '',
        specifications: '',
        imageUrl: '',
        variants: { colors: '', storages: [] },
        promotion: { label: '', discountPercent: 0 }
    });

    useEffect(() => {
        fetchProducts();

        // Check for pending cross-page toasts
        const pendingToast = localStorage.getItem('pendingInventoryToast');
        if (pendingToast) {
            try {
                const { quantity, productName } = JSON.parse(pendingToast);
                setLiveToast({
                    title: 'New Stock Arrived',
                    message: `${quantity}x ${productName} were just received into inventory!`,
                    time: new Date().toLocaleTimeString()
                });
                setTimeout(() => setLiveToast(null), 6000);
            } catch (e) {}
            localStorage.removeItem('pendingInventoryToast');
        }

        // Subscribing to Supabase Realtime for Inventory Logs
        const channel = supabase
            .channel('public:inventory_logs')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'inventory_logs' },
                async (payload) => {
                    const log = payload.new;
                    if (log.action === 'ADDED') {
                        // Fetch the product name to display in the toast
                        const { data: p } = await supabase.from('products').select('name').eq('id', log.product_id).single();
                        const productName = p ? p.name : 'Unknown Product';
                        
                        setLiveToast({
                            title: 'Live Stock Update',
                            message: `${log.quantity_change}x ${productName} just arrived and was added to inventory!`,
                            time: new Date().toLocaleTimeString()
                        });

                        // Automatically refresh the table data
                        fetchProducts();
                        
                        // Hide after 6 seconds
                        setTimeout(() => setLiveToast(null), 6000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/inventory');
            setProducts(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching products:', err);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await api.get('/inventory/logs');
            setLogsData(res.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleViewLogs = () => {
        setShowLogsModal(true);
        setLogFilter({ category: '', action: '', startDate: '', endDate: '' });
        fetchLogs();
    };

    const filteredLogs = logsData.filter(log => {
        const productCategory = log.products?.category || '';
        
        const matchCategory = logFilter.category === '' || productCategory === logFilter.category;
        const matchAction = logFilter.action === '' || log.action === logFilter.action;
        
        const logDateStr = log.created_at.split('T')[0];
        const matchStartDate = logFilter.startDate === '' || logDateStr >= logFilter.startDate;
        const matchEndDate = logFilter.endDate === '' || logDateStr <= logFilter.endDate;

        return matchCategory && matchAction && matchStartDate && matchEndDate;
    });

    const filteredProducts = products.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (p.name || '').toLowerCase().includes(q) ||
            (p.brand || p.supplier || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const isMultipart = imageFiles.length > 0;
            let payload;
            let headers = {};

            if (isMultipart) {
                payload = new FormData();
                Object.keys(formData).forEach(key => {
                    if (key === 'variants' || key === 'promotion' || key === 'specifications') {
                        payload.append(key, JSON.stringify(formData[key]));
                    } else {
                        payload.append(key, formData[key] === null ? '' : formData[key]);
                    }
                });
                payload.append('supplier', formData.brand || '');
                for (let i = 0; i < imageFiles.length; i++) {
                    payload.append('images', imageFiles[i]);
                }
                headers = { 'Content-Type': 'multipart/form-data' };
            } else {
                payload = { ...formData, supplier: formData.brand };
            }

            if (editingId) {
                await api.put(`/inventory/${editingId}`, payload, { headers });
            } else {
                await api.post('/inventory', payload, { headers });
            }
            setShowModal(false);
            setEditingId(null);
            setImageFiles([]);
            fetchProducts();
            setFormData({
                name: '', brand: '', category: 'mobile', price: '', costPrice: '', stock: '', sku: '', barcode: '', description: '', specifications: '', imageUrl: '', variants: { colors: '', storages: [] }, promotion: { label: '', discountPercent: 0 }
            });
        } catch (err) {
            console.error('Error saving product:', err);
            alert('Failed to save product');
        }
    };

    const handleEdit = (product) => {
        setEditingId(product._id || product.id);
        setFormData({
            name: product.name || '',
            brand: product.brand || product.supplier || '',
            category: product.category || 'mobile',
            price: product.price || '',
            costPrice: product.costPrice || '',
            stock: product.stock || '',
            sku: product.sku || '',
            barcode: product.barcode || '',
            description: product.description || '',
            specifications: product.specifications || '',
            imageUrl: product.imageUrl || '',
            variants: product.variants || { colors: '', storages: [] },
            promotion: product.promotion || { label: '', discountPercent: 0 }
        });
        setImageFiles([]);
        setShowModal(true);
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            name: '', brand: '', category: 'mobile', price: '', costPrice: '', stock: '', sku: '', barcode: '', warranty_expiry: '', description: '', specifications: '', imageUrl: '', variants: { colors: '', storages: [] }, promotion: { label: '', discountPercent: 0 }
        });
        setImageFiles([]);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/inventory/${id}`);
                fetchProducts();
            } catch (err) {
                console.error('Error deleting product', err);
            }
        }
    }





    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/50 dark:bg-white/[0.02] p-6 rounded-2xl border border-white/40 dark:border-white/5 backdrop-blur-md mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Inventory Management</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your hardware stock and technical specifications</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleViewLogs}
                        className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-sm active:scale-95"
                    >
                        <ClipboardList size={18} className="text-[#7bc24c]" />
                        Audit Logs
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-[#7bc24c] hover:bg-[#6ab33d] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-[#7bc24c]/20 active:scale-95"
                    >
                        <Plus size={20} />
                        Add Product
                    </button>
                </div>
            </div>

            <div className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/5 border border-white/60 dark:border-white/5 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7bc24c]" size={18} />
                        <input
                            type="text"
                            placeholder="Quick search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-600"
                        />
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                        <tr>
                            <th className="px-8 py-5">Product Details</th>
                            <th className="px-8 py-5">Category</th>
                            <th className="px-8 py-5">Inventory</th>
                            <th className="px-8 py-5">Unit Price</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-16 text-center">
                                    <Search size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-400 font-bold text-sm">No products match &quot;{searchQuery}&quot;</p>
                                    <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Try a different name, brand, or SKU</p>
                                </td>
                            </tr>
                        ) : filteredProducts.map((product) => (
                            <tr key={product._id} className="group border-b border-slate-50 dark:border-white/[0.02] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all duration-200">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail */}
                                        {(() => {
                                            const imgs = product.imageUrl
                                                ? product.imageUrl.split(',').map(s => s.trim()).filter(Boolean)
                                                : getProductImages((product.name || '').replace(/\s+/g, ' ').trim());
                                            const thumb = imgs[0] || null;
                                            return thumb ? (
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0 flex items-center justify-center p-1">
                                                    <img src={thumb} alt={product.name} className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 shrink-0 flex items-center justify-center">
                                                    <ImageOff size={18} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                            );
                                        })()}
                                        {/* Name / Brand / SKU */}
                                        <div className="flex flex-col min-w-0">
                                            <div className="font-bold text-slate-900 dark:text-white mb-0.5 group-hover:text-[#7bc24c] transition-colors truncate">{product.name}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter">{product.supplier || product.brand || 'No Brand'}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{product.sku || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    {(() => {
                                        const cat = product.category || '';
                                        const colorMap = {
                                            mobile:             'bg-blue-500/5   border-blue-500/20   text-blue-600   dark:text-blue-400',
                                            accessory:          'bg-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400',
                                            part:               'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                                            iphone:             'bg-gray-500/5   border-gray-400/20   text-gray-600   dark:text-gray-300',
                                            ipad:               'bg-gray-500/5   border-gray-400/20   text-gray-600   dark:text-gray-300',
                                            mac:                'bg-gray-500/5   border-gray-400/20   text-gray-600   dark:text-gray-300',
                                            apple_watch:        'bg-gray-500/5   border-gray-400/20   text-gray-600   dark:text-gray-300',
                                            apple_accessory:    'bg-gray-500/5   border-gray-400/20   text-gray-600   dark:text-gray-300',
                                            android_phone:      'bg-green-500/5  border-green-500/20  text-green-600  dark:text-green-400',
                                            android_tablet:     'bg-green-500/5  border-green-500/20  text-green-600  dark:text-green-400',
                                            android_watch:      'bg-green-500/5  border-green-500/20  text-green-600  dark:text-green-400',
                                            android_accessory:  'bg-green-500/5  border-green-500/20  text-green-600  dark:text-green-400',
                                        };
                                        const cls = colorMap[cat] || 'bg-slate-500/5 border-slate-400/20 text-slate-500';
                                        return (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
                                                {cat.replace(/_/g, ' ')}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td className="px-8 py-5">
                                    <div className={`inline-flex items-center gap-2 font-black text-xs ${product.stock < 5 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${product.stock < 5 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                        {product.stock} <span className="text-[10px] opacity-70">UNITS</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">{formatPrice(product.price)}</td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <button onClick={() => handleEdit(product)} className="p-2 text-slate-400 hover:text-[#7bc24c] hover:bg-[#7bc24c]/10 rounded-xl transition-all">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-[#0F111A]/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white dark:bg-[#161925] rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {editingId ? 'Edit Product Configuration' : 'Onboard New Product'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Product Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-medium" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Brand Identity</label>
                                <input name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-medium" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Category</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-medium appearance-none">
                                    <optgroup label="── General ──">
                                        <option value="mobile">Mobile Phone</option>
                                        <option value="accessory">Accessory</option>
                                        <option value="part">Spare Part</option>
                                    </optgroup>
                                    <optgroup label="── Apple ──">
                                        <option value="iphone">iPhone</option>
                                        <option value="ipad">iPad</option>
                                        <option value="mac">Mac</option>
                                        <option value="apple_watch">Apple Watch</option>
                                        <option value="apple_accessory">Apple Accessories</option>
                                    </optgroup>

                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Retail Price</label>
                                <input type="number" name="price" value={formData.price} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Cost Basis</label>
                                <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Initial Stock</label>
                                <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">SKU / Model ID</label>
                                <input name="sku" value={formData.sku} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-medium" />
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Promotion Details (Optional)</label>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Promo Label</label>
                                    <input 
                                        placeholder="e.g. FLASH SALE" 
                                        value={formData.promotion?.label || ''} 
                                        onChange={(e) => setFormData({ ...formData, promotion: { ...formData.promotion, label: e.target.value } })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0F111A] text-slate-900 dark:text-white outline-none focus:border-orange-400 transition-all text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Discount %</label>
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={formData.promotion?.discountPercent || ''} 
                                        onChange={(e) => setFormData({ ...formData, promotion: { ...formData.promotion, discountPercent: parseFloat(e.target.value) || 0 } })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0F111A] text-slate-900 dark:text-white outline-none focus:border-orange-400 transition-all text-sm" 
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Upload Images</label>
                                <input 
                                    type="file" 
                                    name="images" 
                                    multiple 
                                    accept="image/*"
                                    onChange={(e) => setImageFiles(e.target.files)} 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#7bc24c]/10 file:text-[#7bc24c] hover:file:bg-[#7bc24c]/20" 
                                />
                                <p className="text-[9px] text-slate-400 mt-2 uppercase tracking-wide">Select one or multiple images for the product. If updating, new images will be appended to existing ones.</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Product Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F111A] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7bc24c]/50 outline-none transition-all font-medium min-h-[100px]" />
                            </div>
                            {formData.category === 'mobile' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-[#7bc24c] uppercase tracking-widest mb-4">Product Configuration & Variants</label>
                                        <VariantEditor 
                                            value={formData.variants}
                                            onChange={(val) => setFormData({ ...formData, variants: val })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-[#7bc24c] uppercase tracking-widest mb-4 mt-4">Detailed Hardware Specifications</label>
                                        <SpecEditor 
                                            value={formData.specifications} 
                                            onChange={(val) => setFormData({ ...formData, specifications: val })} 
                                        />
                                    </div>
                                </>
                            )}

                            <div className="md:col-span-2 flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">Discard Changes</button>
                                <button type="submit" className="px-8 py-3 bg-[#7bc24c] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#6ab33d] transition-all shadow-xl shadow-[#7bc24c]/20 active:scale-95">
                                    {editingId ? 'Update Master Record' : 'Create Master Record'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showLogsModal && (
                <div className="fixed inset-0 bg-[#0F111A]/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white dark:bg-[#161925] rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 max-w-5xl w-full p-8 max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                    <ClipboardList className="text-[#7bc24c]" size={28} /> Inventory Audit Logs
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Traceable history of all hardware stock movements</p>
                            </div>
                            <button onClick={() => setShowLogsModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex gap-4 mb-4">
                            <select 
                                value={logFilter.category}
                                onChange={(e) => setLogFilter({...logFilter, category: e.target.value})}
                                className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                            >
                                <option value="">All Categories</option>
                                <optgroup label="── General ──">
                                    <option value="mobile">Mobile Phone</option>
                                    <option value="accessory">Accessory</option>
                                    <option value="part">Spare Part</option>
                                </optgroup>
                                <optgroup label="── Apple ──">
                                    <option value="iphone">iPhone</option>
                                    <option value="ipad">iPad</option>
                                    <option value="mac">Mac</option>
                                    <option value="apple_watch">Apple Watch</option>
                                    <option value="apple_accessory">Apple Accessories</option>
                                </optgroup>

                            </select>
                            <select 
                                value={logFilter.action}
                                onChange={(e) => setLogFilter({...logFilter, action: e.target.value})}
                                className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                            >
                                <option value="">All Actions</option>
                                <option value="ADDED">ADDED</option>
                                <option value="UPDATED">UPDATED</option>
                                <option value="SOLD">SOLD</option>
                                <option value="DELETED">DELETED</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date"
                                    value={logFilter.startDate}
                                    title="Start Date"
                                    onChange={(e) => setLogFilter({...logFilter, startDate: e.target.value})}
                                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none text-gray-600"
                                />
                                <span className="text-gray-400 text-sm">to</span>
                                <input 
                                    type="date"
                                    value={logFilter.endDate}
                                    title="End Date"
                                    onChange={(e) => setLogFilter({...logFilter, endDate: e.target.value})}
                                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none text-gray-600"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-[#0F111A]/50 rounded-2xl border border-slate-100 dark:border-white/5 custom-scrollbar">
                            {loadingLogs ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <div className="w-8 h-8 border-4 border-[#7bc24c]/20 border-t-[#7bc24c] rounded-full animate-spin mb-4" />
                                    <span className="font-bold text-xs uppercase tracking-widest">Compiling Records...</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-separate border-spacing-0">
                                    <thead className="bg-slate-50 dark:bg-slate-900/80 backdrop-blur-md text-slate-500 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-slate-100 dark:border-white/5">Timestamp</th>
                                            <th className="px-6 py-4 border-b border-slate-100 dark:border-white/5">Action Type</th>
                                            <th className="px-6 py-4 border-b border-slate-100 dark:border-white/5">Product Identifier</th>
                                            <th className="px-6 py-4 border-b border-slate-100 dark:border-white/5">Operator</th>
                                            <th className="px-6 py-4 border-b border-slate-100 dark:border-white/5 text-right">Delta</th>
                                            <th className="px-6 py-4 border-b border-slate-100 dark:border-white/5 text-right">Final Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5 bg-transparent">
                                        {filteredLogs.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center py-20 text-slate-400 dark:text-slate-600 font-medium italic">No audit records match the specified criteria</td></tr>
                                        ) : filteredLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-xs font-mono">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter uppercase border ${
                                                        log.action === 'ADDED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                                        log.action === 'SOLD' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                                                        log.action === 'UPDATED' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' :
                                                        log.action === 'DELETED' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' :
                                                        'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400'
                                                    }`}>{log.action}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">{log.products?.name || 'Deleted Product'}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono italic">{log.products?.sku || 'UNKNOWN-SKU'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{log.users?.name || 'System / Admin'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-black tracking-tight ${log.quantity_change > 0 ? 'text-emerald-500' : log.quantity_change < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white tracking-widest">{log.new_stock}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Realtime Toast Notification */}
            <AnimatePresence>
                {liveToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl rounded-2xl p-4 flex gap-4 items-start max-w-sm"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                            <PackageCheck className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <div className="flex-1 pt-0.5">
                            <h4 className="text-slate-900 dark:text-white font-bold text-sm mb-1 z-50">{liveToast.title}</h4>
                            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{liveToast.message}</p>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 block font-medium">{liveToast.time}</span>
                        </div>
                        <button onClick={() => setLiveToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Inventory;
