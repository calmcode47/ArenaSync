import React, { useMemo, useEffect, useRef, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import gsap from 'gsap';

interface ZoneCrowdStatus {
  zone_id: string;
  zone_name: string;
  density_score: number;
  congestion_level: 'low' | 'moderate' | 'high' | 'critical';
  current_count: number;
}

export interface VenueSceneProps {
  zones: ZoneCrowdStatus[];
  totalCount: number;
  capacity: number;
  className?: string;
}

/** Layer 0: Starfield */
function Starfield() {
  const ref = useRef<THREE.Points>(null);
  
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for(let i=0; i < count; i++) {
        // distribute broadly
        positions[i*3] = (Math.random() - 0.5) * 100;
        positions[i*3+1] = (Math.random() - 0.5) * 60 + 20; 
        positions[i*3+2] = (Math.random() - 0.5) * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.015,
      transparent: true,
      opacity: 0.4
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.00008;
    }
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

/** Layer 1: Ground Plane and Fog */
function GroundFog() {
    const { geo, mat } = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(80, 80);
        
        // Circular fog plane beneath stadium using canvas generated radial gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (context) {
            const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
            gradient.addColorStop(0.3, 'rgba(10, 10, 15, 0)');
            gradient.addColorStop(1, 'rgba(10, 10, 15, 1)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 512, 512);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false, 
        });
        
        return { geo: geometry, mat: material };
    }, []);

    useEffect(() => {
        return () => {
            geo.dispose();
            mat.dispose();
            if (mat.map) mat.map.dispose();
        };
    }, [geo, mat]);

    return (
        <group>
            {/* Infinite grid - barely visible primary, #00d4ff sectionals */}
            <gridHelper args={[80, 80, 0x1a1a24, 0x00d4ff]} position={[0, -0.01, 0]} />
            {/* Overlay Gradient Map */}
            <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
        </group>
    );
}

/** Vector helper for math generation */
const buildRibs = () => {
    const lines: THREE.BufferGeometry[] = [];
    const numRibs = 24;
    for (let i = 0; i < numRibs; i++) {
        const theta = (i / numRibs) * Math.PI * 2;
        // Start ground level on the base oval
        const x1 = Math.cos(theta) * 8 * 1.6;
        const z1 = Math.sin(theta) * 8;
        
        // End ring higher up and slightly inwards/outwards
        const endY = 6;
        const x2 = Math.cos(theta) * 9 * 1.6;
        const z2 = Math.sin(theta) * 9;
        
        // Mid control point throwing it gently outward
        const hx = Math.cos(theta) * 11 * 1.6;
        const hz = Math.sin(theta) * 11;

        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(x1, 0, z1),
            new THREE.Vector3(hx, endY * 0.4, hz),
            new THREE.Vector3(x2, endY, z2)
        );
        
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
        lines.push(geo);
    }
    return lines;
};

const buildRoofLattice = () => {
    const numSpokes = 12;
    const lines: THREE.BufferGeometry[] = [];
    const ringPoints: THREE.Vector3[] = [];
    
    for(let i = 0; i < numSpokes; i++) {
        const theta = (i / numSpokes) * Math.PI * 2;
        const x = Math.cos(theta) * 9 * 1.6;
        const y = 6;
        const z = Math.sin(theta) * 9;
        const pt = new THREE.Vector3(x, y, z);
        
        // line to center
        const spokeGeo = new THREE.BufferGeometry().setFromPoints([pt, new THREE.Vector3(0, 5, 0)]);
        lines.push(spokeGeo);
        
        // Store midpoint for tension cable
        const midPt = pt.clone().lerp(new THREE.Vector3(0,5,0), 0.5);
        ringPoints.push(midPt);
    }
    // close tension ring
    ringPoints.push(ringPoints[0]);
    const tensionGeo = new THREE.BufferGeometry().setFromPoints(
        new THREE.CatmullRomCurve3(ringPoints).getPoints(50)
    );
    lines.push(tensionGeo);
    
    return lines;
};

