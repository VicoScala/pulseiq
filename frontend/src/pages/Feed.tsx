import { useRef, useCallback, useState } from 'react';
import { RefreshCw, Bell } from 'lucide-react';
import { useFeed, useNotifications, useMarkRead } from '../hooks/useSocial';
import { useWebSocket } from '../hooks/useWebSocket';
import { PostCard } from '../components/social/PostCard';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import type { FeedPost, Notification, WsMessage } from '../types/whoop';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Notification Tray ─────────────────────────────────────────────────────

const REACTION_EMOJI: Record<string, string> = {
  like: '👍', fire: '🔥', beast: '💪', rip: '💀', clap: '👏',
};

function notifContent(n: Notification): { icon: string; text: string } {
  const actor = n.first_name
    ? `${n.first_name}${n.last_name ? ' ' + n.last_name : ''}`
    : null;

  switch (n.notif_type) {
    case 'new_follower':
      return { icon: '👤', text: actor ? `${actor} te suit maintenant` : 'Nouveau follower' };

    case 'new_reaction': {
      const rxEmoji = n.extra_json?.reaction_type
        ? (REACTION_EMOJI[n.extra_json.reaction_type] ?? '⚡')
        : '⚡';
      return {
        icon: rxEmoji,
        text: actor
          ? `${actor} a réagi à ton post ${rxEmoji}`
          : `Nouvelle réaction ${rxEmoji}`,
      };
    }

    case 'new_comment':
      return {
        icon: '💬',
        text: actor ? `${actor} a commenté ton post` : 'Nouveau commentaire',
      };

    case 'new_mention':
      return {
        icon: '🔔',
        text: actor
          ? `${actor} t'a mentionné dans un commentaire`
          : 'Tu as été mentionné',
      };

    case 'nudge':
      return {
        icon: '👋',
        text: actor ? `${actor} t'envoie un coup de pouce !` : 'Coup de pouce reçu !',
      };

    case 'streak_warning':
      return { icon: '⚠️', text: 'Ta série est en danger · connecte-toi aujourd\'hui !' };

    case 'badge_earned':
      return { icon: '🏅', text: 'Nouveau badge débloqué !' };

    default:
      return { icon: '📣', text: n.notif_type };
  }
}

function NotifTray({ onClose }: { onClose: () => void }) {
  const { data }    = useNotifications();
  const markRead    = useMarkRead();
  const notifs: Notification[] = data?.notifications ?? [];
  const unread      = data?.unreadCount ?? 0;

  const handleMarkAllRead = () => {
    if (unread > 0) markRead.mutate(undefined);
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-surface-1 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {unread > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs text-brand-green hover:underline">
            Tout marquer lu
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
        {notifs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Aucune notification pour l'instant</p>
        ) : (
          notifs.map((n: Notification) => {
            const { icon, text } = notifContent(n);
            const initials = n.first_name
              ? `${n.first_name[0]}${n.last_name?.[0] ?? ''}`.toUpperCase()
              : null;

            return (
              <div
                key={n.id}
                className={clsx(
                  'px-4 py-3 flex items-start gap-3 transition-colors',
                  !n.read ? 'bg-brand-green/5' : 'hover:bg-white/[0.02]',
                )}
              >
                {/* Avatar with action badge */}
                {initials ? (
                  <div className="relative flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center text-[10px] font-bold text-brand-blue overflow-hidden">
                      {n.avatar_url
                        ? <img src={n.avatar_url} alt={initials} className="h-full w-full object-cover" />
                        : initials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-1 text-sm leading-none">{icon}</span>
                  </div>
                ) : (
                  <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white leading-snug">{text}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="h-2 w-2 rounded-full bg-brand-green flex-shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
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
