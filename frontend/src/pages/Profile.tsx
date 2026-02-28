import { useParams } from 'react-router-dom';
import { useMyProfile, useProfile, useFollow, useUnfollow, useNudge } from '../hooks/useSocial';
import { PostCard } from '../components/social/PostCard';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import type { FeedPost, Streak, Badge } from '../types/whoop';
import clsx from 'clsx';

const STREAK_ICON: Record<string, string> = { recovery: '💚', sleep: '🌙' };
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

  const follow   = useFollow();
  const unfollow = useUnfollow();
  const nudge    = useNudge();

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
            <div className="h-16 w-16 rounded-full bg-brand-blue/30 border-2 border-brand-blue/40 flex items-center justify-center text-2xl font-bold text-brand-blue">
              {user.avatar_url
                ? <img src={user.avatar_url} alt={initials} className="h-full w-full rounded-full object-cover" />
                : initials}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {user.first_name} {user.last_name}
              </h1>
              {user.bio && <p className="text-sm text-slate-400 mt-0.5">{user.bio}</p>}
              {user.last_active && (
                <p className="text-xs text-slate-600 mt-1">
                  Actif·ve récemment
                </p>
              )}
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
        {streaks.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Streaks</p>
            <div className="flex flex-wrap gap-2">
              {(streaks as Streak[]).map(s => (
                <div
                  key={s.type}
                  className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
                >
                  <span className="text-base">{STREAK_ICON[s.type] ?? '🏅'}</span>
                  <div>
                    <p className="text-xs text-slate-400">{s.type === 'recovery' ? 'Recovery' : 'Sommeil'}</p>
                    <p className="text-sm font-bold text-white">{s.current_count}j <span className="text-xs text-slate-500">/ max {s.best_count}j</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
