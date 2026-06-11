import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ShoppingCart, Star, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';
import ProductDetailModal from './ProductDetailModal';
import { getProductImages } from '../utils/productImages';

/**
 * Resolve the best image URL for a product.
 * Priority: DB imageUrl → local Accessory folder match
 */
function getProductImage(item) {
    if (item.imageUrl) return item.imageUrl.split(',')[0].trim();
    const normalizedName = (item.name || '').replace(/\s+/g, ' ').trim();
    const locals = getProductImages(normalizedName);
    return locals[0] || null;
}

/**
 * Enrich a product with local images if DB imageUrl is empty.
 * Returns a new product object with imageUrl set.
 */
function enrichProduct(item) {
    if (item.imageUrl) return item;
    const normalizedName = (item.name || '').replace(/\s+/g, ' ').trim();
    const locals = getProductImages(normalizedName);
    if (locals.length === 0) return item;
    return { ...item, imageUrl: locals.join(',') };
}

const ProductsModal = ({ isOpen, onClose, brandCategory }) => {
    const { addToCart } = useCart();
    const { formatPrice } = useCurrency();
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setSearchQuery('');

        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await api.get('/inventory');
                const data = res.data || [];
                setAllProducts(data);
            } catch (err) {
                console.error('Error fetching products:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isOpen, brandCategory]);

    // Filter by brandCategory + optional search query
    const products = useMemo(() => {
        const term = brandCategory.toLowerCase().trim();

        /** Normalize DB strings that may have multiple spaces */
        const norm = (str) => (str || '').replace(/\s+/g, ' ').toLowerCase().trim();

        let filtered = allProducts.filter(p => {
            const supplier = norm(p.supplier);
            const category = norm(p.category);
            const name = norm(p.name);

            // Show everything for "all products"
            if (term === 'all products' || term === 'all') return true;
            if (term === 'apple accessories') return supplier === 'apple' && category === 'accessory';
            if (term === 'accessories' || term === 'accessory') return category === 'accessory';

            return supplier.includes(term) || category.includes(term) || name.includes(term);
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [allProducts, brandCategory, searchQuery]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-[200]"
                onClick={onClose}
            >
                {/* iOS/Android-style bottom sheet on mobile, centered modal on desktop */}
                <motion.div
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 80 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white w-full sm:max-w-6xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] sm:max-h-[88vh] overflow-hidden shadow-2xl flex flex-col relative"
                    style={{ boxShadow: '0 -4px 60px rgba(0,0,0,0.25)' }}
                >
                    {/* Pill handle (mobile) */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 rounded-full bg-gray-300" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                                {products.length} Products
                            </p>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                {brandCategory}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${brandCategory}…`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 md:p-7 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-square" />
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-24 text-gray-400">
                                <ShoppingBag size={48} className="mx-auto mb-4 opacity-40" />
                                <p className="text-lg font-medium">No {brandCategory} products found.</p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-4 text-sm text-blue-500 underline"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                                {products.map((item, idx) => {
                                    const imgSrc = getProductImage(item);
                                    return (
                                        <motion.div
                                            key={item._id || item.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.5) }}
                                            onClick={() => setSelectedProduct(enrichProduct(item))}
                                            className="product-card group relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 flex flex-col cursor-pointer"
                                        >
                                            {/* Image area */}
                                            <div className="relative overflow-hidden bg-gray-50 aspect-square flex items-center justify-center p-5">
                                                {imgSrc ? (
                                                    <img
                                                        src={imgSrc}
                                                        alt={item.name}
                                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <ShoppingBag size={40} className="text-gray-300" />
                                                )}

                                                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide">
                                                    {item.category}
                                                </div>

                                                {/* Out of Stock overlay */}
                                                {Number(item.stock) <= 0 && (
                                                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                                        <span className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 transform -rotate-6">Out of Stock</span>
                                                    </div>
                                                )}

                                                {/* Add to cart overlay */}
                                                <div className={`absolute bottom-3 left-3 right-3 transition-all duration-300 z-20 ${Number(item.stock) <= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                                    {Number(item.stock) > 0 ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart({
                                                                    id: item._id || item.id,
                                                                    name: item.name,
                                                                    price: item.price,
                                                                    imageUrl: imgSrc,
                                                                    brand: item.brand,
                                                                    category: item.category,
                                                                });
                                                            }}
                                                            className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg"
                                                        >
                                                            <ShoppingCart size={15} />
                                                            Add
                                                        </button>
                                                    ) : (
                                                        <button disabled className="w-full py-2.5 rounded-xl bg-gray-900/10 text-gray-900/40 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed backdrop-blur-md">
                                                            Out of Stock
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="p-4 flex flex-col gap-1 flex-1">
                                                <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                                                    {item.name}
                                                </h3>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={10} fill="#f59e0b" stroke="none" />
                                                    ))}
                                                </div>
                                                <p className="mt-2 text-base font-black text-gray-900 tracking-tight">
                                                    {formatPrice(item.price)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <ProductDetailModal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                product={selectedProduct}
            />
        </AnimatePresence>
    );
};

export default ProductsModal;
