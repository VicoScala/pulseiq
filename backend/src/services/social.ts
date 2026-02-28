/**
 * Social service — auto-generates feed posts from WHOOP data,
 * calculates streaks, awards badges, and sends notifications.
 */
import {
  createPost, createNotification, upsertStreak, awardBadge,
  getStreaks, getDb, getUserById,
} from '../db/database';
import { pushToUser } from './ws';

// ── Sport name → French label ─────────────────────────────────────────────

const SPORT_FR: Record<string, string> = {
  'running':              'course à pied',
  'cycling':              'vélo',
  'swimming':             'natation',
  'weightlifting':        'musculation',
  'powerlifting':         'force athlétique',
  'functional fitness':   'fitness fonctionnel',
  'hiit':                 'HIIT',
  'hiking/rucking':       'randonnée',
  'walking':              'marche',
  'soccer':               'football',
  'basketball':           'basketball',
  'tennis':               'tennis',
  'yoga':                 'yoga',
  'pilates':              'pilates',
  'boxing':               'boxe',
  'kickboxing':           'kickboxing',
  'jiu jitsu':            'jiu-jitsu',
  'martial arts':         'arts martiaux',
  'rowing':               'aviron',
  'golf':                 'golf',
  'skiing':               'ski',
  'snowboarding':         'snowboard',
  'rock climbing':        'escalade',
  'climber':              'escalade',
  'mountain biking':      'VTT',
  'kayaking':             'kayak',
  'surfing':              'surf',
  'volleyball':           'volleyball',
  'baseball':             'baseball',
  'football':             'football américain',
  'rugby':                'rugby',
  'ice hockey':           'hockey sur glace',
  'dance':                'danse',
  'spin':                 'spinning',
  'elliptical':           'elliptique',
  'stairmaster':          'escaliers',
  'jumping rope':         'corde à sauter',
  'assault bike':         'assault bike',
  'stretching':           'étirements',
  'meditation':           'méditation',
  'cross country skiing': 'ski de fond',
  'triathlon':            'triathlon',
  'pickleball':           'pickleball',
  'other':                'autre activité',
  'activity':             'activité',
};

function getSportFR(sportName: string): string {
  return SPORT_FR[sportName?.toLowerCase() ?? ''] ?? sportName ?? 'activité';
}

// ── Message generators ────────────────────────────────────────────────────

function sleepMessage(name: string, recovery: number, perf: number): string {
  if (recovery >= 90) return `💪 ${name} est au max — ${recovery}% de recovery ! Journée de feu 🔥`;
  if (recovery >= 70) return `✅ Bonne nuit pour ${name} — ${recovery}% de recovery, en forme.`;
  if (recovery >= 50) return `😴 Nuit correcte pour ${name} (${recovery}%) — ça passe.`;
  if (recovery >= 30) return `😤 Nuit difficile pour ${name} — ${recovery}% recovery. Journée calme conseillée.`;
  return `💀 ${name} est dans le rouge à ${recovery}% — jour de repos absolu.`;
}

function activityMessage(name: string, sport: string, strain: number, distanceKm?: number): string {
  const sportFr = getSportFR(sport);
  const s = strain.toFixed(1);
  const dist = distanceKm && distanceKm > 0.1 ? ` · ${distanceKm.toFixed(1)} km` : '';
  if (strain >= 17) return `🔥 ${name} s'est explosé en ${sportFr}${dist} — Strain ${s} 💀`;
  if (strain >= 14) return `😤 ${name} a poussé fort en ${sportFr}${dist} — Strain ${s}`;
  if (strain >= 10) return `✅ Bonne séance de ${sportFr} pour ${name}${dist} — Strain ${s}`;
  return `🏃 ${name} a bougé (${sportFr}${dist}) — Strain ${s}`;
}

function streakMessage(name: string, type: string, count: number): string {
  const label = type === 'recovery' ? 'recovery > 66%' : '7h+ de sommeil';
  return `🏆 ${count} jours consécutifs de ${label} pour ${name} ! Continuez comme ça 🔥`;
}

