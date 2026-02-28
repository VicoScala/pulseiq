import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useWebSocket } from '../hooks/useWebSocket';
import { NotifToastContainer, type ToastNotif } from './NotifToast';
import type { WsMessage } from '../types/whoop';

export function Layout() {
  const [toasts, setToasts] = useState<ToastNotif[]>([]);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'notification' && msg.data?.type) {
      const notif: ToastNotif = {
        id: `${Date.now()}-${Math.random()}`,
        notifType:     msg.data.type,
        fromFirstName: msg.data.fromFirstName ?? null,
        fromLastName:  msg.data.fromLastName  ?? null,
      };
      setToasts(prev => [...prev.slice(-4), notif]); // keep at most 5
    }
  }, []);

  useWebSocket(handleWsMessage);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <NotifToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
