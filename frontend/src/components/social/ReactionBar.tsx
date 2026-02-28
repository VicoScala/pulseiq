import clsx from 'clsx';
import { REACTION_EMOJI, type ReactionType, type FeedPost } from '../../types/whoop';
import { useReact, useUnreact } from '../../hooks/useSocial';

interface Props {
  post: FeedPost;
}

export function ReactionBar({ post }: Props) {
  const react   = useReact();
  const unreact = useUnreact();

  const handleReaction = (type: ReactionType) => {
    if (post.my_reaction === type) {
      unreact.mutate(post.id);
    } else {
      react.mutate({ postId: post.id, reactionType: type });
    }
  };

  const reactions = (Object.keys(REACTION_EMOJI) as ReactionType[]).filter(
    (r) => (post.reaction_counts?.[r] ?? 0) > 0 || post.my_reaction === r,
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Active reactions */}
      {reactions.map((type) => (
        <button
          key={type}
          onClick={() => handleReaction(type)}
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all',
            post.my_reaction === type
              ? 'bg-brand-green/20 text-brand-green border-brand-green/30'
              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white',
          )}
        >
          <span>{REACTION_EMOJI[type]}</span>
          {(post.reaction_counts?.[type] ?? 0) > 0 && (
            <span>{post.reaction_counts![type]}</span>
          )}
        </button>
      ))}

      {/* Add reaction picker */}
      <div className="relative group">
        <button className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-slate-500 border border-white/5 hover:bg-white/10 hover:text-white transition-all">
          <span>+</span>
        </button>
        {/* Emoji picker on hover */}
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 bg-surface-2 border border-white/10 rounded-xl p-1.5 z-10 shadow-xl">
          {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              title={type}
              className={clsx(
                'h-8 w-8 rounded-lg flex items-center justify-center text-base hover:bg-white/10 transition-colors',
                post.my_reaction === type && 'bg-brand-green/20',
              )}
            >
              {REACTION_EMOJI[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
