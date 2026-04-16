import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { 
    Users, Clock, AlertTriangle, CloudRain, Info, UserPlus, Bell, Globe, 
    ShieldAlert, Check, Lock
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useAlerts } from '../hooks/useAlerts';
import { useAlertStore } from '../store/alertStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useVenueStore } from '../store/venueStore';
import { useCrowd } from '../hooks/useCrowd';
import { createAlert } from '../api/alerts';

type AlertType = 'overcrowding' | 'long_queue' | 'emergency' | 'weather' | 'info' | 'staff_needed';
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_COLOR: Record<string, string> = {
    critical: '#ff3355',
    high: '#ff6b35',
    medium: '#ffd60a',
    low: '#00ff88'
};

const SEVERITY_WEIGHT: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

// ------------------------------------------------------------------
// RADAR SWEEP COMPONENT
// ------------------------------------------------------------------
function RadarSweep({ alerts }: { alerts: any[] }) {
    const { viewport } = useThree();
    const sweepGroupRef = useRef<THREE.Group>(null);
    const blipsRef = useRef<(THREE.Mesh | null)[]>([]);
    
    const aspect = viewport.aspect;
    const unresolvedAlerts = alerts.filter(a => !a.is_resolved);

    // Build rings using EllipseCurve to get points
    const rings = useMemo(() => {
        const radii = [1, 2, 3, 4, 4.8];
        const opacities = [0.5, 0.4, 0.3, 0.2, 0.15];
        return radii.map((r, i) => {
            const curve = new THREE.EllipseCurve(0, 0, r, r * 0.65, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(64);
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            // rotate to XZ plane
            geo.rotateX(-Math.PI / 2);
            return { geo, opacity: opacities[i] };
        });
    }, []);

    // Build sweep arm + ghost lines
    const sweepLines = useMemo(() => {
        const lines: { geo: THREE.BufferGeometry, opacity: number }[] = [];
        const offsets = [0, -0.06, -0.12, -0.18, -0.24, -0.30, -0.36, -0.42];
        const opacities = [1, 0.7, 0.55, 0.42, 0.30, 0.20, 0.12, 0.06];
        
        offsets.forEach((ang, idx) => {
            const geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(4.8 * Math.cos(ang), 0, 4.8 * Math.sin(ang))
            ]);
            lines.push({ geo, opacity: opacities[idx] });
        });
        return lines;
    }, []);

    // Placed blips pre-calculation
    const blipPositions = useMemo(() => {
        return unresolvedAlerts.map((a, i) => {
            const angle = (i / unresolvedAlerts.length) * Math.PI * 2;
            const r = 1.5 + (i % 3) * 1.0;
            return { x: r * Math.cos(angle), z: r * Math.sin(angle), angle, severity: a.severity };
        });
    }, [unresolvedAlerts]);

    useFrame(() => {
        if (sweepGroupRef.current) {
            sweepGroupRef.current.rotation.y -= 0.025; // Continuous sweep
            
            // Ping blips based on sweep angle
            const currentAngle = sweepGroupRef.current.rotation.y % (Math.PI * 2);
            // Convert to positive 0-2PI representing the sweeping arm's angle
            const armAngle = (currentAngle < 0 ? currentAngle + Math.PI * 2 : currentAngle);

            blipsRef.current.forEach((blip, i) => {
                if (!blip) return;
                const pos = blipPositions[i];
                // normalize blip angle
                const bAngle = (pos.angle < 0 ? pos.angle + Math.PI * 2 : pos.angle);
                
                // Compare angles roughly, bearing in mind wrap-around
                const diff = Math.abs(armAngle - bAngle);
                const pingCondition = diff < 0.2 || diff > Math.PI * 2 - 0.2;
                
                if (pingCondition) {
                    blip.scale.lerp(new THREE.Vector3(1.8, 1.8, 1.8), 0.2);
                } else {
                    blip.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                }
            });
        }
    });

    return (
        <group>
            <OrthographicCamera makeDefault position={[0, 10, 0.001]} zoom={1} args={[-5 * aspect, 5 * aspect, 5, -5, 0.1, 100]} />
            
            {/* Background Rings */}
            {rings.map((ring, i) => (
                <lineLoop key={`ring-${i}`} geometry={ring.geo}>
                    <lineBasicMaterial color="#00d4ff" opacity={ring.opacity} transparent />
                </lineLoop>
            ))}

            {/* Sweep arm */}
            <group ref={sweepGroupRef}>
                {sweepLines.map((line, i) => (
                    <primitive key={`sweep-${i}`} object={new THREE.Line(line.geo, new THREE.LineBasicMaterial({ color: "#00d4ff", opacity: line.opacity, transparent: true }))} />
                ))}
            </group>

            {/* Blips */}
            {blipPositions.map((pos, i) => (
                <mesh key={`blip-${i}`} position={[pos.x, 0, pos.z]} ref={(el) => { blipsRef.current[i] = el; }}>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshBasicMaterial color={SEVERITY_COLOR[pos.severity] || '#fff'} />
                </mesh>
            ))}

            <EffectComposer>
                <Bloom intensity={0.9} luminanceThreshold={0.4} mipmapBlur />
            </EffectComposer>
        </group>
    );
}

