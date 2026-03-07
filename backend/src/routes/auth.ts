import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { exchangeCode } from '../services/whoop';
import {
  upsertUser, upsertToken, createSession, deleteSession, getSession, getDb,
  createEmailUser, getUserByEmail, setEmailVerified, updatePasswordHash,
  createEmailToken, getEmailToken, markEmailTokenUsed, linkWhoopToUser,
} from '../db/database';
import { syncUser, backfillPosts } from '../services/sync';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email';
import { requireAuth, AuthRequest } from '../middleware/session';

const router = Router();
const SALT_ROUNDS = 12;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Helpers ───────────────────────────────────────────────────────────────
function setSessionCookie(res: Response, sessionId: string, expires: Date) {
  res.cookie('pulseiq_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  });
}

function makeSession(res: Response, userId: number) {
  const sessionId = uuidv4();
  const sessionExpiry = new Date(Date.now() + SESSION_TTL_MS);
  createSession(sessionId, userId, sessionExpiry);
  setSessionCookie(res, sessionId, sessionExpiry);
  return sessionId;
}

// ── CSRF state store for Whoop OAuth ──────────────────────────────────────
const stateStore = new Map<string, { createdAt: number; sessionId: string | null }>();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, val] of stateStore) {
    if (val.createdAt < cutoff) stateStore.delete(key);
  }
}, 10 * 60 * 1000);

// ══════════════════════════════════════════════════════════════════════════
// EMAIL / PASSWORD AUTH
// ══════════════════════════════════════════════════════════════════════════

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password_too_short' });
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = createEmailUser({ email, password_hash: hash, first_name, last_name });

    // Send verification email
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    createEmailToken({ id: tokenId, userId, tokenType: 'verify_email', expiresAt });

    try {
      await sendWelcomeEmail(email, tokenId, first_name);
    } catch (e) {
      console.error('[auth] Failed to send verification email:', e);
    }

    // Create session — user can use app immediately (with email verification banner)
    makeSession(res, userId);
    return res.json({ success: true, needsVerification: true });
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'email_exists' });
    }
    console.error('[auth] Register error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  // Search ALL accounts (including legacy Whoop) that have a password set
  const user = getUserByEmail(email, false);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  makeSession(res, user.id);
  return res.json({
    success: true,
    needsVerification: !user.email_verified,
    whoopLinked: !!user.whoop_user_id,
  });
});

// GET /auth/verify-email?token=xxx
router.get('/verify-email', (req: Request, res: Response) => {
  const { token } = req.query as { token: string };
  if (!token) return res.redirect(`${config.frontendUrl}/login?error=missing_token`);

  const row = getEmailToken(token);
  if (!row || row.used || row.token_type !== 'verify_email') {
    return res.redirect(`${config.frontendUrl}/login?error=invalid_token`);
  }
  if (new Date(row.expires_at) < new Date()) {
    return res.redirect(`${config.frontendUrl}/login?error=token_expired`);
  }

  setEmailVerified(row.user_id);
  markEmailTokenUsed(token);
  return res.redirect(`${config.frontendUrl}/login?verified=true`);
});

// POST /auth/resend-verification
router.post('/resend-verification', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  if (!user || user.email_verified) {
    return res.status(400).json({ error: 'already_verified' });
  }

  const tokenId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  createEmailToken({ id: tokenId, userId: user.id, tokenType: 'verify_email', expiresAt });

  try {
    await sendWelcomeEmail(user.email, tokenId, user.first_name);
  } catch (e) {
    console.error('[auth] Failed to resend verification:', e);
    return res.status(500).json({ error: 'email_send_failed' });
  }

  return res.json({ success: true });
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'missing_email' });

  // Always return success (don't leak whether email exists)
  // Search ALL accounts (including legacy Whoop ones) so they can set a password
  const user = getUserByEmail(email, false);
  if (user) {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    createEmailToken({ id: tokenId, userId: user.id, tokenType: 'reset_password', expiresAt });
    try {
      await sendPasswordResetEmail(email, tokenId, user.first_name);
    } catch (e) {
      console.error('[auth] Failed to send reset email:', e);
    }
  }

  return res.json({ success: true });
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'missing_fields' });
  if (password.length < 8) return res.status(400).json({ error: 'password_too_short' });

  const row = getEmailToken(token);
  if (!row || row.used || row.token_type !== 'reset_password') {
    return res.status(400).json({ error: 'invalid_token' });
  }
  if (new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'token_expired' });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  updatePasswordHash(row.user_id, hash);
  markEmailTokenUsed(token);
  return res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// WHOOP OAUTH (link flow + legacy login)
