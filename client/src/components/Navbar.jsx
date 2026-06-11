import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, ShoppingCart, Sun, Moon, Menu, X, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import CartDrawer from './CartDrawer';
import ProductsModal from './ProductsModal';
import Logo from './Logo';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
    const [selectedBrandCategory, setSelectedBrandCategory] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { cartCount } = useCart();
    const { theme, toggleTheme } = useTheme();
    const { currency, setCurrency, currencies } = useCurrency();
    const navigate = useNavigate();
    const location = useLocation();

    /* ── Auth check ── */
    useEffect(() => {
        const checkUser = () => {
            const userStr = localStorage.getItem('user');
            setUser(userStr ? JSON.parse(userStr) : null);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setTimeout(checkUser, 100);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    /* ── Scroll detection (glassmorphism trigger) ── */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
        navigate('/');
    };

    /* ── Nav links ── */
    const navLinks = [
        { label: 'Home', href: '/', sectionId: null },
        { 
            label: 'Apple', 
            href: '/apple', 
            dropdown: [
                { label: 'Apple', href: '#', isFilterItem: true },
                { label: 'iPhone', href: '#', isFilterItem: true },
                { label: 'Mac', href: '#', isFilterItem: true },
                { label: 'iPad', href: '#', isFilterItem: true },
                { label: 'Apple Watch', href: '#', isFilterItem: true },
                { label: 'Apple Accessories', href: '#', isFilterItem: true },
            ] 
        },
        { 
            label: 'Android', 
            href: '/android', 
            dropdown: [
                { label: 'Android', href: '#', isFilterItem: true },
                { label: 'Samsung', href: '#', isFilterItem: true },
                { label: 'Google Pixel', href: '#', isFilterItem: true },
                { label: 'Redmi', href: '#', isFilterItem: true },
                { label: 'Honor', href: '#', isFilterItem: true },
                { label: 'OnePlus', href: '#', isFilterItem: true },
                { label: 'Tecno', href: '#', isFilterItem: true },
                { label: 'Vivo', href: '#', isFilterItem: true },
                { label: 'Nothing', href: '#', isFilterItem: true },
                { label: 'Infinix', href: '#', isFilterItem: true },
                { label: 'Blackview', href: '#', isFilterItem: true },
            ]
        },
        { 
            label: 'Accessory', 
            href: '/#products', 
            sectionId: 'products',
            dropdown: [
                { label: 'Accessory', href: '#', isFilterItem: true },
                { label: 'JBL', href: '#', isFilterItem: true },
                { label: 'Green Lion', href: '#', isFilterItem: true },
                { label: 'Porodo', href: '#', isFilterItem: true },
                { label: 'Anker', href: '#', isFilterItem: true },
                { label: 'Baseus', href: '#', isFilterItem: true },
                { label: 'Powerology', href: '#', isFilterItem: true },
                { label: 'Boya', href: '#', isFilterItem: true },
            ]
        },
        { label: 'Services', href: '/', sectionId: 'features' },
    ];

    const handleNavClick = (e, link) => {
        e.preventDefault();
        setMobileOpen(false);

        if (link.isFilterItem) {
            setSelectedBrandCategory(link.label);
            setIsProductsModalOpen(true);
            return;
        }

        if (!link.sectionId) {
            navigate(link.href);
            if (link.label === 'Home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return; 
        }

        const scrollTo = (id) => {
            if (!id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        if (location.pathname === '/') {
            scrollTo(link.sectionId);
        } else {
            navigate('/');
            setTimeout(() => scrollTo(link.sectionId), 350);
        }
    };

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30'
                        : 'bg-black'
                }`}
            >
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="flex items-center justify-between h-[68px]">

                        {/* ── Logo (left) ── */}
                        <div className="flex-shrink-0">
                            <Link to="/" className="flex items-center h-12 w-56" onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                <Logo />
                            </Link>
                        </div>

                        {/* ── Center nav links (desktop) ── */}
                        <div className="hidden lg:flex items-center gap-6">
                            {navLinks.map((link) => (
                                <div key={link.label} className="relative group">
                                    <a
                                        href={link.href}
                                        onClick={(e) => {
                                            if (!link.dropdown) handleNavClick(e, link);
                                            else e.preventDefault();
                                        }}
                                        className="nav-link flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium tracking-wide transition-colors cursor-pointer py-5"
                                    >
                                        {link.label}
                                        {link.dropdown && <span className="opacity-0 w-0 h-0 overflow-hidden">Dropdown</span>}
                                    </a>
                                    
                                    {link.dropdown && (
                                        <div className="absolute top-14 left-1/2 -translate-x-1/2 mt-1 w-48 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-3">
                                            {link.dropdown.map((sublink) => (
                                                <a
                                                    key={sublink.label}
                                                    href={sublink.href}
                                                    onClick={(e) => {
                                                        if (sublink.sectionId || sublink.isFilterItem) handleNavClick(e, sublink);
                                                    }}
                                                    className="block px-5 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                                >
                                                    {sublink.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* ── Right icons (desktop) ── */}
                        <div className="hidden md:flex items-center gap-3">

                            {/* Search */}
                            <button
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                aria-label="Search"
                            >
                                <Search size={20} />
                            </button>
                            {/* Currency */}
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="bg-transparent text-white/70 hover:text-white text-sm border border-white/20 rounded-lg px-2 py-1.5 focus:outline-none focus:border-white/50 cursor-pointer transition-colors font-medium"
                            >
                                {currencies.map(c => (
                                    <option key={c} value={c} className="bg-black text-white">{c}</option>
                                ))}
                            </select>

                            {/* Cart */}
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                aria-label="Open Cart"
                            >
                                <ShoppingCart size={20} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-white text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                                        {cartCount}
                                    </span>
                                )}
                            </button>

                            {/* Auth actions */}
                            {user ? (
                                <>
                                    {['admin', 'inventory_manager', 'inventory manager', 'technician', 'sales', 'supplier'].includes(user.role?.toLowerCase()) && (
                                        <Link
                                            to={user.role === 'supplier' ? '/dashboard/supplier-portal' : '/dashboard'}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[11px] font-bold">
                                                {user.name ? user.name[0].toUpperCase() : 'U'}
                                            </div>
                                            Dashboard
                                        </Link>
                                    )}
                                    <Link
                                        to="/profile"
                                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                        title="Profile"
                                    >
                                        <User size={18} />
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                                        title="Logout"
                                    >
                                        <LogOut size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-white/70 hover:text-white text-sm font-medium transition-colors px-2"
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-lg"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* ── Mobile: hamburger + cart ── */}
                        <div className="flex md:hidden items-center gap-3">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative p-2 text-white/70 hover:text-white"
                            >
                                <ShoppingCart size={20} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-white text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setMobileOpen(o => !o)}
                                className="p-2 text-white/70 hover:text-white"
                                aria-label="Toggle Menu"
                            >
                                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Mobile Menu ── */}
                {mobileOpen && (
                    <div className="md:hidden bg-black border-t border-white/10 px-5 py-5 flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <button
                                key={link.label}
                                onClick={(e) => handleNavClick(e, link)}
                                className="text-white/80 hover:text-white font-medium text-base text-left transition-colors cursor-pointer"
                            >
                                {link.label}
                            </button>
                        ))}
                        <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                            {/* Theme + Currency */}
                            <div className="flex items-center gap-3">

                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="bg-transparent text-white/70 text-sm border border-white/20 rounded-lg px-2 py-1.5 focus:outline-none"
                                >
                                    {currencies.map(c => (
                                        <option key={c} value={c} className="bg-black text-white">{c}</option>
                                    ))}
                                </select>
                            </div>

                            {user ? (
                                <>
                                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-white/70 hover:text-white text-sm">
                                        <User size={16} /> Profile
                                    </Link>
                                    <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 text-sm text-left">
                                        <LogOut size={16} /> Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Sign in</Link>
                                    <Link to="/signup" onClick={() => setMobileOpen(false)} className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold text-center">Get Started</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <ProductsModal 
                isOpen={isProductsModalOpen} 
                onClose={() => setIsProductsModalOpen(false)} 
                brandCategory={selectedBrandCategory} 
            />
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
};

export default Navbar;