// ------------------------------------------------------------------
// TIMELINE CARD COMPONENT
// ------------------------------------------------------------------
function AlertTimelineCard({ alert, resolveFn }: { alert: any, resolveFn: (id: string) => void }) {
    const [expandedTranslations, setExpandedTranslations] = useState(false);
    const [selectedLang, setSelectedLang] = useState('ES');
    const langs = ['ES', 'FR', 'DE', 'HI', 'ZH', 'PT', 'AR'];
    
    const color = SEVERITY_COLOR[alert.severity] || '#fff';
    const isResolved = alert.is_resolved;

    const translationData = alert.translated_messages ? alert.translated_messages[selectedLang] : null;

    const getIcon = () => {
        switch(alert.alert_type) {
            case 'overcrowding': return <Users size={12} />;
            case 'long_queue': return <Clock size={12} />;
            case 'emergency': return <AlertTriangle size={12} />;
            case 'weather': return <CloudRain size={12} />;
            case 'staff_needed': return <UserPlus size={12} />;
            default: return <Info size={12} />;
        }
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
            className={`flex gap-4 mb-4 ${isResolved ? 'opacity-45' : 'opacity-100'}`}
        >
            {/* Timeline Dot Layer */}
            <div className="w-[34px] shrink-0 relative flex justify-center mt-2">
                {!isResolved && alert.severity === 'critical' && (
                    <div className="absolute top-0 w-3 h-3 rounded-full animate-[ping_1.4s_ease-out_infinite]" style={{ backgroundColor: color }} />
                )}
                <div className="w-3 h-3 rounded-full z-10" style={{ backgroundColor: color }} />
            </div>

            {/* Content Card */}
            <div className="flex-1 bg-[#1a1a24] rounded-lg p-3.5 border-l-[3px] shadow-lg" style={{ borderLeftColor: color }}>
                
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] tracking-wider text-gray-500 uppercase">
                            {getIcon()} {alert.alert_type.replace('_', ' ')}
                        </div>
                        <div className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${color}22`, color: color }}>
                            {alert.severity}
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {alert.zone_id && (
                    <div className="inline-block text-[9px] text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded tracking-wider uppercase mb-2">
                        [ ZONE TARGET: {alert.zone_id.slice(0, 8)} ]
                    </div>
                )}

                <h4 className="font-rajdhani font-bold text-white text-[17px] leading-tight mb-1">{alert.title}</h4>
                <p className="font-sans text-[13px] text-[#9999bb] leading-relaxed mb-3">{alert.message}</p>

                {/* Optional Translations Accordion */}
                <div className="mb-3">
                    <button onClick={() => setExpandedTranslations(!expandedTranslations)} className="text-[11px] text-[#00d4ff]/70 hover:text-[#00d4ff] transition uppercase flex items-center gap-1">
                        <Globe size={11} /> TRANSLATIONS {expandedTranslations ? '▴' : '▾'}
                    </button>
                    
                    <AnimatePresence>
                        {expandedTranslations && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                                <div className="flex gap-1.5 mb-2 flex-wrap">
                                    {langs.map(l => (
                                        <button 
                                            key={l}
                                            onClick={() => setSelectedLang(l)}
                                            className={`text-[10px] px-2 py-0.5 rounded uppercase ${selectedLang === l ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50' : 'bg-[#111118] text-gray-500 border border-[#2a2a38]'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                <div className="bg-[#111118] p-2 rounded border border-[#2a2a38]">
                                    {translationData ? (
                                        <>
                                            <div className="font-rajdhani text-[13px] text-white font-bold mb-1">{translationData.title}</div>
                                            <div className="text-[11px] text-[#9999bb]">{translationData.message}</div>
                                        </>
                                    ) : (
                                        <div className="text-[11px] text-red-400 italic">Translation unavailable</div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between items-center border-t border-[#2a2a38] pt-2.5">
                    <div>
                        {alert.fcm_sent && <span className="inline-flex items-center gap-1 text-[9px] text-[#00ff88] uppercase tracking-wider bg-[#00ff88]/10 px-1.5 py-0.5 rounded"><Bell size={9} /> PUSH SENT</span>}
                    </div>
                    <div>
                        {isResolved ? (
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1"><Check size={11} /> RESOLVED</span>
                        ) : (
                            <button onClick={() => resolveFn(alert.id)} className="text-[10px] text-[#ff3355] border border-[#ff3355]/40 hover:bg-[#ff3355]/10 px-2 py-0.5 rounded uppercase tracking-widest transition">
                                RESOLVE ✓
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

// ------------------------------------------------------------------
// MAIN ALERTS CENTER COMPONENT
// ------------------------------------------------------------------
export default function AlertsCenter() {
    const { venueId } = useVenueStore();
    // In production, derive role from auth context. Hardcoded to admin for demo dispatch capability.
    const userRole = "admin"; 
    
    const queryClient = useQueryClient();
    const { alerts, isLoading, resolveAlert } = useAlerts(venueId);
    useWebSocket(venueId);
    
    // For Zone Dropdown mapping
    const { summary: crowdSummary } = useCrowd(venueId);

    // Form State
    const [alertType, setAlertType] = useState<AlertType>('info');
    const [severity, setSeverity] = useState<AlertSeverity>('medium');
    const [zoneId, setZoneId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!venueId) {
        return <div className="w-full h-full flex justify-center items-center font-rajdhani text-2xl tracking-widest text-[#00d4ff]">SELECT A VENUE TO VIEW ALERTS</div>;
    }

    const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
    const sortedAlerts = [...alerts].sort((a, b) => {
        if (!a.is_resolved && b.is_resolved) return -1;
        if (a.is_resolved && !b.is_resolved) return 1;
        if (!a.is_resolved && !b.is_resolved) {
            return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    unresolvedAlerts.forEach(a => severityCounts[a.severity as keyof typeof severityCounts]++);

    const handleDispatch = async () => {
        if (title.trim().length < 3 || message.trim().length < 3 || isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            await createAlert({
                venue_id: venueId,
                zone_id: zoneId || null,
                alert_type: alertType,
                severity,
                title,
                message
            });
            setTitle('');
            setMessage('');
            setSeverity('medium');
            setAlertType('info');
            setZoneId('');
            queryClient.invalidateQueries({ queryKey: ["alerts", venueId] });
        } catch (err) {
            console.error("Failed to broadcast alert", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-[#0a0a0f] flex flex-col text-white overflow-hidden">
            
            {/* TOP HEADER SCANNER */}
            <div className="w-full h-[260px] relative border-b border-[#2a2a38] shrink-0 bg-[#0a0a0f]">
                <Canvas>
                    <RadarSweep alerts={alerts} />
                </Canvas>
                
                {/* Overlays */}
                <div className="absolute top-4 left-6 pointer-events-none">
                    <h2 className="font-rajdhani font-bold text-[#00d4ff] tracking-[0.3em] uppercase text-sm">[ THREAT RADAR ]</h2>
                </div>

                <div className="absolute top-4 right-6 pointer-events-none flex gap-2">
                    {['critical', 'high', 'medium', 'low'].map(sev => {
                        if (severityCounts[sev as keyof typeof severityCounts] > 0) {
                            return (
                                <div key={sev} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ backgroundColor: `${SEVERITY_COLOR[sev]}22`, color: SEVERITY_COLOR[sev] }}>
                                    {severityCounts[sev as keyof typeof severityCounts]} {sev}
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>

                <div className="absolute bottom-4 right-6 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-[#00ff88] uppercase">
                    <div className="w-3 h-3 rounded-full border-t border-[#00ff88] animate-spin" />
                    SWEEP ACTIVE
                </div>
            </div>

            {/* BOTTOM SECTION */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* DISPATCH COLUMN */}
                <div className="w-[340px] shrink-0 bg-[#111118] border-r border-[#2a2a38] overflow-y-auto p-5">
                    {userRole !== 'admin' && userRole !== 'staff' ? (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-[#2a2a38] rounded-lg text-center mt-4">
                            <Lock className="text-gray-500 mb-3" size={24} />
                            <div className="font-rajdhani font-bold text-gray-400 tracking-wider">STAFF ACCESS REQUIRED</div>
                            <div className="text-[11px] text-gray-500 mt-2">Contact event coordinators to broadcast live alerts.</div>
                        </div>
                    ) : (
                        <>
                            <h3 className="font-rajdhani text-[18px] font-bold tracking-wider text-white mb-5">BROADCAST ALERT</h3>
                            
                            {/* Alert Type */}
                            <div className="mb-4">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Select Classification</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'overcrowding', icon: Users, label: 'OVERCROWD' },
                                        { id: 'long_queue', icon: Clock, label: 'QUEUE' },
                                        { id: 'emergency', icon: AlertTriangle, label: 'EMERGENCY' },
                                        { id: 'weather', icon: CloudRain, label: 'WEATHER' },
                                        { id: 'info', icon: Info, label: 'INFO' },
                                        { id: 'staff_needed', icon: UserPlus, label: 'STAFF REQ' }
                                    ].map(type => (
                                        <button 
                                            key={type.id}
                                            onClick={() => setAlertType(type.id as AlertType)}
                                            className={`flex items-center gap-1.5 p-[8px_6px] rounded border transition ${alertType === type.id ? 'bg-[#001a2e] border-[#00d4ff] text-[#00d4ff]' : 'bg-[#1a1a24] border-[#2a2a38] text-[#666688] hover:border-gray-600'}`}
                                        >
                                            <type.icon size={13} />
                                            <span className="text-[10px] font-rajdhani tracking-wider font-bold truncate">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Severity Level */}
                            <div className="mb-4">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Severity Matrix</div>
                                <div className="flex gap-1">
                                    {['low', 'medium', 'high', 'critical'].map(sev => (
                                        <button 
                                            key={sev}
                                            onClick={() => setSeverity(sev as AlertSeverity)}
                                            className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded transition`}
                                            style={{
                                                backgroundColor: severity === sev ? `${SEVERITY_COLOR[sev]}22` : '#1a1a24',
                                                border: `1px solid ${severity === sev ? SEVERITY_COLOR[sev] : '#2a2a38'}`,
                                                color: severity === sev ? SEVERITY_COLOR[sev] : '#666688'
                                            }}
                                        >
                                            {sev}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Zone Targeting */}
                            <div className="mb-4">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">Geospatial Target</div>
                                <select 
                                    value={zoneId} 
                                    onChange={(e) => setZoneId(e.target.value)}
                                    className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white text-[12px] p-2 rounded outline-none focus:border-[#00d4ff] font-sans"
                                >
                                    <option value="">All Zones (Venue-Wide)</option>
                                    {crowdSummary?.zones?.map((z) => (
                                        <option key={z.zone_id} value={z.zone_id}>
                                            [{z.zone_type?.substring(0,3).toUpperCase() || 'ZON'}] {z.zone_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Alert Content */}
                            <div className="mb-2">
                                <input 
                                    type="text" 
                                    placeholder="Alert Title..." 
                                    maxLength={120}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white text-[13px] p-[10px_12px] rounded outline-none focus:border-[#00d4ff] placeholder-gray-600 font-rajdhani font-bold"
                                />
                            </div>
                            <div className="mb-4 relative">
                                <textarea 
                                    rows={3} 
                                    placeholder="Describe the situation..."
                                    maxLength={500}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    className="w-full bg-[#1a1a24] border border-[#2a2a38] text-white text-[12px] p-[10px_12px] rounded outline-none focus:border-[#00d4ff] placeholder-gray-600 font-sans resize-none"
                                />
                                <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 font-mono">
                                    {message.length} / 500
                                </div>
                            </div>

                            <button 
                                disabled={title.trim().length < 3 || message.trim().length < 3 || isSubmitting}
                                onClick={handleDispatch}
                                className="w-full p-3 rounded font-rajdhani font-bold text-[14px] tracking-widest text-[#0a0a0f] flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: SEVERITY_COLOR[severity] }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-3 h-3 rounded-full border-2 border-[#0a0a0f]/20 border-t-[#0a0a0f] animate-spin" /> 
                                        TRANSMITTING...
                                    </>
                                ) : 'BROADCAST ALERT →'}
                            </button>
                            
                            <div className="flex justify-between items-center mt-3 text-[9px] font-sans text-[#666688] tracking-wider">
                                <div className="flex items-center gap-1 uppercase"><Globe size={10} /> Auto-Translating to 8 Languages</div>
                                {(severity === 'high' || severity === 'critical') && (
                                    <div className="flex items-center gap-1 uppercase text-[#00ff88]"><Bell size={10} /> FCM Push Enabled</div>
                                )}
                            </div>

                        </>
                    )}
                </div>

                {/* TIMELINE COLUMN */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0f]">
                    <div className="flex items-center gap-3 mb-8">
                        <h2 className="font-rajdhani text-[22px] font-bold text-white tracking-widest">COMMAND TIMELINE</h2>
                        <div className="bg-[#1a1a24] text-[#00d4ff] px-2 py-0.5 rounded text-[11px] border border-[#00d4ff]/30 font-mono">
                            {unresolvedAlerts.length} ACTIVE
                        </div>
                    </div>

                    <div className="relative isolate">
                        {/* Vertical line mapping track */}
                        <div className="absolute left-[16px] top-0 bottom-0 w-[2px] bg-[#2a2a38] z-0" />

                        {alerts.length === 0 && !isLoading ? (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center pt-16">
                                <div className="relative">
                                    <svg viewBox="0 0 24 24" width="64" height="64" fill="none">
                                        <path d="M12 2 L22 8 L22 15 C22 20 17 24 12 26 C7 24 2 20 2 15 L2 8 Z" fill="#00ff88" opacity="0.1" stroke="#00ff88" strokeWidth="1" />
                                        <polyline points="8 13 11 16 16 10" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="font-rajdhani font-bold text-[28px] text-[#00ff88] tracking-widest mt-4">ALL CLEAR</h3>
                                <p className="font-sans text-[14px] text-gray-500 mt-1">No active incidents for this venue.</p>
                            </motion.div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {sortedAlerts.map(a => (
                                    <AlertTimelineCard key={a.id} alert={a} resolveFn={resolveAlert} />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
