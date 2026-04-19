import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Loader from './components/ui/Loader';
import { useAlertStore } from './store/alertStore';
import { useVenueStore } from './store/venueStore';
import apiClient, { getToken, setToken, clearToken } from './api/client';

// Lazy loaded routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveMap = lazy(() => import('./pages/LiveMap'));
const QueueIntelligence = lazy(() => import('./pages/QueueIntelligence'));
const AlertsCenter = lazy(() => import('./pages/AlertsCenter'));
const FoodService = lazy(() => import('./pages/FoodService'));
const About = lazy(() => import('./pages/About'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

const queryClient = new QueryClient();

// -- Alerts Toast --
function AlertToastContainer() {
    const alerts = useAlertStore(s => s.alerts);
    const visibleAlerts = alerts
        .filter(a => !a.is_resolved)
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

    return (
        <div className="fixed top-4 right-4 z-[9000] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {visibleAlerts.map(alert => {
                    const cColor = alert.severity === 'critical' ? '#ff3355' : alert.severity === 'high' ? '#ff6b35' : alert.severity === 'medium' ? '#ffd60a' : '#00ff88';
                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className="bg-[#1a1a24] border-l-4 p-4 rounded shadow-2xl w-[320px] pointer-events-auto"
                            style={{ borderLeftColor: cColor }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: cColor }}>{alert.severity} COMMAND</span>
                                <span className="text-[9px] text-gray-500 font-mono">NOW</span>
                            </div>
                            <h4 className="font-rajdhani font-bold text-white text-[15px] mb-1 leading-tight">{alert.title}</h4>
                            <p className="text-[12px] text-gray-400 font-sans leading-tight line-clamp-2">{alert.message}</p>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

function PageTransition({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    return (
        <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}

function VenueSelectorModal() {
    const { venueId, setVenueId, setCurrentUser } = useVenueStore();
    const [inputVal, setInputVal] = useState("");
    const [error, setError] = useState("");
    const [isExpandedAuth, setIsExpandedAuth] = useState(false);
    
    // Auth logic
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    if (venueId) return null;

    const handleBoot = () => {
        const trimmed = inputVal.trim();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(trimmed)) {
            setError("Please enter a valid venue ID");
            return;
        }
        setError("");
        setVenueId(trimmed);
    };

    const handleLogin = async () => {
        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);
            const res = await apiClient.post("/auth/login", formData, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
            if (res.data.access_token) {
                setToken(res.data.access_token);
                const meRes = await apiClient.get("/auth/me");
                setCurrentUser(meRes.data);
                setIsExpandedAuth(false);
            }
        } catch (err) {
            console.error(err);
            setError("Login failed. Check credentials.");
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-[9999] bg-[#0a0a0f] backdrop-blur-md flex justify-center items-center p-4"
        >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-[#111118] border border-[#2a2a38] p-10 rounded-[12px] w-full max-w-[420px] shadow-2xl relative"
            >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent rounded-t-[12px]" />
                <h1 className="font-rajdhani text-[36px] font-bold text-[#00d4ff] tracking-widest text-center leading-none">ARENAFLOW</h1>
                <p className="text-center font-sans text-[14px] text-[#666688] mt-2 mb-8 uppercase tracking-widest">Smart Venue Intelligence Platform</p>
                <div className="w-full h-[1px] bg-[#2a2a38] mb-8" />
                <div className="mb-6">
                    <label className="block text-[10px] text-gray-500 tracking-widest uppercase font-mono mb-2">ENTER VENUE ID</label>
                    <input 
                        type="text" 
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white focus:border-[#00d4ff] outline-none px-4 py-3 rounded text-[13px] font-mono transition"
                    />
                    {error && <div className="text-[11px] text-[#ff3355] mt-2 tracking-wider">{error}</div>}
                </div>
                <button onClick={handleBoot} className="w-full bg-[#00d4ff] text-[#0a0a0f] font-rajdhani font-bold text-[16px] tracking-widest py-3 rounded transition uppercase hover:bg-white text-center">INITIALIZE COMMAND →</button>
                <div className="mt-6 pt-4 border-t border-[#2a2a38]">
                    <button onClick={() => setIsExpandedAuth(!isExpandedAuth)} className="w-full text-center text-[10px] text-[#00d4ff]/60 tracking-widest uppercase hover:text-[#00d4ff] transition">STAFF LOGIN (OPTIONAL) {isExpandedAuth ? '▾' : '▸'}</button>
                    <AnimatePresence>
                        {isExpandedAuth && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-3">
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white outline-none px-3 py-2 rounded text-[12px]" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white outline-none px-3 py-2 rounded text-[12px]" />
                                <button onClick={handleLogin} className="w-full border border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff] text-[12px] py-2 rounded tracking-widest uppercase hover:bg-[#00d4ff]/20">AUTHENTICATE ✓</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function App() {
    const { venueId, venue, setVenue, setCurrentUser } = useVenueStore();
    const [isBooting, setIsBooting] = useState(true);

    useEffect(() => {
        const boot = async () => {
            try {
                const token = getToken();
                if (venueId && !venue) {
                    await apiClient.get(`/maps/venue/${venueId}`).then(res => setVenue(res.data)).catch(() => {});
                }
                if (token) {
                    await apiClient.get('/auth/me').then(res => setCurrentUser(res.data)).catch(() => { clearToken(); setCurrentUser(null); });
                }
            } finally {
                setIsBooting(false);
            }
        };
        boot();
    }, [venueId]);

    if (isBooting) return <Loader />;

    return (
        <QueryClientProvider client={queryClient}>
            <MotionConfig reducedMotion="user">
                <BrowserRouter>
                    {!venueId ? (
                        <VenueSelectorModal />
                    ) : (
                        <div className="flex h-screen bg-[#0a0a0f] text-gray-200 overflow-hidden font-sans">
                            <Sidebar />
                            <div className="flex-1 flex flex-col relative overflow-hidden">
                                <Navbar />
                                <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
                                    <Suspense fallback={<Loader />}>
                                        <Routes>
                                            <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                                            <Route path="/map" element={<PageTransition><LiveMap /></PageTransition>} />
                                            <Route path="/queue" element={<PageTransition><QueueIntelligence /></PageTransition>} />
                                            <Route path="/alerts" element={<PageTransition><AlertsCenter /></PageTransition>} />
                                            <Route path="/food" element={<PageTransition><FoodService /></PageTransition>} />
                                            <Route path="/about" element={<PageTransition><About /></PageTransition>} />
                                            <Route path="/login" element={<LoginPage />} />
                                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                        </Routes>
                                    </Suspense>
                                </main>
                            </div>
                            <AlertToastContainer />
                            <Toaster position="bottom-right" />
                        </div>
                    )}
                </BrowserRouter>
            </MotionConfig>
        </QueryClientProvider>
    );
}
