import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import apiClient, { setToken } from '../api/client';
import { useVenueStore } from '../store/venueStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState(import.meta.env.VITE_DEMO_EMAIL || "");
    const [password, setPassword] = useState(import.meta.env.VITE_DEMO_PASSWORD || "");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { setCurrentUser } = useVenueStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("username", email);
            params.append("password", password);
            params.append("grant_type", "password");
            
            const res = await apiClient.post("/auth/login", params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            
            if (res.data.access_token) {
                setToken(res.data.access_token);
                const meRes = await apiClient.get("/auth/me");
                setCurrentUser(meRes.data);
                toast.success('Access Granted. Welcome back.');
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            toast.error('Authentication failed. Check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00d4ff]/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00ff88]/5 rounded-full blur-[120px] animate-pulse" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[440px] z-10"
            >
                {/* Branding */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-[#00d4ff]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#00d4ff]/20 shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                        <Activity className="w-8 h-8 text-[#00d4ff]" />
                    </div>
                    <h1 className="text-4xl font-bold font-rajdhani tracking-[0.2em] text-white">
                        ARENA<span className="text-[#00d4ff]">FLOW</span>
                    </h1>
                    <p className="text-[#666688] text-xs uppercase tracking-[0.3em] mt-2">Internal Command Protocol</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#111118]/80 backdrop-blur-xl border border-[#2a2a38] p-8 rounded-2xl shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent" />
                    
                    <div className="flex items-center gap-3 mb-8">
                        <ShieldCheck className="w-5 h-5 text-[#00ff88]" />
                        <h2 className="text-lg font-rajdhani font-bold text-white uppercase tracking-widest">Identify Personnel</h2>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00d4ff] transition-colors" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white focus:border-[#00d4ff] outline-none pl-12 pr-4 py-3.5 rounded-xl text-[14px] transition-all placeholder:text-gray-700 font-sans"
                                    placeholder="Enter commander email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono ml-1">Access Cipher</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00d4ff] transition-colors" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white focus:border-[#00d4ff] outline-none pl-12 pr-4 py-3.5 rounded-xl text-[14px] transition-all placeholder:text-gray-700 font-sans"
                                    placeholder="Enter access code"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#00d4ff] hover:bg-white text-[#0a0a0f] font-rajdhani font-bold text-[16px] tracking-widest py-4 rounded-xl transition-all uppercase flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Authorize Session
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[#2a2a38] flex flex-col items-center">
                        <p className="text-[10px] text-gray-600 font-mono tracking-wider uppercase mb-2">Restricted Area</p>
                        <p className="text-[9px] text-gray-700 text-center leading-relaxed">
                            UNAUTHORIZED ACCESS TO THIS TERMINAL IS PROHIBITED. <br /> ALL ACTIONS ARE LOGGED BY THE ARENAFLOW SECURITY ENGINE.
                        </p>
                    </div>
                </div>

                {/* Back Link */}
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full text-center mt-6 text-[10px] text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-colors font-rajdhani font-bold"
                >
                    ← Return to Operational Map
                </button>
            </motion.div>
        </div>
    );
}
