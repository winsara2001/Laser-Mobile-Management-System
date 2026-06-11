import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [userId, setUserId] = useState(null);

    // 1. Detect the current user
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUserId(session?.user?.id || null);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUserId(session?.user?.id || null);
            if (event === 'SIGNED_OUT') {
                // Keep the cart loaded so someone can browse as a guest after logging out
                // setCart([]); 
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Load cart for user or guest
    useEffect(() => {
        const key = userId ? `cart_${userId}` : 'cart_guest';
        try {
            const localCart = localStorage.getItem(key);
            setCart(localCart ? JSON.parse(localCart) : []);
        } catch (error) {
            console.error("Failed to parse cart from local storage", error);
            setCart([]);
        }
    }, [userId]);

    // 3. Save to local storage
    useEffect(() => {
        const key = userId ? `cart_${userId}` : 'cart_guest';
        localStorage.setItem(key, JSON.stringify(cart));
    }, [cart, userId]);

    const addToCart = (product) => {
        const cartItemId = `${product.id}-${product.selectedStorage || 'base'}-${product.selectedColor || 'base'}`;
        setCart(prevCart => {
            const existingItem = prevCart.find(item => (item.cartItemId === cartItemId) || (!item.cartItemId && item.id === product.id));
            if (existingItem) {
                return prevCart.map(item =>
                    (item.cartItemId === cartItemId || (!item.cartItemId && item.id === product.id)) ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, cartItemId, quantity: 1 }];
        });
    };

    const removeFromCart = (identifier) => {
        setCart(prevCart => prevCart.filter(item => item.cartItemId !== identifier && item.id !== identifier));
    };

    const updateQuantity = (identifier, newQuantity) => {
        if (newQuantity < 1) return;
        setCart(prevCart =>
            prevCart.map(item =>
                (item.cartItemId === identifier || item.id === identifier) ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartCount,
            cartTotal
        }}>
            {children}
        </CartContext.Provider>
    );
};
