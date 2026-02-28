import { useState } from 'react';
import { Search, Trophy } from 'lucide-react';
import { useDiscover, useLeaderboard, useFollow, useUnfollow, useNudge } from '../hooks/useSocial';
import { UserCard } from '../components/social/UserCard';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

type LeaderType = 'recovery' | 'strain' | 'sleep';

const LEADER_LABELS: Record<LeaderType, string> = {
  recovery: 'Recovery',
  strain:   'Strain',
  sleep:    'Sommeil',
};

function LeaderboardSection() {
  const [type, setType] = useState<LeaderType>('recovery');
  const { data, isLoading } = useLeaderboard(type);
  const follow   = useFollow();
  const unfollow = useUnfollow();
  const nudge    = useNudge();

  const METRIC_UNIT: Record<LeaderType, string> = {
    recovery: '%',
    strain:   '',
    sleep:    '%',
  };

  return (
    <div className="bg-surface-1 border border-white/5 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <h2 className="font-semibold text-white text-sm">Classement</h2>
        </div>
        <div className="flex gap-1">
          {(Object.keys(LEADER_LABELS) as LeaderType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                type === t
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              )}
            >
              {LEADER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="divide-y divide-white/5">
          {(Array.isArray(data) ? data : []).slice(0, 10).map((entry: any, i: number) => {
            const val = entry.value ?? 0;
            const displayVal = type === 'strain'
              ? val.toFixed(1)
              : Math.round(val).toString();
            return (
            <div
              key={`${entry.user_id}-${i}`}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5',
                entry.is_me && 'bg-brand-green/5',
              )}
            >
              {/* Rank */}
              <div className={clsx(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                i === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                i === 1 ? 'bg-slate-400/20 text-slate-400' :
                i === 2 ? 'bg-amber-600/20 text-amber-600' :
                'bg-white/5 text-slate-500',
              )}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>

              {/* Avatar + name */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center text-[10px] font-bold text-brand-blue flex-shrink-0">
                  {entry.first_name?.[0]}{entry.last_name?.[0]}
                </div>
                <span className={clsx('text-sm truncate', entry.is_me ? 'text-brand-green font-semibold' : 'text-white')}>
                  {entry.first_name} {entry.last_name}
                  {entry.is_me && ' (toi)'}
                </span>
              </div>

              {/* Value */}
              <span className="text-sm font-bold text-white flex-shrink-0">
                {displayVal}{METRIC_UNIT[type]}
              </span>

              {/* Actions */}
              {!entry.is_me && (
                <div className="flex gap-1">
                  <button
                    onClick={() => entry.isFollowing ? unfollow.mutate(entry.user_id) : follow.mutate(entry.user_id)}
                    className={clsx(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all',
                      entry.isFollowing
                        ? 'text-slate-400 border-white/10 hover:text-red-400 hover:border-red-500/30'
                        : 'text-brand-green border-brand-green/30 hover:bg-brand-green/20',
                    )}
                  >
                    {entry.isFollowing ? 'Suivi' : 'Suivre'}
                  </button>
                  <button
                    onClick={() => nudge.mutate(entry.user_id)}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Donner un coup de pouce"
                  >
                    👋
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Discover Page ─────────────────────────────────────────────────────────

export function DiscoverPage() {
  const { user }          = useAuth();
  const [query, setQuery] = useState('');
  const { data, isLoading } = useDiscover(query.length >= 2 ? query : undefined);
  const results            = data?.results ?? [];
  const suggestions        = data?.suggestions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Découvrir</h1>
        <p className="text-sm text-slate-400">Trouve et suis des athlètes</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher par nom…"
          className="w-full bg-surface-1 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-green/40"
        />
      </div>

      {/* Search results */}
      {query.length >= 2 && (
        <div className="bg-surface-1 border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">
              Résultats ({results.length})
            </h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Aucun résultat pour "{query}"</p>
          ) : (
            <div className="p-2 space-y-0.5">
              {results.map((u: any) => (
                <UserCard key={u.id} user={u} viewerId={user?.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {query.length < 2 && suggestions.length > 0 && (
        <div className="bg-surface-1 border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Suggestions pour toi</h2>
            <p className="text-xs text-slate-500 mt-0.5">Personnes que tu pourrais connaître</p>
          </div>
          <div className="p-2 space-y-0.5">
            {suggestions.map((u: any) => (
              <UserCard key={u.id} user={u} viewerId={user?.id} />
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardSection />
    </div>
  );
}