function pbMessage(name: string, sport: string, strain: number): string {
  const sportFr = getSportFR(sport);
  return `📈 Record personnel pour ${name} en ${sportFr} ! Strain ${strain.toFixed(1)} — nouveau max 🎉`;
}

// ── Post generators ───────────────────────────────────────────────────────

export async function generateSleepPost(
  userId: number,
  sleep: { id: string; end_time: string },
  recovery: { recovery_score: number; cycle_id: number } | null,
): Promise<void> {
  if (!recovery?.recovery_score) return;
  const user = getUserById(userId) as any;
  if (!user) return;

  const name = user.first_name ?? 'Quelqu\'un';
  const score = Math.round(recovery.recovery_score);
  const perf = 0; // performance not used in message here

  const post = createPost({
    userId,
    postType: 'sleep',
    whoopRefId: sleep.id,
    whoopData: {
      recovery_score: score,
      sleep_id: sleep.id,
      cycle_id: recovery.cycle_id,
    },
    message: sleepMessage(name, score, perf),
    visibility: 'friends',
  });

  if (post) {
    // Notify followers
    notifyFollowers(userId, 'new_post', String(post.id), { post_type: 'sleep' });
  }
}

export async function generateWorkoutPost(
  userId: number,
  workout: { id: string; sport_name: string; strain: number; start_time: string; distance_meter?: number },
): Promise<void> {
  if (!workout.strain) return;
  const user = getUserById(userId) as any;
  if (!user) return;

  const name = user.first_name ?? 'Quelqu\'un';
  const sport = workout.sport_name ?? 'activity';
  const distanceKm = workout.distance_meter && workout.distance_meter > 0
    ? workout.distance_meter / 1000
    : undefined;

  const post = createPost({
    userId,
    postType: 'activity',
    whoopRefId: workout.id,
    whoopData: {
      sport_name: sport,
      strain: workout.strain,
      workout_id: workout.id,
      distance_km: distanceKm,
    },
    message: activityMessage(name, sport, workout.strain, distanceKm),
    visibility: 'friends',
  });

  if (post) {
    notifyFollowers(userId, 'new_post', String(post.id), { post_type: 'activity' });
    // Check personal best
    await checkAndPostPersonalBest(userId, workout, post.id);
  }
}

async function checkAndPostPersonalBest(
  userId: number,
  workout: { id: string; sport_name: string; strain: number; distance_meter?: number },
  currentPostId: number,
): Promise<void> {
  const db = getDb();
  const prev = db.prepare(`
    SELECT MAX(strain) as best FROM workouts
    WHERE user_id=? AND sport_name=? AND id != ? AND strain IS NOT NULL
  `).get(userId, workout.sport_name, workout.id) as { best: number } | undefined;

  if (prev?.best && workout.strain > prev.best) {
    const user = getUserById(userId) as any;
    const name = user?.first_name ?? 'Quelqu\'un';
    createPost({
      userId,
      postType: 'personal_best',
      whoopRefId: `pb_${workout.id}`,
      whoopData: { sport_name: workout.sport_name, strain: workout.strain, previous_best: prev.best },
      message: pbMessage(name, workout.sport_name, workout.strain),
      visibility: 'friends',
    });
  }
}

// ── Streak management ─────────────────────────────────────────────────────

