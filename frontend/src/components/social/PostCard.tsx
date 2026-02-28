import { useState } from 'react';
import { MessageCircle, Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import type { FeedPost } from '../../types/whoop';
import { ReactionBar } from './ReactionBar';
import { CommentThread } from './CommentThread';
import { useRepost } from '../../hooks/useSocial';

interface Props {
  post: FeedPost;
  myUserId?: number;
}

const POST_TYPE_ICON: Record<string, string> = {
  sleep:  '🌙',
  streak: '🏆',
  pb:     '📈',
  repost: '🔁',
};

const SPORT_EMOJI: Record<string, string> = {
  'running':            '🏃',
  'cycling':            '🚴',
  'swimming':           '🏊',
  'weightlifting':      '🏋️',
  'powerlifting':       '🏋️',
  'functional fitness': '💪',
  'hiit':               '⚡',
  'hiking/rucking':     '🥾',
  'walking':            '🚶',
  'soccer':             '⚽',
  'basketball':         '🏀',
  'tennis':             '🎾',
  'yoga':               '🧘',
  'pilates':            '🤸',
  'boxing':             '🥊',
  'kickboxing':         '🥊',
  'jiu jitsu':          '🥋',
  'martial arts':       '🥋',
  'rowing':             '🚣',
  'golf':               '⛳',
  'skiing':             '⛷️',
  'snowboarding':       '🏂',
  'rock climbing':      '🧗',
  'climber':            '🧗',
  'mountain biking':    '🚵',
  'kayaking':           '🛶',
  'surfing':            '🏄',
  'volleyball':         '🏐',
  'dance':              '💃',
  'spin':               '🚴',
  'cross country skiing': '⛷️',
  'triathlon':          '🏊',
  'pickleball':         '🏓',
};

function getActivityEmoji(sportName?: string): string {
  if (!sportName) return '🏅';
  return SPORT_EMOJI[sportName.toLowerCase()] ?? '🏅';
}

export function PostCard({ post, myUserId }: Props) {
  const navigate     = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const repost       = useRepost();
  const initials     = `${post.first_name?.[0] ?? ''}${post.last_name?.[0] ?? ''}`.toUpperCase();
  const isMyPost     = myUserId === post.user_id;

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    repost.mutate(post.id);
  };

  return (
    <div className="bg-surface-1 border border-white/5 rounded-2xl p-4 space-y-3 hover:border-white/10 transition-colors">
      {/* Repost header */}
      {post.post_type === 'repost' && post.original_first_name && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Repeat2 className="h-3 w-3" />
          <span>
            {post.first_name} a reposté de {post.original_first_name} {post.original_last_name}
          </span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/profile/${post.user_id}`)}
        >
          {post.avatar_url
            ? <img src={post.avatar_url} alt={initials} className="h-full w-full rounded-full object-cover" />
            : initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="font-semibold text-white text-sm truncate cursor-pointer hover:text-brand-green transition-colors"
                onClick={() => navigate(`/profile/${post.user_id}`)}
              >
                {post.first_name} {post.last_name}
              </span>
              <span className="text-base flex-shrink-0">
                {post.post_type === 'activity'
                  ? getActivityEmoji(post.whoop_data?.sport_name)
                  : POST_TYPE_ICON[post.post_type] ?? '📊'}
              </span>
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            {post.post_type === 'repost' && post.original_content
              ? post.original_content
              : post.content}
          </p>

          {/* Metric pill */}
          {post.metric_value != null && post.metric_label && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs">
              <span className="text-slate-400">{post.metric_label}</span>
              <span className="font-semibold text-white">{post.metric_value}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <ReactionBar post={post} />

        <div className="flex items-center gap-3 text-slate-500">
          {/* Comment */}
          <button
            onClick={() => setShowComments(v => !v)}
            className={clsx(
              'flex items-center gap-1 text-xs hover:text-white transition-colors',
              showComments && 'text-brand-green',
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {post.comment_count > 0 && <span>{post.comment_count}</span>}
          </button>

          {/* Repost */}
          {!isMyPost && (
            <button
              onClick={handleRepost}
              disabled={repost.isPending}
              className="flex items-center gap-1 text-xs hover:text-brand-green transition-colors"
            >
              <Repeat2 className="h-4 w-4" />
              {post.repost_count > 0 && <span>{post.repost_count}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Comment thread */}
      {showComments && <CommentThread postId={post.id} myUserId={myUserId} />}
    </div>
  );
}
