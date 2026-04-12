import apiClient from './client';
import { VenueCrowdSummary, VenueHeatmapOut, CrowdSnapshot } from '../types';

export const getCrowdSummary = async (venueId: string): Promise<VenueCrowdSummary> => {
    const res = await apiClient.get(`/crowd/venue/${venueId}/summary`);
    return res.data;
};

export const getCrowdHeatmap = async (venueId: string): Promise<VenueHeatmapOut> => {
    const res = await apiClient.get(`/crowd/venue/${venueId}/heatmap`);
    return res.data;
};

export const getCrowdHistory = async (zoneId: string, hours: number = 24): Promise<CrowdSnapshot[]> => {
    const res = await apiClient.get(`/crowd/zone/${zoneId}/history?hours=${hours}`);
    return res.data;
};

export const getCrowdPrediction = async (zoneId: string): Promise<any> => {
    const res = await apiClient.get(`/crowd/zone/${zoneId}/predict`);
    return res.data;
};

export const postCrowdSnapshot = async (data: { zone_id: string, venue_id: string, current_count: number, flow_direction?: object }): Promise<CrowdSnapshot> => {
    const res = await apiClient.post(`/crowd/snapshot`, data);
    return res.data;
};
