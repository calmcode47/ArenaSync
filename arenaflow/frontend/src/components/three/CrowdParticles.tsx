import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createNoise3D } from 'simplex-noise';

interface ZoneCrowdStatus {
  zone_id: string;
  zone_name: string;
  density_score: number;
  congestion_level: 'low' | 'moderate' | 'high' | 'critical';
  current_count: number;
  zone_type?: string; 
}

export interface CrowdParticlesProps {
  zones: ZoneCrowdStatus[];
  totalCount: number;
}

const MAX_PARTICLES = 3000;
const BUCKET_SIZE = 1;
const GRID_OFFSET = 15;
const GRID_DIM = 30; // -15 to +15

// Helpers
const gaussianRandom = (mean = 0, stdev = 1) => {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
};

const hexToRgb = (hex: string) => {
    const m = hex.match(/\w\w/g);
    if (!m) return { r: 1, g: 1, b: 1 };
    return {
        r: parseInt(m[0], 16) / 255,
        g: parseInt(m[1], 16) / 255,
        b: parseInt(m[2], 16) / 255
    };
};

const COLORS = {
    low: hexToRgb('00ff88'),
    moderate: hexToRgb('ffd60a'),
    high: hexToRgb('ff6b35'),
    critical: hexToRgb('ff3355'),
};

