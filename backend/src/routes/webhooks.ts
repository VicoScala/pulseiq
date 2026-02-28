/**
 * WHOOP Webhook handler
 *
 * WHOOP sends a POST to this endpoint whenever a workout, sleep,
 * or recovery is created/updated for any of our connected users.
 *
 * Payload: { user_id, id, type, trace_id }
 * Security: HMAC-SHA256 signature in X-WHOOP-Signature header
 *
 * IMPORTANT: this router must be mounted BEFORE express.json()
 * so that req.body is the raw Buffer (needed for signature check).
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { getDb } from '../db/database';
import {
  syncSingleWorkout,
  syncSingleSleep,
  syncSingleRecovery,
} from '../services/sync';

const router = Router();

// ── Signature verification ─────────────────────────────────────────────────
// WHOOP signs the webhook with: base64(HMAC-SHA256(timestamp + rawBody, clientSecret))
function verifyWhoopSignature(
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  try {
    const expected = crypto
      .createHmac('sha256', config.whoop.clientSecret)
      .update(timestamp + rawBody)
      .digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  } catch {
    return false;
  }
}

// ── POST /webhooks/whoop ───────────────────────────────────────────────────
router.post('/whoop', async (req: Request, res: Response) => {
  const timestamp = req.headers['x-whoop-signature-timestamp'] as string | undefined;
  const signature = req.headers['x-whoop-signature'] as string | undefined;

  // req.body is a Buffer (express.raw applied before this router)
  const rawBody = req.body instanceof Buffer
    ? req.body.toString('utf8')
    : JSON.stringify(req.body);

  const isProd = process.env.NODE_ENV === 'production';

  // In production, always enforce signature — reject unsigned requests.
  // In dev, skip if headers absent (useful for local curl testing).
  if (isProd && (!timestamp || !signature)) {
    console.warn('[webhook] Missing signature headers in production');
    return res.status(401).json({ error: 'missing_signature' });
  }
  if (timestamp && signature) {
    if (!verifyWhoopSignature(timestamp, rawBody, signature)) {
      console.warn('[webhook] Invalid WHOOP signature');
      return res.status(401).json({ error: 'invalid_signature' });
    }
  }

  let payload: { user_id: number; id: string | number; type: string; trace_id?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const { user_id: whoopUserId, id, type } = payload;

  // Acknowledge immediately — WHOOP retries if we don't respond in ~1s
  res.status(200).json({ ok: true });

  // Look up our internal user by WHOOP user_id
  const db = getDb();
  const user = db
    .prepare('SELECT id FROM users WHERE whoop_user_id = ?')
    .get(whoopUserId) as { id: number } | undefined;

  if (!user) {
    console.warn(`[webhook] Unknown WHOOP user_id ${whoopUserId} — ignoring`);
    return;
  }

  const userId = user.id;
  const itemId = String(id);

  console.log(`[webhook] ${type} — whoop_user=${whoopUserId} id=${itemId}`);

  try {
    switch (type) {
      case 'workout.updated':
        await syncSingleWorkout(userId, itemId);
        break;

      case 'workout.deleted':
        // Soft delete: mark as removed or simply ignore (no critical data loss)
        db.prepare("UPDATE workouts SET score_state='DELETED' WHERE id=? AND user_id=?")
          .run(itemId, userId);
        break;

      case 'sleep.updated':
        await syncSingleSleep(userId, itemId);
        break;

      case 'sleep.deleted':
        db.prepare("UPDATE sleeps SET score_state='DELETED' WHERE id=? AND user_id=?")
          .run(itemId, userId);
        break;

      case 'recovery.updated':
        await syncSingleRecovery(userId, itemId);
        break;

      case 'recovery.deleted':
        db.prepare("DELETE FROM recoveries WHERE sleep_id=? AND user_id=?")
          .run(itemId, userId);
        break;

      default:
        console.log(`[webhook] Unhandled event type: ${type}`);
    }
  } catch (err: any) {
    // Log but don't throw — response already sent
    console.error(`[webhook] Error processing ${type} for user ${userId}:`, err.message);
  }
});

export default router;
