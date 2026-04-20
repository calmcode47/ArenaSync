import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, ShieldAlert, Zap, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

interface GeminiInsightsProps {
    venueId: string;
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ venueId }) => {
    const { data: insights, isLoading, isError } = useQuery({
        queryKey: ['gemini_insights', venueId],
        queryFn: async () => {
            const res = await api.get(`/ml/insights/${venueId}`);
            return res.data;
        },
        refetchInterval: 30000, // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="bg-[#1a1a24] border border-[#00d4ff]/20 rounded-xl p-5 h-full animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-[#00d4ff]/40" />
                    <div className="h-4 w-32 bg-white/5 rounded" />
                </div>
                <div className="space-y-3">
                    <div className="h-3 w-full bg-white/5 rounded" />
                    <div className="h-3 w-5/6 bg-white/5 rounded" />
                    <div className="h-3 w-4/6 bg-white/5 rounded" />
                </div>
            </div>
        );
    }

    if (isError || !insights) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1a24] border border-[#00d4ff]/30 rounded-xl p-5 relative overflow-hidden h-full shadow-[0_0_30px_rgba(0,212,255,0.05)]"
        >
            {/* Animated Neural Background Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4ff] opacity-[0.03] blur-3xl rounded-full" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20">
                        <Brain className="w-5 h-5 text-[#00d4ff]" />
                    </div>
                    <h3 className="font-rajdhani font-bold text-lg text-white tracking-widest uppercase">Gemini Neural Advisor</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded">
                    <Zap className="w-3 h-3 text-[#00ff88]" />
                    <span className="text-[9px] font-mono font-bold text-[#00ff88]">LIVE</span>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="p-3 bg-black/40 border border-white/5 rounded-lg">
                    <p className="text-[13px] text-gray-300 leading-relaxed italic">
                        "{insights.strategic_summary}"
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#00d4ff]/5 border border-[#00d4ff]/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3 h-3 text-[#00d4ff]" />
                            <span className="text-[9px] font-rajdhani font-bold text-gray-500 uppercase tracking-widest">Efficiency</span>
                        </div>
                        <div className="text-2xl font-rajdhani font-bold text-white">
                            {insights.efficiency_score}%
                        </div>
                    </div>
                    <div className="p-3 bg-[#ffd60a]/5 border border-[#ffd60a]/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3 h-3 text-[#ffd60a]" />
                            <span className="text-[9px] font-rajdhani font-bold text-gray-500 uppercase tracking-widest">Maneuver</span>
                        </div>
                        <div className="text-[10px] font-bold text-white leading-tight uppercase">
                            {insights.staff_maneuver}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-rajdhani font-bold text-[#ff3355] tracking-widest uppercase">
                        <ShieldAlert className="w-3 h-3" />
                        Tactical Recommendations
                    </div>
                    <ul className="space-y-2">
                        {insights.critical_recommendations?.map((rec: string, i: number) => (
                            <motion.li 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="text-[11px] text-gray-400 flex gap-2 items-start"
                            >
                                <span className="text-[#ff3355] mt-1">▹</span>
                                {rec}
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Model: Gemini-1.5-Pro</span>
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Conf: 0.98</span>
            </div>
        </motion.div>
    );
};

export default GeminiInsights;
