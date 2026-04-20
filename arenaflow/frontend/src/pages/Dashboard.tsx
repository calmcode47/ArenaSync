import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { Brain, Activity, Target, ChevronDown, Car, Coffee, DoorOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

import { useVenueStore } from '../store/venueStore';
import { useCrowd } from '../hooks/useCrowd';
import { useQueue } from '../hooks/useQueue';
import { useAlerts } from '../hooks/useAlerts';
import { useWebSocket } from '../hooks/useWebSocket';

import VenueScene from '../components/three/VenueScene';
import ZoneBadge from '../components/ui/ZoneBadge';
import GeminiInsights from '../components/dashboard/GeminiInsights';

/** HUD Stat Animation Guard */
const AnimatedNumber = ({ value }: { value: number }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let start = 0;
        const duration = 1500; // 1.5s
        const steps = 60;
        const stepTime = Math.abs(Math.floor(duration / steps));
        const increment = value / steps;
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
                setDisplay(value);
                clearInterval(timer);
            } else {
                setDisplay(Math.floor(start));
            }
        }, stepTime);
        return () => clearInterval(timer);
    }, [value]);
    return <span>{display.toLocaleString()}</span>;
};


/** Mini SVG Sparkline Component */
const MiniSparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length < 2) return <div className="h-6 w-16 opacity-30 border-b border-dashed border-white/20"></div>;
    const max = Math.max(...data, 1);
    const min = 0;
    const w = 64;
    const h = 24;
    
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d - min) / (max - min)) * h;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={w} height={h} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

