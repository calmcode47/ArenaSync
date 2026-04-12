import apiClient from './client';
import { VenueQueueSummary, QueuePredictionOut } from '../types';

export const getVenueQueueSummary = async (venueId: string): Promise<VenueQueueSummary> => {
    const res = await apiClient.get(`/queue/venue/${venueId}/summary`);
    return res.data;
};

export const getZoneQueuePrediction = async (zoneId: string): Promise<QueuePredictionOut> => {
    const res = await apiClient.get(`/queue/zone/${zoneId}/prediction`);
    return res.data;
};

export const postQueueEntry = async (data: { zone_id: string, venue_id: string, queue_length: number, service_rate: number }): Promise<any> => {
    const res = await apiClient.post(`/queue/record`, data);
    return res.data;
};

export const updateActualWait = async (entryId: string, actualWaitMinutes: number): Promise<any> => {
    const res = await apiClient.put(`/queue/entry/${entryId}/actual-wait`, { actual_wait_minutes: actualWaitMinutes });
    return res.data;
};
