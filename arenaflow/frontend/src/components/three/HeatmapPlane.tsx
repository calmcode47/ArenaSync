import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

export interface CrowdHeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

export interface HeatmapPlaneProps {
  heatmap: CrowdHeatmapPoint[];
}

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;

uniform float u_time;
uniform vec3 u_points[32];
uniform int u_pointCount;
uniform float u_opacity;
uniform float u_pulseIntensity;

void main() {
    float heat = 0.0;

    for (int i = 0; i < 32; i++) {
        if (i >= u_pointCount) break;
        
        vec3 pt = u_points[i];
        float dist = distance(vUv, pt.xy);
        
        float radius = 0.15 * max(pt.z, 0.1);
        
        if(dist < radius * 3.0) {
            heat += pt.z * exp(-(dist * dist) / (2.0 * radius * radius));
        }
    }
    
    // Clamp total heat
    heat = clamp(heat, 0.0, 1.0);
    
    vec3 color = vec3(0.0);
    float alpha = 0.0;
    
    if (heat > 0.0) {
        vec3 c0 = vec3(0.04, 0.09, 0.16); // #0a1628
        vec3 c1 = vec3(0.00, 0.23, 0.43); // #003a6e
        vec3 c2 = vec3(0.00, 0.83, 1.00); // #00d4ff
        vec3 c3 = vec3(1.00, 0.84, 0.04); // #ffd60a
        vec3 c4 = vec3(1.00, 0.20, 0.33); // #ff3355
        
        if (heat <= 0.25) {
            float t = smoothstep(0.0, 0.25, heat);
            color = mix(c0, c1, t);
            alpha = mix(0.0, 0.4, t);
        } else if (heat <= 0.5) {
            float t = smoothstep(0.25, 0.5, heat);
            color = mix(c1, c2, t);
            alpha = mix(0.4, 0.65, t);
        } else if (heat <= 0.75) {
            float t = smoothstep(0.5, 0.75, heat);
            color = mix(c2, c3, t);
            alpha = mix(0.65, 0.85, t);
        } else {
            float t = smoothstep(0.75, 1.0, heat);
            color = mix(c3, c4, t);
            alpha = mix(0.85, 1.0, t);
        }
    }
    
    // Danger pulse for critical spots
    if (heat > 0.7) {
        float pulse = sin(u_time * 3.0 + distance(vUv, vec2(0.5)) * 10.0) * 0.08 * heat;
        alpha += pulse * u_pulseIntensity;
    }
    
    // Fade at edges to fit stadium footprint constraint without hard clips
    float edgeX = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    float edgeY = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    float edgeFade = edgeX * edgeY;
    
    gl_FragColor = vec4(color, alpha * edgeFade * u_opacity);
}
`;

const HeatmapShaderMaterial = shaderMaterial(
  { u_time: 0, u_points: new Array(32).fill(new THREE.Vector3()), u_pointCount: 0, u_opacity: 0, u_pulseIntensity: 1.0 },
  vertexShader,
  fragmentShader
);

extend({ HeatmapShaderMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      heatmapShaderMaterial: any;
    }
  }
}

export default function HeatmapPlane({ heatmap }: HeatmapPlaneProps) {
    const materialRef = useRef<any>(null);
    const planeGeoRef = useRef<THREE.PlaneGeometry>(null);

    // Parse Data -> Shader Array
    const { pointsArray, pointCount } = useMemo(() => {
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        heatmap.forEach(p => {
            if (p.latitude < minLat) minLat = p.latitude;
            if (p.latitude > maxLat) maxLat = p.latitude;
            if (p.longitude < minLng) minLng = p.longitude;
            if (p.longitude > maxLng) maxLng = p.longitude;
        });

        // Add 10% padding boundary
        const latPad = (maxLat - minLat) * 0.1 || 0.001;
        const lngPad = (maxLng - minLng) * 0.1 || 0.001;
        minLat -= latPad; maxLat += latPad;
        minLng -= lngPad; maxLng += lngPad;

        const maxPoints = 32;
        const count = Math.min(heatmap.length, maxPoints);
        const mappedArray = new Array(maxPoints).fill(new THREE.Vector3());

        for (let i = 0; i < count; i++) {
            const pt = heatmap[i];
            const u = (pt.longitude - minLng) / (maxLng - minLng);
            // v = 0 is bottom, depending on latitude direction, we may need 1 - (normalized)
            const v = (pt.latitude - minLat) / (maxLat - minLat);
            mappedArray[i] = new THREE.Vector3(u, v, pt.weight);
        }

        return { pointsArray: mappedArray, pointCount: count };
    }, [heatmap]);

    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.u_points = pointsArray;
            materialRef.current.u_pointCount = pointCount;
            // Flare up pulse intensity manually on data refresh then damp back
            materialRef.current.u_pulseIntensity = 1.5;
        }
    }, [pointsArray, pointCount]);

    useEffect(() => {
        return () => {
            if (planeGeoRef.current) planeGeoRef.current.dispose();
            if (materialRef.current) materialRef.current.dispose();
        }
    }, []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.u_time = state.clock.elapsedTime;
            
            // Lerp opacity from 0 -> 1 on mount
            materialRef.current.u_opacity = THREE.MathUtils.lerp(materialRef.current.u_opacity, 1.0, 0.05);

            // Damp pulse intensity back towards 1.0
            if (materialRef.current.u_pulseIntensity > 1.0) {
                 materialRef.current.u_pulseIntensity = THREE.MathUtils.lerp(materialRef.current.u_pulseIntensity, 1.0, 0.05);
            }
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 1, 1]} position={[0, 0.05, 0]}>
            <planeGeometry ref={planeGeoRef} args={[20, 14, 128, 128]} />
            <heatmapShaderMaterial 
                ref={materialRef} 
                transparent={true} 
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}
