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

import VenueSelector from './components/venue/VenueSelector';

export default function App() {
    const { venueId, venue, setVenue, setCurrentUser, clearVenue } = useVenueStore();
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

    // If venueId is cleared via sidebar, clear the venue object too
    useEffect(() => {
        if (!venueId && venue) {
            setVenue(null);
        }
    }, [venueId, venue, setVenue]);

    if (isBooting) return <Loader />;

    return (
        <QueryClientProvider client={queryClient}>
            <MotionConfig reducedMotion="user">
                <BrowserRouter>
                    {!venueId ? (
                        <VenueSelector />
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
