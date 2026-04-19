import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { RefreshCw, MapPin, Zap } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useVenueStore } from '../store/venueStore';
import { useCrowd } from '../hooks/useCrowd';
import ZoneBadge from '../components/ui/ZoneBadge';
import Loader from '../components/ui/Loader';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ------------------------------------------------------------------
// GLOBE INTRO SEQUENCE (Stable 3D Component)
// ------------------------------------------------------------------
function GlobeIntro({ lat, lng }: { lat: number, lng: number }) {
    const { camera } = useThree();
    const globeRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    
    const r = 5;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const z = (r * Math.sin(phi) * Math.sin(theta));
    const y = (r * Math.cos(phi));

    useEffect(() => {
        camera.position.set(0, 2, 18);
        camera.lookAt(0, 0, 0);

        gsap.to(camera.position, {
            z: 9,
            y: 1,
            duration: 1.8,
            delay: 0.3,
            ease: "power2.inOut"
        });
        
        if (globeRef.current) {
             const angle = Math.atan2(x, z);
             gsap.to(globeRef.current.rotation, {
                 y: angle,
                 duration: 1.8,
                 delay: 0.3,
                 ease: "power2.inOut"
             });
        }
    }, [camera, x, z]);

    useFrame((state) => {
        if (globeRef.current) {
            globeRef.current.rotation.y += 0.004;
        }
        if (ringRef.current) {
            const t = (state.clock.elapsedTime % 1.5) / 1.5;
            const size = 0.12 + Math.sin(t * Math.PI) * 0.33;
            ringRef.current.scale.set(size, size, size);
            (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
        }
    });

    return (
        <group>
            <ambientLight intensity={0.2} />
            <pointLight position={[8, 8, 8]} intensity={1.5} color="#00d4ff" />
            <group ref={globeRef}>
                <lineSegments geometry={new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 32, 24))}>
                    <lineBasicMaterial color="#00d4ff" opacity={0.45} transparent />
                </lineSegments>
                <group position={[x, y, z]}>
                    <mesh><sphereGeometry args={[0.12]} /><meshBasicMaterial color="#ff3355" /></mesh>
                    <mesh ref={ringRef} rotation={[phi, -theta, 0]}>
                        <torusGeometry args={[1, 0.015, 6, 32]} /><meshBasicMaterial color="#ff3355" transparent />
                    </mesh>
                </group>
            </group>
        </group>
    );
}

// ------------------------------------------------------------------
// HELPERS & CONSTANTS
// ------------------------------------------------------------------
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const CONGESTION_COLOR_MAP: Record<string, string> = {
    low: "#00ff88",
    moderate: "#ffd60a",
    high: "#ff6b35",
    critical: "#ff3355"
};

