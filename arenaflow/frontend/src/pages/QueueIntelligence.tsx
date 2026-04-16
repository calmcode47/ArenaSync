import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity, Brain, Clock, Shield, DoorOpen, Coffee, ChevronDown, List, Car } from 'lucide-react';

import { useVenueStore } from '../store/venueStore';
import { useQueue } from '../hooks/useQueue';
import ZoneBadge from '../components/ui/ZoneBadge';

// --- DATA TYPES ---
interface ForecastPoint {
    timestamp: string;
    wait_time_minutes: number;
    yhat_lower: number;
    yhat_upper: number;
}
interface QueuePredictionOut {
    zone_id: string;
    zone_name: string;
    zone_type?: string;
    current_queue_length: number;
    estimated_wait_minutes: number;
    confidence_score: number;
    next_30min_forecast: ForecastPoint[];
    congestion_level: 'low' | 'moderate' | 'high' | 'critical';
}

// ------------------------------------------------------------------
// 3D SCENE: QUEUE BAR CHART
// ------------------------------------------------------------------

function BarNode({ zone, index, total, maxWait }: { zone: QueuePredictionOut, index: number, total: number, maxWait: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    
    // Spacing logic: centered at X=0, distance 1.4
    const spacing = 1.4;
    const startX = -(total * spacing) / 2 + (spacing / 2);
    const px = startX + index * spacing;
    
    const targetHeight = Math.max(0.1, (zone.estimated_wait_minutes / maxWait) * 6);
    
    // Config properties based on estimated wait
    const cObj = useMemo(() => {
        const w = zone.estimated_wait_minutes;
        if(w < 5) return { c: '#00ff88', h: false };
        if(w < 15) return { c: '#ffd60a', h: false };
        if(w < 30) return { c: '#ff6b35', h: false };
        return { c: '#ff3355', h: true }; // High wait critical red
    }, [zone.estimated_wait_minutes]);

    // Animate height and scale
    useFrame((state) => {
        if (!meshRef.current) return;
        // height lerp
        const currentScaleY = meshRef.current.scale.y;
        meshRef.current.scale.y += (targetHeight - currentScaleY) * 0.1;
        // Adjust position y so it builds upwards from the floor (scale y scales from center)
        meshRef.current.position.y = meshRef.current.scale.y / 2;

        // Hover scale lerp
        const targetXZ = hovered ? 1.15 : 1.0;
        meshRef.current.scale.x += (targetXZ - meshRef.current.scale.x) * 0.2;
        meshRef.current.scale.z += (targetXZ - meshRef.current.scale.z) * 0.2;
    });

    return (
        <group position={[px, 0, 0]}>
            <mesh 
                ref={meshRef} 
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
            >
                <boxGeometry args={[0.8, 1, 0.8]} />
                <meshStandardMaterial 
                    color={cObj.c} 
                    emissive={cObj.h ? new THREE.Color('#ff0000') : new THREE.Color('#000000')} 
                    emissiveIntensity={cObj.h ? 0.3 : 0} 
                    roughness={0.2} metalness={0.8} 
                />
            </mesh>

            {/* Wait time float label top */}
            <Text 
                position={[0, targetHeight + 0.4, 0]} 
                fontSize={0.3} color={cObj.c} 
                anchorX="center" anchorY="bottom"
            >
                ~{Math.round(zone.estimated_wait_minutes)}m
            </Text>

            {/* Zone Name Label Bottom */}
            <Text 
                position={[0, -0.2, 0]} 
                fontSize={0.25} color="#8888aa" 
                anchorX="center" anchorY="top" rotation={[-Math.PI/6, 0, 0]}
            >
                {zone.zone_name.length > 8 ? zone.zone_name.substring(0,8) + '.' : zone.zone_name}
            </Text>

            {/* Hover Tooltip Overlay */}
            {hovered && (
                <Html position={[0, targetHeight / 2, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                     <div className="bg-[#1a1a24] border border-white/20 rounded shadow-2xl p-3 min-w-[150px] font-sans">
                         <div className="text-[10px] text-[#00d4ff] uppercase tracking-widest font-bold mb-1">Queue Telemetry</div>
                         <div className="text-white font-rajdhani font-bold text-lg uppercase leading-tight mb-2">{zone.zone_name}</div>
                         <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
                             <span>Q-LENGTH:</span>
                             <span className="text-white font-bold">{zone.current_queue_length}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs text-gray-400 font-mono mt-1">
                             <span>WAIT EST:</span>
                             <span style={{ color: cObj.c }} className="font-bold">{zone.estimated_wait_minutes}m</span>
                         </div>
                     </div>
                </Html>
            )}
        </group>
    );
}

function GridAxis({ zonesCount, maxWait }: { zonesCount: number, maxWait: number }) {
    const spacing = 1.4;
    const leftEdge = -(zonesCount * spacing) / 2 - 1.5;

    // Line drawing [leftEdge, 0, 0] to [leftEdge, 6, 0]
    const points = useMemo(() => [new THREE.Vector3(leftEdge, 0, 0), new THREE.Vector3(leftEdge, 6, 0)], [leftEdge]);
    const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
    
    const ticks = [0, 5, 10, 15, 20, 30];

    return (
        <group>
            {/* Grid Floor */}
            <gridHelper args={[20, 20, 0x1a1a24, 0x1a1a24]} position={[0, -0.01, 0]} />
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.02, 0]}>
                <planeGeometry args={[20, 12]} />
                <meshStandardMaterial color="#0d0d14" roughness={1} />
            </mesh>

            {/* Vertical Y Axis */}
            <primitive object={new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#444466" }))} />
            
            {/* Ticks mapping Wait Time to 6 unit max height */}
            {ticks.map(tick => {
                const percentage = tick / maxWait;
                if(percentage > 1.2) return null; // cap drawing out of bounds
                const yPos = percentage * 6;
                return (
                    <group key={`tick-${tick}`} position={[leftEdge, yPos, 0]}>
                         <primitive object={new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(0.2, 0, 0)]), new THREE.LineBasicMaterial({ color: "#444466" }))} />
                         <Text position={[-0.4, 0, 0]} fontSize={0.25} color="#444466" anchorX="right" anchorY="middle">
                             {tick}m{tick===30?'+':''}
                         </Text>
                    </group>
                );
            })}
        </group>
    );
}

