import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Zap, Globe, Sun, Moon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const FEATURES = [
    { icon: ShieldCheck, text: 'Secure & Encrypted Access' },
    { icon: Zap, text: 'Real-time Dashboard Analytics' },
    { icon: Globe, text: 'Multi-currency Support' },
];

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;
    const { theme, toggleTheme } = useTheme();

    // Auto-redirect if already logged in
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            try {
                const currentUser = JSON.parse(userStr);
                const userRole = currentUser.role?.toLowerCase() || '';
                if (['admin', 'inventory_manager', 'inventory manager', 'technician', 'sales'].includes(userRole)) {
                    navigate('/dashboard');
                } else if (userRole === 'supplier') {
                    navigate('/dashboard/supplier-portal');
                } else {
                    navigate('/');
                }
            } catch (e) {
                console.error("Error parsing stored user data:", e);
            }
        }
    }, [navigate]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        console.log("=== LOGIN ATTEMPT START ===");
        setError('');
        setIsLoading(true);

        try {
            console.log("Attempting backend mock login...");
            try {
                const mockRes = await api.post('/auth/login', { email, password });
                console.log("Backend login success:", mockRes.data);
                if (mockRes.data.token && mockRes.data.user) {
                    const mappedUser = {
                        ...mockRes.data.user,
                        name: mockRes.data.user.fullName || mockRes.data.user.name || 'User'
                    };
                    localStorage.setItem('token', mockRes.data.token);
                    localStorage.setItem('user', JSON.stringify(mappedUser));
                    setIsLoading(false);
                    console.log("Navigating to dashboard/home (mock)");
                    const mockRole = mockRes.data.user.role?.toLowerCase() || '';
                    ['admin', 'inventory_manager', 'inventory manager', 'technician', 'sales'].includes(mockRole) ? navigate('/dashboard') : mockRole === 'supplier' ? navigate('/dashboard/supplier-portal') : navigate('/');
                    return;
                }
            } catch (err) {
                console.log("Backend login failed (expected if real user):", err?.response?.status);
            }

            console.log("Attempting Supabase login...");
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            console.log("Supabase response:", { hasData: !!data, hasError: !!error, error });

            if (error) {
                console.log("Throwing Supabase error");
                throw error;
            }

            console.log("Supabase login successful, fetching profile...");
            const sessionUser = data.user;
            const { data: profileData, error: profileErr } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
            console.log("Profile fetch response:", { hasProfile: !!profileData, profileErr });

            if (!profileData) {
                await supabase.auth.signOut();
                throw new Error("Your account has been deleted or does not exist.");
            }

            if (profileData.is_active === false) {
                await supabase.auth.signOut();
                throw new Error("Your account has been deactivated. Please contact an administrator.");
            }

            const userRole = profileData.role || 'user';
            const user = {
                id: sessionUser.id,
                email: sessionUser.email,
                name: profileData?.fullName || sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
                avatarUrl: sessionUser.user_metadata?.avatar_url,
                role: userRole
            };

            console.log("Setting localStorage and navigating");
            localStorage.setItem('token', data.session.access_token);
            localStorage.setItem('user', JSON.stringify(user));

            setIsLoading(false);
            const userRoleNormalized = user.role?.toLowerCase() || '';
            ['admin', 'inventory_manager', 'inventory manager', 'technician', 'sales'].includes(userRoleNormalized) ? navigate('/dashboard') : userRoleNormalized === 'supplier' ? navigate('/dashboard/supplier-portal') : navigate('/');
            console.log("=== LOGIN ATTEMPT END (SUCCESS) ===");
        } catch (err) {
            console.error("=== LOGIN ERROR ===", err);
            setError(err.message || 'Login Failed. Please check your credentials.');
            setIsLoading(false);
            console.log("Set error and isLoading(false)");
        }
    };

    const handleGoogleLogin = async (e) => {
        e.preventDefault();
        try {
            setIsGoogleLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { queryParams: { access_type: 'offline', prompt: 'consent' } },
            });
            if (error) throw error;
            // Native redirect occurs here, we don't unset loading to prevent UI flicker
        } catch (err) {
            setError(err.message);
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex overflow-hidden bg-slate-50 dark:bg-[#050817] transition-colors duration-300">
            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors z-50"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* ──────────────── LEFT PANEL ──────────────── */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-200 dark:border-transparent z-10">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-white dark:from-[#0a0f2e] dark:via-[#0d1a4a] dark:to-[#050817] transition-colors duration-300" />
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.75s' }} />
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-10"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(99,179,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.5) 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}
                    />
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-blue-500/20 dark:bg-white/20"
                            style={{
                                width: `${Math.random() * 6 + 2}px`,
                                height: `${Math.random() * 6 + 2}px`,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animation: `float-up ${Math.random() * 8 + 4}s linear infinite`,
                                animationDelay: `${Math.random() * 5}s`,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10">
                    <div className="w-56 h-16"><Logo /></div>
                </div>

                <div className="relative z-10 space-y-8">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="text-4xl font-black text-slate-800 dark:text-white leading-tight mb-3"
                        >
                            Manage Your<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500 dark:from-blue-400 dark:to-sky-300">Store Smarter.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                            className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed"
                        >
                            A complete management system for your mobile phone retail operations.
                        </motion.p>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-4">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                    <Icon size={16} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-sm font-medium">{text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="relative z-10">
                    <p className="text-slate-500 dark:text-slate-600 text-xs">© 2026 Laser Mobile Phone Arcade. All rights reserved.</p>
                </div>
            </div>

            {/* ──────────────── RIGHT PANEL ──────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-white dark:bg-[#060a1a] transition-colors duration-300 z-10">
                <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: 'radial-gradient(ellipse at center, rgba(30,58,138,0.08) 0%, transparent 70%)' }} />

                <motion.div
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="lg:hidden w-48 h-14 mb-8 mx-auto"><Logo /></div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-slate-500 dark:text-slate-400">Sign in to access your account</p>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                            <div className={`rounded-xl border transition-all duration-200 ${focusedField === 'email' ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-200 dark:border-white/10'}`}>
                                <input
                                    id="email" name="email" type="email" required
                                    value={email} onChange={onChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl outline-none text-sm transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                            <div className={`relative rounded-xl border transition-all duration-200 ${focusedField === 'password' ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-200 dark:border-white/10'}`}>
                                <input
                                    id="password" name="password" type={showPassword ? 'text' : 'password'} required
                                    value={password} onChange={onChange}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full px-4 py-3.5 pr-12 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl outline-none text-sm transition-colors"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 dark:hover:from-blue-500 dark:hover:to-sky-400 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10 transition-colors" />
                        <span className="text-slate-500 dark:text-slate-600 text-xs font-medium">OR CONTINUE WITH</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10 transition-colors" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white text-sm font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isGoogleLoading ? (
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        {isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}
                    </button>

                    <p className="text-center text-sm text-slate-600 dark:text-slate-500 mt-6">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">Create one</Link>
                    </p>
                </motion.div>
            </div>

            <style>{`
                @keyframes float-up {
                    0%   { transform: translateY(100vh) scale(0); opacity: 0; }
                    10%  { opacity: 0.6; }
                    90%  { opacity: 0.3; }
                    100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default Login;
