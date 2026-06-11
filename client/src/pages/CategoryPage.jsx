import React from 'react';
import { ChevronRight, ChevronLeft, Smartphone, Laptop, Tablet, Watch, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ANDROID_BRANDS = [
    { name: 'Google Pixel', icon: Smartphone },
    { name: 'Redmi', icon: Smartphone },
    { name: 'Honor', icon: Smartphone },
    { name: 'OnePlus', icon: Smartphone },
    { name: 'Tecno', icon: Smartphone },
    { name: 'Vivo', icon: Smartphone },
    { name: 'Nothing', icon: Smartphone },
    { name: 'Infinix', icon: Smartphone },
    { name: 'Blackview', icon: Smartphone },
];

const APPLE_BRANDS = [
    { name: 'iPhone', icon: Smartphone },
    { name: 'Mac', icon: Laptop },
    { name: 'iPad', icon: Tablet },
    { name: 'Apple Watch', icon: Watch },
    { name: 'Apple Accessories', icon: Headphones },
];

const CategoryPage = ({ type }) => {
    const isAndroid = type === 'android';
    const title = isAndroid ? 'Android Collections' : 'Apple Collections';
    const collections = isAndroid ? ANDROID_BRANDS : APPLE_BRANDS;

    // A placeholder banner image from a generic source or dark background if none
    const bannerUrl = isAndroid 
        ? 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=2000&q=80' // Samsung/Android style
        : 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=2000&q=80'; // Apple macbook style

    return (
        <div className="min-h-screen bg-white font-['Inter',sans-serif] pt-[68px]">
            {/* Image Slider Banner */}
            <div className="relative w-full h-[400px] md:h-[500px] bg-black overflow-hidden group">
                <img 
                    src={bannerUrl} 
                    alt="Banner" 
                    className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000" 
                />
                
                {/* Banner Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white text-5xl md:text-7xl font-black tracking-tight drop-shadow-lg mb-4"
                    >
                        Image slide
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/80 text-lg md:text-xl max-w-xl"
                    >
                        Experience the latest {title.replace(' Collections', '')} lineup.
                    </motion.p>
                </div>

                {/* Simulated slider arrows */}
                <button className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
                    <ChevronLeft />
                </button>
                <button className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
                    <ChevronRight />
                </button>
                
                {/* Simulated dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                </div>
            </div>

            {/* Collections Grid */}
            <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-12">Collections</h2>
                
                <div className="flex flex-wrap gap-6 md:gap-8 overflow-x-auto pb-8 scrollbar-hide">
                    {collections.map((brand, idx) => {
                        const Icon = brand.icon;
                        return (
                            <Link 
                                to="/#products" 
                                key={brand.name}
                                className="flex flex-col items-center gap-4 flex-shrink-0 min-w-[100px] md:min-w-[120px] group"
                            >
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300"
                                >
                                    {/* Using Lucide Icon as placeholder since we don't have the real phone images */}
                                    <Icon size={48} className="text-gray-300 group-hover:text-black transition-colors duration-300" />
                                </motion.div>
                                <span className="text-sm font-semibold text-gray-800 text-center tracking-wide">{brand.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
            
        </div>
    );
};

export default CategoryPage;
