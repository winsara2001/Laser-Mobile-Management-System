import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Save, Lock, Camera, Check, Trash2, Shield, Settings, Key, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [message, setMessage] = useState(null);

    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const getProfile = async () => {
            try {
                setLoading(true);
                const { data: { user }, error: userErr } = await supabase.auth.getUser();
                if (userErr) throw userErr;
                
                setUser(user);
                setNewEmail(user.email);

                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (error) throw error;
                    setProfile(data);
                }
            } catch (error) {
                console.error('Error loading profile:', error.message);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, []);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 200;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setProfile({ ...profile, avatarUrl: dataUrl });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        
        if (password && password !== confirmPassword) {
            setMessage('Protocol Error: Passphrase mismatch detected.');
            return;
        }

        try {
            setLoading(true);
            setMessage(null);
            
            const authUpdates = {};
            if (newEmail !== user.email) authUpdates.email = newEmail;
            if (password) authUpdates.password = password;

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            const updates = {
                ...profile,
                id: user.id,
                email: newEmail,
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl,
                updated_at: new Date(),
            };

            const { error: profileError } = await supabase.from('profiles').upsert(updates);
            if (profileError) throw profileError;

            let successMsg = 'Identity Core Synchronized successfully.';
            if (authUpdates.email) successMsg += ' Verification sequence initiated for new address.';
            
            setMessage(successMsg);
            setTimeout(() => setMessage(null), 6000);
            
            setPassword('');
            setConfirmPassword('');

            const updatedUser = {
                ...JSON.parse(localStorage.getItem('user')),
                name: profile.fullName,
                email: newEmail,
                avatarUrl: profile.avatarUrl
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('authStatusChanged'));

        } catch (error) {
            setMessage('Critical Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !profile) return <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 text-center py-40 animate-pulse italic">Retrieving Operator Identity...</div>;

    const isSuccess = message && !message.includes('Error') && !message.includes('mismatch');

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-white/50 dark:bg-white/[0.02] p-10 rounded-[2.5rem] border border-white/40 dark:border-white/5 backdrop-blur-md shadow-2xl shadow-black/5">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic flex items-center gap-4">
                        <Settings className="text-[#7bc24c]" size={36} />
                        Personal Command Center
                    </h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
                        <Shield size={14} className="text-[#7bc24c]" />
                        Identity Hash: {user?.id.substring(0, 16)}...
                    </p>
                </div>
            </div>

            <div className="relative">
                {/* Feedback Toast */}
                <AnimatePresence>
                    {message && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className={clsx(
                                "p-6 mb-8 rounded-[1.5rem] flex items-center gap-4 border backdrop-blur-xl shadow-2xl",
                                isSuccess 
                                    ? "bg-[#7bc24c]/10 text-[#7bc24c] border-[#7bc24c]/20" 
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                        >
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isSuccess ? "bg-[#7bc24c]/10" : "bg-red-500/10")}>
                                {isSuccess ? <Check size={20} /> : <Shield size={20} />}
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-widest leading-relaxed">{message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={updateProfile} autoComplete="off" className="space-y-10">
                    
                    {/* Core Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        
                        {/* Avatar Cell */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-1 bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/60 dark:border-white/5 shadow-2xl shadow-black/5 flex flex-col items-center justify-center space-y-8"
                        >
                            <div className="relative group">
                                <div className="w-48 h-48 rounded-[3rem] overflow-hidden bg-slate-100 dark:bg-[#0F111A] border-4 border-slate-50 dark:border-white/10 shadow-inner flex items-center justify-center transform group-hover:scale-105 transition-all duration-700">
                                    {profile?.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={80} className="text-slate-300 dark:text-slate-700" />
                                    )}
                                </div>
                                <div className="absolute -bottom-4 -right-4 flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="w-14 h-14 bg-[#7bc24c] hover:bg-[#6ab33d] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-[#7bc24c]/30 hover:scale-110 active:scale-90 transition-all"
                                    >
                                        <Camera size={24} />
                                    </button>
                                    {profile?.avatarUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setProfile({ ...profile, avatarUrl: null })}
                                            className="w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center backdrop-blur-lg border border-red-500/20 transition-all hover:scale-110"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    )}
                                </div>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
                            </div>

                            <div className="text-center">
                                <h3 className="text-base font-black text-slate-900 dark:text-white italic uppercase tracking-wider">Visual Signature</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">Operator Uplink Interface</p>
                            </div>
                        </motion.div>

                        {/* Informational Cells */}
                        <div className="lg:col-span-2 space-y-10">
                            
                            {/* Identity Payload */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/60 dark:border-white/5 shadow-2xl shadow-black/5 space-y-8"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#7bc24c]/10 flex items-center justify-center">
                                        <User size={20} className="text-[#7bc24c]" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest italic leading-none">Entity Metadata</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic ml-1">Legal Identity Name</label>
                                        <input
                                            type="text"
                                            value={profile?.fullName || ''}
                                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 transition-all font-black italic text-sm shadow-inner"
                                            placeholder="Operator Name"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic ml-1">Communication Uplink</label>
                                        <div className="relative">
                                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-[#7bc24c]" size={18} />
                                            <input
                                                type="email"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl pl-16 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 transition-all font-black italic text-sm shadow-inner"
                                                placeholder="email@node.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Security Logic */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/70 dark:bg-[#161925]/60 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/60 dark:border-white/5 shadow-2xl shadow-black/5 space-y-8"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <Key size={20} className="text-orange-500" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest italic leading-none">Cipher Management</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic ml-1">New Access Token</label>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 shadow-inner"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic ml-1">Verify Change</label>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#0F111A] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7bc24c]/50 shadow-inner"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Submission Command */}
                    <div className="flex justify-end gap-6 pt-10 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-all"
                        >
                            Reset Logic
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#7bc24c] hover:bg-[#6ab33d] text-white px-12 py-5 rounded-[2rem] flex items-center gap-4 transition-all shadow-2xl shadow-[#7bc24c]/30 font-black text-xs uppercase tracking-[0.4em] active:scale-95 disabled:opacity-50"
                        >
                            <Save size={20} />
                            {loading ? 'Synchronizing...' : 'Update Core Identity'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Profile;
