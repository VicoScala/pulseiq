import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = path.resolve(config.dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

// ── Migrations ────────────────────────────────────────────────────────────
// Each migration runs exactly once, identified by its version number.
// PRAGMA user_version tracks the current schema version in the DB file itself.
// Adding a new schema change = add a new entry at the end of MIGRATIONS.
// Never edit existing migrations — only append new ones.

interface Migration {
  version: number;
  run: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    // Initial schema — all tables created correctly
    version: 1,
    run(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          whoop_user_id  INTEGER UNIQUE NOT NULL,
          email          TEXT,
          first_name     TEXT,
          last_name      TEXT,
          height_meter   REAL,
          weight_kg      REAL,
          max_heart_rate INTEGER,
          created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tokens (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          access_token   TEXT NOT NULL,
          refresh_token  TEXT NOT NULL,
          expires_at     DATETIME NOT NULL,
          created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id         TEXT PRIMARY KEY,
          user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cycles (
          id                  INTEGER PRIMARY KEY,
          user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          start_time          DATETIME NOT NULL,
          end_time            DATETIME,
          strain              REAL,
          kilojoule           REAL,
          average_heart_rate  INTEGER,
          max_heart_rate      INTEGER,
          score_state         TEXT,
          created_at          DATETIME,
          updated_at          DATETIME
        );

        CREATE TABLE IF NOT EXISTS recoveries (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          cycle_id             INTEGER NOT NULL,
          sleep_id             TEXT,
          recovery_score       REAL,
          resting_heart_rate   REAL,
          hrv_rmssd_milli      REAL,
          spo2_percentage      REAL,
          skin_temp_celsius    REAL,
          score_state          TEXT,
          created_at           DATETIME,
          updated_at           DATETIME,
          UNIQUE(user_id, cycle_id)
        );

        CREATE TABLE IF NOT EXISTS sleeps (
          id                               TEXT PRIMARY KEY,
          user_id                          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          cycle_id                         INTEGER,
          start_time                       DATETIME NOT NULL,
          end_time                         DATETIME,
          nap                              INTEGER DEFAULT 0,
          total_in_bed_time_milli          INTEGER,
          total_awake_time_milli           INTEGER,
          total_light_sleep_time_milli     INTEGER,
          total_slow_wave_sleep_time_milli INTEGER,
          total_rem_sleep_time_milli       INTEGER,
          sleep_cycle_count                INTEGER,
          disturbance_count                INTEGER,
          sleep_performance_percentage     REAL,
          sleep_consistency_percentage     REAL,
          sleep_efficiency_percentage      REAL,
          respiratory_rate                 REAL,
          baseline_need_milli              INTEGER,
          debt_need_milli                  INTEGER,
          strain_need_milli                INTEGER,
          score_state                      TEXT,
          created_at                       DATETIME,
          updated_at                       DATETIME
        );

        CREATE TABLE IF NOT EXISTS workouts (
          id                   TEXT PRIMARY KEY,
          user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          start_time           DATETIME NOT NULL,
          end_time             DATETIME,
          sport_name           TEXT,
          sport_id             INTEGER,
          strain               REAL,
          average_heart_rate   INTEGER,
          max_heart_rate       INTEGER,
          kilojoule            REAL,
          percent_recorded     REAL,
          zone_zero_milli      INTEGER,
          zone_one_milli       INTEGER,
          zone_two_milli       INTEGER,
          zone_three_milli     INTEGER,
          zone_four_milli      INTEGER,
          zone_five_milli      INTEGER,
          score_state          TEXT,
          created_at           DATETIME,
          updated_at           DATETIME
        );

        CREATE INDEX IF NOT EXISTS idx_cycles_user_start     ON cycles(user_id, start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_recoveries_user_cycle ON recoveries(user_id, cycle_id DESC);
        CREATE INDEX IF NOT EXISTS idx_sleeps_user_start     ON sleeps(user_id, start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_workouts_user_start   ON workouts(user_id, start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_user         ON sessions(user_id);
      `);
    },
  },
  {
    // Fix cycles table: drop the erroneous UNIQUE(id, user_id) composite constraint
    // that conflicted with INTEGER PRIMARY KEY and broke ON CONFLICT(id).
    // Recreates the table without it if needed; no-op on fresh DBs.
    version: 2,
    run(db) {
      const row = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='cycles'"
      ).get() as { sql: string } | undefined;

      // Only touch the table if the bad constraint is present
      if (row?.sql && /UNIQUE\s*\(\s*id\s*,\s*user_id\s*\)/i.test(row.sql)) {
        db.exec(`
          CREATE TABLE cycles_new (
            id                  INTEGER PRIMARY KEY,
            user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            start_time          DATETIME NOT NULL,
            end_time            DATETIME,
            strain              REAL,
            kilojoule           REAL,
            average_heart_rate  INTEGER,
            max_heart_rate      INTEGER,
            score_state         TEXT,
            created_at          DATETIME,
            updated_at          DATETIME
          );
          INSERT OR IGNORE INTO cycles_new
            SELECT id, user_id, start_time, end_time, strain, kilojoule,
                   average_heart_rate, max_heart_rate, score_state, created_at, updated_at
            FROM cycles;
          DROP TABLE cycles;
          ALTER TABLE cycles_new RENAME TO cycles;
          CREATE INDEX IF NOT EXISTS idx_cycles_user_start ON cycles(user_id, start_time DESC);
        `);
        console.log('[db] Migration 2: cycles table constraint fixed');
      }
    },
  },
  // ↓ Append future migrations here — never edit the ones above.
  {
    // Social layer: follow graph, feed posts, reactions, comments, streaks, badges, notifications
    version: 3,
    run(db) {
      // Helper: add column only if absent (SQLite has no IF NOT EXISTS for ALTER TABLE)
      const cols = (t: string) =>
        (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name);
      const addCol = (t: string, col: string, def: string) => {
        if (!cols(t).includes(col)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${col} ${def}`);
      };

      // Extend users table
      addCol('users', 'username',    'TEXT');
      addCol('users', 'bio',         'TEXT');
      addCol('users', 'last_active', 'DATETIME');

      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)
          WHERE username IS NOT NULL;

        -- ── Follow graph (asymmetric, like X/Twitter) ─────────────────────
        CREATE TABLE IF NOT EXISTS friendships (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(follower_id, following_id)
        );
        CREATE INDEX IF NOT EXISTS idx_fs_follower  ON friendships(follower_id);
        CREATE INDEX IF NOT EXISTS idx_fs_following ON friendships(following_id);

        -- ── Auto-generated feed posts ──────────────────────────────────────
        CREATE TABLE IF NOT EXISTS feed_posts (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          post_type         TEXT NOT NULL,
          whoop_ref_id      TEXT,
          whoop_data        TEXT,
          generated_message TEXT NOT NULL,
          visibility        TEXT DEFAULT 'friends',
          repost_of         INTEGER REFERENCES feed_posts(id) ON DELETE SET NULL,
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, post_type, whoop_ref_id)
        );
        CREATE INDEX IF NOT EXISTS idx_posts_user    ON feed_posts(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_created ON feed_posts(created_at DESC);

        -- ── Reactions (one per user per post, replaceable) ────────────────
        CREATE TABLE IF NOT EXISTS reactions (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id       INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
          user_id       INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
          reaction_type TEXT NOT NULL,
          created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

        -- ── Comments (threaded) ───────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS comments (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id           INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
          user_id           INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
          content           TEXT NOT NULL,
          parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC);

        -- ── Streaks ───────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS user_streaks (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          streak_type        TEXT NOT NULL,
          current_count      INTEGER DEFAULT 0,
          best_count         INTEGER DEFAULT 0,
          last_activity_date DATE,
          updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, streak_type)
        );

        -- ── Badges ────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS user_badges (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          badge_type TEXT NOT NULL,
          earned_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
          status     TEXT DEFAULT 'active',
          UNIQUE(user_id, badge_type)
        );

        -- ── In-app notifications ──────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS notifications (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type         TEXT NOT NULL,
          from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          reference_id TEXT,
          payload      TEXT,
          read         INTEGER DEFAULT 0,
          created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, read, created_at DESC);
      `);
    },
  },
  {
    // Add distance_meter and altitude_gain_meter to workouts (missing from initial schema)
    version: 4,
    run(db) {
      const cols = (t: string) =>
        (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name);
      const addCol = (t: string, col: string, def: string) => {
        if (!cols(t).includes(col)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${col} ${def}`);
      };
      addCol('workouts', 'distance_meter', 'REAL');
      addCol('workouts', 'altitude_gain_meter', 'REAL');
      console.log('[db] Migration 4: distance/altitude columns added to workouts');
    },
  },
  {
    // Add avatar_url to users for profile photo uploads
    version: 5,
    run(db) {
      const cols = (t: string) =>
        (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name);
      const addCol = (t: string, col: string, def: string) => {
        if (!cols(t).includes(col)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${col} ${def}`);
      };
      addCol('users', 'avatar_url', 'TEXT');
      console.log('[db] Migration 5: avatar_url column added to users');
    },
  },
];

function migrate(db: Database.Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  const pending = MIGRATIONS.filter(m => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    console.log(`[db] Running migration v${migration.version}…`);
    db.transaction(() => {
      migration.run(db);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }

  const latest = MIGRATIONS[MIGRATIONS.length - 1].version;
  console.log(`[db] Schema up to date (v${latest})`);
}

// ── User ──────────────────────────────────────────────────────────────────
export function upsertUser(data: {
  whoop_user_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  height_meter?: number;
  weight_kg?: number;
  max_heart_rate?: number;
}): number {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE whoop_user_id = ?').get(data.whoop_user_id) as { id: number } | undefined;
  if (existing) {
    db.prepare(`
      UPDATE users SET email=?, first_name=?, last_name=?, height_meter=?, weight_kg=?, max_heart_rate=?, updated_at=CURRENT_TIMESTAMP
      WHERE whoop_user_id=?
    `).run(data.email, data.first_name, data.last_name, data.height_meter, data.weight_kg, data.max_heart_rate, data.whoop_user_id);
    return existing.id;
  }
  const result = db.prepare(`
    INSERT INTO users (whoop_user_id, email, first_name, last_name, height_meter, weight_kg, max_heart_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.whoop_user_id, data.email, data.first_name, data.last_name, data.height_meter, data.weight_kg, data.max_heart_rate);
  return result.lastInsertRowid as number;
}

export function getUserById(id: number) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ── Tokens ────────────────────────────────────────────────────────────────
export function upsertToken(userId: number, accessToken: string, refreshToken: string, expiresAt: Date): void {
  getDb().prepare(`
    INSERT INTO tokens (user_id, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      expires_at=excluded.expires_at,
      updated_at=CURRENT_TIMESTAMP
  `).run(userId, accessToken, refreshToken, expiresAt.toISOString());
}

export function getToken(userId: number): { access_token: string; refresh_token: string; expires_at: string } | undefined {
  return getDb().prepare('SELECT * FROM tokens WHERE user_id = ?').get(userId) as any;
}

// ── Sessions ──────────────────────────────────────────────────────────────
export function createSession(sessionId: string, userId: number, expiresAt: Date): void {
  getDb().prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt.toISOString());
}

export function getSession(sessionId: string): { user_id: number; expires_at: string } | undefined {
  return getDb().prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sessionId) as any;
}

export function deleteSession(sessionId: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function cleanExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

// ── Cycles ────────────────────────────────────────────────────────────────
export function upsertCycles(userId: number, cycles: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO cycles (id, user_id, start_time, end_time, strain, kilojoule, average_heart_rate, max_heart_rate, score_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      end_time=excluded.end_time, strain=excluded.strain, kilojoule=excluded.kilojoule,
      average_heart_rate=excluded.average_heart_rate, max_heart_rate=excluded.max_heart_rate,
      score_state=excluded.score_state, updated_at=excluded.updated_at
  `);
  const insert = db.transaction((rows: any[]) => {
    for (const c of rows) {
      stmt.run(c.id, userId, c.start, c.end, c.score?.strain, c.score?.kilojoule,
        c.score?.average_heart_rate, c.score?.max_heart_rate, c.score_state, c.created_at, c.updated_at);
    }
  });
  insert(cycles);
}

export function getCycles(userId: number, days: number): any[] {
  return getDb().prepare(`
    SELECT * FROM cycles WHERE user_id=? AND start_time >= datetime('now', ? || ' days')
    ORDER BY start_time DESC
  `).all(userId, `-${days}`) as any[];
}

// ── Recoveries ────────────────────────────────────────────────────────────
export function upsertRecoveries(userId: number, records: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO recoveries (user_id, cycle_id, sleep_id, recovery_score, resting_heart_rate, hrv_rmssd_milli, spo2_percentage, skin_temp_celsius, score_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, cycle_id) DO UPDATE SET
      recovery_score=excluded.recovery_score, resting_heart_rate=excluded.resting_heart_rate,
      hrv_rmssd_milli=excluded.hrv_rmssd_milli, spo2_percentage=excluded.spo2_percentage,
      skin_temp_celsius=excluded.skin_temp_celsius, score_state=excluded.score_state,
      updated_at=excluded.updated_at
  `);
  const insert = db.transaction((rows: any[]) => {
    for (const r of rows) {
      stmt.run(userId, r.cycle_id, r.sleep_id, r.score?.recovery_score, r.score?.resting_heart_rate,
        r.score?.hrv_rmssd_milli, r.score?.spo2_percentage, r.score?.skin_temp_celsius,
        r.score_state, r.created_at, r.updated_at);
    }
  });
  insert(records);
}

export function getRecoveries(userId: number, days: number): any[] {
  return getDb().prepare(`
    SELECT r.*, c.start_time as cycle_date, c.strain as cycle_strain
    FROM recoveries r
    LEFT JOIN cycles c ON c.id = r.cycle_id AND c.user_id = r.user_id
    WHERE r.user_id=? AND r.created_at >= datetime('now', ? || ' days')
    ORDER BY r.created_at DESC
  `).all(userId, `-${days}`) as any[];
}

export function getLatestRecovery(userId: number): any {
  return getDb().prepare(`
    SELECT r.*, c.start_time as cycle_date, c.strain as cycle_strain
    FROM recoveries r
    LEFT JOIN cycles c ON c.id = r.cycle_id AND c.user_id = r.user_id
    WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 1
  `).get(userId);
}

// ── Sleeps ────────────────────────────────────────────────────────────────
export function upsertSleeps(userId: number, records: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sleeps
    (id, user_id, cycle_id, start_time, end_time, nap,
     total_in_bed_time_milli, total_awake_time_milli, total_light_sleep_time_milli,
     total_slow_wave_sleep_time_milli, total_rem_sleep_time_milli, sleep_cycle_count,
     disturbance_count, sleep_performance_percentage, sleep_consistency_percentage,
     sleep_efficiency_percentage, respiratory_rate, baseline_need_milli, debt_need_milli,
     strain_need_milli, score_state, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insert = db.transaction((rows: any[]) => {
    for (const s of rows) {
      stmt.run(
        s.id, userId, s.cycle_id, s.start, s.end, s.nap ? 1 : 0,
        s.score?.stage_summary?.total_in_bed_time_milli,
        s.score?.stage_summary?.total_awake_time_milli,
        s.score?.stage_summary?.total_light_sleep_time_milli,
        s.score?.stage_summary?.total_slow_wave_sleep_time_milli,
        s.score?.stage_summary?.total_rem_sleep_time_milli,
        s.score?.stage_summary?.sleep_cycle_count,
        s.score?.stage_summary?.disturbance_count,
        s.score?.sleep_performance_percentage,
        s.score?.sleep_consistency_percentage,
        s.score?.sleep_efficiency_percentage,
        s.score?.respiratory_rate,
        s.score?.sleep_needed?.baseline_milli,
        s.score?.sleep_needed?.need_from_sleep_debt_milli,
        s.score?.sleep_needed?.need_from_recent_strain_milli,
        s.score_state, s.created_at, s.updated_at,
      );
    }
  });
  insert(records);
}

export function getSleeps(userId: number, days: number): any[] {
  return getDb().prepare(`
    SELECT * FROM sleeps WHERE user_id=? AND nap=0
    AND start_time >= datetime('now', ? || ' days')
    ORDER BY start_time DESC
  `).all(userId, `-${days}`) as any[];
}

export function getLatestSleep(userId: number): any {
  return getDb().prepare(
    'SELECT * FROM sleeps WHERE user_id=? AND nap=0 ORDER BY start_time DESC LIMIT 1'
  ).get(userId);
}

// ── Workouts ──────────────────────────────────────────────────────────────
export function upsertWorkouts(userId: number, records: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO workouts
    (id, user_id, start_time, end_time, sport_name, sport_id, strain, average_heart_rate,
     max_heart_rate, kilojoule, percent_recorded, zone_zero_milli, zone_one_milli, zone_two_milli,
     zone_three_milli, zone_four_milli, zone_five_milli, distance_meter, altitude_gain_meter,
     score_state, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insert = db.transaction((rows: any[]) => {
    for (const w of rows) {
      stmt.run(
        w.id, userId, w.start, w.end, w.sport_name, w.sport_id,
        w.score?.strain, w.score?.average_heart_rate, w.score?.max_heart_rate,
        w.score?.kilojoule, w.score?.percent_recorded,
        w.score?.zone_durations?.zone_zero_milli,
        w.score?.zone_durations?.zone_one_milli,
        w.score?.zone_durations?.zone_two_milli,
        w.score?.zone_durations?.zone_three_milli,
        w.score?.zone_durations?.zone_four_milli,
        w.score?.zone_durations?.zone_five_milli,
        w.score?.distance_meter,
        w.score?.altitude_gain_meter,
        w.score_state, w.created_at, w.updated_at,
      );
    }
  });
  insert(records);
}

export function getWorkouts(userId: number, days: number): any[] {
  return getDb().prepare(`
    SELECT * FROM workouts WHERE user_id=?
    AND start_time >= datetime('now', ? || ' days')
    ORDER BY start_time DESC
  `).all(userId, `-${days}`) as any[];
}

// ── Social: Profile ────────────────────────────────────────────────────────
export function updateProfile(userId: number, data: { username?: string; bio?: string; avatar_url?: string }): { ok: boolean; error?: string } {
  const db = getDb();
  if (data.username) {
    const taken = db.prepare('SELECT id FROM users WHERE username=? AND id!=?').get(data.username, userId);
    if (taken) return { ok: false, error: 'username_taken' };
    db.prepare('UPDATE users SET username=? WHERE id=?').run(data.username, userId);
  }
  if (data.bio !== undefined) {
    db.prepare('UPDATE users SET bio=? WHERE id=?').run(data.bio, userId);
  }
  if (data.avatar_url !== undefined) {
    db.prepare('UPDATE users SET avatar_url=? WHERE id=?').run(data.avatar_url, userId);
  }
  return { ok: true };
}

export function touchLastActive(userId: number): void {
  getDb().prepare("UPDATE users SET last_active=datetime('now') WHERE id=?").run(userId);
}

export function getUserPublic(userId: number): any {
  return getDb().prepare(
    'SELECT id, first_name, last_name, username, bio, avatar_url, created_at FROM users WHERE id=?'
  ).get(userId);
}

export function searchUsers(query: string, excludeId: number): any[] {
  const q = `%${query}%`;
  return getDb().prepare(`
    SELECT id, first_name, last_name, username, bio, avatar_url
    FROM users
    WHERE id != ? AND (
      first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR email LIKE ?
    )
    LIMIT 20
  `).all(excludeId, q, q, q, q) as any[];
}

export function getSuggestedUsers(userId: number): any[] {
  // Friends of friends not yet followed
  const db = getDb();
  return db.prepare(`
    SELECT DISTINCT u.id, u.first_name, u.last_name, u.username, u.bio, u.avatar_url
    FROM users u
    JOIN friendships f2 ON f2.following_id = u.id
    WHERE f2.follower_id IN (
      SELECT following_id FROM friendships WHERE follower_id = ?
    )
    AND u.id != ?
    AND u.id NOT IN (SELECT following_id FROM friendships WHERE follower_id = ?)
    LIMIT 10
  `).all(userId, userId, userId) as any[];
}

// ── Social: Follow ─────────────────────────────────────────────────────────
export function follow(followerId: number, followingId: number): void {
  getDb().prepare(
    'INSERT OR IGNORE INTO friendships (follower_id, following_id) VALUES (?,?)'
  ).run(followerId, followingId);
}

export function unfollow(followerId: number, followingId: number): void {
  getDb().prepare(
    'DELETE FROM friendships WHERE follower_id=? AND following_id=?'
  ).run(followerId, followingId);
}

export function isFollowing(followerId: number, followingId: number): boolean {
  return !!getDb().prepare(
    'SELECT 1 FROM friendships WHERE follower_id=? AND following_id=?'
  ).get(followerId, followingId);
}

export function getFollowers(userId: number): any[] {
  return getDb().prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username, u.bio
    FROM friendships f JOIN users u ON u.id = f.follower_id
    WHERE f.following_id=? ORDER BY f.created_at DESC
  `).all(userId) as any[];
}

export function getFollowing(userId: number): any[] {
  return getDb().prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username, u.bio
    FROM friendships f JOIN users u ON u.id = f.following_id
    WHERE f.follower_id=? ORDER BY f.created_at DESC
  `).all(userId) as any[];
}

// ── Social: Feed Posts ─────────────────────────────────────────────────────
export function createPost(data: {
  userId: number; postType: string; whoopRefId?: string;
  whoopData?: object; message: string; visibility?: string;
}): any {
  const db = getDb();
  const result = db.prepare(`
    INSERT OR IGNORE INTO feed_posts (user_id, post_type, whoop_ref_id, whoop_data, generated_message, visibility)
    VALUES (?,?,?,?,?,?)
  `).run(
    data.userId, data.postType, data.whoopRefId ?? null,
    data.whoopData ? JSON.stringify(data.whoopData) : null,
    data.message, data.visibility ?? 'friends',
  );
  if (!result.lastInsertRowid) return null; // was duplicate
  return db.prepare('SELECT * FROM feed_posts WHERE id=?').get(result.lastInsertRowid);
}

export function getFeed(userId: number, cursor?: number, limit = 20): any[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*,
      p.generated_message AS content,
      u.first_name, u.last_name, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM comments  c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM feed_posts rr WHERE rr.repost_of = p.id) AS repost_count,
      (SELECT reaction_type FROM reactions r WHERE r.post_id=p.id AND r.user_id=?) AS my_reaction,
      rp.generated_message AS original_content,
      ru.first_name AS original_first_name,
      ru.last_name  AS original_last_name
    FROM feed_posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN feed_posts rp ON rp.id = p.repost_of
    LEFT JOIN users ru ON ru.id = rp.user_id
    WHERE (p.user_id = ? OR p.user_id IN (
        SELECT following_id FROM friendships WHERE follower_id = ?
    ))
    AND p.visibility != 'private'
    ${cursor ? 'AND p.id < ?' : ''}
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(...(cursor ? [userId, userId, userId, cursor, limit] : [userId, userId, userId, limit])) as any[];

  // Enrich each post with per-reaction-type counts
  const reactionStmt = db.prepare(
    `SELECT reaction_type, COUNT(*) as n FROM reactions WHERE post_id=? GROUP BY reaction_type`
  );
  return rows.map(r => {
    const rxRows = reactionStmt.all(r.id) as { reaction_type: string; n: number }[];
    const reaction_counts: Record<string, number> = {};
    for (const rx of rxRows) reaction_counts[rx.reaction_type] = rx.n;
    return {
      ...r,
      reaction_counts,
      whoop_data: r.whoop_data ? JSON.parse(r.whoop_data) : null,
    };
  });
}

export function getNewPostsCount(userId: number, since: string): number {
  const row = getDb().prepare(`
    SELECT COUNT(*) as n FROM feed_posts p
    WHERE (p.user_id IN (SELECT following_id FROM friendships WHERE follower_id=?))
    AND p.visibility != 'private' AND p.created_at > ?
  `).get(userId, since) as { n: number };
  return row.n;
}

export function getUserPosts(profileUserId: number, viewerId: number, cursor?: number, limit = 20): any[] {
  const db = getDb();
  const isSelf = profileUserId === viewerId;
  const rows = db.prepare(`
    SELECT p.*,
      p.generated_message AS content,
      u.first_name, u.last_name, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM comments  c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM feed_posts rr WHERE rr.repost_of = p.id) AS repost_count,
      (SELECT reaction_type FROM reactions r WHERE r.post_id=p.id AND r.user_id=?) AS my_reaction
    FROM feed_posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ?
    ${!isSelf ? "AND p.visibility IN ('public','friends')" : ''}
    ${cursor ? 'AND p.id < ?' : ''}
    ORDER BY p.created_at DESC LIMIT ?
  `).all(...(cursor ? [viewerId, profileUserId, cursor, limit] : [viewerId, profileUserId, limit])) as any[];

  const reactionStmt = db.prepare(
    `SELECT reaction_type, COUNT(*) as n FROM reactions WHERE post_id=? GROUP BY reaction_type`
  );
  return rows.map(r => {
    const rxRows = reactionStmt.all(r.id) as { reaction_type: string; n: number }[];
    const reaction_counts: Record<string, number> = {};
    for (const rx of rxRows) reaction_counts[rx.reaction_type] = rx.n;
    return { ...r, reaction_counts, whoop_data: r.whoop_data ? JSON.parse(r.whoop_data) : null };
  });
}

export function repostPost(userId: number, postId: number): any {
  const original = getDb().prepare('SELECT * FROM feed_posts WHERE id=?').get(postId) as any;
  if (!original) return null;
  return createPost({
    userId, postType: 'repost', whoopRefId: `repost_${postId}_${userId}`,
    message: original.generated_message, visibility: 'friends',
  });
}

// ── Social: Reactions ──────────────────────────────────────────────────────
export function upsertReaction(postId: number, userId: number, reactionType: string): void {
  getDb().prepare(`
    INSERT INTO reactions (post_id, user_id, reaction_type) VALUES (?,?,?)
    ON CONFLICT(post_id, user_id) DO UPDATE SET reaction_type=excluded.reaction_type, created_at=CURRENT_TIMESTAMP
  `).run(postId, userId, reactionType);
}

export function removeReaction(postId: number, userId: number): void {
  getDb().prepare('DELETE FROM reactions WHERE post_id=? AND user_id=?').run(postId, userId);
}

export function getReactionSummary(postId: number, viewerId: number): any {
  const counts = getDb().prepare(`
    SELECT reaction_type, COUNT(*) as count FROM reactions WHERE post_id=? GROUP BY reaction_type
  `).all(postId) as any[];
  const mine = getDb().prepare(
    'SELECT reaction_type FROM reactions WHERE post_id=? AND user_id=?'
  ).get(postId, viewerId) as any;
  return { counts, myReaction: mine?.reaction_type ?? null };
}

// ── Social: Comments ───────────────────────────────────────────────────────
export function addComment(postId: number, userId: number, content: string, parentId?: number): any {
  const db = getDb();
  const res = db.prepare(
    'INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (?,?,?,?)'
  ).run(postId, userId, content, parentId ?? null);
  return db.prepare(`
    SELECT c.*, u.first_name, u.last_name, u.username FROM comments c
    JOIN users u ON u.id=c.user_id WHERE c.id=?
  `).get(res.lastInsertRowid);
}

export function getComments(postId: number): any[] {
  return getDb().prepare(`
    SELECT c.*, u.first_name, u.last_name, u.username FROM comments c
    JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.created_at ASC
  `).all(postId) as any[];
}

// ── Social: Notifications ──────────────────────────────────────────────────
export function createNotification(data: {
  userId: number; type: string; fromUserId?: number; referenceId?: string; payload?: object;
}): void {
  getDb().prepare(`
    INSERT INTO notifications (user_id, type, from_user_id, reference_id, payload)
    VALUES (?,?,?,?,?)
  `).run(
    data.userId, data.type, data.fromUserId ?? null,
    data.referenceId ?? null, data.payload ? JSON.stringify(data.payload) : null,
  );
}

export function getNotifications(userId: number, limit = 30): any[] {
  return (getDb().prepare(`
    SELECT n.*, u.first_name as from_first, u.last_name as from_last, u.username as from_username
    FROM notifications n
    LEFT JOIN users u ON u.id = n.from_user_id
    WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT ?
  `).all(userId, limit) as any[]).map(n => ({
    ...n, payload: n.payload ? JSON.parse(n.payload) : null,
  }));
}

export function markNotificationsRead(userId: number, id?: number): void {
  if (id) {
    getDb().prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(id, userId);
  } else {
    getDb().prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(userId);
  }
}

export function getUnreadNotifCount(userId: number): number {
  const row = getDb().prepare(
    'SELECT COUNT(*) as n FROM notifications WHERE user_id=? AND read=0'
  ).get(userId) as { n: number };
  return row.n;
}

// ── Social: Streaks ────────────────────────────────────────────────────────
export function upsertStreak(userId: number, streakType: string, lastDate: string, increment: boolean): any {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM user_streaks WHERE user_id=? AND streak_type=?'
  ).get(userId, streakType) as any;

  if (!existing) {
    db.prepare(`
      INSERT INTO user_streaks (user_id, streak_type, current_count, best_count, last_activity_date)
      VALUES (?,?,?,?,?)
    `).run(userId, streakType, increment ? 1 : 0, increment ? 1 : 0, lastDate);
    return db.prepare('SELECT * FROM user_streaks WHERE user_id=? AND streak_type=?').get(userId, streakType);
  }

  const newCount = increment ? existing.current_count + 1 : 0;
  const newBest  = Math.max(existing.best_count, newCount);
  db.prepare(`
    UPDATE user_streaks SET current_count=?, best_count=?, last_activity_date=?, updated_at=CURRENT_TIMESTAMP
    WHERE user_id=? AND streak_type=?
  `).run(newCount, newBest, lastDate, userId, streakType);
  return { ...existing, current_count: newCount, best_count: newBest };
}

export function getStreaks(userId: number): any[] {
  return getDb().prepare('SELECT * FROM user_streaks WHERE user_id=?').all(userId) as any[];
}

// ── Social: Badges ─────────────────────────────────────────────────────────
export function awardBadge(userId: number, badgeType: string): boolean {
  const res = getDb().prepare(
    'INSERT OR IGNORE INTO user_badges (user_id, badge_type) VALUES (?,?)'
  ).run(userId, badgeType);
  return res.changes > 0;
}

export function getBadges(userId: number): any[] {
  return getDb().prepare('SELECT * FROM user_badges WHERE user_id=? ORDER BY earned_at DESC').all(userId) as any[];
}

// ── Social: Leaderboard ────────────────────────────────────────────────────
export function getLeaderboard(userId: number, type: 'recovery' | 'strain' | 'sleep'): any[] {
  const db = getDb();
  // Use last 7 days instead of "since monday" to always have data
  const cutoff = "datetime('now', '-7 days')";

  let rows: any[];

  if (type === 'recovery') {
    rows = db.prepare(`
      SELECT u.id as user_id, u.first_name, u.last_name,
             AVG(r.recovery_score) as value
      FROM users u JOIN recoveries r ON r.user_id=u.id
      WHERE r.created_at >= ${cutoff}
        AND (u.id=? OR u.id IN (SELECT following_id FROM friendships WHERE follower_id=?))
      GROUP BY u.id ORDER BY value DESC LIMIT 10
    `).all(userId, userId) as any[];
  } else if (type === 'strain') {
    rows = db.prepare(`
      SELECT u.id as user_id, u.first_name, u.last_name,
             AVG(c.strain) as value
      FROM users u JOIN cycles c ON c.user_id=u.id
      WHERE c.start_time >= ${cutoff}
        AND (u.id=? OR u.id IN (SELECT following_id FROM friendships WHERE follower_id=?))
      GROUP BY u.id ORDER BY value DESC LIMIT 10
    `).all(userId, userId) as any[];
  } else {
    // sleep performance %
    rows = db.prepare(`
      SELECT u.id as user_id, u.first_name, u.last_name,
             AVG(s.sleep_performance_percentage) as value
      FROM users u JOIN sleeps s ON s.user_id=u.id
      WHERE s.start_time >= ${cutoff} AND s.nap=0
        AND (u.id=? OR u.id IN (SELECT following_id FROM friendships WHERE follower_id=?))
      GROUP BY u.id ORDER BY value DESC LIMIT 10
    `).all(userId, userId) as any[];
  }

  return rows.map((r, i) => ({
    ...r,
    rank:        i + 1,
    value:       r.value ?? 0,
    is_me:       r.user_id === userId,
    isFollowing: r.user_id !== userId
      ? !!(db.prepare('SELECT 1 FROM friendships WHERE follower_id=? AND following_id=?')
             .get(userId, r.user_id))
      : false,
  }));
}

// ── Social: Morning stats ──────────────────────────────────────────────────
export function getMorningStats(userId: number): {
  recovery: number | null;
  hrv: number | null;
  sleep_perf: number | null;
  streak_recovery: number;
  streak_sleep: number;
} {
  const db = getDb();

  // Today's recovery + HRV (most recent cycle for the user)
  const rec = db.prepare(`
    SELECT r.recovery_score, r.hrv_rmssd_milli
    FROM recoveries r
    JOIN cycles c ON c.id = r.cycle_id
    WHERE r.user_id = ?
    ORDER BY c.end_time DESC LIMIT 1
  `).get(userId) as { recovery_score: number; hrv_rmssd_milli: number } | undefined;

  // Most recent sleep performance
  const sleep = db.prepare(`
    SELECT sleep_performance_percentage
    FROM sleeps
    WHERE user_id = ? AND nap = 0
    ORDER BY end_time DESC LIMIT 1
  `).get(userId) as { sleep_performance_percentage: number } | undefined;

  // Current streaks
  const streaks = getStreaks(userId) as { type: string; current_count: number }[];
  const srec  = streaks.find(s => s.type === 'recovery')?.current_count ?? 0;
  const ssleep = streaks.find(s => s.type === 'sleep')?.current_count ?? 0;

  return {
    recovery:        rec?.recovery_score ?? null,
    hrv:             rec?.hrv_rmssd_milli ?? null,
    sleep_perf:      sleep?.sleep_performance_percentage ?? null,
    streak_recovery: srec,
    streak_sleep:    ssleep,
  };
}