// ══════════════════════════════════════════════════════════════════════════

// GET /auth/whoop — redirect to WHOOP OAuth
router.get('/whoop', (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  const sessionId = req.cookies?.pulseiq_session ?? null;
  stateStore.set(state, { createdAt: Date.now(), sessionId });

  const params = new URLSearchParams({
    client_id: config.whoop.clientId,
    response_type: 'code',
    redirect_uri: config.whoop.redirectUri,
    scope: config.whoop.scopes,
    state,
  });

  res.redirect(`${config.whoop.authUrl}?${params.toString()}`);
});

// GET /auth/callback — handle WHOOP OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    return res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!state || !stateStore.has(state)) {
    return res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
  }
  const stateData = stateStore.get(state)!;
  stateStore.delete(state);

  if (!code) {
    return res.redirect(`${config.frontendUrl}/login?error=no_code`);
  }

  try {
    const { access_token, refresh_token, expires_in } = await exchangeCode(code);
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const axios = (await import('axios')).default;
    const profileRes = await axios.get(`${config.whoop.apiBase}/v2/user/profile/basic`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const bodyRes = await axios.get(`${config.whoop.apiBase}/v2/user/measurement/body`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data;
    const body = bodyRes.data;

    // ── LINKING FLOW: user already logged in ──
    if (stateData.sessionId) {
      const session = getSession(stateData.sessionId);
      if (!session || new Date(session.expires_at) < new Date()) {
        return res.redirect(`${config.frontendUrl}/dashboard?error=session_expired`);
      }

      const userId = session.user_id;
      const linkResult = linkWhoopToUser(userId, profile.user_id);
      if (!linkResult.ok) {
        return res.redirect(`${config.frontendUrl}/dashboard?error=${linkResult.error}`);
      }

      // Update body measurements from Whoop
      getDb().prepare(`
        UPDATE users SET height_meter=?, weight_kg=?, max_heart_rate=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(body.height_meter, body.weight_kilogram, body.max_heart_rate, userId);

      upsertToken(userId, access_token, refresh_token, expiresAt);

      syncUser(userId, true)
        .then(() => backfillPosts(userId))
        .catch(e => console.error('[auth] Link sync failed:', e));

      return res.redirect(`${config.frontendUrl}/dashboard?whoop_linked=true`);
    }

    // ── LEGACY LOGIN: existing Whoop-only user ──
    const existingUser = getDb().prepare(
      'SELECT id FROM users WHERE whoop_user_id = ?'
    ).get(profile.user_id) as { id: number } | undefined;

    if (existingUser) {
      upsertUser({
        whoop_user_id: profile.user_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        height_meter: body.height_meter,
        weight_kg: body.weight_kilogram,
        max_heart_rate: body.max_heart_rate,
      });
      upsertToken(existingUser.id, access_token, refresh_token, expiresAt);
      makeSession(res, existingUser.id);

      syncUser(existingUser.id, true)
        .then(() => backfillPosts(existingUser.id))
        .catch(e => console.error('[auth] Legacy sync failed:', e));

      return res.redirect(`${config.frontendUrl}/dashboard`);
    }

    // ── NEW WHOOP USER with no account → redirect to register ──
    return res.redirect(`${config.frontendUrl}/register?error=whoop_no_account`);
  } catch (err: any) {
    console.error('[auth] Callback error:', err.response?.data ?? err.message);
    return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// COMMON
// ══════════════════════════════════════════════════════════════════════════

// GET /auth/me — current user info
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  res.json({
    user: {
      ...user,
      whoop_linked: !!user.whoop_user_id,
    },
  });
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.pulseiq_session;
  if (sessionId) deleteSession(sessionId);
  res.clearCookie('pulseiq_session');
  res.json({ success: true });
});

export default router;
