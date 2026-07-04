import { useRef, useState, useCallback } from "react";

/**
 * useBackendSocket — Django backend (Render pe deployed) se optional
 * connection. VITE_WS_URL set na ho to yeh silently no-op rehta hai —
 * matlab yeh React app AKELE bhi (bina kisi backend ke) fully demo
 * mode me chal sakta hai, sirf live analysis save/PDF/history nahi milega.
 */
export default function useBackendSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState(null);

  const connect = useCallback((sessionId) => {
    let base = import.meta.env.VITE_WS_URL;
    if (!base && import.meta.env.VITE_API_URL) {
      // VITE_API_URL="https://backend.onrender.com" se seedha WS url bana lete hain,
      // taaki alag se VITE_WS_URL set karne ki zaroorat na pade
      base = import.meta.env.VITE_API_URL.replace(/^http/, "ws");
    }
    if (!base) {
      console.info("[Focusense] No backend URL set — running in standalone demo mode (no backend save).");
      return;
    }
    const url = `${base.replace(/\/$/, "")}/ws/session/${sessionId}/`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "alert") setLastAlert(data);
    };
  }, []);

  const send = useCallback((summary) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(summary));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  return { connect, send, disconnect, connected, lastAlert, enabled: Boolean(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL) };
}
