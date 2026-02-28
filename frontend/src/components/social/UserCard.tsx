import clsx from 'clsx';
import type { PublicUser } from '../../types/whoop';
import { useFollow, useUnfollow } from '../../hooks/useSocial';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: PublicUser & { isFollowing?: boolean };
  compact?: boolean;
  showFollow?: boolean;
  viewerId?: number;
}

export function UserCard({ user, compact = false, showFollow = true, viewerId }: Props) {
  const navigate   = useNavigate();
  const follow     = useFollow();
  const unfollow   = useUnfollow();
  const isMe       = viewerId === user.id;
  const following  = user.isFollowing ?? false;

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (following) unfollow.mutate(user.id);
    else follow.mutate(user.id);
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors',
        compact ? 'p-2' : 'p-3',
      )}
      onClick={() => navigate(`/profile/${user.id}`)}
    >
      {/* Avatar */}
      <div className={clsx(
        'rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center font-bold text-brand-blue flex-shrink-0',
        compact ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm',
      )}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt={initials} className="h-full w-full rounded-full object-cover" />
          : initials}
      </div>

      {/* Name + bio */}
      <div className="min-w-0 flex-1">
        <p className={clsx('font-medium text-white truncate', compact ? 'text-sm' : 'text-base')}>
          {user.first_name} {user.last_name}
        </p>
        {!compact && user.bio && (
          <p className="text-xs text-slate-400 truncate">{user.bio}</p>
        )}
      </div>

      {/* Follow button */}
      {showFollow && !isMe && (
        <button
          onClick={toggle}
          disabled={follow.isPending || unfollow.isPending}
          className={clsx(
            'text-xs font-semibold px-3 py-1 rounded-full border transition-all flex-shrink-0',
            following
              ? 'bg-white/10 text-slate-300 border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
              : 'bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30',
          )}
        >
          {following ? 'Suivi' : 'Suivre'}
        </button>
      )}
    </div>
  );
}
