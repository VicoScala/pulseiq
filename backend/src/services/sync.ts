import { getDb, upsertCycles, upsertRecoveries, upsertSleeps, upsertWorkouts, upsertUser } from '../db/database';
import {
  getWhoopClient,
  fetchUserProfile,
  fetchBodyMeasurements,
  fetchCycles,
  fetchRecoveries,
  fetchSleeps,
  fetchWorkouts,
} from './whoop';
import {
  generateSleepPost, generateWorkoutPost,
  updateRecoveryStreak, updateSleepStreak, checkEarlyAdopter,
} from './social';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const now = () => new Date().toISOString();

// ── Backfill posts for existing DB data ──────────────────────────────────
// Called once per user to generate posts for data already in the DB
export async function backfillPosts(userId: number): Promise<void> {
  const db = getDb();
  const existingRefs = new Set(
    (db.prepare('SELECT whoop_ref_id FROM feed_posts WHERE user_id=?').all(userId) as any[])
      .map((r: any) => r.whoop_ref_id)
  );

  // Backfill recent workouts (last 90 days)
  const cutoff = daysAgo(90);
  const workouts = db.prepare(`
    SELECT id, sport_name, strain, start_time, distance_meter
    FROM workouts
    WHERE user_id=? AND start_time > ? AND strain IS NOT NULL AND score_state='SCORED'
    ORDER BY start_time DESC
    LIMIT 30
  `).all(userId, cutoff) as any[];

  for (const w of workouts) {
    if (existingRefs.has(w.id)) continue;
    await generateWorkoutPost(userId, {
      id: w.id, sport_name: w.sport_name ?? 'activity',
      strain: w.strain, start_time: w.start_time,
      distance_meter: w.distance_meter,
    }).catch(() => {});
  }

  // Backfill recent sleeps (last 30 days)
  const sleeps = db.prepare(`
    SELECT s.id, s.cycle_id, s.end_time,
           r.recovery_score, r.hrv_rmssd_milli
    FROM sleeps s
    LEFT JOIN recoveries r ON r.cycle_id = s.cycle_id AND r.user_id = s.user_id
    WHERE s.user_id=? AND s.nap=0 AND s.start_time > ?
      AND r.recovery_score IS NOT NULL
    ORDER BY s.start_time DESC
    LIMIT 30
  `).all(userId, cutoff) as any[];

  for (const s of sleeps) {
    if (existingRefs.has(s.id)) continue;
    await generateSleepPost(userId,
      { id: s.id, end_time: s.end_time },
      { recovery_score: s.recovery_score, cycle_id: s.cycle_id }
    ).catch(() => {});
  }

  console.log(`[sync] Backfill done for user ${userId}`);
}

export async function syncUser(userId: number, fullSync = false): Promise<void> {
  console.log(`[sync] Starting sync for user ${userId} (full=${fullSync})`);
  const client = await getWhoopClient(userId);

  // Always refresh profile
  try {
    const [profile, body] = await Promise.all([
      fetchUserProfile(client),
      fetchBodyMeasurements(client),
    ]);
    upsertUser({
      whoop_user_id: profile.user_id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      height_meter: body.height_meter,
      weight_kg: body.weight_kilogram,
      max_heart_rate: body.max_heart_rate,
    });
  } catch (e) {
    console.error('[sync] Profile fetch failed:', e);
  }

  const start = daysAgo(fullSync ? 365 : 14);
  const end = now();

  const [cycles, recoveries, sleeps, workouts] = await Promise.allSettled([
    fetchCycles(client, start, end),
    fetchRecoveries(client, start, end),
    fetchSleeps(client, start, end),
    fetchWorkouts(client, start, end),
  ]) as [
    PromiseSettledResult<any[]>,
    PromiseSettledResult<any[]>,
    PromiseSettledResult<any[]>,
    PromiseSettledResult<any[]>,
  ];

  if (cycles.status === 'fulfilled') {
    upsertCycles(userId, cycles.value);
    console.log(`[sync] Upserted ${cycles.value.length} cycles`);
  }

  // Build a recovery map for post generation (cycle_id → recovery)
  const recoveryMap = new Map<number, any>();
  if (recoveries.status === 'fulfilled') {
    upsertRecoveries(userId, recoveries.value);
    console.log(`[sync] Upserted ${recoveries.value.length} recoveries`);
    for (const r of recoveries.value) recoveryMap.set(r.cycle_id, r);
  }

  if (sleeps.status === 'fulfilled') {
    upsertSleeps(userId, sleeps.value);
    console.log(`[sync] Upserted ${sleeps.value.length} sleeps`);
    // Generate posts for ALL non-nap sleeps in this sync window
    for (const s of sleeps.value) {
      if (s.nap) continue;
      const rec = recoveryMap.get(s.cycle_id) ?? null;
      generateSleepPost(userId, { id: s.id, end_time: s.end }, rec).catch(() => {});
    }
    updateSleepStreak(userId);
  }

  if (workouts.status === 'fulfilled') {
    upsertWorkouts(userId, workouts.value);
    console.log(`[sync] Upserted ${workouts.value.length} workouts`);
    // Generate posts for ALL workouts in this sync window
    for (const w of workouts.value) {
      if (w.score?.strain) {
        generateWorkoutPost(userId, {
          id: w.id, sport_name: w.sport_name ?? 'activity',
          strain: w.score.strain, start_time: w.start,
          distance_meter: w.score?.distance_meter,
        }).catch(() => {});
      }
    }
  }

  updateRecoveryStreak(userId);
  checkEarlyAdopter(userId);
  console.log(`[sync] Done for user ${userId}`);
}

