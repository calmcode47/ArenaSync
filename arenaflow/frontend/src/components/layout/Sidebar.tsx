import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Clock, Bell, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
    const [isHovered, setIsHovered] = useState(false);

    const routes = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/map', label: 'Live Map', icon: Map },
        { path: '/queue', label: 'Queue Intelligence', icon: Clock },
        { path: '/alerts', label: 'Alerts Center', icon: Bell },
        { path: '/about', label: 'About', icon: Info },
    ];

    return (
        <motion.aside
            className="h-full bg-[#0a0a0f] border-r border-[#1a1a24] flex flex-col items-center py-6 z-40 relative group"
            initial={{ width: 72 }}
            animate={{ width: isHovered ? 220 : 72 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            transition={{ duration: 0.3, ease: 'circOut' }}
            style={{ overflow: 'hidden' }}
        >
            <div className="flex flex-col gap-4 mt-6 w-full px-3">
                {routes.map((route) => (
                    <NavLink
                        key={route.path}
                        to={route.path}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-3 py-3 rounded-lg transition-all relative ${
                                isActive 
                                    ? 'bg-[#1a1a24] text-[#00d4ff] shadow-[inset_2px_0_0_#00d4ff]' 
                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a24]/50'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <route.icon className={`w-6 h-6 shrink-0 ${isActive ? 'drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]' : ''}`} />
                                <AnimatePresence>
                                    {isHovered && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="whitespace-nowrap font-rajdhani font-semibold tracking-wide text-lg"
                                        >
                                            {route.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
            
            <div className="mt-auto w-full px-3">
                <div className={`p-3 rounded-lg border border-gray-800 bg-[#1a1a24]/50 flex items-center justify-center cursor-pointer hover:border-[#00d4ff]/50 transition-colors ${isHovered ? 'w-full' : 'w-12 h-12'}`}>
                    <span className="font-rajdhani font-bold text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {isHovered ? 'Select Target' : 'SEL'}
                    </span>
                </div>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
