"use client";

import { useEffect, useRef } from "react";
import { revalidateKeys } from "./useApiSWR";

export interface SSEEventData {
  type: string;
  [key: string]: unknown;
}

/** Map SSE event types to SWR cache prefixes for auto-revalidation */
const SSE_REVALIDATION_MAP: Record<string, string[]> = {
  "spk:updated": ["/spk", "/dashboard"],
  "spk:selesai": ["/spk", "/dashboard", "/pembayaran"],
  "spk:kendala": ["/spk", "/dashboard"],
  "pembayaran:lunas": ["/pembayaran", "/dashboard"],
  "pembayaran:bayar": ["/pembayaran", "/dashboard"],
  "inventaris:stok-update": ["/sparepart", "/inventaris", "/dashboard"],
  "notifikasi:new": ["/notifikasi"],
};

/**
 * Hook to subscribe to Server-Sent Events from the backend.
 * Auto-reconnects on disconnect. Calls onEvent for each received event.
 * Optionally auto-revalidates SWR cache for related data.
 *
 * @param onEvent - Callback for each received event
 * @param autoRevalidate - If true, automatically revalidate SWR cache on relevant events (default: true)
 */
export function useSSE(onEvent: (event: SSEEventData) => void, autoRevalidate: boolean = true) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function handleEvent(data: SSEEventData) {
      onEventRef.current(data);

      // Auto-revalidate SWR cache
      if (autoRevalidate && data.type) {
        const prefixes = SSE_REVALIDATION_MAP[data.type];
        if (prefixes) {
          revalidateKeys(...prefixes);
        }
      }
    }

    function connect() {
      es = new EventSource("/api/v1/events");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as SSEEventData;
          handleEvent(data);
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
        "inventaris:stok-update",
        "notifikasi:new",
      ];

      eventTypes.forEach((type) => {
        es!.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as SSEEventData;
            handleEvent(data);
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
  }, [autoRevalidate]);
}