/** Layer 2: Stadium Shell Geometry */
function StadiumShell() {
    const scanRingRef = useRef<THREE.Mesh>(null);
    const { baseRingGeo, baseRingMat, ribsGeos, ribMats, roofGeos, roofMat, scanRingGeo, scanRingMat } = useMemo(() => {
        // a) Oval base ring 
        const baseRingGeo = new THREE.TorusGeometry(8, 0.12, 8, 80);
        baseRingGeo.scale(1.6, 1, 1);
        const baseRingMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.9, wireframe: true });

        // b) Seating Bowl (Lines connecting)
        const ribsGeos = buildRibs();
        const ribMats = ribsGeos.map((_, i) => new THREE.LineBasicMaterial({ 
            color: 0x00d4ff, 
            transparent: true, 
             // Variable vertical opacity emulation
            opacity: 0.3 + ((i%3) * 0.2) 
        }));

        // c) Roof Lattice
        const roofGeos = buildRoofLattice();
        const roofMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 });

        // d) Scanning Ring
        const scanRingGeo = new THREE.TorusGeometry(8.1, 0.02, 4, 80);
        scanRingGeo.scale(1.6, 1, 1);
        const scanRingMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 1.0 });

        return { baseRingGeo, baseRingMat, ribsGeos, ribMats, roofGeos, roofMat, scanRingGeo, scanRingMat };
    }, []);

    useEffect(() => {
        return () => {
            baseRingGeo.dispose();
            baseRingMat.dispose();
            ribsGeos.forEach(g => g.dispose());
            ribMats.forEach(m => m.dispose());
            roofGeos.forEach(g => g.dispose());
            roofMat.dispose();
            scanRingGeo.dispose();
            scanRingMat.dispose();
        };
    }, []);

    useFrame((state) => {
        if(scanRingRef.current) {
            // Loop duration ~4s 
            const t = (state.clock.elapsedTime % 4) / 4;
            // ease-in-out movement
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            scanRingRef.current.position.y = ease * 6; // traverses from 0 to 6
        }
    });

    return (
        <group>
            <mesh geometry={baseRingGeo} material={baseRingMat} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]} />
            
            {ribsGeos.map((geo, i) => (
               <primitive key={`rib-${i}`} object={new THREE.Line(geo, ribMats[i])} />
            ))}

            {roofGeos.map((geo, i) => (
                <primitive key={`roof-${i}`} object={new THREE.Line(geo, roofMat)} />
            ))}

            <mesh ref={scanRingRef} geometry={scanRingGeo} material={scanRingMat} rotation={[-Math.PI/2, 0, 0]} />
        </group>
    );
}