export default function Dashboard() {
    const { venueId, setVenueId } = useVenueStore();
    const [venueInput, setVenueInput] = useState('');
    
    // Core Data Hooks
    const { summary: crowdSummary, isLoading: crowdLoading } = useCrowd(venueId);
    const { summary: queueSummary } = useQueue(venueId);
    const { isConnected } = useWebSocket(venueId);

    // Track zone history arrays for sparkline updates
    const sparklineData = useRef<Record<string, number[]>>({});
    
    useEffect(() => {
        if (!crowdSummary?.zones) return;
        crowdSummary.zones.forEach(z => {
            if (!sparklineData.current[z.zone_id]) sparklineData.current[z.zone_id] = [];
            sparklineData.current[z.zone_id].push(z.current_count);
            // keep last 8 memory
            if (sparklineData.current[z.zone_id].length > 8) {
                sparklineData.current[z.zone_id].shift();
            }
        });
    }, [crowdSummary]);

    // Graph Timeline State (2 Hours mapped from largest zone)
    const primaryZoneId = useMemo(() => {
        if (!crowdSummary?.zones?.length) return null;
        return crowdSummary.zones.sort((a,b) => b.current_count - a.current_count)[0].zone_id;
    }, [crowdSummary]);

    const { data: chartHistory } = useQuery({
        queryKey: ['zone_history', primaryZoneId],
        queryFn: async () => {
            if (!primaryZoneId) return [];
            const r = await api.get(`/crowd/zone/${primaryZoneId}/history?hours=2`);
            return r.data;
        },
        enabled: !!primaryZoneId,
        refetchInterval: 60000
    });

    const chartDataFormatted = useMemo(() => {
        if (!chartHistory || !Array.isArray(chartHistory)) return [];
        return chartHistory.map((h: any) => ({
            time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            occupancy: (h.current_count / Math.max(h.capacity, 1)) * 100
        })).slice(-30); // 30 ticks
    }, [chartHistory]);

    // Local UI State
    const [timeStr, setTimeStr] = useState('');
    useEffect(() => {
        const t = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(t);
    }, []);

    const gridRef = useRef(null);
    const gridInView = useInView(gridRef, { once: true, amount: 0.1 });

    // Handle missing Venue context overlay
    if (!venueId) {
        return (
            <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_#003a6e_0%,_#0a0a0f_70%)] opacity-30" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 p-8 bg-[#1a1a24] border border-[#00d4ff]/40 rounded-xl max-w-sm w-full shadow-[0_0_30px_rgba(0,212,255,0.15)] flex flex-col items-center placeholder-data">
                    <Target className="w-12 h-12 text-[#00d4ff] mb-4 animate-pulse" />
                    <h2 className="font-rajdhani font-bold text-2xl tracking-widest text-white mb-6 uppercase">Initialize Command</h2>
                    <input 
                        value={venueInput} onChange={e => setVenueInput(e.target.value)}
                        placeholder="Enter Venue UUID..."
                        className="w-full bg-[#0a0a0f] border border-white/20 text-white p-3 rounded font-sans text-sm text-center mb-4 focus:border-[#00d4ff] outline-none transition uppercase tracking-wider"
                    />
                    <button 
                        onClick={() => { if(venueInput.trim()) setVenueId(venueInput.trim()) }}
                        className="w-full bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 border border-[#00d4ff] text-[#00d4ff] font-rajdhani font-bold tracking-widest py-3 rounded transition uppercase"
                    >
                        Establish Uplink
                    </button>
                </motion.div>
            </div>
        );
    }

    // Computations
    const occPct = Math.round((crowdSummary?.total_current_count ?? 0) / Math.max(crowdSummary?.total_capacity ?? 1, 1) * 100);
    const occColor = occPct < 50 ? '#00ff88' : occPct < 75 ? '#ffd60a' : occPct < 90 ? '#ff6b35' : '#ff3355';
    
    const peakWait = queueSummary?.zones?.reduce((max, z) => Math.max(max, z.estimated_wait_minutes), 0) ?? 0;
    const sortedZones = [...(crowdSummary?.zones || [])].sort((a,b) => b.density_score - a.density_score);

    const getSectorIcon = (type?: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('gate') || t.includes('door')) return <DoorOpen className="w-4 h-4" />;
        if (t.includes('park')) return <Car className="w-4 h-4" />;
        if (t.includes('food') || t.includes('concession')) return <Coffee className="w-4 h-4" />;
        return <Activity className="w-4 h-4" />;
    };

    const getStatusColor = (v: string) => {
        if(v === 'critical') return '#ff3355';
        if(v === 'high') return '#ff6b35';
        if(v === 'moderate') return '#ffd60a';
        return '#00ff88';
    };

    return (
        <main className="w-full min-h-screen bg-[#0a0a0f] overflow-x-hidden selection:bg-[#00d4ff]/30 text-white font-sans relative">
            
            {/* Global CSS Noise Overlay */}
            <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]">
                 <svg width="100%" height="100%"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)"/></svg>
            </div>

            {/* SECTION 1: HERO / 3D COMMAND MAP */}
            <section className="relative h-[100vh] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,_#001a2e_0%,_#0a0a0f_60%)]" aria-label="Venue 3D Command Map">
                {/* 3D Scene */}
                <div className="absolute inset-0">
                    <VenueScene zones={crowdSummary?.zones ?? []} totalCount={crowdSummary?.total_current_count ?? 0} capacity={crowdSummary?.total_capacity ?? 1} />
                </div>

                {/* HUD: Top Left - System Panel */}
                <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="absolute top-[90px] left-6 border-l-2 border-[#00d4ff] pl-3 pointer-events-none">
                    <div className="text-[11px] font-rajdhani font-bold tracking-widest text-[#00d4ff] mb-1">[ ARENAFLOW COMMAND ]</div>
                    <div className="w-32 h-px bg-[#00d4ff]/30 mb-2" />
                    
                    <div className="text-[10px] font-sans tracking-wider text-gray-300 flex items-center gap-2 mb-1">
                        STATE <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" /> OPERATIONAL
                    </div>
                    <div className="text-[10px] font-sans tracking-wider text-gray-300 flex items-center gap-2 mb-1 uppercase">
                        SYNC <span className="font-mono text-gray-400">{timeStr || '...'}</span>
                    </div>
                    <div className="text-[10px] font-sans tracking-wider text-gray-300 flex items-center gap-2 mb-1">
                        LINK <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00ff88]' : 'bg-[#ff3355]'}`} /> {isConnected ? 'SECURE' : 'DROPPED'}
                    </div>
                    <div className="text-[10px] font-sans tracking-wider text-gray-300 flex items-center gap-2">
                        NODES <span className="text-[#00d4ff] font-bold">{crowdSummary?.zones?.length ?? 0} ACTIVE</span>
                    </div>
                </motion.div>

                {/* HUD: Top Right - Stat Cluster */}
                <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.0 }} className="absolute top-[90px] right-6 grid grid-cols-2 gap-3 pointer-events-none">
                    <div className="border border-white/10 bg-black/40 backdrop-blur-sm p-3 relative before:absolute before:top-0 before:left-0 before:w-2 before:h-2 before:border-l border-t before:border-[#00d4ff]/50 after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:border-r border-b after:border-[#00d4ff]/50 min-w-[140px]">
                        <div className="text-[9px] font-rajdhani tracking-widest text-[#00d4ff]/60 uppercase mb-1">Total Attendance</div>
                        <div className="text-3xl font-rajdhani font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            <AnimatedNumber value={crowdSummary?.total_current_count ?? 0} />
                        </div>
                    </div>
                    <div className="border border-white/10 bg-black/40 backdrop-blur-sm p-3 relative before:absolute before:top-0 before:left-0 before:w-2 before:h-2 before:border-l border-t before:border-[#00d4ff]/50 after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:border-r border-b after:border-[#00d4ff]/50 min-w-[140px]">
                        <div className="text-[9px] font-rajdhani tracking-widest text-[#00d4ff]/60 uppercase mb-1">Max Capacity</div>
                        <div className="text-3xl font-rajdhani font-bold text-gray-300">
                            <AnimatedNumber value={crowdSummary?.total_capacity ?? 0} />
                        </div>
                    </div>
                    <div style={{ borderColor: occColor, boxShadow: occPct > 75 ? `0 0 15px ${occColor}40` : 'none' }} className={`border bg-black/40 backdrop-blur-sm p-3 relative transition-all duration-1000 ${occPct > 90 ? 'animate-pulse' : ''} min-w-[140px]`}>
                        <div className="text-[9px] font-rajdhani tracking-widest text-white/50 uppercase mb-1">Occupancy Load</div>
                        <div className="text-3xl font-rajdhani font-bold" style={{ color: occColor }}>
                            {occPct}%
                        </div>
                    </div>
                    <div className="border border-white/10 bg-black/40 backdrop-blur-sm p-3 relative min-w-[140px]">
                        <div className="text-[9px] font-rajdhani tracking-widest text-[#00d4ff]/60 uppercase mb-1">Critical Zones</div>
                        <div className="text-3xl font-rajdhani font-bold text-[#ff3355] drop-shadow-[0_0_8px_rgba(255,51,85,0.4)]">
                            {crowdSummary?.zones.filter(z => z.congestion_level === 'critical').length ?? 0}
                        </div>
                    </div>
                </motion.div>

                {/* HUD: Bottom Center - Ticker */}
                <div className="absolute bottom-[32px] left-1/2 -translate-x-1/2 w-full max-w-2xl overflow-hidden border-y border-white/5 bg-black/40 backdrop-blur pointer-events-none py-1">
                    <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] px-4">
                        {(crowdSummary?.zones || []).concat(crowdSummary?.zones || []).map((z, i) => (
                            <div key={`${z.zone_id}-${i}`} className="inline-flex items-center text-[10px] font-rajdhani font-bold tracking-widest uppercase mx-4">
                                <span className="text-gray-300">{z.zone_name}</span>
                                <span className="mx-2 text-gray-600">·</span>
                                <span style={{ color: getStatusColor(z.congestion_level) }}>{z.congestion_level}</span>
                                <span className="mx-6 text-[#00d4ff]/40">//</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HUD: Bottom Left - Engine Info */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-[32px] left-6 pointer-events-none">
                    <div className="flex items-center gap-2 mb-1">
                        <Brain className="w-4 h-4 text-[#00d4ff]" />
                        <span className="text-[9px] font-rajdhani tracking-widest text-white/70 uppercase">Prophet ML Core <span className="text-[#00ff88]">ACTIVATED</span></span>
                    </div>
                    <div className="flex gap-1 ml-6 mb-1">
                        {[1,2,3,4].map(idx => (
                            <div key={idx} className="w-1.5 h-1.5 border border-[#00d4ff]/30 animate-pulse" style={{ animationDelay: `${idx * 0.2}s`, backgroundColor: '#00d4ff20' }} />
                        ))}
                    </div>
                    <div className="ml-6 text-[8px] font-mono text-gray-500 uppercase tracking-wider">Scikit Flow Matrix // 97.4% CONF</div>
                </motion.div>

                {/* HUD: Center Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                    <div className="relative w-[120px] h-[120px] animate-[spin_8s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-[#00d4ff]" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-6 bg-[#00d4ff]" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-px bg-[#00d4ff]" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-px bg-[#00d4ff]" />
                    </div>
                </div>

                {/* Scroll Indicator */}
                <motion.div 
                    animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-50"
                >
                    <ChevronDown className="w-6 h-6 text-[#00d4ff]" />
                </motion.div>
            </section>

            {/* SECTION 2: ZONE COMMAND GRID */}
            <section className="min-h-screen border-t border-white/5 bg-[repeating-linear-gradient(0deg,_#0a0a0f,_#0a0a0f_3px,_rgba(0,212,255,0.02)_4px)] relative p-8" aria-label="Sector Status Matrix">
                <div className="max-w-7xl mx-auto" ref={gridRef}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 overflow-hidden">
                        <div>
                            <div className="text-[10px] font-rajdhani font-bold text-[#00d4ff] tracking-[0.3em] uppercase mb-1">
                                [ Zone Telemetry Focus ]
                            </div>
                            <h2 className="text-4xl md:text-5xl font-rajdhani font-bold uppercase tracking-wide text-white drop-shadow-lg shadow-black">
                                Sector Status Matrix
                            </h2>
                            <motion.div 
                                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                                animate={gridInView ? { clipPath: 'inset(0 0% 0 0)' } : {}}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-0.5 w-64 bg-gradient-to-r from-[#00d4ff] to-transparent mt-3"
                            />
                        </div>
                        <div className="mt-4 md:mt-0 px-3 py-1 border border-white/10 bg-black/50 rounded text-[10px] font-sans text-gray-400 uppercase tracking-widest">
                            {crowdSummary?.zones?.length ?? 0} Active Sectors Mapped
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {sortedZones.map((zone, i) => {
                            const pColor = getStatusColor(zone.congestion_level);
                            const fillPct = Math.min((zone.current_count / Math.max(zone.capacity, 1)) * 100, 100);
                            const trendData = sparklineData.current[zone.zone_id] || [zone.current_count, zone.current_count];

                            return (
                                <motion.div 
                                    key={zone.zone_id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={gridInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, delay: i * 0.08 }}
                                    whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${pColor}20` }}
                                    className="bg-[#1a1a24] border relative p-4 rounded-lg flex flex-col justify-between h-48 cursor-default group"
                                    style={{ borderColor: `${pColor}40` }}
                                    aria-label={`Zone ${zone.zone_name}, ${zone.congestion_level} congestion, ${zone.current_count} of ${zone.capacity} capacity`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-rajdhani font-bold text-lg text-white uppercase tracking-wider leading-tight">{zone.zone_name}</h3>
                                            <div className="text-[10px] text-[#00d4ff]/60 uppercase tracking-widest mt-0.5">
                                                {zone.zone_type || 'STANDARD SECTOR'}
                                            </div>
                                        </div>
                                        <div className="text-gray-500 opacity-50 group-hover:text-[#00d4ff] group-hover:opacity-100 transition-colors">
                                            {getSectorIcon(zone.zone_type)}
                                        </div>
                                    </div>

                                    <div className="my-auto">
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-rajdhani font-bold text-3xl text-white drop-shadow flex-1">
                                                {zone.current_count.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-500 font-sans tracking-wide">
                                                / {zone.capacity.toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-2 relative">
                                            <div className="flex justify-between text-[8px] font-sans text-gray-400 font-bold tracking-widest uppercase mb-1">
                                                <span>Structural Mass</span>
                                                <span style={{ color: pColor }}>{fillPct.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-[#2a2a38] rounded-full overflow-hidden absolute">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={gridInView ? { width: `${fillPct}%` } : {}}
                                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 + (i * 0.05) }}
                                                    className="h-full"
                                                    style={{ backgroundColor: pColor }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-6">
                                        <div className="pointer-events-none transform translate-y-1">
                                            <ZoneBadge level={zone.congestion_level} />
                                        </div>
                                        <div className="opacity-60 mix-blend-screen overflow-hidden rounded bg-black/20 p-1">
                                            <MiniSparkline data={trendData} color={pColor} />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {crowdLoading && [1,2,3,4].map(idx => (
                            <div key={idx} className="bg-[#1a1a24] border border-white/5 h-48 rounded-lg animate-pulse p-4 flex flex-col justify-between">
                                <div className="w-2/3 h-5 bg-white/10 rounded" />
                                <div className="w-1/2 h-8 bg-white/10 rounded" />
                                <div className="w-full h-1 bg-white/10 rounded" />
                                <div className="w-1/3 h-4 bg-white/10 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 3: INTELLIGENCE PANEL */}
            <section className="bg-black border-t border-white/10 relative p-8" aria-label="Venue Intelligence Metrics">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                    
                    {/* LEFT: Chart */}
                    <div className="flex-[0.6] bg-[#0a0a0f] border border-white/5 rounded-xl p-5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
                            <Activity className="w-4 h-4 text-[#00d4ff]" />
                            <h3 className="font-rajdhani font-bold text-lg text-white tracking-widest uppercase">Global Mass Timeline</h3>
                            <span className="ml-auto text-[10px] text-gray-500 font-sans tracking-widest uppercase border border-white/10 px-2 py-0.5 rounded">T-120 MINS</span>
                        </div>
                        
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartDataFormatted} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="time" 
                                        axisLine={false} tickLine={false} 
                                        tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'DM Sans' }} 
                                        interval="preserveStartEnd" minTickGap={30}
                                    />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#00d4ff', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="occupancy" stroke="#00d4ff" strokeWidth={2} fillOpacity={1} fill="url(#colorOcc)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex justify-between mt-4 border-t border-white/5 pt-4">
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Peak Today</div>
                                <div className="text-xl font-rajdhani font-bold text-white">94%</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-[#00d4ff] uppercase tracking-widest mb-1">Current Matrix</div>
                                <div className="text-xl font-rajdhani font-bold text-white">{occPct}%</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-[#ff6b35] uppercase tracking-widest mb-1">Prophet Max (30M)</div>
                                <div className="text-xl font-rajdhani font-bold text-[#ff6b35]">+{(peakWait / 10).toFixed(1)}% Surge</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Gemini Advisor */}
                    <div className="flex-[0.4] min-w-[340px]">
                        <GeminiInsights venueId={venueId} />
                    </div>
                </div>
            </section>
        </main>
    );
}

// Ensure keyframes are available directly in CSS file or injected globally via tailwind
const styleElement = document.createElement('style');
styleElement.innerHTML = `
@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
`;
document.head.appendChild(styleElement);
