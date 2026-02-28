import { useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Zap } from 'lucide-react';

export interface ToastNotif {
  id: string;
  notifType: string;
  fromFirstName?: string | null;
  fromLastName?: string | null;
}

interface ContainerProps {
  toasts: ToastNotif[];
  onDismiss: (id: string) => void;
}

function notifIcon(type: string) {
  switch (type) {
    case 'new_reaction': return <Heart className="h-4 w-4 text-brand-red" />;
    case 'new_comment':  return <MessageCircle className="h-4 w-4 text-brand-blue" />;
    case 'new_follower': return <UserPlus className="h-4 w-4 text-brand-green" />;
    case 'nudge':        return <Zap className="h-4 w-4 text-brand-yellow" />;
    default:             return <Bell className="h-4 w-4 text-slate-400" />;
  }
}

function notifText(type: string): string {
  switch (type) {
    case 'new_reaction': return 'a réagi à votre publication';
    case 'new_comment':  return 'a commenté votre publication';
    case 'new_follower': return 'vous suit maintenant';
    case 'nudge':        return 'vous a envoyé un coup de coude';
    default:             return 'vous a notifié';
  }
}

function Toast({ toast, onDismiss }: { toast: ToastNotif; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const actorName =
    [toast.fromFirstName, toast.fromLastName].filter(Boolean).join(' ') || 'Quelqu\'un';

  return (
    <div
      role="alert"
      onClick={onDismiss}
      className="flex items-center gap-3 bg-surface-1 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl w-72 cursor-pointer hover:border-white/20 transition-colors"
    >
      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        {notifIcon(toast.notifType)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white leading-snug">
          <span className="font-semibold">{actorName} </span>
          <span className="text-slate-400">{notifText(toast.notifType)}</span>
        </p>
      </div>
    </div>
  );
}

export function NotifToastContainer({ toasts, onDismiss }: ContainerProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
