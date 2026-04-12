import apiClient from './client';
import { Alert } from '../types';

export const getActiveAlerts = async (venueId: string): Promise<Alert[]> => {
    const res = await apiClient.get(`/alerts/venue/${venueId}`);
    return res.data;
};

export const createAlert = async (data: { venue_id: string, zone_id?: string | null, alert_type: string, severity: string, title: string, message: string }): Promise<Alert> => {
    const res = await apiClient.post(`/alerts/create`, data);
    return res.data;
};

export const resolveAlert = async (alertId: string): Promise<Alert> => {
    const res = await apiClient.patch(`/alerts/${alertId}/resolve`, { is_resolved: true });
    return res.data;
};

export const getAlertById = async (alertId: string): Promise<Alert> => {
    const res = await apiClient.get(`/alerts/${alertId}`);
    return res.data;
};
