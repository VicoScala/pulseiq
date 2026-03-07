import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/session';
import {
  follow, unfollow, isFollowing, getFollowers, getFollowing,
  getFeed, getNewPostsCount, getUserPosts, repostPost,
  upsertReaction, removeReaction, getReactionSummary,
  addComment, getComments,
  getNotifications, markNotificationsRead, getUnreadNotifCount,
  getLeaderboard, getStreaks, getBadges,
  searchUsers, getSuggestedUsers, getMorningStats,
  getUserPublic, updateProfile, touchLastActive,
  getUserById, getDb,
} from '../db/database';
import { notifyUser } from '../services/social';
import { pushToUser } from '../services/ws';
import { sendNewFollowerEmail, sendReactionEmail, sendCommentEmail, sendRepostEmail } from '../services/email';

const router = Router();
router.use(requireAuth);

// Touch last_active on every social request
router.use((req: AuthRequest, _res, next) => {
  if (req.userId) touchLastActive(req.userId);
  next();
});

// ── Profile ───────────────────────────────────────────────────────────────

router.get('/profile/me', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const user    = getUserPublic(userId) as any;
  const streaks = getStreaks(userId);
  const badges  = getBadges(userId);
  const posts   = getUserPosts(userId, userId, undefined, 20);
  const db      = getDb();
  const followers  = (db.prepare('SELECT COUNT(*) as n FROM friendships WHERE following_id=?').get(userId) as any).n;
  const following  = (db.prepare('SELECT COUNT(*) as n FROM friendships WHERE follower_id=?').get(userId) as any).n;
  const postCount  = (db.prepare('SELECT COUNT(*) as n FROM feed_posts WHERE user_id=?').get(userId) as any).n;
  res.json({ user, streaks, badges, followers, following, postCount, posts });
});

router.get('/profile/:userId', (req: AuthRequest, res: Response) => {
  const profileId = parseInt(req.params.userId);
  const viewerId  = req.userId!;
  const user      = getUserPublic(profileId) as any;
  if (!user) { res.status(404).json({ error: 'user_not_found' }); return; }
  const db        = getDb();
  const followers  = (db.prepare('SELECT COUNT(*) as n FROM friendships WHERE following_id=?').get(profileId) as any).n;
  const following  = (db.prepare('SELECT COUNT(*) as n FROM friendships WHERE follower_id=?').get(profileId) as any).n;
  const postCount  = (db.prepare('SELECT COUNT(*) as n FROM feed_posts WHERE user_id=?').get(profileId) as any).n;
  const iFollow   = isFollowing(viewerId, profileId);
  const posts     = getUserPosts(profileId, viewerId, undefined, 20);
  const streaks   = getStreaks(profileId);
  const badges    = getBadges(profileId);
  res.json({ user, followers, following, postCount, isFollowing: iFollow, posts, streaks, badges });
});

router.patch('/profile', (req: AuthRequest, res: Response) => {
  const result = updateProfile(req.userId!, req.body);
  if (!result.ok) { res.status(400).json({ error: result.error }); return; }
  res.json(getUserPublic(req.userId!));
});

// ── Follow ────────────────────────────────────────────────────────────────

router.post('/follow/:userId', async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.userId);
  if (targetId === req.userId) { res.status(400).json({ error: 'cant_follow_self' }); return; }
  follow(req.userId!, targetId);
  notifyUser(targetId, 'new_follower', req.userId!);

  // Send email notification (non-blocking)
  const target = getUserById(targetId) as any;
  const follower = getUserById(req.userId!) as any;
  if (target?.email && follower) {
    const followerName = [follower.first_name, follower.last_name].filter(Boolean).join(' ');
    sendNewFollowerEmail(target.email, followerName, req.userId!, target.first_name).catch(e =>
      console.error('[social] Failed to send follower email:', e),
    );
  }

  res.json({ ok: true });
});

router.delete('/follow/:userId', (req: AuthRequest, res: Response) => {
  unfollow(req.userId!, parseInt(req.params.userId));
  res.json({ ok: true });
});

router.get('/followers', (req: AuthRequest, res: Response) => {
  res.json(getFollowers(req.userId!));
});

router.get('/following', (req: AuthRequest, res: Response) => {
  res.json(getFollowing(req.userId!));
});

// ── Feed ──────────────────────────────────────────────────────────────────

router.get('/feed', (req: AuthRequest, res: Response) => {
  const cursor   = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
  const limit    = Math.min(parseInt(req.query.limit as string || '20'), 50);
  const since    = req.query.since as string | undefined;
  const posts    = getFeed(req.userId!, cursor, limit);
  const newCount = since ? getNewPostsCount(req.userId!, since) : 0;
  res.json({ posts, nextCursor: posts.length === limit ? posts[posts.length - 1].id : null, newCount });
});

router.get('/morning-stats', (req: AuthRequest, res: Response) => {
  res.json(getMorningStats(req.userId!));
});

// ── Posts ─────────────────────────────────────────────────────────────────

router.post('/posts/:id/repost', async (req: AuthRequest, res: Response) => {
  const originalPostId = parseInt(req.params.id);
  const originalPost = getDb().prepare('SELECT user_id, generated_message FROM feed_posts WHERE id=?').get(originalPostId) as any;
  const post = repostPost(req.userId!, originalPostId);
  if (!post) { res.status(404).json({ error: 'post_not_found' }); return; }

  // Send email to original post owner (non-blocking, skip own reposts)
  if (originalPost && originalPost.user_id !== req.userId) {
    const owner = getUserById(originalPost.user_id) as any;
    const actor = getUserById(req.userId!) as any;
    if (owner?.email && actor) {
      const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ');
      sendRepostEmail(owner.email, actorName, (originalPost.generated_message ?? '').slice(0, 120), originalPostId, owner.first_name).catch(e =>
        console.error('[social] Failed to send repost email:', e),
      );
    }
  }

  res.json({ post });
});

