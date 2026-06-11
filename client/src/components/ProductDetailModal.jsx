import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ShoppingCart, Star, Cpu, HardDrive, MemoryStick, Camera, Battery, Monitor } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';
import { getProductImages } from '../utils/productImages';

/* ─────────────── helpers ─────────────── */
const SPEC_ICON_MAP = {
    processor: Cpu,
    cpu: Cpu,
    storage: HardDrive,
    memory: MemoryStick,
    ram: MemoryStick,
    camera: Camera,
    battery: Battery,
    display: Monitor,
    screen: Monitor,
};

const getGroupedSpecs = (specStr) => {
    if (!specStr) return [];
    try {
        const json = JSON.parse(specStr);
        if (Array.isArray(json)) return json;
    } catch (e) {}

    // Convert legacy to one group
    return [{
        category: 'General',
        items: specStr.split('\n').map(line => {
            const [l, v] = line.split(':');
            return { label: (l || '').trim(), value: (v || '').trim() };
        }).filter(i => i.label)
    }];
};

const ProductDetailModal = ({ isOpen, onClose, product }) => {
    const { addToCart } = useCart();
    const { formatPrice } = useCurrency();

    const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
    const [productReviews, setProductReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ customerName: '', rating: 5, message: '' });
    const [activeTab, setActiveTab] = useState('Description');
    const [selectedStorage, setSelectedStorage] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);

    // Initialize state when product changes
    useEffect(() => {
        if (isOpen && product) {
            setSelectedGalleryIndex(0);
            
            let parsedVariants = null;
            if (product.variants) {
                try {
                    parsedVariants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
                } catch (e) {}
            }
            
            if (parsedVariants) {
                if (parsedVariants.storages && parsedVariants.storages.length > 0) setSelectedStorage(parsedVariants.storages[0]);
                else setSelectedStorage(null);

                if (parsedVariants.colors) {
                    const colorsArr = parsedVariants.colors.split(',').map(c => c.trim()).filter(Boolean);
                    if (colorsArr.length > 0) setSelectedColor(colorsArr[0]);
                    else setSelectedColor(null);
                } else {
                    setSelectedColor(null);
                }
            } else {
                setSelectedStorage(null);
                setSelectedColor(null);
            }

            fetchProductReviews(product._id || product.id);
        }
    }, [isOpen, product]);

    const fetchProductReviews = async (productId) => {
        try {
            const res = await api.get(`/feedback/product/${productId}`);
            setProductReviews(res.data);
        } catch (err) {
            setProductReviews([]);
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        try {
            await api.post('/feedback', { ...reviewForm, productId: product._id || product.id });
            setReviewForm({ customerName: '', rating: 5, message: '' });
            fetchProductReviews(product._id || product.id);
            alert('Thank you for your review!');
        } catch {
            alert('Failed to submit review.');
        }
    };

    if (!isOpen || !product) return null;

    // Use DB imageUrl first; otherwise auto-match local images by product name
    let productImages = product.imageUrl ? product.imageUrl.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (productImages.length === 0) {
        const normalizedName = (product.name || '').replace(/\s+/g, ' ').trim();
        productImages = getProductImages(normalizedName);
    }
    const activeImage = productImages.length > 0 ? productImages[selectedGalleryIndex] : null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[300]"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 32, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
                >
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    {/* Left side: Image Gallery */}
                    <div className="md:w-5/12 bg-gray-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100">
                        <div className="w-full h-full max-h-[600px] flex flex-col items-center justify-center">
                            <div className="flex-1 w-full flex justify-center items-center mb-6">
                                {activeImage ? (
                                    <motion.img
                                        key={activeImage}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        src={activeImage}
                                        alt={product.name}
                                        className="max-h-[380px] object-contain drop-shadow-2xl"
                                    />
                                ) : (
                                    <ShoppingBag size={80} className="text-gray-200" />
                                )}
                            </div>
                            
                            {productImages.length > 1 && (
                                <div className="w-full flex justify-center gap-3 mb-6 flex-wrap">
                                    {productImages.map((imgPath, idx) => {
                                        const isActive = selectedGalleryIndex === idx;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex(idx); }}
                                                className={`w-14 h-14 bg-white rounded-xl overflow-hidden transition-all flex items-center justify-center p-2 border-2 ${
                                                    isActive ? "border-[#7bc24c] shadow-lg scale-105" : "border-transparent opacity-60 hover:opacity-100"
                                                }`}
                                            >
                                                <img src={imgPath} alt="variant" className="w-full h-full object-contain" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {productImages.length > 1 && (
                                <div className="flex justify-center items-center gap-1.5">
                                    {productImages.map((_, idx) => (
                                        <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${selectedGalleryIndex === idx ? "w-6 bg-[#7bc24c]" : "w-1 bg-gray-200"}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center: Product info */}
                    <div className="md:w-4/12 bg-white p-6 md:p-8 overflow-y-auto custom-scrollbar flex flex-col border-r border-gray-100">
                        <div className="mb-6">
                            {(() => {
                                let promo = product.promotion;
                                if (promo && typeof promo === 'string') { try { promo = JSON.parse(promo); } catch(e) { promo = null; } }
                                if (!promo || !promo.discountPercent || Number(promo.discountPercent) <= 0) return null;
                                return (
                                    <span className="inline-block mb-2 px-3 py-1 rounded-full bg-[#7bc24c] text-white text-[11px] font-black uppercase tracking-widest shadow-sm">
                                        {promo.label || 'Sale!'}
                                    </span>
                                );
                            })()}
                            {product.category && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7bc24c] mb-2 block">{product.category}</span>
                            )}
                            <h2 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{product.name}</h2>
                            {(() => {
                                let parsedVariants = null;
                                if (product.variants) {
                                    try {
                                        parsedVariants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
                                    } catch (e) {}
                                }
                                const colorsArr = parsedVariants?.colors ? parsedVariants.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
                                const storagesArr = parsedVariants?.storages || [];

                                return (
                                    <>
                                        {(() => {
                                            let promo = product.promotion;
                                            if (promo && typeof promo === 'string') { try { promo = JSON.parse(promo); } catch(e) { promo = null; } }
                                            const discount = promo && Number(promo.discountPercent) > 0 ? Number(promo.discountPercent) : 0;
                                            const basePrice = selectedStorage ? Number(selectedStorage.price) : product.price;
                                            const discountedPrice = discount > 0 ? basePrice * (1 - discount / 100) : null;
                                            return (
                                                <div className="flex flex-col gap-0.5 mb-6">
                                                    {discountedPrice !== null && (
                                                        <span className="text-base text-gray-400 line-through font-semibold">{formatPrice(basePrice)}</span>
                                                    )}
                                                    <span className={`text-2xl font-black ${discountedPrice !== null ? 'text-[#7bc24c]' : 'text-black'}`}>
                                                        {formatPrice(discountedPrice ?? basePrice)}
                                                    </span>
                                                    {discount > 0 && promo && (
                                                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center">
                                                                <span className="text-[10px] font-black">%</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-red-600 uppercase tracking-widest">{promo.label || 'Special Offer'}</p>
                                                                <p className="text-[10px] font-bold text-red-500/70 uppercase tracking-wider">You save {promo.discountPercent}% on this item</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Variant Selectors */}
                                        {(colorsArr.length > 0 || storagesArr.length > 0) && (
                                            <div className="space-y-5 mb-8 border-t border-gray-100 pt-5">
                                                {storagesArr.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Storage Capacity</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {storagesArr.map((storage, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setSelectedStorage(storage)}
                                                                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                                                        selectedStorage?.capacity === storage.capacity
                                                                            ? "border-[#7bc24c] bg-[#7bc24c]/10 text-black"
                                                                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                                                                    }`}
                                                                >
                                                                    {storage.capacity}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {colorsArr.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Color Option</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {colorsArr.map((color, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setSelectedColor(color)}
                                                                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                                                        selectedColor === color
                                                                            ? "border-black bg-black text-white shadow-md shadow-black/20"
                                                                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                                                                    }`}
                                                                >
                                                                    {color}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                            
                            <div className="space-y-6">
                                <div className="flex gap-8 border-b border-gray-100 mb-6">
                                    {['Description', (product.category === 'mobile' ? 'Specification' : null)].filter(Boolean).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${
                                                activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-600"
                                            }`}
                                        >
                                            {tab}
                                            {activeTab === tab && <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7bc24c]" />}
                                        </button>
                                    ))}
                                </div>

                                {activeTab === 'Description' ? (
                                    <div className="animate-in fade-in duration-300">
                                        <p className="text-sm text-gray-500 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                                            {product.description || 'Experience flagship-grade performance and craftsmanship in every detail.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in duration-300 space-y-3">
                                        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100/50">
                                            {getGroupedSpecs(product.specifications).map((group, gIdx) => {
                                                const hasItems = group.items && group.items.length > 0 && group.items.some(i => i.label || i.value);
                                                if (!hasItems) return null;
                                                return (
                                                    <div key={gIdx} className="p-4 bg-white/50">
                                                        <h5 className="text-[10px] font-black text-[#7bc24c] uppercase tracking-wider mb-3">{group.category}</h5>
                                                        <div className="space-y-3">
                                                            {group.items.map((item, iIdx) => (
                                                                <div key={iIdx} className="grid grid-cols-2 gap-4 text-[11px] items-start border-b border-gray-100/30 pb-2 last:border-0 last:pb-0 font-medium">
                                                                    <span className="text-gray-400 font-bold uppercase tracking-tight">{item.label}</span>
                                                                    <span className="text-gray-700 leading-tight">{item.value || '—'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto pt-6">
                            {Number(product.stock) > 0 ? (
                                <button
                                    onClick={() => {
                                        const finalPrice = selectedStorage ? Number(selectedStorage.price) : product.price;
                                        
                                        // Validation
                                        let parsedVariants = null;
                                        if (product.variants) {
                                            try { parsedVariants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants; } catch (e) {}
                                        }
                                        if (parsedVariants) {
                                            const hasColors = parsedVariants.colors && parsedVariants.colors.split(',').filter(Boolean).length > 0;
                                            const hasStorages = parsedVariants.storages && parsedVariants.storages.length > 0;
                                            if (hasColors && !selectedColor) return alert("Please select a color first.");
                                            if (hasStorages && !selectedStorage) return alert("Please select a storage capacity first.");
                                        }

                                        addToCart({ 
                                            id: product._id || product.id, 
                                            name: product.name, 
                                            price: finalPrice, 
                                            imageUrl: activeImage || product.imageUrl, 
                                            brand: product.brand, 
                                            category: product.category,
                                            selectedStorage: selectedStorage?.capacity || null,
                                            selectedColor: selectedColor || null
                                        });
                                        alert('Added to cart!');
                                    }}
                                    className="w-full py-4 rounded-2xl bg-[#7bc24c] text-white font-black text-sm uppercase tracking-widest hover:bg-[#6ab33d] transition-all shadow-xl shadow-[#7bc24c]/20 flex items-center justify-center gap-3"
                                >
                                    <ShoppingCart size={18} /> Add to Cart
                                </button>
                            ) : (
                                <button disabled className="w-full py-4 rounded-2xl bg-gray-200 text-gray-500 font-black text-sm uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-3">
                                    Out of Stock
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Reviews */}
                    <div className="md:w-3/12 bg-gray-50/50 p-6 md:p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                            <Star size={16} className="text-yellow-400" fill="currentColor" /> Reviews
                        </h3>

                        <div className="flex-1 space-y-4 mb-8">
                            {productReviews.length > 0 ? productReviews.map(review => (
                                <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-900 text-[11px]">{review.customerName}</span>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={10} fill={i < review.rating ? '#f59e0b' : 'none'} stroke={i < review.rating ? 'none' : '#d1d5db'} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-relaxed italic">"{review.message}"</p>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-gray-300 bg-white/50 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No reviews</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-900 text-[10px] mb-3 uppercase tracking-widest leading-none">Rate this device</h4>
                            <form onSubmit={submitReview} className="space-y-3">
                                <input type="text" placeholder="Name" required value={reviewForm.customerName} onChange={e => setReviewForm({ ...reviewForm, customerName: e.target.value })} className="w-full border border-gray-100 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:bg-white focus:outline-none transition-all" />
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rating</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                                className="transition-transform active:scale-90"
                                            >
                                                <Star
                                                    size={14}
                                                    fill={star <= reviewForm.rating ? '#f59e0b' : 'none'}
                                                    stroke={star <= reviewForm.rating ? 'none' : '#d1d5db'}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Your experience..."
                                    required
                                    value={reviewForm.message}
                                    onChange={e => setReviewForm({ ...reviewForm, message: e.target.value })}
                                    className="w-full border border-gray-100 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:bg-white focus:outline-none transition-all h-20 resize-none"
                                />
                                <button
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl bg-[#7bc24c] text-white text-sm font-black hover:bg-[#6ab33d] transition-all shadow-lg shadow-[#7bc24c]/20"
                                >
                                    Submit Review
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProductDetailModal;