function QueueBarChart3D({ zones }: { zones: QueuePredictionOut[] }) {
    // Dynamic max wait calculation mapping relative heights
    const maxWait = useMemo(() => {
        const h = zones.reduce((m, z) => Math.max(m, z.estimated_wait_minutes), 0);
        return Math.max(h, 30); // Default minimum scale axis of 30 if data is low
    }, [zones]);
    
    // Sort logic identical to standard lists for sequential matching
    const sorted = [...zones].sort((a,b) => b.estimated_wait_minutes - a.estimated_wait_minutes).slice(0, 10); // cap max 10 to fit screen logically

    return (
        <group>
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 10, 5]} intensity={1.0} />
            
            <GridAxis zonesCount={sorted.length} maxWait={maxWait} />
            
            {sorted.map((zone, i) => (
                <BarNode key={zone.zone_id} zone={zone} index={i} total={sorted.length} maxWait={maxWait} />
            ))}

        </group>
    );
}

// ------------------------------------------------------------------
// 2D UI: SECTOR INTELLIGENCE GRID
// ------------------------------------------------------------------

function ZoneQueueCard({ zone }: { zone: QueuePredictionOut }) {
    const cObj = useMemo(() => {
        const w = zone.estimated_wait_minutes;
        if(w < 5) return '#00ff88';
        if(w < 15) return '#ffd60a';
        if(w < 30) return '#ff6b35';
        return '#ff3355';
    }, [zone.estimated_wait_minutes]);

    // Format ML Forecast dataset
    const charData = useMemo(() => {
        return (zone.next_30min_forecast || []).map(f => {
            const date = new Date(f.timestamp);
            return {
                time: `+${Math.round((date.getTime() - new Date().getTime()) / 60000)}m`,
                wait: Math.round(f.wait_time_minutes * 10) / 10,
                range: [Math.max(0, f.yhat_lower), f.yhat_upper]
            };
        });
    }, [zone.next_30min_forecast]);

    const getSectorIcon = (type?: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('gate') || t.includes('door')) return <DoorOpen className="w-[18px] h-[18px]" />;
        if (t.includes('park')) return <Car className="w-[18px] h-[18px]" />;
        if (t.includes('food') || t.includes('concession')) return <Coffee className="w-[18px] h-[18px]" />;
        return <Activity className="w-[18px] h-[18px]" />;
    };

    const isCritical = zone.estimated_wait_minutes >= 30;

    return (
        <motion.div 
            whileHover={{ scale: 1.01, boxShadow: `0 0 15px ${cObj}20` }}
            className={`bg-[#1a1a24] p-5 rounded-lg border relative transition-all ${isCritical ? 'animate-[pulseRedBorder_2s_infinite]' : ''}`}
            style={{ borderColor: isCritical ? undefined : `${cObj}40` }}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="text-gray-500">{getSectorIcon(zone.zone_type)}</div>
                    <div>
                        <h3 className="font-rajdhani font-bold text-xl uppercase tracking-wider text-white leading-none">{zone.zone_name}</h3>
                        <div className="text-[10px] text-[#00d4ff]/60 uppercase tracking-widest mt-1">{zone.zone_type || 'SECTOR'}</div>
                    </div>
                </div>
                <div><ZoneBadge level={zone.congestion_level} /></div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                 <div>
                     <div className="text-[9px] font-sans tracking-widest text-[#00d4ff]/60 uppercase mb-1">Queue Length</div>
                     <div className="text-2xl font-rajdhani font-bold text-white leading-none">{zone.current_queue_length}</div>
                 </div>
                 <div>
                     <div className="text-[9px] font-sans tracking-widest text-[#00d4ff]/60 uppercase mb-1">Wait Time</div>
                     <div className="text-2xl font-rajdhani font-bold leading-none" style={{ color: cObj }}>{Math.round(zone.estimated_wait_minutes)}m</div>
                 </div>
                 <div>
                     <div className="text-[9px] font-sans tracking-widest text-[#00d4ff]/60 uppercase mb-1">Confidence</div>
                     <div className={`text-2xl font-rajdhani font-bold leading-none ${zone.confidence_score > 0.8 ? 'text-[#00ff88]' : zone.confidence_score > 0.6 ? 'text-[#ffd60a]' : 'text-[#ff3355]'}`}>
                         {Math.round(zone.confidence_score * 100)}%
                     </div>
                 </div>
            </div>

            <div className="h-[140px] w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={charData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                         <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} />
                         <YAxis hide domain={['auto', 'auto']} />
                         <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#111118', border: `1px solid ${cObj}40`, borderRadius: '4px', fontSize: '11px', color: '#fff' }}
                             itemStyle={{ color: cObj, fontWeight: 'bold' }}
                             labelStyle={{ color: '#aaa', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}
                         />
                         {/* Confidence Band */}
                         <Area type="monotone" dataKey="range" stroke="none" fill="#00d4ff" fillOpacity={0.12} />
                         {/* Wait Line */}
                         <Line type="monotone" dataKey="wait" stroke="#00d4ff" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                <div className="text-[9px] text-gray-500 font-mono tracking-wider">SYNCED ZERO-OFFSET</div>
                <button className="text-gray-500 hover:text-[#00d4ff] transition"><Activity className="w-3.5 h-3.5" /></button>
            </div>
        </motion.div>
    );
}


