export interface User {
  id: number;
  whoop_user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  height_meter: number;
  weight_kg: number;
  max_heart_rate: number;
}

export interface Recovery {
  id: number;
  cycle_id: number;
  sleep_id: string;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage: number;
  skin_temp_celsius: number;
  score_state: string;
  created_at: string;
  updated_at: string;
  cycle_date?: string;
  cycle_strain?: number;
}

export interface Sleep {
  id: string;
  cycle_id: number;
  start_time: string;
  end_time: string;
  nap: number;
  total_in_bed_time_milli: number;
  total_awake_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
  sleep_performance_percentage: number;
  sleep_consistency_percentage: number;
  sleep_efficiency_percentage: number;
  respiratory_rate: number;
  baseline_need_milli: number;
  debt_need_milli: number;
  score_state: string;
  created_at: string;
}

export interface Cycle {
  id: number;
  start_time: string;
  end_time: string;
  strain: number;
  kilojoule: number;
  average_heart_rate: number;
  max_heart_rate: number;
  score_state: string;
}

// ── Social types ──────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'fire' | 'beast' | 'rip' | 'clap';

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like:  '👍',
  fire:  '🔥',
  beast: '💪',
  rip:   '💀',
  clap:  '👏',
};

export interface PublicUser {
  id: number;
  whoop_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  last_active?: string;
}

export interface FeedPost {
  id: number;
  user_id: number;
  post_type: 'sleep' | 'activity' | 'streak' | 'pb' | 'repost';
  content: string;
  metric_value?: number;
  metric_label?: string;
  ref_id?: string;
  repost_of?: number;
  created_at: string;
  // joined fields
  first_name: string;
  last_name: string;
  avatar_url?: string;
  reaction_counts?: Partial<Record<ReactionType, number>>;
  my_reaction?: ReactionType | null;
  comment_count: number;
  repost_count: number;
  // repost source (when post_type === 'repost')
  original_content?: string;
  original_first_name?: string;
  original_last_name?: string;
  // whoop data for richer display
  whoop_data?: {
    sport_name?: string;
    strain?: number;
    distance_km?: number;
    recovery_score?: number;
    sleep_id?: string;
    streak_type?: string;
    count?: number;
  };
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  parent_comment_id?: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export interface Streak {
  type: 'recovery' | 'sleep';
  current_count: number;
  best_count: number;
  last_date: string;
}

export interface Badge {
  badge_type: string;
  awarded_at: string;
}

export interface Notification {
  id: number;
  actor_id: number;
  notif_type: 'new_follower' | 'new_reaction' | 'new_comment' | 'nudge' | 'streak_warning' | 'badge_earned';
  target_id?: string;
  extra_json?: string;
  read: number;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  value: number;
  is_me: boolean;
  isFollowing: boolean;
}

export interface SocialProfile {
  user: PublicUser;
  streaks: Streak[];
  badges: Badge[];
  followers: number;
  following: number;
  postCount: number;
  isFollowing?: boolean;
  posts?: FeedPost[];
}

export interface MorningStats {
  recovery: number | null;
  hrv: number | null;
  sleep_perf: number | null;
  streak_recovery: number;
  streak_sleep: number;
}

export interface WsMessage {
  type: 'new_post' | 'notification' | 'nudge' | 'ping' | 'connected';
  data?: {
    type?: string;
    fromUserId?: number;
    fromFirstName?: string | null;
    fromLastName?: string | null;
    referenceId?: string;
  };
  [key: string]: unknown;
}

export interface Workout {
  id: string;
  start_time: string;
  end_time: string;
  sport_name: string;
  sport_id: number;
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  zone_zero_milli: number;
  zone_one_milli: number;
  zone_two_milli: number;
  zone_three_milli: number;
  zone_four_milli: number;
  zone_five_milli: number;
  distance_meter?: number;
  altitude_gain_meter?: number;
  score_state: string;
  created_at: string;
}

export interface DashboardData {
  today: { recovery: Recovery | null; sleep: Sleep | null };
  trends: {
    avgRecovery: number | null;
    avgHrv: number | null;
    avgRhr: number | null;
    avgStrain7d: number | null;
  };
  recentWorkouts: Workout[];
}

export type Period = '7d' | '30d' | '90d' | '1y';
