import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, MapPin, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import { useVenueStore } from '../../store/venueStore';
import apiClient, { setToken } from '../../api/client';
import { Venue } from '../../types';

const VenueSelector = () => {
    const { setVenueId, setVenue, setCurrentUser } = useVenueStore();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isExpandedAuth, setIsExpandedAuth] = useState(false);
    
    // Auth state for nested login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const fetchVenues = async () => {
            try {
                const res = await apiClient.get('/maps/venues');
                setVenues(res.data);
            } catch (err) {
                console.error("Failed to fetch venues", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVenues();
    }, []);

    const handleSelect = (id: string) => {
        setVenueId(id);
    };

    const handleLogin = async () => {
        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);
            const res = await apiClient.post("/auth/login", formData, { 
                headers: { "Content-Type": "application/x-www-form-urlencoded" } 
            });
            if (res.data.access_token) {
                localStorage.setItem("arenaflow_token", res.data.access_token);
                const meRes = await apiClient.get("/auth/me");
                setCurrentUser(meRes.data);
                setIsExpandedAuth(false);
                setAuthError("");
            }
        } catch (err) {
            setAuthError("Authentication failed. Invalid credentials.");
        }
    };

    const filteredVenues = venues.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto"
        >
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-50"></div>
                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[#00d4ff]/10 to-transparent"></div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-4xl z-10"
            >
                {/* Header Container */}
                <div className="text-center mb-12">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-block p-3 rounded-2xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 mb-6"
                    >
                        <Building2 className="w-10 h-10 text-[#00d4ff]" />
                    </motion.div>
                    <h1 className="text-5xl font-rajdhani font-bold text-white tracking-tighter mb-4">
                        SELECT <span className="text-[#00d4ff]">OPERATIONAL TARGET</span>
                    </h1>
                    <p className="text-gray-400 font-sans tracking-widest uppercase text-xs">
                        Deployment Zone Initialization • Neural Mapping • Real-time Sync
                    </p>
                </div>

                {/* Sub-header / Search */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 pb-8 border-b border-white/5">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Filter by city or venue name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white rounded-xl py-3 pl-12 pr-4 text-sm focus:border-[#00d4ff] outline-none transition-all shadow-inner"
                        />
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono tracking-widest">
                        TOTAL REVISIONS: {venues.length} • ACTIVE CLUSTERS: 1
                    </div>
                </div>

                {/* Venue Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-48 rounded-2xl bg-[#111118] border border-white/5 animate-pulse" />
                        ))
                    ) : filteredVenues.map((v, i) => (
                        <motion.div
                            key={v.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5, borderColor: 'rgba(0, 212, 255, 0.4)' }}
                            onClick={() => handleSelect(v.id)}
                            className="group relative bg-[#111118] border border-white/10 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-5 h-5 text-[#00d4ff]" />
                            </div>
                            
                            <div className="flex flex-col h-full">
                                <div className="p-2 w-10 h-10 rounded-lg bg-[#1a1a24] border border-white/5 flex items-center justify-center mb-4 group-hover:bg-[#00d4ff]/10 transition-colors">
                                    <MapPin className="w-5 h-5 text-gray-500 group-hover:text-[#00d4ff]" />
                                </div>
                                <h3 className="font-rajdhani font-bold text-xl text-white mb-2 group-hover:text-[#00d4ff] transition-colors">{v.name}</h3>
                                <div className="space-y-1 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Users className="w-3 h-3" />
                                        <span>CAPACITY: {v.total_capacity.toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-mono uppercase tracking-tighter">
                                        LOCATION: {v.city.toUpperCase()}, {v.country}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Section - Manual ID + Auth */}
                <div className="flex flex-col items-center gap-6 pt-12 border-t border-white/5">
                    <button 
                        onClick={() => setIsExpandedAuth(!isExpandedAuth)}
                        className="flex items-center gap-2 text-[11px] text-[#00d4ff]/60 tracking-widest uppercase hover:text-[#00d4ff] transition group"
                    >
                        <ShieldCheck className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        Privileged Access Login {isExpandedAuth ? '▾' : '▸'}
                    </button>
                    
                    <AnimatePresence>
                        {isExpandedAuth && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }} 
                                className="overflow-hidden w-full max-w-sm"
                            >
                                <div className="bg-[#1a1a24] border border-[#2a2a38] p-6 rounded-2xl space-y-4 shadow-2xl">
                                    <h4 className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-2">Internal Authentication</h4>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        placeholder="Admin Email" 
                                        className="w-full bg-[#0a0a0f] border border-[#2a2a38] text-white outline-none px-4 py-2.5 rounded-lg text-sm focus:border-[#00d4ff] transition" 
                                    />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        placeholder="Password" 
                                        className="w-full bg-[#0a0a0f] border border-[#2a2a38] text-white outline-none px-4 py-2.5 rounded-lg text-sm focus:border-[#00d4ff] transition" 
                                    />
                                    {authError && <p className="text-[10px] text-[#ff3355] text-center uppercase tracking-wider">{authError}</p>}
                                    <button 
                                        onClick={handleLogin} 
                                        className="w-full bg-[#00d4ff] text-[#0a0a0f] font-bold text-xs py-3 rounded-lg tracking-widest uppercase transition-all hover:bg-white hover:scale-[1.02] active:scale-95"
                                    >
                                        Establish Connection
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="text-[10px] text-gray-700 font-mono">
                        LOCAL TIME: {new Date().toLocaleTimeString()} • SYSTEM STATUS: STABLE
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default VenueSelector;