export function updateRecoveryStreak(userId: number): void {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Get last two days of recovery
  const rows = db.prepare(`
    SELECT date(created_at) as day, recovery_score FROM recoveries
    WHERE user_id=? ORDER BY created_at DESC LIMIT 2
  `).all(userId) as { day: string; recovery_score: number }[];

  if (!rows.length) return;
  const latest = rows[0];
  if (latest.day !== today) return; // No data today yet

  const isGood = latest.recovery_score >= 66;
  const streak = upsertStreak(userId, 'recovery', today, isGood);

  if (!isGood) return;

  // Award badges at milestones
  if (streak.current_count >= 7)  awardBadge(userId, 'streak_7');
  if (streak.current_count >= 30) awardBadge(userId, 'streak_30');

  // Generate post at milestones (7, 14, 21, 30, 60, 90...)
  const milestones = [7, 14, 21, 30, 60, 90];
  if (milestones.includes(streak.current_count)) {
    const user = getUserById(userId) as any;
    if (user) {
      createPost({
        userId,
        postType: 'streak',
        whoopRefId: `streak_recovery_${today}`,
        whoopData: { streak_type: 'recovery', count: streak.current_count },
        message: streakMessage(user.first_name, 'recovery', streak.current_count),
        visibility: 'friends',
      });
    }
  }
}

export function updateSleepStreak(userId: number): void {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const row = db.prepare(`
    SELECT date(start_time) as day,
           (total_in_bed_time_milli - total_awake_time_milli) / 3600000.0 as hours
    FROM sleeps WHERE user_id=? AND nap=0 ORDER BY start_time DESC LIMIT 1
  `).get(userId) as { day: string; hours: number } | undefined;

  if (!row || row.day !== today) return;

  const isGood = row.hours >= 7;
  const streak = upsertStreak(userId, 'sleep', today, isGood);

  if (!isGood) return;

  if (streak.current_count >= 7) awardBadge(userId, 'sleep_champion');

  const milestones = [7, 14, 30];
  if (milestones.includes(streak.current_count)) {
    const user = getUserById(userId) as any;
    if (user) {
      createPost({
        userId,
        postType: 'streak',
        whoopRefId: `streak_sleep_${today}`,
        whoopData: { streak_type: 'sleep', count: streak.current_count },
        message: streakMessage(user.first_name, 'sleep', streak.current_count),
        visibility: 'friends',
      });
    }
  }
}

// ── Nightly streak-loss warning ───────────────────────────────────────────

export function runNightlyStreakWarnings(): void {
  const db = getDb();
  const users = db.prepare('SELECT id FROM users').all() as { id: number }[];
  const today = new Date().toISOString().split('T')[0];

  for (const { id } of users) {
    const streaks = getStreaks(id).filter(s => s.current_count >= 3);
    for (const s of streaks) {
      if (s.last_activity_date === today) continue; // Already active today
      createNotification({
        userId: id,
        type: 'streak_warning',
        payload: { streak_type: s.streak_type, count: s.current_count },
      });
      pushToUser(id, {
        type: 'notification',
        data: { type: 'streak_warning', streak_type: s.streak_type, count: s.current_count },
      });
    }
  }
}

// ── Early adopter badge ───────────────────────────────────────────────────

export function checkEarlyAdopter(userId: number): void {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  if (count <= 100) awardBadge(userId, 'early_adopter');
}

// ── Helper: notify followers ──────────────────────────────────────────────

function notifyFollowers(
  userId: number, type: string, referenceId: string, payload?: object,
): void {
  const db = getDb();
  const followers = db.prepare(
    'SELECT follower_id FROM friendships WHERE following_id=?'
  ).all(userId) as { follower_id: number }[];

  for (const { follower_id } of followers) {
    createNotification({ userId: follower_id, type, fromUserId: userId, referenceId, payload });
    pushToUser(follower_id, { type: 'notification', data: { type, fromUserId: userId, referenceId } });
  }
}

export function notifyUser(
  targetId: number, type: string, fromUserId: number, referenceId?: string, payload?: object,
): void {
  createNotification({ userId: targetId, type, fromUserId, referenceId, payload });
  const actor = getUserById(fromUserId) as any;
  pushToUser(targetId, {
    type: 'notification',
    data: {
      type,
      fromUserId,
      fromFirstName: actor?.first_name ?? null,
      fromLastName:  actor?.last_name  ?? null,
      referenceId,
    },
  });
}
