import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Billings from './pages/Billings';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import SupplierPortal from './pages/SupplierPortal';
import Feedback from './pages/Feedback';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import CategoryPage from './pages/CategoryPage';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import Payments from './pages/Payments';
import Repairs from './pages/Repairs';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';

import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import UserLayout from './components/UserLayout';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';

function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentToken = localStorage.getItem('token');
      const isMockToken = currentToken && currentToken.startsWith('mock-');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (isMockToken) return;

        localStorage.setItem('token', session.access_token);

        // Run asynchronously to avoid Supabase auth lock deadlock
        const fetchProfile = async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const user = {
            id: session.user.id,
            email: session.user.email,
            name: profile?.fullName || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatarUrl: session.user.user_metadata?.avatar_url,
            role: profile?.role || 'user'
          };

          localStorage.setItem('user', JSON.stringify(user));
          window.dispatchEvent(new Event('authStatusChanged'));
        };
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        if (isMockToken) return;

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('authStatusChanged'));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <CurrencyProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            <Route path="/" element={
              <>
                <Navbar />
                <LandingPage />
              </>
            } />
            <Route path="/android" element={
              <>
                <Navbar />
                <CategoryPage type="android" />
              </>
            } />
            <Route path="/apple" element={
              <>
                <Navbar />
                <CategoryPage type="apple" />
              </>
            } />

            {/* Routes for any logged-in user */}
            <Route element={<UserProtectedRoute />}>
              <Route element={<UserLayout />}>
                <Route path="/profile" element={<Profile />} />
                <Route path="/checkout" element={<Checkout />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="sales" element={<Sales />} />
                <Route path="billings" element={<Billings />} />
                <Route path="payments" element={<Payments />} />
                <Route path="repairs" element={<Repairs />} />
                <Route path="users" element={<Users />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="supplier-portal" element={<SupplierPortal />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>
          </Routes>
        </CartProvider>
      </CurrencyProvider>
    </Router>
  );
}

export default App;
