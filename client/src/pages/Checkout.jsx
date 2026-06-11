import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { CreditCard, Truck, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

const Checkout = () => {
    const { formatPrice } = useCurrency();
    const { cart, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        paymentMethod: 'cash'
    });
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        nameOnCard: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-green-600 w-12 h-12" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Order Confirmed!</h2>
                <p className="text-gray-500 mb-8 max-w-md">Thank you for your purchase. Your order has been placed successfully and is being processed.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3.5 bg-indigo-600 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                    Continue Shopping
                </button>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
                <p className="text-gray-500 mb-8 max-w-md">Looks like you haven't added any products to your cart yet.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3.5 bg-gray-900 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                    Return to Shop
                </button>
            </div>
        );
    }

    const handleInputChange = (e) => {
        let { name, value } = e.target;

        if (name === 'name') {
            value = value.replace(/[^a-zA-Z\s]/g, '');
        } else if (name === 'phone') {
            value = value.replace(/[^0-9]/g, '');
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleCardInputChange = (e) => {
        let { name, value } = e.target;

        // Basic formatting for card inputs
        if (name === 'cardNumber') {
            value = value.replace(/\D/g, '').slice(0, 16);
            // Format as XXXX XXXX XXXX XXXX
            const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            setCardDetails({ ...cardDetails, [name]: formattedValue });
            return;
        }
        if (name === 'cvv') {
            value = value.replace(/\D/g, '').slice(0, 4);
        }
        if (name === 'expiryDate') {
            value = value.replace(/\D/g, '').slice(0, 4);
            if (value.length > 2) {
                value = `${value.slice(0, 2)}/${value.slice(2)}`;
            }
        }

        setCardDetails({ ...cardDetails, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim() || !formData.phone.trim()) {
            return setError('Please fill out all required fields.');
        }

        if (formData.paymentMethod === 'card') {
            if (!cardDetails.cardNumber.trim() || !cardDetails.expiryDate.trim() || !cardDetails.cvv.trim() || !cardDetails.nameOnCard.trim()) {
                return setError('Please fill out all card details.');
            }
            if (cardDetails.cardNumber.replace(/\s/g, '').length < 15) {
                return setError('Please enter a valid card number.');
            }
            if (cardDetails.expiryDate.length < 5) {
                return setError('Please enter a valid expiry date (MM/YY).');
            }
            if (cardDetails.cvv.length < 3) {
                return setError('Please enter a valid CVV.');
            }

            // Validate expiry date is in the future
            const [month, year] = cardDetails.expiryDate.split('/');
            const expiry = new Date(`20${year}`, parseInt(month) - 1);
            const now = new Date();
            if (expiry < now) {
                return setError('Card has expired.');
            }
        }

        // All validations passed. Show confirmation modal instead of placing order immediately.
        setShowConfirmation(true);
    };

    const handlePlaceOrder = async () => {
        setSubmitting(true);
        setError('');

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            
            const saleData = {
                products: cart.map(item => ({
                    product: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                customerName: formData.name,
                customerPhone: formData.phone,
                paymentMethod: formData.paymentMethod,
                customerEmail: user?.email,
                cardDetails: formData.paymentMethod === 'card' ? {
                    name: cardDetails.nameOnCard,
                    last4: cardDetails.cardNumber.slice(-4)
                } : null
            };

            await api.post('/sales', saleData);

            clearCart();
            setShowConfirmation(false);
            setSuccess(true);

        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.response?.data?.msg || 'Failed to process checkout. Please try again.');
            setShowConfirmation(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-28">
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-8">Checkout</h1>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Left Column: Form */}
                <div className="flex-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Truck className="text-indigo-600" size={24} />
                            Customer Details
                        </h2>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm">
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>

                            <div className="pt-6 border-t border-gray-100 mt-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <CreditCard className="text-indigo-600" size={24} />
                                    Payment Method
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {['cash', 'card', 'online'].map((method) => (
                                        <label
                                            key={method}
                                            className={`relative flex items-center justify-center px-4 py-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === method
                                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                                                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value={method}
                                                checked={formData.paymentMethod === method}
                                                onChange={handleInputChange}
                                                className="sr-only"
                                            />
                                            <span className="font-semibold capitalize">{method}</span>
                                        </label>
                                    ))}
                                </div>

                                {formData.paymentMethod === 'card' && (
                                    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h3 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2">Enter Card Details</h3>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Name on Card *</label>
                                            <input
                                                type="text"
                                                name="nameOnCard"
                                                value={cardDetails.nameOnCard}
                                                onChange={handleCardInputChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number *</label>
                                            <input
                                                type="text"
                                                name="cardNumber"
                                                value={cardDetails.cardNumber}
                                                onChange={handleCardInputChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors font-mono tracking-widest"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date *</label>
                                                <input
                                                    type="text"
                                                    name="expiryDate"
                                                    value={cardDetails.expiryDate}
                                                    onChange={handleCardInputChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">CVV *</label>
                                                <input
                                                    type="text"
                                                    name="cvv"
                                                    value={cardDetails.cvv}
                                                    onChange={handleCardInputChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full mt-10 px-8 py-4 bg-indigo-600 text-slate-900 dark:text-white font-bold text-lg rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                            >
                                {submitting ? 'Processing...' : 'Save Order'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:w-[400px]">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 sticky top-32">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                            {cart.map((item) => (
                                <div key={item.cartItemId || item.id} className="flex gap-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 p-1">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h4 className="text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                                        <div className="flex gap-1 mt-1 font-semibold">
                                            {item.selectedStorage && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{item.selectedStorage}</span>}
                                            {item.selectedColor && <span className="text-[10px] px-1.5 py-0.5 bg-fuchsia-50 text-fuchsia-600 rounded capitalize">{item.selectedColor}</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="text-right pt-1 shrink-0 flex flex-col justify-between">
                                        <p className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                                        <p className="text-[10px] text-gray-400 text-right mt-1">{formatPrice(item.price)} each</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-6 space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatPrice(cartTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                <span>Taxes</span>
                                <span>Calculated at next step</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <span className="text-lg font-bold text-gray-900">Total</span>
                                <span className="text-2xl font-extrabold text-indigo-600">{formatPrice(cartTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 overflow-hidden">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle size={32} className="text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 text-center">Confirm Order</h2>
                            <p className="text-gray-500 text-center text-sm mt-1">Please review your details before placing the order.</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-8">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500 text-sm">Customer Name</span>
                                <span className="font-semibold text-gray-900">{formData.name}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500 text-sm">Phone Number</span>
                                <span className="font-semibold text-gray-900">{formData.phone}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500 text-sm">Payment Method</span>
                                <span className="font-semibold text-gray-900 capitalize">{formData.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-500 text-sm">Total Amount</span>
                                <span className="font-bold text-indigo-600 text-lg">{formatPrice(cartTotal)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                disabled={submitting}
                                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Edit Details
                            </button>
                            <button
                                onClick={handlePlaceOrder}
                                disabled={submitting}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex justify-center items-center"
                            >
                                {submitting ? 'Processing...' : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Checkout;
