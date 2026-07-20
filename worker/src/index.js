/**
 * Worker IA separado — faz poll em video_analyses (status=queued),
 * processa stub (frames/áudio/movimento), grava resultado, atualiza
 * perfil (XP/level/streak), challenge entries e envia push Expo.
 */

import { createClient } from '@supabase/supabase-js';

import { processAnalysisStub } from './process.js';
import { sendExpoPush } from './push.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pollMs = Number(process.env.POLL_MS ?? 4000);

if (!supabaseUrl || !serviceKey) {
  console.error('[worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TIER_ORDER = ['comum', 'rara', 'epica', 'lendaria', 'divina', 'cosmica'];

function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

function compareTiers(a, b) {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}

function nextStreak(lastMeasureDate, previousStreak) {
  const today = new Date().toISOString().slice(0, 10);
  if (!lastMeasureDate) return 1;
  if (lastMeasureDate === today) return previousStreak || 1;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastMeasureDate === yesterday) return (previousStreak || 0) + 1;
  return 1;
}

async function claimNextJob() {
  const { data: candidates, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) throw error;
  if (!candidates?.length) return null;

  for (const row of candidates) {
    const { data: claimed, error: claimError } = await supabase
      .from('video_analyses')
      .update({ status: 'processing' })
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle();

    if (claimError) throw claimError;
    if (claimed) return claimed;
  }

  return null;
}

async function markFailed(id, message) {
  await supabase
    .from('video_analyses')
    .update({ status: 'failed', error_message: message })
    .eq('id', id);

  await supabase.from('video_analysis_events').insert({
    analysis_id: id,
    step: 'failed',
    detail: { message },
  });
}

async function applyProfileRewards(job, result) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', job.user_id)
    .maybeSingle();

  if (!profile) return;

  let bonusXp = 25 + Math.round(result.score / 20);
  if (job.visibility === 'public') bonusXp += 15;
  if (job.challenge_id) bonusXp += 20;

  const xp = profile.xp + bonusXp;
  const level = levelFromXp(xp);
  const streak_days = nextStreak(profile.last_measure_date, profile.streak_days);
  const best_tier_id =
    !profile.best_tier_id || compareTiers(result.tierId, profile.best_tier_id) > 0
      ? result.tierId
      : profile.best_tier_id;

  await supabase
    .from('profiles')
    .update({
      xp,
      level,
      total_aura: profile.total_aura + result.score,
      measurements: profile.measurements + 1,
      best_tier_id,
      streak_days,
      last_measure_date: new Date().toISOString().slice(0, 10),
    })
    .eq('user_id', job.user_id);

  return bonusXp;
}

async function attachChallengeEntry(job, result) {
  if (!job.challenge_id) return;

  await supabase.from('challenge_entries').upsert(
    {
      challenge_id: job.challenge_id,
      user_id: job.user_id,
      analysis_id: job.id,
      score: result.score,
      tier_id: result.tierId,
    },
    { onConflict: 'analysis_id' },
  );

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', job.challenge_id)
    .maybeSingle();

  if (challenge?.type === 'duel' && challenge.rules?.target_score != null) {
    const beat = result.score > Number(challenge.rules.target_score);
    if (beat) {
      await supabase
        .from('challenges')
        .update({ status: 'ended' })
        .eq('id', challenge.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('user_id', job.user_id)
        .maybeSingle();

      if (profile) {
        const xp = profile.xp + (challenge.reward_xp || 75);
        await supabase
          .from('profiles')
          .update({ xp, level: levelFromXp(xp) })
          .eq('user_id', job.user_id);
      }
    }
  }
}

async function completeJob(job, result) {
  await supabase.from('video_analysis_results').upsert(
    {
      analysis_id: job.id,
      tier_id: result.tierId,
      score: result.score,
      metrics: result.metrics,
    },
    { onConflict: 'analysis_id' },
  );

  const patch = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    error_message: null,
  };
  if (job.visibility === 'public' && !job.posted_at) {
    patch.posted_at = new Date().toISOString();
  }

  await supabase.from('video_analyses').update(patch).eq('id', job.id);

  for (const step of result.steps) {
    await supabase.from('video_analysis_events').insert({
      analysis_id: job.id,
      step: step.name,
      detail: step.detail,
    });
  }

  const bonusXp = await applyProfileRewards(job, result);
  await attachChallengeEntry(job, result);

  const { data: tokens } = await supabase
    .from('device_push_tokens')
    .select('token')
    .eq('user_id', job.user_id);

  if (tokens?.length) {
    await sendExpoPush(
      tokens.map((t) => t.token),
      {
        title: 'Aura pronta',
        body: `Sua leitura ficou ${String(result.tierId).toUpperCase()} (+${result.score})${bonusXp ? ` · +${bonusXp} XP` : ''}.`,
        data: { analysisId: job.id, type: 'analysis_completed' },
      },
    );
  }
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return;

  console.log(`[worker] processing ${job.id}`);
  try {
    await supabase.from('video_analysis_events').insert({
      analysis_id: job.id,
      step: 'processing_started',
      detail: { storage_key: job.storage_key },
    });

    const result = await processAnalysisStub(job);
    await completeJob(job, result);
    console.log(`[worker] completed ${job.id} → ${result.tierId} +${result.score}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] failed ${job.id}:`, message);
    await markFailed(job.id, message);
  }
}

console.log(`[worker] polling every ${pollMs}ms`);
setInterval(() => {
  void tick().catch((err) => console.error('[worker] tick error', err));
}, pollMs);

void tick().catch((err) => console.error('[worker] tick error', err));
