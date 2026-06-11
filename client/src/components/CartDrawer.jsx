import React from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';

const CartDrawer = ({ isOpen, onClose }) => {
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();

    const handleCheckout = () => {
        onClose();
        navigate('/checkout');
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-xl pointer-events-auto"
                    />

                    {/* Centered Modal */}
                    <motion.div
                        initial={{ x: '-100vw', opacity: 0, scale: 0.95 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: '100vw', opacity: 0, scale: 0.95 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 250,
                            mass: 0.8
                        }}
                        className="relative w-full max-w-5xl max-h-[90vh] bg-white text-gray-800 shadow-2xl rounded-3xl flex flex-col overflow-hidden border border-gray-100/50 pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-xl text-[#7bc24c]">
                                    <ShoppingBag size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">Your Cart</h2>
                                    <span className="text-gray-500 text-sm font-medium">
                                        {cartCount} {cartCount === 1 ? 'item' : 'items'} selected
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50/50">
                            {cart.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12"
                                >
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                                        <ShoppingBag size={48} className="text-gray-300" />
                                    </div>
                                    <h3 className="font-bold text-2xl text-gray-900 mb-2">Your cart is empty</h3>
                                    <p className="text-gray-500 max-w-sm">Looks like you haven't added any products yet. Explore our inventory to find exactly what you need.</p>
                                    <button
                                        onClick={onClose}
                                        className="mt-8 px-8 py-3.5 bg-[#7bc24c] text-white font-semibold rounded-full hover:bg-[#6ab33d] transition-colors shadow-lg shadow-[#7bc24c]/20"
                                    >
                                        Start Shopping
                                    </button>
                                </motion.div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {cart.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: -50, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            transition={{
                                                type: "spring",
                                                delay: index * 0.05,
                                                damping: 20,
                                                stiffness: 300
                                            }}
                                            className="flex flex-col sm:flex-row gap-5 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7bc24c] opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="w-full sm:w-28 h-32 sm:h-28 bg-gray-50 rounded-xl flex items-center justify-center p-3 sm:flex-shrink-0">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" />
                                                ) : (
                                                    <ShoppingBag className="text-gray-300" size={32} />
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="pr-8">
                                                        <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-[#7bc24c] transition-colors break-words">{item.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md capitalize">{(item.brand || item.category || 'Mobile Phone')}</span>
                                                            {item.selectedStorage && <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">{item.selectedStorage}</span>}
                                                            {item.selectedColor && <span className="text-xs font-semibold px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 rounded-md capitalize">{item.selectedColor}</span>}
                                                            {item.sku && <span className="text-xs text-gray-400">SKU: {item.sku}</span>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.cartItemId || item.id)}
                                                        className="absolute sm:relative top-4 right-4 sm:top-auto sm:right-auto text-gray-400 hover:text-slate-900 dark:text-white hover:bg-red-500 p-2 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-red-500/20 bg-gray-50 hover:border-red-500 border border-gray-100"
                                                        title="Remove Item"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 md:mt-0 pt-4 border-t border-gray-50 sm:border-none sm:pt-0">
                                                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200/60 shadow-inner">
                                                        <button
                                                            onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                            className="p-1 px-2 text-gray-500 hover:text-[#7bc24c] hover:bg-white rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent shadow-sm"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="font-bold text-sm w-8 text-center text-gray-900">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                                                            className="p-1 px-2 text-gray-500 hover:text-[#7bc24c] hover:bg-white rounded-md transition-all shadow-sm"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-baseline gap-2 text-right">
                                                        {item.quantity > 1 && (
                                                            <span className="text-xs text-gray-400 font-medium">{formatPrice(item.price)} each</span>
                                                        )}
                                                        <span className="font-bold text-xl text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Footer Checkout */}
                        {cart.length > 0 && (
                            <div className="p-6 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <div>
                                        <p className="text-gray-500 mb-1">Subtotal <span className="text-xs ml-1">(Taxes calculated at checkout)</span></p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-extrabold text-gray-900">{formatPrice(cartTotal)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCheckout}
                                        className="w-full sm:w-auto px-10 py-4 rounded-xl bg-[#7bc24c] text-white font-bold text-lg hover:bg-green-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#7bc24c]/20 flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        Proceed to Checkout
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default CartDrawer;
