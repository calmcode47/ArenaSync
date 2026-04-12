import React from 'react';
import { CongestionLevel } from '../../types';

interface ZoneBadgeProps {
    level: CongestionLevel;
    size?: 'sm' | 'md';
}

const config = {
    low: { color: 'bg-[#00ff88]', text: 'text-[#00ff88]', label: 'LOW', shadow: 'shadow-[0_0_10px_#00ff88]' },
    moderate: { color: 'bg-[#ffd60a]', text: 'text-[#ffd60a]', label: 'MOD', shadow: 'shadow-[0_0_10px_#ffd60a]' },
    high: { color: 'bg-[#ff6b35]', text: 'text-[#ff6b35]', label: 'HIGH', shadow: 'shadow-[0_0_10px_#ff6b35]' },
    critical: { color: 'bg-[#ff3355]', text: 'text-[#ff3355]', label: 'CRIT', shadow: 'shadow-[0_0_10px_#ff3355]', animate: 'animate-pulse' },
};

const ZoneBadge: React.FC<ZoneBadgeProps> = ({ level, size = 'md' }) => {
    const style = config[level || 'low'];
    
    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md bg-[#1a1a24] border border-white/5 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
            <div className={`relative flex h-2 w-2`}>
                {level === 'critical' && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.color} opacity-75`}></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${style.color} ${style.shadow}`}></span>
            </div>
            <span className={`font-rajdhani font-bold tracking-wider ${style.text}`}>
                {style.label}
            </span>
        </div>
    );
};

export default ZoneBadge;