/** Layer 3: Zone Markers Data Representation */
function ZoneMarker({ zone, index, total }: { zone: ZoneCrowdStatus; index: number; total: number }) {
    const markerRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const { geo, mat, glowColor } = useMemo(() => {
        const theta = (index / total) * Math.PI * 2;
        const cx = Math.cos(theta) * 5.5 * 1.6;
        const cz = Math.sin(theta) * 5.5;

        // Line geometry connecting floor to top marker
        const bg = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(cx, 0, cz),
            new THREE.Vector3(cx, 2, cz)
        ]);

        let color = 0x00ff88; // low
        if(zone.congestion_level === 'moderate') color = 0xffd60a;
        if(zone.congestion_level === 'high') color = 0xff6b35;
        if(zone.congestion_level === 'critical') color = 0xff3355;

        const bm = new THREE.LineBasicMaterial({ color, opacity: 0.8, transparent: true });

        let gColor = '#00ff88';
        if(zone.congestion_level === 'moderate') gColor = '#ffd60a';
        if(zone.congestion_level === 'high') gColor = '#ff6b35';
        if(zone.congestion_level === 'critical') gColor = '#ff3355';

        return { geo: bg, mat: bm, cx, cz, glowColor: gColor };
    }, [zone.congestion_level, index, total]);

    useEffect(() => {
        return () => {
            geo.dispose();
            mat.dispose();
        };
    }, [geo, mat]);

    useFrame((state) => {
        if(markerRef.current && zone.congestion_level === 'critical') {
             // oscillate scale for critical warning pulse
             const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
             markerRef.current.scale.set(1, pulse, 1);
        } else if (markerRef.current) {
             markerRef.current.scale.set(1, 1, 1);
        }
    });

    return (
        <group ref={markerRef}>
            <primitive object={new THREE.Line(geo, mat)} />
            
            {/* Hit box for raycasting */}
            <mesh position={[geo.attributes.position.getX(1), 2.2, geo.attributes.position.getZ(1)]} 
                  onPointerOver={() => setHovered(true)} 
                  onPointerOut={() => setHovered(false)}>
                <sphereGeometry args={[0.4, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                
                {hovered && (
                    <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                        <div className="bg-[#1a1a24] border border-white/10 rounded overflow-hidden shadow-2xl w-48 font-sans">
                            <div className="text-[10px] uppercase tracking-widest px-3 py-1 font-rajdhani font-bold flex justify-between items-center" style={{ backgroundColor: `${glowColor}30`, color: glowColor }}>
                                <span>{zone.zone_name}</span>
                                <span>{zone.congestion_level}</span>
                            </div>
                            <div className="px-3 py-2 text-white">
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold font-rajdhani">{zone.current_count}</span>
                                    <span className="text-[10px] text-gray-500 mb-1">/ {zone.density_score.toFixed(2)} Vol</span>
                                </div>
                            </div>
                        </div>
                    </Html>
                )}
            </mesh>
            
            {/* Glowing top dot */}
            <mesh position={[geo.attributes.position.getX(1), 2, geo.attributes.position.getZ(1)]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={new THREE.Color(glowColor)} />
            </mesh>
        </group>
    );
}

/** Layer 4: Decorative Floating Rings */
function FloatingDataRings() {
    const ringGroupRefs = useRef<THREE.Group[]>([]);

    const ringGeos = useMemo(() => {
        // [radius, tube, speed, yPos]
        const specs = [
            [12, 0.05, 0.001, 1],
            [15, 0.02, -0.0015, 2.5],
            [10, 0.03, 0.002, 4]
        ];

        return specs.map(([rad, tb, spd, y], i) => {
            const isBroken = i === 1;
            const geo = new THREE.TorusGeometry(
                rad as number, tb as number, 4, 100, 
                isBroken ? Math.PI * 1.6 : Math.PI * 2
            );
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x00d4ff, transparent: true, opacity: i === 0 ? 0.2 : 0.1 
            });
            return { geo, mat, spd: spd as number, y: y as number };
        });
    }, []);

    useEffect(() => {
        return () => {
            ringGeos.forEach(d => {
                d.geo.dispose();
                d.mat.dispose();
            });
        };
    }, [ringGeos]);

    useFrame(() => {
        ringGroupRefs.current.forEach((g, i) => {
            if(g) g.rotation.y += ringGeos[i].spd;
        });
    });

    return (
        <group>
            {ringGeos.map((d, i) => (
                <group key={i} ref={el => { if(el) ringGroupRefs.current[i] = el; }} position={[0, d.y, 0]}>
                   <mesh geometry={d.geo} material={d.mat} rotation={[-Math.PI/2, 0, 0]} />
                </group>
            ))}
        </group>
    );
}

/** Core Internal Scene Assembler */
export function SceneSetup({ zones }: { zones: ZoneCrowdStatus[] }) {
    const { camera } = useThree();

    useEffect(() => {
        // GSAP Intro animation
        camera.position.set(0, 3, 5);
        gsap.to(camera.position, {
            x: 0,
            y: 14,
            z: 18,
            duration: 2.5,
            ease: "power3.out"
        });
    }, [camera]);

    return (
        <>
            <OrbitControls 
                autoRotate 
                autoRotateSpeed={0.4}
                maxPolarAngle={Math.PI/2.1}
                minDistance={12}
                maxDistance={30}
                enablePan={false}
            />

            <Starfield />
            <GroundFog />
            <StadiumShell />
            <FloatingDataRings />

            <group>
                {zones.map((z, i) => (
                    <ZoneMarker key={z.zone_id} zone={z} index={i} total={zones.length || 1} />
                ))}
            </group>

        </>
    );
}

/** Scene Loading Spinner */
function SceneFallback() {
    return (
        <Html center>
            <div className="flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 rounded-full border-t-2 border-[#00d4ff] animate-spin mb-2" />
                <span className="font-rajdhani uppercase tracking-widest text-xs text-[#00d4ff]">Calibrating Sensors...</span>
            </div>
        </Html>
    );
}

/** Default Outer Wrapper */
export default function VenueScene({ zones, className }: VenueSceneProps) {
    return (
        <div className={`w-full h-full ${className || ''}`} style={{ backgroundColor: 'transparent' }}>
            <Canvas 
                gl={{ antialias: true, alpha: true }} 
                dpr={[1, 2]}
                camera={{ fov: 50, near: 0.1, far: 200 }}
                frameloop="always" // required for postprocessing and GSAP smooth updates normally
            >
                <Suspense fallback={<SceneFallback />}>
                    <SceneSetup zones={zones || []} />
                </Suspense>
            </Canvas>
        </div>
    );
}
