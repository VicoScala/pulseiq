import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { exchangeCode } from '../services/whoop';
import { getWhoopClient, fetchUserProfile, fetchBodyMeasurements } from '../services/whoop';
import { upsertUser, upsertToken, createSession, deleteSession, getSession } from '../db/database';
import { syncUser, backfillPosts } from '../services/sync';
import { requireAuth, AuthRequest } from '../middleware/session';

const router = Router();

// Temporary in-memory state store (PKCE / CSRF protection)
const stateStore = new Map<string, { createdAt: number }>();

// Cleanup old states every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, val] of stateStore) {
    if (val.createdAt < cutoff) stateStore.delete(key);
  }
}, 10 * 60 * 1000);

// GET /auth/whoop — redirect to WHOOP OAuth
router.get('/whoop', (_req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, { createdAt: Date.now() });

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
  stateStore.delete(state);

  if (!code) {
    return res.redirect(`${config.frontendUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const { access_token, refresh_token, expires_in } = await exchangeCode(code);
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch user profile with fresh token
    const axios = (await import('axios')).default;
    const profileRes = await axios.get(`${config.whoop.apiBase}/v2/user/profile/basic`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const bodyRes = await axios.get(`${config.whoop.apiBase}/v2/user/measurement/body`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data;
    const body = bodyRes.data;

    // Persist user + tokens
    const userId = upsertUser({
      whoop_user_id: profile.user_id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      height_meter: body.height_meter,
      weight_kg: body.weight_kilogram,
      max_heart_rate: body.max_heart_rate,
    });
    upsertToken(userId, access_token, refresh_token, expiresAt);

    // Create session (30 days)
    const sessionId = uuidv4();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    createSession(sessionId, userId, sessionExpiry);

    // Set cookie
    res.cookie('pulseiq_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiry,
      path: '/',
    });

    // Trigger initial sync in background (365 days) then backfill social posts
    syncUser(userId, true)
      .then(() => backfillPosts(userId))
      .catch(e => console.error('[auth] Initial sync failed:', e));

    return res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (err: any) {
    console.error('[auth] Callback error:', err.response?.data ?? err.message);
    return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
});

// GET /auth/me — current user info
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.pulseiq_session;
  if (sessionId) deleteSession(sessionId);
  res.clearCookie('pulseiq_session');
  res.json({ success: true });
});

export default router;
