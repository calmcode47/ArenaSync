import React from 'react';
import { Bell, Activity } from 'lucide-react';
import { useVenueStore } from '../../store/venueStore';
import { useAlertStore } from '../../store/alertStore';
import { useWebSocket } from '../../hooks/useWebSocket';

const Navbar = () => {
    const { venue, venueId } = useVenueStore();
    const alerts = useAlertStore((state) => state.alerts);
    const { isConnected } = useWebSocket(venueId);

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
                
                <div className="relative cursor-pointer group">
                    <Bell className="w-6 h-6 text-gray-300 group-hover:text-[#00d4ff] transition-colors" />
                    {alerts.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3355] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_#ff3355]">
                            {alerts.length > 99 ? '99+' : alerts.length}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
