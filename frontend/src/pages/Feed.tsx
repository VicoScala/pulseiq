import { useRef, useCallback, useState } from 'react';
import { RefreshCw, Bell, Flame } from 'lucide-react';
import { useFeed, useNotifications, useMarkRead, useMorningStats } from '../hooks/useSocial';
import { useWebSocket } from '../hooks/useWebSocket';
import { PostCard } from '../components/social/PostCard';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import type { FeedPost, Notification, WsMessage } from '../types/whoop';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Morning Stats Banner ──────────────────────────────────────────────────

function MorningBanner() {
  const { data } = useMorningStats();
  if (!data || data.recovery == null) return null;

  const color =
    data.recovery >= 67 ? 'brand-green' :
    data.recovery >= 34 ? 'yellow-400' : 'red-500';

  return (
    <div className={`bg-${color}/10 border border-${color}/20 rounded-2xl p-4 flex items-center justify-between`}>
      <div>
        <p className="text-sm font-semibold text-white">Ton matin aujourd'hui</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Recovery&nbsp;
          <span className={`text-${color} font-bold`}>{Math.round(data.recovery)}%</span>
          {data.hrv != null && <> · HRV <span className="text-white font-medium">{Math.round(data.hrv)} ms</span></>}
          {data.sleep_perf != null && <> · Sommeil <span className="text-white font-medium">{Math.round(data.sleep_perf)}%</span></>}
        </p>
      </div>
      {(data.streak_recovery > 2 || data.streak_sleep > 2) && (
        <div className="flex items-center gap-1.5 text-yellow-400">
          <Flame className="h-4 w-4" />
          <span className="text-xs font-bold">
            {Math.max(data.streak_recovery, data.streak_sleep)}j streak
          </span>
        </div>
      )}
    </div>
  );
}

// ── Notification Tray ─────────────────────────────────────────────────────

function NotifTray({ onClose }: { onClose: () => void }) {
  const { data }    = useNotifications();
  const markRead    = useMarkRead();
  const notifs: Notification[] = data?.notifications ?? [];
  const unread      = data?.unreadCount ?? 0;

  const handleOpen = () => {
    if (unread > 0) markRead.mutate(undefined);
    onClose();
  };

  const NOTIF_ICON: Record<string, string> = {
    new_follower: '👤',
    new_reaction: '⚡',
    new_comment:  '💬',
    nudge:        '👋',
    streak_warning: '⚠️',
    badge_earned: '🏅',
  };
  const NOTIF_TEXT: Record<string, string> = {
    new_follower: 'te suit maintenant',
    new_reaction: 'a réagi à ton post',
    new_comment:  'a commenté ton post',
    nudge:        'te donne un coup de pouce !',
    streak_warning: 'ta streak est en danger',
    badge_earned: 'nouveau badge débloqué !',
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-surface-1 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        <button onClick={handleOpen} className="text-xs text-brand-green hover:underline">
          Tout marquer lu
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
        {notifs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Aucune notification</p>
        ) : (
          notifs.map((n: Notification) => (
            <div
              key={n.id}
              className={clsx('px-4 py-3 flex items-start gap-3', !n.read && 'bg-brand-green/5')}
            >
              <span className="text-lg flex-shrink-0">{NOTIF_ICON[n.notif_type] ?? '📣'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white leading-snug">
                  {n.first_name && <span className="font-medium">{n.first_name} {n.last_name} </span>}
                  {NOTIF_TEXT[n.notif_type] ?? n.notif_type}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              {!n.read && <div className="h-2 w-2 rounded-full bg-brand-green flex-shrink-0 mt-1" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Feed Page ─────────────────────────────────────────────────────────────

export function FeedPage() {
  const { user }    = useAuth();
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch,
  } = useFeed();

  const [showNotifs, setShowNotifs] = useState(false);
  const [nudge, setNudge]           = useState<string | null>(null);
  const { data: notifData }         = useNotifications();
  const unread                      = notifData?.unreadCount ?? 0;

  // WebSocket — listen for nudges + new posts
  useWebSocket((msg: WsMessage) => {
    if (msg.type === 'nudge') {
      setNudge('Quelqu\'un t\'envoie un coup de pouce 👋');
      setTimeout(() => setNudge(null), 4000);
    }
  });

  // Infinite scroll sentinel
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage) fetchNextPage(); },
      { threshold: 0.1 },
    );
    observerRef.current.observe(node);
  }, [hasNextPage, fetchNextPage]);

  const posts: FeedPost[] = (data?.pages ?? [])
    .flatMap((p: any) => (Array.isArray(p?.posts) ? p.posts : []))
    .filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Fil d'actualité</h1>
          <p className="text-sm text-slate-400">Les performances de ton cercle</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="relative p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {showNotifs && <NotifTray onClose={() => setShowNotifs(false)} />}
          </div>
        </div>
      </div>

      {/* Morning banner */}
      <MorningBanner />

      {/* Nudge toast */}
      {nudge && (
        <div className="bg-brand-green/15 border border-brand-green/30 rounded-xl px-4 py-3 text-sm text-brand-green font-medium animate-pulse">
          {nudge}
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">👥</p>
          <p className="text-white font-medium">Aucune activité pour l'instant</p>
          <p className="text-sm text-slate-400">Suis des amis pour voir leurs performances ici</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {posts.map((post: FeedPost) => (
              <PostCard key={post.id} post={post} myUserId={user?.id} />
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4"><Spinner /></div>
          )}
          {!hasNextPage && posts.length > 5 && (
            <p className="text-center text-xs text-slate-600 py-4">C'est tout pour le moment ✓</p>
          )}
        </>
      )}
    </div>
  );
}
