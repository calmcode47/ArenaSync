import { create } from 'zustand';
import { Alert } from '../types';

interface AlertState {
    alerts: Alert[];
    setAlerts: (alerts: Alert[]) => void;
    addAlert: (alert: Alert) => void;
    clearAlert: (alertId: string) => void;
    clearAll: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
    alerts: [],
    setAlerts: (alerts) => set({ alerts }),
    addAlert: (alert) => set((state) => {
        const existing = state.alerts.findIndex(a => a.id === alert.id);
        if (existing >= 0) {
            const newAlerts = [...state.alerts];
            newAlerts[existing] = alert;
            return { alerts: newAlerts };
        }
        return { alerts: [alert, ...state.alerts] };
    }),
    clearAlert: (alertId) => set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== alertId)
    })),
    clearAll: () => set({ alerts: [] }),
}));
