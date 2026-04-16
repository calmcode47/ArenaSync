export interface User { id: string; email: string; full_name: string; role: string; preferred_language: string; is_active: boolean; created_at: string; }
export interface Venue { id: string; name: string; city: string; country: string; total_capacity: number; latitude: number; longitude: number; google_place_id?: string; config_json: any; zones: ZoneOut[]; }
export interface ZoneOut { id: string; venue_id: string; is_active: boolean; name: string; zone_type: string; capacity: number; latitude: number; longitude: number; polygon_coords: any; }
export interface Zone { id: string; venue_id: string; name: string; zone_type: ZoneType; capacity: number; latitude: number; longitude: number; polygon_coords: any; is_active: boolean; }
export interface CrowdSnapshot { id: string; zone_id: string; venue_id: string; current_count: number; density_score: number; congestion_level: string; flow_direction: any; recorded_at: string; }
export interface VenueCrowdSummary { venue_id: string; total_current_count: number; total_capacity: number; overall_occupancy_pct: number; zones: ZoneCrowdStatus[]; }
export type CongestionLevel = "low" | "moderate" | "high" | "critical";
export interface ZoneCrowdStatus { zone_id: string; zone_name: string; zone_type: string; density_score: number; congestion_level: CongestionLevel; current_count: number; capacity: number; latitude?: number; longitude?: number; polygon_coords?: any; }
export interface CrowdHeatmapPoint { latitude: number; longitude: number; weight: number; }
export interface VenueHeatmapOut { venue_id: string; points: CrowdHeatmapPoint[]; generated_at: string; }
export interface QueueForecastPoint { timestamp: string; wait_time_minutes: number; yhat_lower: number; yhat_upper: number; }
export interface QueuePredictionOut { zone_id: string; zone_name: string; current_queue_length: number; estimated_wait_minutes: number; confidence_score: number; congestion_level: CongestionLevel; next_30min_forecast: QueueForecastPoint[]; }
export interface VenueQueueSummary { venue_id: string; total_global_queue_length: number; average_wait_minutes: number; zones: QueuePredictionOut[]; worst_zone_id: string; best_zone_id: string; }
export interface Alert { id: string; venue_id: string; zone_id?: string; alert_type: string; severity: AlertSeverity; title: string; message: string; translated_messages: any; is_resolved: boolean; fcm_sent: boolean; created_at: string; }
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertType = "overcrowding" | "long_queue" | "emergency" | "weather" | "info" | "staff_needed";
export type ZoneType = "gate" | "concession" | "restroom" | "seating" | "emergency_exit" | "parking";
export interface WSMessage { event: string; data: unknown; timestamp: string; }
