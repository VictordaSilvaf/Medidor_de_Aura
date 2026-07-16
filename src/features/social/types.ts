export type VideoVisibility = 'private' | 'public';

export type Profile = {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  level: number;
  xp: number;
  total_aura: number;
  measurements: number;
  best_tier_id: string | null;
  streak_days: number;
  last_measure_date: string | null;
  default_visibility: VideoVisibility;
  is_public_profile: boolean;
  created_at: string;
  updated_at: string;
};

export type ChallengeType =
  | 'weekly'
  | 'monthly'
  | 'seasonal'
  | 'duel'
  | 'community'
  | 'tier_hunt'
  | 'streak';

export type ChallengeStatus = 'draft' | 'active' | 'ended';

export type LocalizedText = Record<string, string>;

export type Challenge = {
  id: string;
  type: ChallengeType;
  status: ChallengeStatus;
  title: LocalizedText;
  description: LocalizedText;
  rules: Record<string, unknown>;
  reward_xp: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  opponent_analysis_id: string | null;
  opponent_user_id: string | null;
  created_at: string;
};

export type FeedPost = {
  id: string;
  user_id: string;
  posted_at: string | null;
  created_at: string;
  visibility: VideoVisibility;
  score: number;
  tier_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
};

/** XP → level: level = floor(sqrt(xp / 100)) + 1 */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForNextLevel(level: number): number {
  return level * level * 100;
}

export function localizeChallengeText(
  text: LocalizedText,
  locale: string,
): string {
  return text[locale] ?? text['pt-BR'] ?? text.en ?? text.es ?? Object.values(text)[0] ?? '';
}