// ------------------------------------------------------------------
// PAGE COMPOSITION
// ------------------------------------------------------------------

export default function QueueIntelligence() {
    const { venueId } = useVenueStore();
    const { queueSummary: summary, isLoading, refetch } = useQueue(venueId);
    
    // Auto-polling 30s
    useEffect(() => {
        const i = setInterval(() => refetch(), 30000);
        return () => clearInterval(i);
    }, [refetch]);

    const [showAccord, setShowAccord] = useState(false);

    return (
        <div className="min-h-[100vh] bg-[#0a0a0f] text-white overflow-x-hidden font-sans pb-12">
             
             {/* Global CSS for critical border pulse keyframes */}
             <style>{`
                @keyframes pulseRedBorder {
                    0% { border-color: rgba(255, 51, 85, 0.2); box-shadow: 0 0 0 rgba(255,51,85,0); }
                    50% { border-color: rgba(255, 51, 85, 1); box-shadow: 0 0 15px rgba(255,51,85,0.3); }
                    100% { border-color: rgba(255, 51, 85, 0.2); box-shadow: 0 0 0 rgba(255,51,85,0); }
                }
             `}</style>
             
             {/* SECTION 1: 3D Visualization */}
             <section className="h-[50vh] relative border-b border-white/5 overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,_#001a2e_0%,_#0a0a0f_70%)]">
                  
                  {/* HUD Top Overlays */}
                  <div className="absolute top-6 left-6 z-10 pointer-events-none">
                      <div className="text-[10px] font-rajdhani font-bold text-[#00d4ff] tracking-[0.2em] uppercase">
                          [ Queue Depth Visualization ]
                      </div>
                  </div>
                  <div className="absolute top-6 right-6 z-10 pointer-events-none flex items-center gap-2">
                       <span className="text-[9px] font-rajdhani tracking-[0.1em] text-white/50 uppercase">Prophet Forecasting <span className="text-[#00ff88]">Active</span></span>
                       <div className="flex gap-1">
                           {[1,2,3].map(i => (
                               <div key={i} className="w-1 h-3 bg-[#00d4ff]/40 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />
                           ))}
                       </div>
                  </div>

                  {!venueId ? (
                      <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-500 font-sans tracking-widest text-xs">
                          <Brain className="w-8 h-8 mb-2 opacity-50" />
                          NO SENSOR INPUT DETECTED
                      </div>
                  ) : isLoading && (!summary || !summary.zones.length) ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border-t-2 border-[#00d4ff] animate-spin" />
                      </div>
                  ) : (
                      <Canvas camera={{ fov: 45, position: [0, 12, 20] }}>
                           <QueueBarChart3D zones={summary?.zones || []} />
                      </Canvas>
                  )}
             </section>

             {/* SECTION 2: Sector Queue Cards */}
             <section className="max-w-7xl mx-auto px-6 pt-10">
                 <div className="mb-8 border-b border-white/5 pb-4">
                     <h2 className="text-3xl font-rajdhani font-bold uppercase tracking-wider text-white">Sector Queue Intelligence</h2>
                     <div className="text-[10px] font-sans tracking-[0.2em] text-[#00d4ff] uppercase mt-1">30-Minute Prophet Forecast</div>
                 </div>

                 {(!summary || !summary.zones.length) && !isLoading && venueId && (
                      <div className="border border-white/5 bg-[#111118] py-20 rounded flex flex-col items-center justify-center text-gray-500">
                          <List className="w-10 h-10 mb-3 opacity-30" />
                          <div className="text-xs uppercase tracking-widest">No Active Queues Tracked in Sector</div>
                      </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {summary?.zones.map(z => (
                         <ZoneQueueCard key={z.zone_id} zone={z as QueuePredictionOut} />
                     ))}
                     
                     {/* Loaders */}
                     {isLoading && (!summary?.zones || summary.zones.length === 0) && venueId && [1,2,3,4].map(idx => (
                         <div key={`loader-${idx}`} className="bg-[#1a1a24] border border-white/5 min-h-[280px] rounded-lg animate-pulse p-5">
                             <div className="flex gap-3 mb-6">
                                 <div className="w-8 h-8 bg-white/10 rounded" />
                                 <div className="w-1/2 h-6 bg-white/10 rounded" />
                             </div>
                             <div className="grid grid-cols-3 gap-4 mb-6">
                                  <div className="h-10 bg-white/10 rounded" />
                                  <div className="h-10 bg-white/10 rounded" />
                                  <div className="h-10 bg-white/10 rounded" />
                             </div>
                             <div className="h-[100px] w-full bg-white/5 rounded" />
                         </div>
                     ))}
                 </div>

                 {/* ML Accordion Footer */}
                 <div className="mt-12 max-w-2xl">
                     <button onClick={() => setShowAccord(!showAccord)} className="flex items-center gap-2 text-[10px] font-rajdhani font-bold tracking-[0.2em] text-white/50 uppercase hover:text-[#00d4ff] transition w-full text-left">
                         <ChevronDown className={`w-3 h-3 transition-transform ${showAccord ? 'rotate-180' : ''}`} />
                         How Predictions Work
                     </button>
                     <AnimatePresence>
                         {showAccord && (
                             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                 <div className="text-xs text-gray-400 font-sans leading-relaxed pt-3 border-l-2 border-[#00d4ff]/30 pl-3 mt-3">
                                     ArenaFlow integrates Facebook Open Source Prophet to execute scalable time-series forecasting against massive historical queue telemetry sets. 
                                     The ML core detects non-linear structural traffic trends dynamically, projecting robust wait-time boundaries and upper/lower confidence band distributions in real-time.
                                 </div>
                             </motion.div>
                         )}
                     </AnimatePresence>
                 </div>
             </section>

        </div>
    );
}
