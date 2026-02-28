import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/session';
import {
  getRecoveries, getLatestRecovery,
  getSleeps, getLatestSleep,
  getCycles, getWorkouts,
} from '../db/database';
import { syncUser, backfillPosts } from '../services/sync';

const router = Router();
router.use(requireAuth);

function parseDays(period?: string): number {
  const map: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  return map[period ?? '30d'] ?? 30;
}

// GET /api/dashboard — today's summary
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const [recovery, sleep, cycles7d, workouts30d] = await Promise.all([
    Promise.resolve(getLatestRecovery(userId)),
    Promise.resolve(getLatestSleep(userId)),
    Promise.resolve(getCycles(userId, 7)),
    Promise.resolve(getWorkouts(userId, 30)),
  ]);

  // Rolling 30-day averages
  const recoveries30d = getRecoveries(userId, 30);
  const avgRecovery = recoveries30d.length
    ? recoveries30d.reduce((s, r) => s + (r.recovery_score ?? 0), 0) / recoveries30d.length
    : null;
  const avgHrv = recoveries30d.length
    ? recoveries30d.reduce((s, r) => s + (r.hrv_rmssd_milli ?? 0), 0) / recoveries30d.length
    : null;
  const avgRhr = recoveries30d.length
    ? recoveries30d.reduce((s, r) => s + (r.resting_heart_rate ?? 0), 0) / recoveries30d.length
    : null;

  // 7-day avg strain
  const avgStrain7d = cycles7d.length
    ? cycles7d.reduce((s, c) => s + (c.strain ?? 0), 0) / cycles7d.length
    : null;

  res.json({
    today: { recovery, sleep },
    trends: { avgRecovery, avgHrv, avgRhr, avgStrain7d },
    recentWorkouts: workouts30d.slice(0, 5),
  });
});

// GET /api/recovery?period=7d|30d|90d|1y
router.get('/recovery', (req: AuthRequest, res: Response) => {
  const days = parseDays(req.query.period as string);
  const data = getRecoveries(req.userId!, days);
  res.json(data);
});

// GET /api/sleep?period=...
router.get('/sleep', (req: AuthRequest, res: Response) => {
  const days = parseDays(req.query.period as string);
  const data = getSleeps(req.userId!, days);
  res.json(data);
});

// GET /api/cycles?period=...
router.get('/cycles', (req: AuthRequest, res: Response) => {
  const days = parseDays(req.query.period as string);
  const data = getCycles(req.userId!, days);
  res.json(data);
});

// GET /api/workouts?period=...
router.get('/workouts', (req: AuthRequest, res: Response) => {
  const days = parseDays(req.query.period as string);
  const data = getWorkouts(req.userId!, days);
  res.json(data);
});

// GET /api/insights — computed correlations
router.get('/insights', (req: AuthRequest, res: Response) => {
  const recoveries = getRecoveries(req.userId!, 90);
  const sleeps = getSleeps(req.userId!, 90);

  // Join recovery + sleep by date
  const sleepMap = new Map(sleeps.map(s => [
    new Date(s.start_time).toDateString(),
    s,
  ]));

  const corr: { date: string; recovery: number; hrv: number; rhr: number; sleepHours: number; strain: number }[] = [];
  for (const r of recoveries) {
    const dateKey = new Date(r.created_at).toDateString();
    const s = sleepMap.get(dateKey);
    if (!r.recovery_score) continue;
    corr.push({
      date: r.created_at,
      recovery: r.recovery_score,
      hrv: r.hrv_rmssd_milli,
      rhr: r.resting_heart_rate,
      sleepHours: s ? (s.total_in_bed_time_milli - s.total_awake_time_milli) / 3_600_000 : 0,
      strain: r.cycle_strain ?? 0,
    });
  }

  // HRV 30d vs 60d trend
  const last30 = recoveries.slice(0, 30);
  const prev30 = recoveries.slice(30, 60);
  const hrv30avg = last30.length ? last30.reduce((s, r) => s + (r.hrv_rmssd_milli ?? 0), 0) / last30.length : 0;
  const hrv60avg = prev30.length ? prev30.reduce((s, r) => s + (r.hrv_rmssd_milli ?? 0), 0) / prev30.length : 0;

  res.json({
    correlationData: corr,
    hrvTrend: { last30: hrv30avg, prev30: hrv60avg, change: hrv30avg - hrv60avg },
  });
});

// POST /api/sync — manual sync
router.post('/sync', async (req: AuthRequest, res: Response) => {
  const full = req.query.full === 'true';
  res.json({ started: true });
  // After sync, backfill any existing data that has no post yet
  syncUser(req.userId!, full)
    .then(() => backfillPosts(req.userId!))
    .catch(e => console.error('[sync] manual sync failed:', e));
});

// POST /api/sync/backfill — generate posts for existing DB data
router.post('/sync/backfill', async (req: AuthRequest, res: Response) => {
  res.json({ started: true });
  backfillPosts(req.userId!).catch(e => console.error('[sync] backfill failed:', e));
});

export default router;
