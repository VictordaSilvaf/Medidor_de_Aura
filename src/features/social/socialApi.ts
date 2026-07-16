import { supabase } from '@/src/features/auth/supabase';

import type { Challenge, FeedPost } from './types';

export async function fetchPublicFeed(limit = 40): Promise<FeedPost[]> {
  const { data: analyses, error } = await supabase
    .from('video_analyses')
    .select('id, user_id, posted_at, created_at, visibility')
    .eq('visibility', 'public')
    .eq('status', 'completed')
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!analyses?.length) return [];

  const ids = analyses.map((a) => a.id);
  const userIds = [...new Set(analyses.map((a) => a.user_id))];

  const [{ data: results }, { data: profiles }] = await Promise.all([
    supabase
      .from('video_analysis_results')
      .select('analysis_id, score, tier_id')
      .in('analysis_id', ids),
    supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, level')
      .in('user_id', userIds),
  ]);

  const resultById = new Map(
    (results ?? []).map((r) => [r.analysis_id, r] as const),
  );
  const profileById = new Map(
    (profiles ?? []).map((p) => [p.user_id, p] as const),
  );

  return analyses
    .map((row) => {
      const result = resultById.get(row.id);
      const profile = profileById.get(row.user_id);
      if (!result || !profile) return null;
      return {
        id: row.id,
        user_id: row.user_id,
        posted_at: row.posted_at,
        created_at: row.created_at,
        visibility: row.visibility,
        score: result.score,
        tier_id: result.tier_id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        level: profile.level,
      } satisfies FeedPost;
    })
    .filter(Boolean) as FeedPost[];
}

export async function fetchChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .in('status', ['active', 'ended'])
    .order('ends_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Challenge[];
}

export async function fetchChallenge(id: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Challenge | null;
}

export async function joinChallenge(
  challengeId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('challenge_participants').upsert(
    { challenge_id: challengeId, user_id: userId },
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw new Error(error.message);
}

export async function fetchChallengeLeaderboard(challengeId: string) {
  const { data, error } = await supabase
    .from('challenge_entries')
    .select('id, user_id, score, tier_id, created_at')
    .eq('challenge_id', challengeId)
    .order('score', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, level')
    .in('user_id', userIds);

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.user_id, p] as const),
  );

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
    profile: profileById.get(row.user_id) ?? null,
  }));
}

export async function createDuelChallenge(input: {
  challengerUserId: string;
  opponentUserId: string;
  opponentAnalysisId: string;
  opponentScore: number;
  opponentUsername: string;
}): Promise<Challenge> {
  const title = {
    'pt-BR': `Duelo vs @${input.opponentUsername}`,
    en: `Duel vs @${input.opponentUsername}`,
    es: `Duelo vs @${input.opponentUsername}`,
  };
  const description = {
    'pt-BR': `Supere +${input.opponentScore} aura.`,
    en: `Beat +${input.opponentScore} aura.`,
    es: `Supera +${input.opponentScore} aura.`,
  };

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      type: 'duel',
      status: 'active',
      title,
      description,
      rules: {
        target_score: input.opponentScore,
        opponent_analysis_id: input.opponentAnalysisId,
        scoring: 'beat_score',
      },
      reward_xp: 75,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      created_by: input.challengerUserId,
      opponent_analysis_id: input.opponentAnalysisId,
      opponent_user_id: input.opponentUserId,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  await joinChallenge(data.id, input.challengerUserId);
  return data as Challenge;
}

export async function fetchPublicPost(analysisId: string) {
  const { data: analysis, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!analysis) return null;

  const [{ data: result }, { data: profile }] = await Promise.all([
    supabase
      .from('video_analysis_results')
      .select('*')
      .eq('analysis_id', analysisId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', analysis.user_id)
      .maybeSingle(),
  ]);

  return { analysis, result, profile };
}