// Custom Marker Creator
const createCustomIcon = (color: string) => L.divIcon({
    html: `
        <div style="position:relative; width:24px; height:24px;">
            <div style="position:absolute; inset:0; background:${color}; border-radius:50%; opacity:0.6; animation: ping 2s infinite;"></div>
            <div style="position:absolute; inset:6px; background:${color}; border-radius:50%; border:3px solid #000; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
        </div>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Map Panner Component
function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (center[0] !== 0) {
            map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
        }
    }, [center, zoom, map]);
    return null;
}

// Custom Heatmap Layer (CSS-based)
function HeatmapLayer({ points }: { points: any[] }) {
    if (!points || points.length === 0) return null;
    
    // Simple helper to get color from weight (0 to 1)
    const getHeatColor = (w: number) => {
        if (w > 0.8) return '#ff3355'; // Critical Red
        if (w > 0.5) return '#ffb300'; // High Orange
        return '#00ff88'; // Low Green
    };

    return (
        <>
            {points.map((p, i) => (
                <CircleMarker
                    key={`heat-${i}`}
                    center={[p.latitude, p.longitude]}
                    radius={20}
                    pathOptions={{
                        fillColor: getHeatColor(p.weight),
                        fillOpacity: p.weight * 0.35,
                        stroke: false
                    }}
                />
            ))}
        </>
    );
}

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------
export default function LiveMap() {
    const { venueId, venue } = useVenueStore();
    const { summary, heatmap, isLoading, refetch } = useCrowd(venueId);
    
    const [showGlobe, setShowGlobe] = useState(false);
    const [introText, setIntroText] = useState("ACQUIRING VENUE COORDINATES...");
    const [mapState, setMapState] = useState({ center: [0, 0] as [number, number], zoom: 17 });
    const [lastSync, setLastSync] = useState<string>("");

    // Initial positioning
    useEffect(() => {
        if (venue?.latitude && venue?.longitude) {
            setMapState({ center: [venue.latitude, venue.longitude], zoom: 17 });
        }
    }, [venue]);

    useEffect(() => {
        const hasShown = sessionStorage.getItem("arenaflow_map_intro_shown");
        if (hasShown) return;

        setShowGlobe(true);
        sessionStorage.setItem("arenaflow_map_intro_shown", "true");
        const t1 = setTimeout(() => setIntroText("LOCALIZING ASSETS"), 1500);
        const t2 = setTimeout(() => setShowGlobe(false), 3000);
        
        return () => { 
            clearTimeout(t1); 
            clearTimeout(t2); 
        };
    }, []);

    useEffect(() => {
        const now = new Date();
        setLastSync(now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
        const interval = setInterval(() => {
            setLastSync(new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    if (!venueId || !venue) {
        return <div className="w-full h-[calc(100vh-64px)] bg-[#0a0a0f] flex items-center justify-center font-rajdhani text-xl tracking-widest text-[#00d4ff]">SELECT A VENUE FROM THE SIDEBAR</div>;
    }

    const mapCenter: [number, number] = [venue.latitude || 40.7128, venue.longitude || -74.0060];

    return (
        <div className="w-full h-[calc(100vh-64px)] flex bg-[#0a0a0f] text-white">
            
            {/* Globe Intro Overlay */}
            <AnimatePresence>
                {showGlobe && (
                    <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 z-[1000] bg-[#0a0a0f]">
                        <Canvas><GlobeIntro lat={mapCenter[0]} lng={mapCenter[1]} /></Canvas>
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
                            <motion.div key={introText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] font-rajdhani font-bold tracking-[0.3em] text-[#00d4ff] uppercase">{introText}</motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Panel */}
            <div className="w-[300px] shrink-0 bg-[#111118] border-r border-[#2a2a38] overflow-y-auto flex flex-col relative z-[900]">
                <div className="p-4 border-b border-[#2a2a38] flex items-center justify-between sticky top-0 bg-[#111118] z-10">
                    <h3 className="font-rajdhani text-[11px] font-bold tracking-widest text-[#00d4ff] uppercase">[ OSM SENSOR ARRAY ]</h3>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => refetch()}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                        <span className="text-[10px] font-mono text-[#00ff88]">ONLINE</span>
                    </div>
                </div>
                
                <div className="flex-1 p-3 flex flex-col gap-2">
                    {summary?.zones?.map((zone) => {
                        const cColor = CONGESTION_COLOR_MAP[zone.congestion_level] || "#00ff88";
                        return (
                            <motion.div 
                                key={zone.zone_id}
                                onClick={() => setMapState({ center: [zone.latitude || mapCenter[0], zone.longitude || mapCenter[1]], zoom: 19 })}
                                className="p-[12px_16px] rounded bg-[#0a0a0f] cursor-pointer hover:bg-[#16161f] transition-all border-l-4"
                                style={{ borderLeftColor: cColor }}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-sans font-medium text-[14px] text-white">{zone.zone_name}</div>
                                    <ZoneBadge level={zone.congestion_level} size="sm" />
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{zone.zone_type}</div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-[#2a2a38] text-[10px] font-mono text-gray-500 flex justify-between">
                    <span>SYNC: {lastSync}</span>
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                </div>
            </div>

            {/* Right Panel: Leaflet Map */}
            <div className="flex-1 relative overflow-hidden z-0">
                <div className="absolute top-0 left-0 right-0 h-[44px] z-[500] bg-[#111118]/85 backdrop-blur-[8px] border-b border-[#2a2a38] flex items-center justify-between px-4">
                    <div className="font-rajdhani text-[15px] text-white tracking-widest uppercase">{venue.name}</div>
                    <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-widest flex items-center gap-2">
                        <Zap size={10} /> ZERO-KEY MAPPING ACTIVE
                    </div>
                </div>

                <MapContainer 
                    center={mapCenter} 
                    zoom={17} 
                    zoomControl={false}
                    style={{ width: '100%', height: '100%', background: '#0a0a0f' }}
                >
                    <TileLayer url={DARK_TILES} attribution={ATTRIBUTION} />
                    <ZoomControl position="bottomright" />
                    <MapController center={mapState.center} zoom={mapState.zoom} />
                    
                    {/* Heatmap Layer */}
                    <HeatmapLayer points={heatmap?.points || []} />

                    {summary?.zones?.map((zone) => (
                        <Marker 
                            key={zone.zone_id} 
                            position={[zone.latitude || mapCenter[0], zone.longitude || mapCenter[1]]}
                            icon={createCustomIcon(CONGESTION_COLOR_MAP[zone.congestion_level] || "#00ff88")}
                        >
                            <Popup className="custom-popup">
                                <div className="bg-[#1a1a24] text-white p-2 rounded font-sans text-xs">
                                    <div className="font-bold border-b border-[#2a2a38] pb-1 mb-1">{zone.zone_name}</div>
                                    <div>Ppl: {zone.current_count} / {zone.capacity}</div>
                                    <div className="mt-1" style={{ color: CONGESTION_COLOR_MAP[zone.congestion_level] }}>
                                        {zone.congestion_level.toUpperCase()}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <style>{`
                .leaflet-container { background: #0a0a0f !important; }
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: #1a1a24 !important;
                    color: white !important;
                    border: 1px solid #2a2a38;
                }
                @keyframes ping {
                    0% { transform: scale(1); opacity: 0.4; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
