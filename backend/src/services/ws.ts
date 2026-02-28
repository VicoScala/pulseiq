import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { getSession } from '../db/database';

// userId → Set of open WS connections (multiple tabs/devices)
const connections = new Map<number, Set<WebSocket>>();

function parseCookies(header = ''): Record<string, string> {
  return Object.fromEntries(
    header.split(';')
      .map(c => c.trim().split('='))
      .filter(p => p.length >= 2)
      .map(([k, ...v]) => [k.trim(), decodeURIComponent(v.join('=').trim())]),
  );
}

export function createWss(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['pulseiq_session'];

    if (!sessionId) { ws.close(4001, 'Unauthorized'); return; }

    const session = getSession(sessionId);
    if (!session || new Date(session.expires_at) < new Date()) {
      ws.close(4001, 'Session expired');
      return;
    }

    const userId = session.user_id;
    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId)!.add(ws);

    ws.send(JSON.stringify({ type: 'connected', userId }));

    ws.on('close', () => {
      connections.get(userId)?.delete(ws);
      if (connections.get(userId)?.size === 0) connections.delete(userId);
    });

    ws.on('error', () => {
      connections.get(userId)?.delete(ws);
    });
  });

  return wss;
}

/** Push a real-time event to all open connections for a given user. */
export function pushToUser(userId: number, event: object): void {
  const sockets = connections.get(userId);
  if (!sockets || sockets.size === 0) return;
  const msg = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

export function connectedUserIds(): number[] {
  return [...connections.keys()];
}
