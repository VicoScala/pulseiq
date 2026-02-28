import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WsMessage } from '../types/whoop';

type Handler = (msg: WsMessage) => void;

export function useWebSocket(onMessage?: Handler) {
  const qc  = useRef(useQueryClient());
  const ws  = useRef<WebSocket | null>(null);
  const cb  = useRef(onMessage);
  cb.current = onMessage;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket   = new WebSocket(`${protocol}://${window.location.host}/ws`);
    ws.current     = socket;

    socket.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data);
        if (msg.type === 'new_post') {
          qc.current.invalidateQueries({ queryKey: ['social', 'feed'] });
        }
        if (msg.type === 'new_notif') {
          qc.current.invalidateQueries({ queryKey: ['social', 'notifications'] });
        }
        cb.current?.(msg);
      } catch {
        // ignore parse errors
      }
    };

    socket.onclose = () => {
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    connect();
    const ping = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);
    return () => {
      clearInterval(ping);
      ws.current?.close();
    };
  }, [connect]);
}
