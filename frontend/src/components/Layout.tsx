import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useWebSocket } from '../hooks/useWebSocket';
import { NotifToastContainer, type ToastNotif } from './NotifToast';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WsMessage } from '../types/whoop';

function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success('Email de verification renvoye !');
    } catch {
      toast.error('Impossible de renvoyer l\'email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-brand-yellow/10 border-b border-brand-yellow/20 px-4 py-2 flex items-center justify-center gap-2 text-sm">
      <Mail size={14} className="text-brand-yellow flex-shrink-0" />
      <span className="text-brand-yellow">Verifiez votre email pour debloquer toutes les fonctionnalites.</span>
      <button
        onClick={resend}
        disabled={sending}
        className="text-brand-yellow underline hover:no-underline disabled:opacity-50"
      >
        {sending ? 'Envoi...' : 'Renvoyer'}
      </button>
    </div>
  );
}

export function Layout() {
  const { emailVerified } = useAuth();
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
      <div className="flex-1 flex flex-col overflow-auto">
        {!emailVerified && <EmailVerificationBanner />}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <NotifToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
