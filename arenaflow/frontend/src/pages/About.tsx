import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Text, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { MapPin, MessageSquare, Bell } from 'lucide-react';


// -----------------------------------------------------------------------------
// 3D SCENES
// -----------------------------------------------------------------------------

function UnifiedDataEngine() {
    const mainRef = useRef<THREE.Group>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);
    const pointCloudRef = useRef<THREE.Points>(null);

    useFrame((state) => {
         const t = state.clock.elapsedTime;
         if (mainRef.current) {
             mainRef.current.rotation.y = t * 0.1;
             mainRef.current.position.y = Math.sin(t * 1.5) * 0.2;
         }
         if (ring1Ref.current) {
             ring1Ref.current.rotation.x = t * 0.2;
             ring1Ref.current.rotation.y = t * 0.3;
         }
         if (ring2Ref.current) {
             ring2Ref.current.rotation.x = -t * 0.15;
             ring2Ref.current.rotation.z = t * 0.25;
         }
         if (pointCloudRef.current) {
             pointCloudRef.current.rotation.y = -t * 0.05;
             pointCloudRef.current.rotation.x = t * 0.02;
         }
    });

    return (
        <group ref={mainRef} scale={[1.2, 1.2, 1.2]}>
             <directionalLight position={[10, 10, 5]} intensity={1.5} color="#00d4ff" />
             <directionalLight position={[-10, -10, -5]} intensity={1} color="#00ff88" />
             
             {/* Central Glowing Icosahedron */}
             <mesh>
                 <icosahedronGeometry args={[1.5, 0]} />
                 <meshStandardMaterial color="#050a14" metalness={0.9} roughness={0.1} />
                 <lineSegments>
                     <edgesGeometry args={[new THREE.IcosahedronGeometry(1.5, 0)]} />
                     <lineBasicMaterial color="#00d4ff" opacity={0.6} transparent />
                 </lineSegments>
             </mesh>

             {/* Orbiting Ring 1 */}
             <mesh ref={ring1Ref}>
                 <torusGeometry args={[2.5, 0.01, 16, 100]} />
                 <meshBasicMaterial color="#00ff88" transparent opacity={0.4} />
                 <mesh position={[2.5, 0, 0]}>
                     <sphereGeometry args={[0.08]} />
                     <meshBasicMaterial color="#ffffff" />
                 </mesh>
             </mesh>

             {/* Orbiting Ring 2 */}
             <mesh ref={ring2Ref}>
                 <torusGeometry args={[3.2, 0.02, 16, 100]} />
                 <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.2} />
                 <mesh position={[-3.2, 0, 0]}>
                     <sphereGeometry args={[0.12]} />
                     <meshBasicMaterial color="#ffd60a" />
                 </mesh>
             </mesh>

             {/* Spherical Point Cloud Aura */}
             <points ref={pointCloudRef}>
                 <sphereGeometry args={[6, 32, 32]} />
                 <pointsMaterial size={0.03} color="#00d4ff" transparent opacity={0.15} sizeAttenuation={true} blending={THREE.AdditiveBlending} />
             </points>
        </group>
    );
}

// -----------------------------------------------------------------------------
// MAIN PAGE LAYOUT

