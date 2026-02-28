import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { useComments, useAddComment, useDiscover } from '../../hooks/useSocial';
import type { Comment } from '../../types/whoop';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';

// ── Mention rendering ──────────────────────────────────────────────────────

function renderContent(text: string) {
  const parts = text.split(/(@[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/g);
  return parts.map((part, i) =>
    /^@/.test(part)
      ? <span key={i} className="text-purple-400 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

// ── Comment item ───────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  isOwn: boolean;
  onReply: (id: number) => void;
}

function CommentItem({ comment, isOwn, onReply }: CommentItemProps) {
  const initials = `${comment.first_name?.[0] ?? ''}${comment.last_name?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex gap-2">
      <div
        className={clsx(
          'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 overflow-hidden',
          isOwn
            ? 'bg-brand-green/30 border border-brand-green/40 text-brand-green'
            : 'bg-brand-blue/30 border border-brand-blue/20 text-brand-blue',
        )}
      >
        {comment.avatar_url
          ? <img src={comment.avatar_url} alt={initials} className="h-full w-full object-cover" />
          : initials}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            'rounded-xl px-3 py-2',
            isOwn ? 'bg-brand-green/10 border border-brand-green/20' : 'bg-white/5',
          )}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs font-semibold text-white">
              {comment.first_name} {comment.last_name}
            </p>
            {isOwn && (
              <span className="text-[9px] font-bold text-brand-green bg-brand-green/15 px-1.5 py-0.5 rounded-full leading-none">
                Vous
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 break-words">{renderContent(comment.content)}</p>
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

// ── Main thread ────────────────────────────────────────────────────────────

interface Props {
  postId: number;
  myUserId?: number;
  onClose?: () => void;
}

export function CommentThread({ postId, myUserId, onClose }: Props) {
  const { data: comments = [], isLoading } = useComments(postId);
  const addComment = useAddComment(postId);
  const [text, setText]       = useState('');
  const [replyTo, setReplyTo] = useState<number | undefined>(undefined);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions when mention query active (≥1 char)
  const activeQuery = mentionQuery !== null && mentionQuery.length >= 1 ? mentionQuery : undefined;
  const { data: discoverData } = useDiscover(activeQuery);
  const suggestions = activeQuery ? (discoverData?.results ?? []).slice(0, 5) : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setText(val);
    const before = val.slice(0, cursor);
    const match  = before.match(/@([A-Za-zÀ-ÿ]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (firstName: string, lastName: string) => {
    const cursor  = inputRef.current?.selectionStart ?? text.length;
    const before  = text.slice(0, mentionStart);
    const after   = text.slice(cursor);
    const newText = `${before}@${firstName} ${lastName} ${after}`;
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = (before + `@${firstName} ${lastName} `).length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMentionQuery(null);
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
              <CommentItem
                comment={c}
                isOwn={myUserId !== undefined && c.user_id === myUserId}
                onReply={setReplyTo}
              />
              {replies(c.id).map((r: Comment) => (
                <div key={r.id} className="ml-8 mt-1.5">
                  <CommentItem
                    comment={r}
                    isOwn={myUserId !== undefined && r.user_id === myUserId}
                    onReply={setReplyTo}
                  />
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

      {/* Input + mention dropdown */}
      <div className="relative">
        {/* Mention suggestions dropdown — appears above input */}
        {mentionQuery !== null && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-2 border border-white/10 rounded-xl overflow-hidden shadow-xl z-20">
            {suggestions.map((u: any) => (
              <button
                key={u.id}
                // onMouseDown + preventDefault so input doesn't lose focus before click fires
                onMouseDown={e => { e.preventDefault(); insertMention(u.first_name, u.last_name); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors text-left"
              >
                <div className="h-6 w-6 rounded-full bg-brand-blue/30 border border-brand-blue/20 flex items-center justify-center text-[10px] font-bold text-brand-blue flex-shrink-0 overflow-hidden">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                    : `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()}
                </div>
                <span className="text-sm text-white">{u.first_name} {u.last_name}</span>
                {u.username && <span className="text-xs text-slate-500 ml-auto">@{u.username}</span>}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleChange}
            onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
            placeholder="Ajouter un commentaire… (@prénom pour taguer)"
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
    </div>
  );
}