// ── Single-item sync (used by webhooks) ──────────────────────────────────

export async function syncSingleWorkout(userId: number, workoutId: string): Promise<void> {
  const client = await getWhoopClient(userId);
  const { data: w } = await client.get(`/v2/activity/workout/${workoutId}`);
  upsertWorkouts(userId, [w]);
  if (w.score?.strain) {
    await generateWorkoutPost(userId, {
      id: w.id,
      sport_name: w.sport_name ?? 'activity',
      strain: w.score.strain,
      start_time: w.start,
      distance_meter: w.score?.distance_meter,
    });
  }
  console.log(`[sync] syncSingleWorkout ${workoutId} done for user ${userId}`);
}

export async function syncSingleSleep(userId: number, sleepId: string): Promise<void> {
  const client = await getWhoopClient(userId);
  const { data: s } = await client.get(`/v2/activity/sleep/${sleepId}`);
  upsertSleeps(userId, [s]);

  // Try to also fetch recovery — it may or may not exist yet
  try {
    const { data: rec } = await client.get(`/v2/recovery/${sleepId}`);
    if (rec?.score?.recovery_score) {
      upsertRecoveries(userId, [rec]);
      if (!s.nap) {
        await generateSleepPost(userId, { id: s.id, end_time: s.end }, {
          recovery_score: rec.score.recovery_score,
          cycle_id: rec.cycle_id,
        });
        updateRecoveryStreak(userId);
      }
    }
  } catch {
    // Recovery not ready yet — will arrive with recovery.updated webhook
  }
  updateSleepStreak(userId);
  console.log(`[sync] syncSingleSleep ${sleepId} done for user ${userId}`);
}

export async function syncSingleRecovery(userId: number, sleepId: string): Promise<void> {
  const client = await getWhoopClient(userId);
  const [{ data: rec }, { data: s }] = await Promise.all([
    client.get(`/v2/recovery/${sleepId}`),
    client.get(`/v2/activity/sleep/${sleepId}`),
  ]);
  upsertRecoveries(userId, [rec]);
  upsertSleeps(userId, [s]);

  if (rec?.score?.recovery_score && !s.nap) {
    await generateSleepPost(userId, { id: s.id, end_time: s.end }, {
      recovery_score: rec.score.recovery_score,
      cycle_id: rec.cycle_id,
    });
    updateRecoveryStreak(userId);
  }
  console.log(`[sync] syncSingleRecovery sleepId=${sleepId} done for user ${userId}`);
}

export async function syncAllUsers(): Promise<void> {
  const db = getDb();
  const users = db.prepare('SELECT id FROM users').all() as { id: number }[];
  for (const { id } of users) {
    try {
      await syncUser(id, false);
    } catch (e) {
      console.error(`[sync] Failed for user ${id}:`, e);
    }
  }
}
