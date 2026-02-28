import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { config } from './config';
import { getDb, cleanExpiredSessions } from './db/database';
import authRouter    from './routes/auth';
import apiRouter     from './routes/api';
import socialRouter  from './routes/social';
import webhookRouter from './routes/webhooks';
import { syncAllUsers } from './services/sync';
import { runNightlyStreakWarnings } from './services/social';
import { createWss } from './services/ws';

const app    = express();
const server = createServer(app);

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ⚠️  Webhook route must be mounted BEFORE express.json() so that
//     req.body is the raw Buffer needed for HMAC signature verification.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json());
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/auth',   authRouter);
app.use('/api',    apiRouter);
app.use('/social', socialRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── WebSocket ──────────────────────────────────────────────────────────────
createWss(server);

// ── Init DB ────────────────────────────────────────────────────────────────
getDb(); // runs migrations on startup

// ── Scheduled Jobs ─────────────────────────────────────────────────────────
// Fallback sync every 6h — webhooks handle real-time, this catches edge cases
// (user revoked+reconnected, missed events, rate-limit retries, etc.)
// At 1000 users: ~1000 syncs / 6h = fine for WHOOP API rate limits.
cron.schedule('0 */6 * * *', async () => {
  console.log('[cron] Starting 6h fallback sync');
  await syncAllUsers();
});

// Nightly streak warnings at 8pm
cron.schedule('0 20 * * *', () => {
  console.log('[cron] Running streak warnings');
  runNightlyStreakWarnings();
});

// Clean expired sessions daily at 3am
cron.schedule('0 3 * * *', () => {
  cleanExpiredSessions();
  console.log('[cron] Cleaned expired sessions');
});

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(config.port, async () => {
  console.log(`\n🚀 PulseIQ Backend running on http://localhost:${config.port}`);
  console.log(`   Frontend expected at ${config.frontendUrl}`);
  console.log(`   OAuth callback:      ${config.whoop.redirectUri}`);
  console.log(`   WebSocket:           ws://localhost:${config.port}/ws`);

  // ── Ngrok auto-tunnel (dev only) ──────────────────────────────────────
  if (config.ngrok.authtoken) {
    try {
      const ngrok = await import('@ngrok/ngrok');
      const listener = await ngrok.forward({
        addr: config.port,
        authtoken: config.ngrok.authtoken,
        ...(config.ngrok.domain ? { domain: config.ngrok.domain } : {}),
      });
      const publicUrl = listener.url();
      const webhookUrl = `${publicUrl}/webhooks/whoop`;

      console.log('\n   ✅ ngrok tunnel active!');
      console.log(`   🌍 Public URL:  ${publicUrl}`);
      console.log(`   🔗 Webhook URL: ${webhookUrl}`);

      if (!config.ngrok.domain) {
        // Dynamic URL — user needs to update WHOOP dashboard each restart
        console.log('\n   ⚠️  URL changes on every restart. Use a static domain to avoid this:');
        console.log('      1. Run: ngrok config add-authtoken <token>');
        console.log('      2. Get a free static domain at: https://dashboard.ngrok.com/domains');
        console.log('      3. Add NGROK_DOMAIN=your-domain.ngrok-free.app to .env');
      }

      console.log('\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   📋 WHOOP Webhook (register once in dashboard)');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   1. https://developer-dashboard.whoop.com → ton app');
      console.log(`   2. Webhooks → ajoute: ${webhookUrl}`);
      console.log('   3. Model: v2 | Events: workout/sleep/recovery .updated');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (err: any) {
      console.error('\n   ❌ ngrok failed to start:', err.message);
      console.log('   → Webhooks disabled. Manual sync still works.\n');
    }
  } else {
    console.log('\n   💡 Tip: Add NGROK_AUTHTOKEN to .env to enable auto-sync via webhooks.');
    console.log('      Get a free token at: https://dashboard.ngrok.com\n');
  }
});
