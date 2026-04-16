import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { RefreshCw } from 'lucide-react';

import { useVenueStore } from '../store/venueStore';
import { useCrowd } from '../hooks/useCrowd';
import ZoneBadge from '../components/ui/ZoneBadge';
import Loader from '../components/ui/Loader';

// ------------------------------------------------------------------
// GLOBE INTRO SEQUENCE
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
            const size = 0.12 + Math.sin(t * Math.PI) * 0.33; // 0.12 to 0.45
            ringRef.current.scale.set(size, size, size);
            (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
        }
    });

    const wireGeo = useMemo(() => new THREE.SphereGeometry(r, 32, 24), []);
    const wireframe = useMemo(() => new THREE.WireframeGeometry(wireGeo), [wireGeo]);

    return (
        <group>
            <ambientLight intensity={0.2} />
            <pointLight position={[8, 8, 8]} intensity={1.5} color="#00d4ff" />
            
            <group ref={globeRef}>
                <lineSegments geometry={wireframe}>
                    <lineBasicMaterial color="#00d4ff" opacity={0.45} transparent />
                </lineSegments>

                {/* Venue Pin */}
                <group position={[x, y, z]}>
                    <mesh>
                        <sphereGeometry args={[0.12]} />
                        <meshBasicMaterial color="#ff3355" />
                    </mesh>
                    <mesh ref={ringRef} rotation={[phi, -theta, 0]}>
                        <torusGeometry args={[1, 0.015, 6, 32]} />
                        <meshBasicMaterial color="#ff3355" transparent />
                    </mesh>
                </group>
            </group>

            <EffectComposer>
                <Bloom intensity={1.2} luminanceThreshold={0.25} mipmapBlur />
            </EffectComposer>
        </group>
    );
}

