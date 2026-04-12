import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Clock, AlertOctagon, X } from 'lucide-react';
import { Alert } from '../../types';

interface AlertToastProps {
    alert: Alert;
    onDismiss: () => void;
}

const iconMap = {
    info: Info,
    long_queue: Clock,
    overcrowding: AlertTriangle,
    emergency: AlertOctagon,
    weather: AlertTriangle,
    staff_needed: Info
};

const AlertToast: React.FC<AlertToastProps> = ({ alert, onDismiss }) => {
    const isHighCrit = alert.severity === 'high' || alert.severity === 'critical';
    
    useEffect(() => {
        if (!isHighCrit) {
            const timer = setTimeout(onDismiss, 8000);
            return () => clearTimeout(timer);
        }
    }, [isHighCrit, onDismiss]);

    const bgMap = {
        low: 'bg-[#1a1a24] border-[#00d4ff]',
        medium: 'bg-[#1a1a24] border-[#ffd60a]',
        high: 'bg-[#ff6b35]/20 border-[#ff6b35] shadow-[0_0_20px_rgba(255,107,53,0.3)]',
        critical: 'bg-[#ff3355]/20 border-[#ff3355] shadow-[0_0_20px_rgba(255,51,85,0.4)] animate-pulse'
    };

    const textMap = {
        low: 'text-[#00d4ff]',
        medium: 'text-[#ffd60a]',
        high: 'text-[#ff6b35]',
        critical: 'text-[#ff3355]'
    };

    const Icon = iconMap[alert.alert_type as keyof typeof iconMap] || Info;

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            layout
            className={`w-80 p-4 rounded-lg border-l-4 backdrop-blur-md relative ${bgMap[alert.severity as keyof typeof bgMap] || bgMap.low}`}
        >
            <button onClick={onDismiss} className="absolute top-2 right-2 text-gray-400 hover:text-white transition">
                <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3 items-start">
                <Icon className={`w-6 h-6 shrink-0 mt-1 ${textMap[alert.severity as keyof typeof textMap] || textMap.low}`} />
                <div>
                    <h4 className="font-rajdhani font-bold text-lg tracking-wide text-white uppercase">{alert.title}</h4>
                    <p className="font-sans text-sm text-gray-300 mt-1 leading-relaxed">
                        {alert.message.length > 100 ? `${alert.message.substring(0, 100)}...` : alert.message}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm border ${textMap[alert.severity as keyof typeof textMap] || textMap.low} border-current`}>
                            {alert.severity}
                        </span>
                        <span className="text-[10px] text-gray-500 font-sans">{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AlertToast;
