"use client";

import { useEffect, useRef } from "react";

export interface SSEEventData {
  type: string;
  [key: string]: unknown;
}

/**
 * Hook to subscribe to Server-Sent Events from the backend.
 * Auto-reconnects on disconnect. Calls onEvent for each received event.
 */
export function useSSE(onEvent: (event: SSEEventData) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/v1/events");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as SSEEventData;
          onEventRef.current(data);
        } catch {
          // Ignore parse errors
        }
      };

      // Listen for specific event types
      const eventTypes = [
        "spk:updated",
        "spk:selesai",
        "spk:kendala",
        "pembayaran:lunas",
        "pembayaran:bayar",
      ];

      eventTypes.forEach((type) => {
        es!.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as SSEEventData;
            onEventRef.current(data);
          } catch {
            // Ignore
          }
        });
      });

      es.onerror = () => {
        es?.close();
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, []);
}