// ------------------------------------------------------------------
// GOOGLE MAPS STYLE CONFIG
// ------------------------------------------------------------------
const DARK_MAP_STYLES = [
    { featureType: "all", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
    { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
    { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#3a3a5c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1628" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0f0f1a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a28" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2a2a3a" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#4a4a6a" }] },
    { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1a1a28" }] },
    { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#4a4a6a" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#6a6a8a" }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#0d0d1a" }] }
];

const CONGESTION_COLOR_MAP: Record<string, string> = {
    low: "#00ff88",
    moderate: "#ffd60a",
    high: "#ff6b35",
    critical: "#ff3355"
};

const LIBRARIES: ("visualization" | "geometry" | "places")[] = ["visualization", "geometry", "places"];

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------
export default function LiveMap() {
    const { venueId, venue } = useVenueStore();
    const { summary, heatmap, isLoading, refetch } = useCrowd(venueId);
    
    const defaultLocation = { lat: venue?.latitude || 40.7128, lng: venue?.longitude || -74.0060 };
    
    const [showGlobe, setShowGlobe] = useState(false);
    const [introText, setIntroText] = useState("ACQUIRING VENUE COORDINATES...");
    const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<string>("");
    
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES
    });

    useEffect(() => {
        const hasShown = sessionStorage.getItem("arenaflow_map_intro_shown");
        if (!hasShown) {
            setShowGlobe(true);
            sessionStorage.setItem("arenaflow_map_intro_shown", "true");

            const t1 = setTimeout(() => setIntroText("LOCK ACQUIRED"), 1500);
            const t2 = setTimeout(() => setShowGlobe(false), 3000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        return undefined;
    }, []);

    useEffect(() => {
        const now = new Date();
        setLastSync(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
        
        const interval = setInterval(() => {
            const time = new Date();
            setLastSync(time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
        }, 15000);
        return () => clearInterval(interval);
    }, [heatmap]);

    const sortedZones = useMemo(() => {
        if (!summary?.zones) return [];
        return [...summary.zones].sort((a,b) => b.density_score - a.density_score);
    }, [summary?.zones]);

    const panToZone = (lat: number, lng: number) => {
        mapRef.current?.panTo({ lat, lng });
        setTimeout(() => mapRef.current?.setZoom(19), 400);
    };

    // Initialize Map Overlays
    useEffect(() => {
        if (!isLoaded || !mapRef.current || !summary || typeof google === 'undefined') return;

        // Clear existing markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const infoWindow = new google.maps.InfoWindow();

        // Zone Markers
        summary.zones.forEach(zone => {
            const zLat = zone.latitude ?? defaultLocation.lat + (Math.random()-0.5)*0.001;
            const zLng = zone.longitude ?? defaultLocation.lng + (Math.random()-0.5)*0.001;
            const color = CONGESTION_COLOR_MAP[zone.congestion_level] || "#00ff88";

            const marker = new google.maps.Marker({
                position: { lat: zLat, lng: zLng },
                map: mapRef.current,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: color,
                    fillOpacity: 0.9,
                    strokeColor: "#0a0a0f",
                    strokeWeight: 2
                },
                title: zone.zone_name
            });

            marker.addListener('click', () => {
                const content = `
                    <div style="background:#1a1a24;border:1px solid #2a2a38;padding:12px;border-radius:8px;font-family:'DM Sans',sans-serif;color:white;min-width:180px;">
                        <div style="font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;color:${color};">${zone.zone_name}</div>
                        <div style="font-size:11px;color:#8888aa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">${zone.zone_type}</div>
                        <div style="font-size:13px;margin-bottom:4px;">Crowd: <strong>${zone.current_count} / ${zone.capacity}</strong></div>
                        <div style="font-size:13px;margin-bottom:8px;">Density: <strong>${Math.round(zone.density_score * 100)}%</strong></div>
                        <div style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:${color}22;color:${color};border:1px solid ${color}55;">
                            ${zone.congestion_level.toUpperCase()}
                        </div>
                    </div>
                `;
                infoWindow.setContent(content);
                infoWindow.open(mapRef.current, marker);
            });

            markersRef.current.push(marker);
        });

        // Heatmap
        if (heatmap?.points) {
            const heatData = heatmap.points.map((p: any) => ({
                location: new google.maps.LatLng(p.latitude, p.longitude),
                weight: p.weight
            }));

            if (!heatmapLayerRef.current) {
                heatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
                    data: heatData,
                    map: mapRef.current,
                    radius: 35,
                    opacity: 0.72,
                    gradient: [
                        'rgba(0,0,0,0)',
                        'rgba(0,58,110,0.8)',
                        'rgba(0,212,255,0.9)',
                        'rgba(255,214,10,0.9)',
                        'rgba(255,107,53,0.95)',
                        'rgba(255,51,85,1)'
                    ]
                });
            } else {
                heatmapLayerRef.current.setData(heatData);
            }
        }

        // Venue Boundary Polygon
        if (google.maps.geometry?.spherical && !mapRef.current.get('boundaryDrawn')) {
            const rx = 350;
            const ry = 250;
            const points: google.maps.LatLng[] = [];
            const center = new google.maps.LatLng(defaultLocation.lat, defaultLocation.lng);
            
            for (let i = 0; i < 36; i++) {
                const angle = i * 10;
                const rad = angle * (Math.PI / 180);
                const effectiveDist = (rx * ry) / Math.sqrt(Math.pow(ry * Math.cos(rad), 2) + Math.pow(rx * Math.sin(rad), 2));
                points.push(google.maps.geometry.spherical.computeOffset(center, effectiveDist, angle));
            }
            
            new google.maps.Polygon({
                paths: points,
                strokeColor: "#00d4ff",
                strokeOpacity: 0.35,
                strokeWeight: 2,
                fillColor: "#00d4ff",
                fillOpacity: 0.04,
                map: mapRef.current
            });
            mapRef.current.set('boundaryDrawn', true);
        }

    }, [isLoaded, summary, heatmap, defaultLocation]);

    if (!venueId || !venue) {
        return <div className="w-full h-[calc(100vh-64px)] bg-[#0a0a0f] flex items-center justify-center font-rajdhani text-xl tracking-widest text-[#00d4ff]">SELECT A VENUE FROM THE SIDEBAR</div>;
    }

    return (
        <div className="w-full h-[calc(100vh-64px)] flex bg-[#0a0a0f] text-white">
            
            {/* Globe Intro Overlay */}
            <AnimatePresence>
                {showGlobe && (
                    <motion.div 
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 z-50 bg-[#0a0a0f]"
                    >
                        <Canvas>
                            <GlobeIntro lat={defaultLocation.lat} lng={defaultLocation.lng} />
                        </Canvas>
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={introText}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-[12px] font-rajdhani font-bold tracking-[0.3em] text-[#00d4ff] uppercase"
                                >
                                    {introText}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-500 tracking-wider">
                            N {defaultLocation.lat.toFixed(4)}° · E {defaultLocation.lng.toFixed(4)}°
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Panel */}
            <div className="w-[300px] shrink-0 bg-[#111118] border-r border-[#2a2a38] overflow-y-auto flex flex-col relative z-20">
                <div className="p-4 border-b border-[#2a2a38] flex items-center justify-between sticky top-0 bg-[#111118] z-10">
                    <h3 className="font-rajdhani text-[11px] font-bold tracking-widest text-[#00d4ff]">[ LIVE ZONE RADAR ]</h3>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => refetch()}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-[pulse_1.4s_infinite]" />
                        <span className="text-[10px] font-mono text-[#00ff88]">LIVE</span>
                    </div>
                </div>
                
                <div className="flex-1 p-3 flex flex-col gap-2">
                    <AnimatePresence>
                        {sortedZones.map((zone) => {
                            const cColor = CONGESTION_COLOR_MAP[zone.congestion_level] || "#00ff88";
                            const fillPct = Math.min((zone.current_count / Math.max(zone.capacity, 1)) * 100, 100);
                            const isActive = activeZoneId === zone.zone_id;

                            return (
                                <motion.div 
                                    layoutId={zone.zone_id}
                                    key={zone.zone_id}
                                    onClick={() => {
                                        setActiveZoneId(zone.zone_id);
                                        panToZone(zone.latitude || defaultLocation.lat, zone.longitude || defaultLocation.lng);
                                    }}
                                    className={`p-[12px_16px] rounded bg-[#0a0a0f] cursor-pointer transition-all duration-200 border-y border-r border-transparent ${isActive ? 'bg-[#1a1a24]' : 'hover:bg-[#16161f]'}`}
                                    style={{ borderLeft: `${isActive ? '4px' : '3px'} solid ${cColor}` }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-sans font-medium text-[14px] text-white">{zone.zone_name}</div>
                                            <div className="text-[10px] text-[#00d4ff]/50 tracking-wider uppercase mt-0.5">{zone.zone_type || 'SECTOR'}</div>
                                        </div>
                                        <ZoneBadge level={zone.congestion_level} size="sm" />
                                    </div>
                                    
                                    <div className="w-full h-[4px] bg-[#2a2a38] rounded-full overflow-hidden mt-3 mb-1.5">
                                        <div className="h-full transition-all duration-800 ease-out" style={{ width: `${fillPct}%`, backgroundColor: cColor }} />
                                    </div>
                                    
                                    <div className="text-[10px] font-sans text-[#666688]">
                                        {Math.round(zone.density_score * 100)}% · {zone.current_count} / {zone.capacity} ppl
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                <div className="p-3 border-t border-[#2a2a38] sticky bottom-0 bg-[#111118] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">LAST SYNC: {lastSync}</span>
                    <button onClick={() => refetch()} className="text-[#00d4ff] hover:text-white transition-colors">
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Right Panel: Google Map */}
            <div className="flex-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[44px] z-10 bg-[#111118]/85 backdrop-blur-[8px] border-b border-[#2a2a38] flex items-center justify-between px-4">
                    <div className="font-rajdhani text-[15px] text-white tracking-widest">{venue.name}</div>
                    <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
                        HEATMAP · LIVE
                    </div>
                    <select className="bg-[#0a0a0f] border border-[#2a2a38] text-[10px] text-gray-400 p-1 rounded outline-none focus:border-[#00d4ff]">
                        <option>EN</option>
                        <option>ES</option>
                        <option>FR</option>
                    </select>
                </div>

                {!isLoaded ? (
                    <div className="w-full h-full bg-[#0a0a0f] flex items-center justify-center"><Loader /></div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        className="w-full h-full"
                    >
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={defaultLocation}
                            zoom={17}
                            onLoad={(map) => { mapRef.current = map; }}
                            options={{
                                styles: DARK_MAP_STYLES,
                                disableDefaultUI: true,
                                zoomControl: false,
                                gestureHandling: 'greedy',
                                mapTypeId: 'roadmap',
                                minZoom: 14,
                                maxZoom: 20,
                                backgroundColor: '#0a0a0f'
                            }}
                        />

                        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
                            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom()||17) + 1)} className="w-[36px] h-[36px] rounded-full bg-[#1a1a24] border border-[#00d4ff] text-[#00d4ff] flex items-center justify-center font-rajdhani text-xl hover:bg-[#00d4ff]/20 transition">+</button>
                            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom()||17) - 1)} className="w-[36px] h-[36px] rounded-full bg-[#1a1a24] border border-[#00d4ff] text-[#00d4ff] flex items-center justify-center font-rajdhani text-xl hover:bg-[#00d4ff]/20 transition">−</button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
