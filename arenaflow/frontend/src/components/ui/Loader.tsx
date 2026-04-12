import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Loader() {
    const [titleText, setTitleText] = useState('');
    const fullTitle = "ARENAFLOW";
    const [dots, setDots] = useState(1);
    const [statusIndex, setStatusIndex] = useState(0);

    const statuses = [
        "INITIALIZING SYSTEMS",
        "CONNECTING TO VENUE",
        "LOADING CROWD DATA",
        "CALIBRATING ML ENGINE",
        "READY"
    ];

    useEffect(() => {
        let i = 0;
        const typeTimer = setInterval(() => {
            setTitleText(fullTitle.substring(0, i + 1));
            i++;
            if(i >= fullTitle.length) clearInterval(typeTimer);
        }, 80);

        const dotTimer = setInterval(() => {
            setDots(d => (d % 3) + 1);
        }, 500);

        const statusTimer = setInterval(() => {
            setStatusIndex(prev => Math.min(prev + 1, statuses.length - 1));
        }, 600);

        return () => {
            clearInterval(typeTimer);
            clearInterval(dotTimer);
            clearInterval(statusTimer);
        };
    }, []);

    return (
        <motion.div 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] bg-[#0a0a0f] flex flex-col items-center justify-center overflow-hidden"
        >
            {/* SVG STADIUM ANIMATION */}
            <div className="relative w-[300px] h-[300px] mb-8">
                
                {/* 4 Corner Bracket HUD Elements */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00d4ff] opacity-0 animate-[fadeDelay_1.5s_forwards]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00d4ff] opacity-0 animate-[fadeDelay_1.6s_forwards]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00d4ff] opacity-0 animate-[fadeDelay_1.7s_forwards]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00d4ff] opacity-0 animate-[fadeDelay_1.8s_forwards]" />

                <svg viewBox="0 0 400 400" className="w-full h-full">
                    <defs>
                        <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d4ff" stopOpacity="1" />
                            <stop offset="100%" stopColor="#0055ff" stopOpacity="0.5" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Outer Oval Ring */}
                    <ellipse 
                        cx="200" cy="230" rx="150" ry="70" 
                        fill="none" stroke="url(#neonGlow)" strokeWidth="3" filter="url(#glow)"
                        strokeDasharray="1000" strokeDashoffset="1000"
                        className="animate-[drawLoop_1.2s_ease-in-out_forwards]"
                    />

                    {/* Inner Pitch Oval */}
                    <ellipse 
                        cx="200" cy="230" rx="60" ry="25" 
                        fill="none" stroke="#00ff88" strokeWidth="2" filter="url(#glow)" strokeOpacity="0.4"
                        strokeDasharray="500" strokeDashoffset="500"
                        className="animate-[drawLoop_1s_ease-in-out_0.5s_forwards]"
                    />

                    {/* Vertical Rib lines */}
                    {[0,1,2,3,4,5,6,7].map(i => {
                        const angle = (i / 8) * Math.PI * 2;
                        const bx = 200 + Math.cos(angle) * 150;
                        const by = 230 + Math.sin(angle) * 70;
                        const tx = 200 + Math.cos(angle) * 130;
                        const ty = 140 + Math.sin(angle) * 40;
                        return (
                            <path 
                                key={i} d={`M${bx},${by} L${tx},${ty}`} 
                                stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="200" strokeDashoffset="200"
                                className="animate-[drawLoop_0.5s_ease-out_forwards]"
                                style={{ animationDelay: `${0.8 + i * 0.05}s` }}
                            />
                        );
                    })}

                    {/* Roof Arc Connectors */}
                    <ellipse 
                        cx="200" cy="140" rx="130" ry="40" 
                        fill="none" stroke="#00d4ff" strokeWidth="2" filter="url(#glow)" strokeOpacity="0.6"
                        strokeDasharray="1000" strokeDashoffset="1000"
                        className="animate-[drawLoop_0.8s_ease-in-out_1.2s_forwards]"
                    />
                    
                    {/* Scanner Line */}
                    <line 
                        x1="50" y1="200" x2="350" y2="200" 
                        stroke="#00ff88" strokeWidth="1" filter="url(#glow)" opacity="0"
                        className="animate-[scanSweep_2s_ease-in-out_2s_infinite]"
                    />
                </svg>
            </div>

            {/* TYPOGRAPHY */}
            <div className="flex flex-col items-center">
                 <h1 className="font-rajdhani font-bold text-4xl tracking-[0.2em] text-white">
                      {titleText}<span className="inline-block w-1.5 h-[28px] bg-[#00d4ff] ml-3 align-middle animate-[blink_1s_step-end_infinite]" />
                 </h1>
                 
                 <div className="mt-6 text-xs font-sans tracking-[0.2em] text-[#00d4ff]/70 h-4 uppercase">
                      {statuses[statusIndex]}
                      <span className="inline-block w-4 text-left ml-1">
                          {'.'.repeat(dots)}
                      </span>
                 </div>
            </div>

            {/* Global Loader CSS */}
            <style>{`
                 @keyframes drawLoop {
                     to { stroke-dashoffset: 0; }
                 }
                 @keyframes fadeDelay {
                     to { opacity: 1; }
                 }
                 @keyframes blink {
                     0%, 100% { opacity: 1; }
                     50% { opacity: 0; }
                 }
                 @keyframes scanSweep {
                     0% { transform: translateY(-80px); opacity: 0; }
                     10% { opacity: 0.8; }
                     90% { opacity: 0.8; }
                     100% { transform: translateY(80px); opacity: 0; }
                 }
            `}</style>
        </motion.div>
    );
}
