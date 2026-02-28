import { useState } from 'react';
import { Send } from 'lucide-react';
import { useComments, useAddComment } from '../../hooks/useSocial';
import type { Comment } from '../../types/whoop';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (id: number) => void }) {
  const initials = `${comment.first_name?.[0] ?? ''}${comment.last_name?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex gap-2">
      <div className="h-7 w-7 rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center text-[10px] font-bold text-brand-blue flex-shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white/5 rounded-xl px-3 py-2">
          <p className="text-xs font-semibold text-white mb-0.5">
            {comment.first_name} {comment.last_name}
          </p>
          <p className="text-sm text-slate-300 break-words">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-xs text-slate-600">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
          </span>
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-slate-500 hover:text-brand-green transition-colors"
          >
            Répondre
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  postId: number;
  onClose?: () => void;
}

export function CommentThread({ postId, onClose }: Props) {
  const { data: comments = [], isLoading } = useComments(postId);
  const addComment = useAddComment(postId);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment.mutate(
      { content: text.trim(), parentId: replyTo },
      {
        onSuccess: () => {
          setText('');
          setReplyTo(undefined);
        },
      },
    );
  };

  // Group: top-level + replies
  const topLevel = comments.filter((c: Comment) => !c.parent_comment_id);
  const replies  = (parentId: number) => comments.filter((c: Comment) => c.parent_comment_id === parentId);

  return (
    <div className="border-t border-white/5 pt-3 space-y-3">
      {/* Comment list */}
      {isLoading ? (
        <p className="text-xs text-slate-500 text-center py-2">Chargement…</p>
      ) : topLevel.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-2">Sois le premier à commenter</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {topLevel.map((c: Comment) => (
            <div key={c.id}>
              <CommentItem comment={c} onReply={setReplyTo} />
              {replies(c.id).map((r: Comment) => (
                <div key={r.id} className="ml-8 mt-1.5">
                  <CommentItem comment={r} onReply={setReplyTo} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-brand-green px-1">
          <span>Réponse à un commentaire</span>
          <button onClick={() => setReplyTo(undefined)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ajouter un commentaire…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-green/40"
        />
        <button
          type="submit"
          disabled={!text.trim() || addComment.isPending}
          className="p-1.5 rounded-xl bg-brand-green/20 text-brand-green border border-brand-green/30 hover:bg-brand-green/30 transition-colors disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
