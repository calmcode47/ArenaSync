import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Activity, User, LogOut } from 'lucide-react';
import { useVenueStore } from '../../store/venueStore';
import { useAlertStore } from '../../store/alertStore';
import { useWebSocket } from '../../hooks/useWebSocket';

const Navbar = () => {
    const navigate = useNavigate();
    const { venue, venueId, currentUser, setCurrentUser } = useVenueStore();
    const alerts = useAlertStore((state) => state.alerts);
    const { isConnected } = useWebSocket(venueId);

    const handleLogout = () => {
        localStorage.removeItem("arenaflow_token");
        setCurrentUser(null);
    };

    return (
        <nav className="h-16 w-full bg-[#1a1a24]/80 backdrop-blur-md border-b border-[#00d4ff]/20 flex items-center justify-between px-6 z-50 shrink-0 shadow-[0_0_15px_rgba(0,212,255,0.1)]">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#00d4ff]/10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-pulse">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold font-rajdhani tracking-wider text-white">ARENA<span className="text-[#00d4ff]">FLOW</span></h1>
            </div>

            <div className="flex-1 flex justify-center">
                {venue ? (
                    <div className="px-4 py-1 rounded-full bg-[#1a1a24] border border-[#00ff88]/30 text-[#00ff88] font-rajdhani font-semibold text-lg flex items-center gap-2 shadow-[0_0_10px_rgba(0,255,136,0.1)] hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all">
                        <Activity className="w-4 h-4" />
                        {venue.name.toUpperCase()}
                    </div>
                ) : (
                    <div className="text-gray-500 font-rajdhani tracking-widest text-sm uppercase">No Venue Selected</div>
                )}
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-rajdhani uppercase text-gray-400">Sys Status</span>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]' : 'bg-[#ff3355] shadow-[0_0_8px_#ff3355]'}`} />
                </div>
                
                <div className="relative cursor-pointer group" role="button" aria-label={`Notifications, ${alerts.length} active alerts`}>
                    <Bell className="w-6 h-6 text-gray-300 group-hover:text-[#00d4ff] transition-colors" aria-hidden="true" />
                    {alerts.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3355] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_#ff3355]">
                            {alerts.length > 99 ? '99+' : alerts.length}
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-white/10 mx-2" />

                {currentUser ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{currentUser.role}</span>
                            <span className="text-xs font-rajdhani font-bold text-white uppercase">{currentUser.email.split('@')[0]}</span>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-8 h-8 rounded bg-[#ff3355]/10 flex items-center justify-center text-[#ff3355] hover:bg-[#ff3355] hover:text-white transition-all border border-[#ff3355]/30 group"
                            aria-label="Logout"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#0a0a0f] transition-all font-rajdhani text-sm font-bold uppercase tracking-widest"
                        aria-label="Staff Login"
                    >
                        <User className="w-4 h-4" aria-hidden="true" />
                        Staff Login
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
