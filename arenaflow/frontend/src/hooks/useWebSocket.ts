import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../store/alertStore';

export interface WSMessage {
    event: string;
    data: any;
    timestamp: string;
}

export function useWebSocket(venueId: string | null) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const attemptRef = useRef(0);
    const isMounted = useRef(true);
    const queryClient = useQueryClient();

    const connect = useCallback(() => {
        if (!venueId) return;
        const token = localStorage.getItem("arenaflow_token");
        if (!token) return;

        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const httpBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
        const rootUrl = httpBase.replace('/api/v1', '');
        const wsBase = rootUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
        const url = `${wsBase}/ws/${venueId}?token=${token}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMounted.current) return ws.close();
            setIsConnected(true);
            attemptRef.current = 0;
            console.debug(`[WS] Connected to venue ${venueId}`);
        };

        ws.onclose = (event) => {
            setIsConnected(false);
            if (!isMounted.current || event.code === 1000) return;

            if (attemptRef.current < 5) {
                const delay = Math.pow(2, attemptRef.current) * 1000;
                attemptRef.current++;
                console.debug(`[WS] Disconnected. Reconnecting in ${delay}ms... (Attempt ${attemptRef.current}/5)`);
                setTimeout(() => {
                    if (isMounted.current) connect();
                }, delay);
            } else {
                console.error("[WS] Connection failed after 5 attempts.");
            }
        };

        ws.onerror = (error) => {
            console.error("[WS] Error:", error);
        };

        ws.onmessage = (event) => {
            try {
                const msg: WSMessage = JSON.parse(event.data);
                setLastMessage(msg);

                switch(msg.event) {
                    case "crowd_update":
                        queryClient.setQueryData(["crowd", "summary", venueId], msg.data);
                        break;
                    case "queue_update":
                        queryClient.setQueryData(["queue", "summary", venueId], msg.data);
                        break;
                    case "alert_created":
                        useAlertStore.getState().addAlert(msg.data);
                        break;
                    case "alert_resolved":
                        useAlertStore.getState().clearAlert(msg.data.alert_id);
                        queryClient.invalidateQueries({ queryKey: ["alerts", venueId] });
                        break;
                    case "queue_called":
                        useAlertStore.getState().addAlert({
                            id: msg.data.ticket_code,
                            venue_id: venueId,
                            zone_id: undefined,
                            alert_type: "info",
                            severity: "low",
                            title: "Queue Called",
                            message: `Ticket ${msg.data.ticket_code} — proceed to ${msg.data.zone_name}`,
                            translated_messages: {},
                            is_resolved: false,
                            fcm_sent: false,
                            created_at: new Date().toISOString()
                        });
                        break;
                    case "ping":
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ event: "pong" }));
                        }
                        break;
                }
            } catch (err) {
                console.error("[WS] Failed to parse message:", err);
            }
        };
    }, [venueId, queryClient]);

    useEffect(() => {
        isMounted.current = true;
        connect();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isConnected) {
                // Let the browser connection unthaw slightly
                setTimeout(connect, 300);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isMounted.current = false;
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (wsRef.current) {
                wsRef.current.close(1000, "component unmount");
                wsRef.current = null;
            }
        };
    }, [connect, isConnected]);

    const sendMessage = useCallback((event: string, data: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ event, data }));
        } else {
            console.warn("[WS] Cannot send — not connected");
        }
    }, []);

    const reconnect = useCallback(() => {
        attemptRef.current = 0;
        if (wsRef.current) {
            wsRef.current.close(1000, "manual reconnect");
        }
        setTimeout(connect, 100);
    }, [connect]);

    return {
        isConnected,
        lastMessage,
        sendMessage,
        reconnect
    };
}