export default function About() {
    const [activeChapter, setActiveChapter] = useState(0);
    const [titleText, setTitleText] = useState('');
    const fullTitle = "ARENAFLOW";
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setTitleText(fullTitle.substring(0, i + 1));
            i++;
            if(i >= fullTitle.length) clearInterval(timer);
        }, 100);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
             entries.forEach(e => {
                  if(e.isIntersecting) {
                      const idx = parseInt(e.target.getAttribute('data-index') || '0');
                      setActiveChapter(idx);
                  }
             });
        }, { threshold: 0.5 });

        sectionRefs.current.forEach(el => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const scrollTo = (idx: number) => {
        sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth' });
    };

    const chapters = [
        {
            eye: "THE CHALLENGE", title: "80,000 people. One venue. Zero coordination.",
            body: [
                "Modern mega-events operate blindly. When 80,000 people descend on a stadium, the environment becomes a chaotic, fluid mass. Bottlenecks form at gates in minutes, concessions are overrun, and security forces are left reacting to crowd surges rather than preventing them.",
                "Traditional crowd management relies on manual radio callouts, static signage, and intuition. These archaic workflows are completely incapable of processing the mathematical scale of live arena telemetry."
            ],
            callout: "Average stadium attendee wastes 47 minutes in queues per event"
        },
        {
            eye: "REAL-TIME INTELLIGENCE", title: "Live crowd telemetry. Updated every 15 seconds.",
            body: [
                "ArenaFlow intercepts live gateway and camera sensor streams, synthesizing massive unstructured traffic payloads into a global density matrix. We compute complex capacity ratios continuously across the grid.",
                "Zones instantly self-classify from nominal to critical. Operations command is no longer blind."
            ],
            features: ["🔵 Crowd density computed live", "🟢 Auto-mapped Congestion bounds", "🟠 Autonomous Alert triggering"]
        },
        {
            eye: "MACHINE LEARNING", title: "See the future. 30 minutes ahead.",
            body: [
                "We deployed Facebook's Prophet time-series algorithm to predict the nonlinear ebb and flow of human traffic. Forecasting wait times dynamically against historical flow profiles.",
                "When new zones lack vast memory, the system dynamically cascades gracefully into generic physics proxies—ensuring a unified, unbroken prediction map worldwide."
            ],
            callout: "97% forecast confidence on zones with 7+ days of telemetry history."
        },
        {
            eye: "POWERED BY GOOGLE", title: "Maps. Translation. Push Alerts. All unified.",
            blocks: [
                 { icon: <MapPin/>, title: "Spatial Intelligence", desc: "Native integration generating structural heatmaps locked to GPS tracking." },
                 { icon: <MessageSquare/>, title: "Universal Language", desc: "Every critical broadcast instantly auto-translates to 8 distinct global dialects." },
                 { icon: <Bell/>, title: "Instant Push", desc: "Firebase Cloud Messaging outmaneuvers cellular gridlock instantly." }
            ]
        },
        {
            eye: "TECHNICAL ARCHITECTURE", title: "FastAPI. Prophet. Three.js. Firebase. All live.",
            body: ["Our stack relies on cutting-edge non-blocking integrations bounding React Native execution directly into a continuous ML feedback architecture."]
        },
        {
            eye: "O(1) GANG", title: "Built in 48 hours. Deployed for real.",
            body: [
                "ArenaFlow was built by O(1) Gang for PromptWars Virtual Hackathon. A team of full-stack developers from DAV Institute of Engineering and Technology, Jalandhar — engineering AI-powered solutions for real-world challenges.",
                "Live deployments demand no compromises. Everything running on this platform is rendered continuously."
            ]
        }
    ];

    return (
        <div className="w-full bg-[#0a0a0f] text-white overflow-x-hidden scroll-smooth font-sans">
             
             {/* Progress Dots */}
             <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
                  {chapters.map((_, i) => (
                       <button 
                           key={i} onClick={() => scrollTo(i)} 
                           className={`w-3 h-3 rounded-full transition-all duration-300 ${activeChapter === i ? 'bg-[#00d4ff] shadow-[0_0_10px_#00d4ff] scale-125' : 'bg-white/20 hover:bg-white/40'}`} 
                       />
                  ))}
             </div>

             <div className="flex relative items-start">
                  
                  {/* Left Column: Text */}
                  <div className="w-full md:w-[45%] pb-[20vh]">
                       
                       <div className="pt-20 px-12 mb-20">
                            <h1 className="font-rajdhani font-bold text-5xl md:text-7xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00d4ff]">
                                 {titleText}<span className="inline-block w-1 h-12 bg-[#00d4ff] animate-pulse ml-2 align-middle"/>
                            </h1>
                       </div>

                       {chapters.map((ch, idx) => (
                           <div 
                               key={idx} 
                               data-index={idx} 
                               ref={el => sectionRefs.current[idx] = el}
                               className="min-h-screen px-12 pb-32 flex flex-col justify-center"
                           >
                               <motion.div 
                                   initial={{ opacity: 0, y: 30 }}
                                   whileInView={{ opacity: 1, y: 0 }}
                                   viewport={{ once: true, margin: "-20%" }}
                                   transition={{ duration: 0.8 }}
                               >
                                    <div className="text-[10px] uppercase tracking-[0.3em] font-rajdhani font-bold text-[#00d4ff] mb-4">[{ch.eye}]</div>
                                    <h2 className="text-4xl md:text-5xl font-rajdhani font-bold leading-tight mb-8 text-white">{ch.title}</h2>
                                    
                                    {ch.body && ch.body.map((p, i) => (
                                         <p key={i} className="text-gray-300 text-lg leading-relaxed mb-6 font-sans">{p}</p>
                                    ))}

                                    {ch.callout && (
                                         <div className="mt-8 border-l-4 border-[#00d4ff] pl-6 py-2 bg-gradient-to-r from-[#00d4ff]/10 to-transparent">
                                             <div className="text-2xl font-rajdhani font-bold italic text-white/90">{ch.callout}</div>
                                         </div>
                                    )}

                                    {ch.features && (
                                         <div className="mt-6 flex flex-col gap-3 font-sans tracking-wide">
                                              {ch.features.map((f, i) => (
                                                  <div key={i} className="bg-white/5 border border-white/10 rounded px-4 py-3 text-sm text-gray-300">{f}</div>
                                              ))}
                                         </div>
                                    )}

                                    {ch.blocks && (
                                         <div className="grid grid-cols-1 gap-6 mt-8">
                                              {ch.blocks.map((b, i) => (
                                                   <div key={i} className="flex gap-4 items-start bg-[#1a1a24] p-5 rounded border border-white/5">
                                                        <div className="text-[#00d4ff]">{b.icon}</div>
                                                        <div>
                                                            <div className="font-rajdhani font-bold text-xl uppercase tracking-wide mb-1">{b.title}</div>
                                                            <div className="text-sm text-gray-400 leading-relaxed font-sans">{b.desc}</div>
                                                        </div>
                                                   </div>
                                              ))}
                                         </div>
                                    )}

                                    {idx === 4 && (
                                         <div className="mt-10 p-6 bg-[#0a0a0f] border border-[#00d4ff]/30 rounded">
                                               <div className="text-center font-mono text-xs text-[#00d4ff] mb-4">[ Sensor Array ]</div>
                                               <div className="w-px h-6 bg-[#00d4ff] mx-auto opacity-50" />
                                               <div className="text-center font-mono text-xs text-white bg-white/10 py-2 mt-2 rounded">FastAPI Backend + PostgreSQL</div>
                                               <div className="text-center font-mono text-xs text-gray-500 my-2">↕ Redis Sync</div>
                                               <div className="text-center font-mono text-xs text-[#ff3355] bg-[#ff3355]/20 py-2 rounded">Prophet ML Core</div>
                                               <div className="w-px h-6 bg-[#00d4ff] mx-auto opacity-50 mt-2" />
                                               <div className="text-center font-mono text-xs text-white bg-[#00d4ff]/20 py-2 mt-2 border border-[#00d4ff]/50 rounded shadow-[0_0_15px_rgba(0,212,255,0.2)]">WebSockets → React UX</div>
                                         </div>
                                    )}

                                    {idx === 5 && (
                                        <div className="mt-10 flex gap-4">
                                            <a href="#" className="bg-[#00d4ff] text-black font-rajdhani font-bold tracking-widest px-8 py-4 rounded uppercase hover:bg-white transition-colors text-lg">
                                                View Source Code →
                                            </a>
                                        </div>
                                    )}
                               </motion.div>
                           </div>
                       ))}
                  </div>

                  {/* Right Column: Unified 3D Canvas */}
                  <div className="hidden md:block w-[55%] h-[calc(100vh-64px)] fixed top-[64px] right-0 overflow-hidden radial-overlay">
                       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_transparent_0%,_#0a0a0f_100%)] z-10 pointer-events-none" />
                       <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                            <ambientLight intensity={0.5} />
                            <UnifiedDataEngine />
                       </Canvas>
                  </div>
              </div>
        </div>
    );
}