// ── Reactions ─────────────────────────────────────────────────────────────

const VALID_REACTIONS = ['like', 'fire', 'beast', 'rip', 'clap'];

router.post('/posts/:id/react', async (req: AuthRequest, res: Response) => {
  const { reaction_type } = req.body;
  if (!VALID_REACTIONS.includes(reaction_type)) {
    res.status(400).json({ error: 'invalid_reaction' }); return;
  }
  const postId = parseInt(req.params.id);
  upsertReaction(postId, req.userId!, reaction_type);

  // Notify post owner (always, even on own posts)
  const post = getDb().prepare('SELECT user_id, generated_message FROM feed_posts WHERE id=?').get(postId) as any;
  if (post) {
    notifyUser(post.user_id, 'new_reaction', req.userId!, String(postId), { reaction_type });

    // Send email (non-blocking, skip if reacting to own post)
    if (post.user_id !== req.userId) {
      const owner = getUserById(post.user_id) as any;
      const actor = getUserById(req.userId!) as any;
      if (owner?.email && actor) {
        const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ');
        sendReactionEmail(owner.email, actorName, reaction_type, (post.generated_message ?? '').slice(0, 120), postId, owner.first_name).catch(e =>
          console.error('[social] Failed to send reaction email:', e),
        );
      }
    }
  }

  res.json(getReactionSummary(postId, req.userId!));
});

router.delete('/posts/:id/react', (req: AuthRequest, res: Response) => {
  removeReaction(parseInt(req.params.id), req.userId!);
  res.json({ ok: true });
});

router.get('/posts/:id/reactions', (req: AuthRequest, res: Response) => {
  res.json(getReactionSummary(parseInt(req.params.id), req.userId!));
});

// ── Comments ──────────────────────────────────────────────────────────────

router.get('/posts/:id/comments', (req: AuthRequest, res: Response) => {
  res.json(getComments(parseInt(req.params.id)));
});

router.post('/posts/:id/comment', async (req: AuthRequest, res: Response) => {
  const { content, parent_comment_id } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'empty_comment' }); return; }
  const postId  = parseInt(req.params.id);
  const comment = addComment(postId, req.userId!, content.trim(), parent_comment_id);

  // Notify post owner (always, even on own posts)
  const post = getDb().prepare('SELECT user_id FROM feed_posts WHERE id=?').get(postId) as any;
  if (post) {
    notifyUser(post.user_id, 'new_comment', req.userId!, String(postId));

    // Send email (non-blocking, skip if commenting on own post)
    if (post.user_id !== req.userId) {
      const owner = getUserById(post.user_id) as any;
      const actor = getUserById(req.userId!) as any;
      if (owner?.email && actor) {
        const actorName = [actor.first_name, actor.last_name].filter(Boolean).join(' ');
        sendCommentEmail(owner.email, actorName, content.trim().slice(0, 150), postId, owner.first_name).catch(e =>
          console.error('[social] Failed to send comment email:', e),
        );
      }
    }
  }

  // Notify @mentioned users
  const mentionRegex = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/g;
  const db = getDb();
  for (const match of [...content.matchAll(mentionRegex)]) {
    const parts = match[1].trim().split(/\s+/);
    const [first, last] = parts;
    const mentioned = last
      ? db.prepare('SELECT id FROM users WHERE LOWER(first_name)=LOWER(?) AND LOWER(last_name)=LOWER(?)').get(first, last)
      : db.prepare('SELECT id FROM users WHERE LOWER(first_name)=LOWER(?)').get(first);
    if (mentioned && (mentioned as any).id !== req.userId) {
      notifyUser((mentioned as any).id, 'new_mention', req.userId!, String(postId), { snippet: content.slice(0, 100) });
    }
  }

  res.json({ comment });
});

// ── Notifications ─────────────────────────────────────────────────────────

router.get('/notifications', (req: AuthRequest, res: Response) => {
  const notifs      = getNotifications(req.userId!);
  const unreadCount = getUnreadNotifCount(req.userId!);
  res.json({ notifications: notifs, unreadCount });
});

router.post('/notifications/read', (req: AuthRequest, res: Response) => {
  markNotificationsRead(req.userId!, req.body.id ? parseInt(req.body.id) : undefined);
  res.json({ ok: true });
});

// ── Leaderboard ───────────────────────────────────────────────────────────

router.get('/leaderboard', (req: AuthRequest, res: Response) => {
  const type = (req.query.type as 'recovery' | 'strain' | 'sleep') ?? 'recovery';
  res.json(getLeaderboard(req.userId!, type));
});

// ── Discover ──────────────────────────────────────────────────────────────

router.get('/discover', (req: AuthRequest, res: Response) => {
  const q           = req.query.q as string;
  const userId      = req.userId!;
  const results     = q ? searchUsers(q, userId) : [];
  const suggestions = getSuggestedUsers(userId);
  // Augment with isFollowing flag
  const enrich = (users: any[]) =>
    users.map(u => ({ ...u, isFollowing: isFollowing(userId, u.id) }));
  res.json({ results: enrich(results), suggestions: enrich(suggestions) });
});

// ── Nudge ─────────────────────────────────────────────────────────────────

router.post('/nudge/:userId', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.userId);
  if (targetId === req.userId) { res.status(400).json({ error: 'cant_nudge_self' }); return; }
  notifyUser(targetId, 'nudge', req.userId!);
  pushToUser(targetId, { type: 'nudge', fromUserId: req.userId });
  res.json({ ok: true });
});

export default router;