export default function CrowdParticles({ zones, totalCount }: CrowdParticlesProps) {
    const normalGeoRef = useRef<THREE.BufferGeometry>(null);
    const criticalGeoRef = useRef<THREE.BufferGeometry>(null);
    const lastFpsTime = useRef(0);
    const frameCount = useRef(0);
    const isHighFPS = useRef(true);
    
    const noise3D = useMemo(() => createNoise3D(), []);

    // Master physics state
    const state = useMemo(() => {
        return {
            positions: new Float32Array(MAX_PARTICLES * 3),
            velocities: new Float32Array(MAX_PARTICLES * 3),
            homePositions: new Float32Array(MAX_PARTICLES * 3),
            phases: new Float32Array(MAX_PARTICLES),
            currentColors: new Float32Array(MAX_PARTICLES * 3),
            targetColors: new Float32Array(MAX_PARTICLES * 3),
            isCritical: new Uint8Array(MAX_PARTICLES),
            densityMults: new Float32Array(MAX_PARTICLES),
            activeCount: 0
        };
    }, []);

    // Recompute Particle Data Budget when zones change
    useEffect(() => {
        if (!zones || zones.length === 0) return;
        
        let particleCursor = 0;
        
        zones.forEach((zone, index) => {
            // Compute budget
            let rawBudget = totalCount > 0 ? (zone.current_count / totalCount) * MAX_PARTICLES : 0;
            let budget = Math.max(1, Math.floor(rawBudget)); 
            
            // Constrain if overmax
            if (particleCursor + budget > MAX_PARTICLES) {
                budget = MAX_PARTICLES - particleCursor;
            }
            if (budget <= 0) return;

            // Geometry logic
            let radMin = 3, radMax = 7, yPos = 0.1;
            const t = zone.zone_type?.toLowerCase() || 'seating';
            if (t.includes('gate')) { radMin = 7; radMax = 8.5; }
            else if (t.includes('concession')) { radMin = 5; radMax = 6.5; }
            else if (t.includes('restroom')) { radMin = 6; radMax = 7.5; }
            else if (t.includes('parking')) { radMin = 8.5; radMax = 10; }
            else if (t.includes('exit')) { radMin = 7.5; radMax = 8.8; }

            const angleCenter = (index / zones.length) * Math.PI * 2;
            const colorObj = COLORS[zone.congestion_level] || COLORS['low'];

            for (let i = 0; i < budget; i++) {
                const idx = particleCursor + i;
                
                // Gaussian angle and radius mapping
                const angle = gaussianRandom(angleCenter, 0.4);
                const radius = Math.abs(gaussianRandom((radMin + radMax)/2, (radMax - radMin)/4));
                const finalRad = Math.min(Math.max(radius, radMin), radMax);

                const hx = Math.cos(angle) * finalRad * 1.6;
                const hz = Math.sin(angle) * finalRad;
                
                // Initial generation logic
                if (state.positions[idx * 3] === 0) {
                    state.positions[idx * 3] = hx;
                    state.positions[idx * 3 + 1] = yPos;
                    state.positions[idx * 3 + 2] = hz;
                    state.phases[idx] = Math.random() * 100;
                    
                    state.currentColors[idx * 3] = colorObj.r;
                    state.currentColors[idx * 3 + 1] = colorObj.g;
                    state.currentColors[idx * 3 + 2] = colorObj.b;
                }

                // Update targets dynamically
                state.homePositions[idx * 3] = hx;
                state.homePositions[idx * 3 + 1] = yPos;
                state.homePositions[idx * 3 + 2] = hz;

                state.targetColors[idx * 3] = colorObj.r;
                state.targetColors[idx * 3 + 1] = colorObj.g;
                state.targetColors[idx * 3 + 2] = colorObj.b;
                
                state.isCritical[idx] = zone.congestion_level === 'critical' ? 1 : 0;
                state.densityMults[idx] = 1 + (zone.density_score * 2);
            }
            particleCursor += budget;
        });
        
        state.activeCount = particleCursor;
    }, [zones, totalCount, state]);

    // Internal physics loop
    useFrame((r3fState, delta) => {
        // Track rough FPS guard
        frameCount.current++;
        if (r3fState.clock.elapsedTime - lastFpsTime.current > 1) {
            isHighFPS.current = frameCount.current > 30;
            frameCount.current = 0;
            lastFpsTime.current = r3fState.clock.elapsedTime;
        }

        const t = r3fState.clock.elapsedTime;
        const s = state;
        const total = s.activeCount;
        
        // Spatial Bucketing Setup
        const buckets: number[][] = [];
        if (isHighFPS.current) {
            for(let i=0; i<GRID_DIM * GRID_DIM; i++) buckets.push([]);
            for (let i = 0; i < total; i++) {
                const px = s.positions[i*3];
                const pz = s.positions[i*3+2];
                const gx = Math.floor(px) + GRID_OFFSET;
                const gz = Math.floor(pz) + GRID_OFFSET;
                if(gx >= 0 && gx < GRID_DIM && gz >= 0 && gz < GRID_DIM) {
                    buckets[gz * GRID_DIM + gx].push(i);
                }
            }
        }

        let normalCount = 0;
        let criticalCount = 0;

        // Buffers matching maximum possible length
        const normPos = normalGeoRef.current?.attributes.position.array as Float32Array;
        const normCol = normalGeoRef.current?.attributes.color.array as Float32Array;
        const critPos = criticalGeoRef.current?.attributes.position.array as Float32Array;
        const critCol = criticalGeoRef.current?.attributes.color.array as Float32Array;

        if (!normPos || !critPos) return;

        for (let i = 0; i < total; i++) {
            const i3 = i * 3;
            
            // 1. Color Lerping
            s.currentColors[i3] += (s.targetColors[i3] - s.currentColors[i3]) * 0.1;
            s.currentColors[i3+1] += (s.targetColors[i3+1] - s.currentColors[i3+1]) * 0.1;
            s.currentColors[i3+2] += (s.targetColors[i3+2] - s.currentColors[i3+2]) * 0.1;

            let px = s.positions[i3];
            let py = s.positions[i3+1];
            let pz = s.positions[i3+2];

            let vx = s.velocities[i3];
            let vz = s.velocities[i3+2];

            // 2. Drift Noise Force
            const noiseTime = t * 0.15 + s.phases[i];
            const driftBase = 0.003 * s.densityMults[i];
            const nx = noise3D(px * 0.3, py * 0.3, noiseTime) * driftBase;
            const nz = noise3D(px * 0.3 + 100, pz * 0.3, noiseTime) * driftBase;

            vx += nx;
            vz += nz;

            // 3. Home Soft Spring
            const hx = s.homePositions[i3];
            const hz = s.homePositions[i3+2];
            vx += (hx - px) * 0.002;
            vz += (hz - pz) * 0.002;

            // 4. Spatial separation (if high FPS)
            if (isHighFPS.current) {
                const gx = Math.floor(px) + GRID_OFFSET;
                const gz = Math.floor(pz) + GRID_OFFSET;
                let neighborsChecked = 0;
                
                for(let dx=-1; dx<=1; dx++) {
                    for(let dz=-1; dz<=1; dz++) {
                        const cellX = gx + dx;
                        const cellZ = gz + dz;
                        if(cellX >= 0 && cellX < GRID_DIM && cellZ >= 0 && cellZ < GRID_DIM) {
                            const bucket = buckets[cellZ * GRID_DIM + cellX];
                            for(let j=0; j<bucket.length; j++) {
                                const neighborId = bucket[j];
                                if(neighborId !== i && neighborsChecked < 20) {
                                    const ox = s.positions[neighborId*3];
                                    const oz = s.positions[neighborId*3+2];
                                    const distSq = (px-ox)*(px-ox) + (pz-oz)*(pz-oz);
                                    if(distSq < 0.09 && distSq > 0.0001) { // 0.3 squared = 0.09
                                        const dist = Math.sqrt(distSq);
                                        const push = (0.3 - dist) * 0.01;
                                        vx += ((px-ox)/dist) * push;
                                        vz += ((pz-oz)/dist) * push;
                                    }
                                    neighborsChecked++;
                                }
                            }
                        }
                    }
                }
            }

            // Damping constraint
            vx *= 0.9;
            vz *= 0.9;

            // Boundary Reversal Array
            px += vx;
            pz += vz;
            const currentRad = Math.sqrt(px*px + pz*pz);
            if(currentRad > 10) {
                vx *= -1;
                vz *= -1;
            }

            // Sync States
            s.positions[i3] = px;
            s.positions[i3+2] = pz;
            s.velocities[i3] = vx;
            s.velocities[i3+2] = vz;

            // 5. Partition Render Logic
            if(s.isCritical[i]) {
                const c3 = criticalCount * 3;
                critPos[c3] = px;
                critPos[c3+1] = py + (Math.sin(t*8 + s.phases[i]) * 0.05); // Rapid jump
                critPos[c3+2] = pz;
                
                critCol[c3] = s.currentColors[i3];
                critCol[c3+1] = s.currentColors[i3+1];
                critCol[c3+2] = s.currentColors[i3+2];
                criticalCount++;
            } else {
                const n3 = normalCount * 3;
                normPos[n3] = px;
                normPos[n3+1] = py;
                normPos[n3+2] = pz;
                
                normCol[n3] = s.currentColors[i3];
                normCol[n3+1] = s.currentColors[i3+1];
                normCol[n3+2] = s.currentColors[i3+2];
                normalCount++;
            }
        }

        // Draw calls masking updates
        if(normalGeoRef.current) {
            normalGeoRef.current.attributes.position.needsUpdate = true;
            normalGeoRef.current.attributes.color.needsUpdate = true;
            normalGeoRef.current.setDrawRange(0, normalCount);
        }
        if(criticalGeoRef.current) {
            criticalGeoRef.current.attributes.position.needsUpdate = true;
            criticalGeoRef.current.attributes.color.needsUpdate = true;
            criticalGeoRef.current.setDrawRange(0, criticalCount);
        }
    });

    const initArrays = useMemo(() => {
        return {
            pos: new Float32Array(MAX_PARTICLES * 3),
            col: new Float32Array(MAX_PARTICLES * 3)
        };
    }, []);

    // Cleanup intercept
    useEffect(() => {
        return () => {
            normalGeoRef.current?.dispose();
            criticalGeoRef.current?.dispose();
        }
    }, []);

    return (
        <group>
            {/* Standard Cloud */}
            <points>
                <bufferGeometry ref={normalGeoRef}>
                    <bufferAttribute attach="attributes-position" count={MAX_PARTICLES} array={initArrays.pos} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={MAX_PARTICLES} array={initArrays.col} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial 
                    size={0.12} 
                    sizeAttenuation={true} 
                    vertexColors={true} 
                    transparent={true} 
                    opacity={0.85} 
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>

            {/* Critical Pulsing Cloud */}
            <points>
                <bufferGeometry ref={criticalGeoRef}>
                    <bufferAttribute attach="attributes-position" count={MAX_PARTICLES} array={new Float32Array(MAX_PARTICLES * 3)} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={MAX_PARTICLES} array={new Float32Array(MAX_PARTICLES * 3)} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial 
                    size={0.18} 
                    sizeAttenuation={true} 
                    vertexColors={true} 
                    transparent={true} 
                    opacity={0.95} 
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>
        </group>
    );
}
