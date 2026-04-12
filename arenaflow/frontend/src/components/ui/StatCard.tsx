import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: number | string;
    unit?: string;
    delta?: number;
    deltaType?: 'positive' | 'negative' | 'neutral';
    icon?: React.ElementType;
    color?: 'blue' | 'green' | 'orange' | 'red';
}

const colorMap = {
    blue: { text: 'text-[#00d4ff]', border: 'group-hover:border-[#00d4ff]/50', shadow: 'group-hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]' },
    green: { text: 'text-[#00ff88]', border: 'group-hover:border-[#00ff88]/50', shadow: 'group-hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]' },
    orange: { text: 'text-[#ff6b35]', border: 'group-hover:border-[#ff6b35]/50', shadow: 'group-hover:shadow-[0_0_20px_rgba(255,107,53,0.15)]' },
    red: { text: 'text-[#ff3355]', border: 'group-hover:border-[#ff3355]/50', shadow: 'group-hover:shadow-[0_0_20px_rgba(255,51,85,0.15)]' },
};

const StatCard: React.FC<StatCardProps> = ({ 
    label, value, unit, delta, deltaType = 'neutral', icon: Icon, color = 'blue' 
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const controls = useAnimation();
    const [displayValue, setDisplayValue] = useState(0);
    const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;

    useEffect(() => {
        if (isInView) {
            controls.start({ opacity: 1, y: 0 });
            let start = 0;
            const duration = 1000;
            const startTime = performance.now();
            
            const updateCounter = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 4);
                setDisplayValue(Math.floor(ease * numValue));
                
                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    setDisplayValue(numValue);
                }
            };
            requestAnimationFrame(updateCounter);
        }
    }, [isInView, controls, numValue]);

    const theme = colorMap[color];

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={controls}
            transition={{ duration: 0.5 }}
            className={`group bg-[#1a1a24] rounded-xl p-5 border border-white/5 relative overflow-hidden transition-all duration-300 ${theme.border} ${theme.shadow}`}
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-rajdhani uppercase tracking-widest text-sm text-gray-400">{label}</h3>
                {Icon && <Icon className={`w-5 h-5 ${theme.text} opacity-50 group-hover:opacity-100 transition-opacity`} />}
            </div>
            
            <div className="flex items-baseline gap-1">
                <span className={`font-rajdhani text-4xl font-bold ${theme.text} drop-shadow-[0_0_8px_currentColor]`}>
                    {typeof value === 'number' ? displayValue : value}
                </span>
                {unit && <span className="text-gray-500 font-sans text-sm ml-1">{unit}</span>}
            </div>

            {delta !== undefined && (
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold">
                    {deltaType === 'positive' && <TrendingUp className="w-3 h-3 text-[#00ff88]" />}
                    {deltaType === 'negative' && <TrendingDown className="w-3 h-3 text-[#ff3355]" />}
                    {deltaType === 'neutral' && <Minus className="w-3 h-3 text-gray-400" />}
                    <span className={deltaType === 'positive' ? 'text-[#00ff88]' : deltaType === 'negative' ? 'text-[#ff3355]' : 'text-gray-400'}>
                        {Math.abs(delta)}% vs last hr
                    </span>
                </div>
            )}
        </motion.div>
    );
};

export default StatCard;
