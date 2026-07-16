/**
 * Worker IA separado — faz poll em video_analyses (status=queued),
 * processa stub (frames/áudio/movimento), grava resultado e envia push Expo.
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID (opcional no stub)
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   POLL_MS (default 4000)
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

async function claimNextJob() {
  const { data: candidates, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('status', 'queued')
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

  await supabase
    .from('video_analyses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', job.id);

  for (const step of result.steps) {
    await supabase.from('video_analysis_events').insert({
      analysis_id: job.id,
      step: step.name,
      detail: step.detail,
    });
  }

  const { data: tokens } = await supabase
    .from('device_push_tokens')
    .select('token')
    .eq('user_id', job.user_id);

  if (tokens?.length) {
    await sendExpoPush(
      tokens.map((t) => t.token),
      {
        title: 'Aura pronta',
        body: `Sua leitura ficou ${String(result.tierId).toUpperCase()} (+${result.score}).`,
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

void tick();
