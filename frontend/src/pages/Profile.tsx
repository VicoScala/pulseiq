import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMyProfile, useProfile, useFollow, useUnfollow, useNudge, useUpdateAvatar } from '../hooks/useSocial';
import { PostCard } from '../components/social/PostCard';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import type { FeedPost, Streak, Badge } from '../types/whoop';
import clsx from 'clsx';

const BADGE_ICON: Record<string, string> = {
  first_workout:    '🏋️',
  streak_5_recovery: '🔥',
  streak_10_recovery: '🔥🔥',
  streak_30_recovery: '🔥🔥🔥',
  streak_5_sleep:   '😴',
  streak_10_sleep:  '😴😴',
  pb_strain:        '📈',
  weekly_active:    '🗓️',
};

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: me } = useAuth();

  const isMe     = !userId || parseInt(userId) === me?.id;
  const myQ      = useMyProfile();
  const otherQ   = useProfile(userId ? parseInt(userId) : 0);
  const profileQ = isMe ? myQ : otherQ;

  const follow       = useFollow();
  const unfollow     = useUnfollow();
  const nudge        = useNudge();
  const updateAvatar = useUpdateAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (profileQ.isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (profileQ.isError) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Profil introuvable</p>
      </div>
    );
  }

  const { user, streaks = [], badges = [], followers, following, postCount, isFollowing, posts = [] } = profileQ.data ?? {};
  if (!user) return null;

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  const toggleFollow = () => {
    if (isFollowing) unfollow.mutate(user.id);
    else follow.mutate(user.id);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="bg-surface-1 border border-white/5 rounded-2xl p-6 space-y-4">
        {/* Avatar + actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Clickable avatar when viewing own profile */}
            <div
              className={clsx(
                'relative h-16 w-16 rounded-full bg-brand-blue/30 border-2 border-brand-blue/40 flex items-center justify-center text-2xl font-bold text-brand-blue overflow-hidden',
                isMe && 'cursor-pointer group',
              )}
              onClick={() => isMe && fileInputRef.current?.click()}
            >
              {updateAvatar.isPending ? (
                <Spinner size="sm" />
              ) : user.avatar_url ? (
                <img src={user.avatar_url} alt={initials} className="h-full w-full rounded-full object-cover" />
              ) : (
                initials
              )}
              {isMe && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            {/* Hidden file input */}
            {isMe && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) updateAvatar.mutate(file);
                  e.target.value = '';
                }}
              />
            )}
            <div>
              <h1 className="text-lg font-bold text-white">
                {user.first_name} {user.last_name}
              </h1>
              {user.created_at && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Membre depuis {format(new Date(user.created_at), 'MMMM yyyy', { locale: fr })} sur Whoop Mate
                </p>
              )}
              {user.bio && <p className="text-sm text-slate-400 mt-1">{user.bio}</p>}
            </div>
          </div>

          {/* Action buttons */}
          {!isMe && (
            <div className="flex gap-2">
              <button
                onClick={toggleFollow}
                disabled={follow.isPending || unfollow.isPending}
                className={clsx(
                  'text-sm font-semibold px-4 py-1.5 rounded-xl border transition-all',
                  isFollowing
                    ? 'bg-white/10 text-slate-300 border-white/10 hover:bg-red-500/20 hover:text-red-400'
                    : 'bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30',
                )}
              >
                {isFollowing ? 'Suivi ✓' : '+ Suivre'}
              </button>
              <button
                onClick={() => nudge.mutate(user.id)}
                className="text-sm px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Coup de pouce"
              >
                👋
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around pt-2 border-t border-white/5">
          <StatPill label="Posts" value={postCount ?? 0} />
          <div className="h-8 w-px bg-white/5" />
          <StatPill label="Followers" value={followers ?? 0} />
          <div className="h-8 w-px bg-white/5" />
          <StatPill label="Following" value={following ?? 0} />
        </div>

        {/* Streaks */}
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Série de jours</p>
          {(streaks as Streak[]).filter(s => s.current_count > 0).length === 0 ? (
            <p className="text-xs text-slate-600">Aucune série active · commence aujourd'hui !</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(streaks as Streak[]).filter(s => s.current_count > 0).map(s => (
                <div
                  key={s.type}
                  className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-2.5"
                >
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-xl font-black text-white leading-none">
                      {s.current_count}{' '}
                      <span className="text-sm font-medium text-slate-400">jours</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {s.type === 'recovery' ? 'Recovery' : 'Sommeil'} · record {s.best_count}j
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Badges</p>
            <div className="flex flex-wrap gap-2">
              {(badges as Badge[]).map(b => (
                <div
                  key={b.badge_type}
                  title={b.badge_type.replace(/_/g, ' ')}
                  className="h-9 w-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-lg"
                >
                  {BADGE_ICON[b.badge_type] ?? '🏅'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Activité récente
        </h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-surface-1 border border-white/5 rounded-2xl">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-slate-400 text-sm">Aucun post pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(posts as FeedPost[]).map(post => (
              <PostCard key={post.id} post={post} myUserId={me?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
