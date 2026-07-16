/**
 * Stub do pipeline IA.
 * Substitui por: download R2 → extract frames → audio → motion → métricas reais.
 */

const TIERS = [
  { id: 'comum', min: 12, max: 120 },
  { id: 'rara', min: 130, max: 320 },
  { id: 'epica', min: 340, max: 580 },
  { id: 'lendaria', min: 600, max: 820 },
  { id: 'divina', min: 840, max: 970 },
  { id: 'cosmica', min: 999, max: 999 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickTierFromSignals({ durationMs, fileSizeBytes }) {
  const durationScore = Math.min(1, (durationMs ?? 0) / 60_000);
  const sizeScore = Math.min(1, (fileSizeBytes ?? 0) / (50 * 1024 * 1024));
  const energy = 0.35 * durationScore + 0.25 * sizeScore + 0.4 * Math.random();

  let tier = TIERS[0];
  if (energy > 0.92) tier = TIERS[5];
  else if (energy > 0.8) tier = TIERS[4];
  else if (energy > 0.65) tier = TIERS[3];
  else if (energy > 0.48) tier = TIERS[2];
  else if (energy > 0.3) tier = TIERS[1];

  const score =
    tier.min + Math.round(Math.random() * Math.max(0, tier.max - tier.min));

  return {
    tierId: tier.id,
    score,
    metrics: {
      energy,
      durationMs,
      fileSizeBytes,
      framesSampled: Math.max(8, Math.round((durationMs ?? 1000) / 1000)),
      audioPeakDb: Number((-18 + energy * 12).toFixed(2)),
      motionIndex: Number((energy * 100).toFixed(1)),
      stub: true,
    },
  };
}

export async function processAnalysisStub(job) {
  const steps = [];

  await sleep(600);
  steps.push({
    name: 'extract_frames',
    detail: { note: 'stub — plug ffmpeg / vision here', storageKey: job.storage_key },
  });

  await sleep(500);
  steps.push({
    name: 'analyze_audio',
    detail: { note: 'stub — plug whisper / audio features here' },
  });

  await sleep(500);
  steps.push({
    name: 'analyze_motion',
    detail: { note: 'stub — plug pose / optical flow here' },
  });

  const mapped = pickTierFromSignals({
    durationMs: job.duration_ms,
    fileSizeBytes: Number(job.file_size_bytes ?? 0),
  });

  steps.push({
    name: 'compute_metrics',
    detail: mapped.metrics,
  });

  return {
    tierId: mapped.tierId,
    score: mapped.score,
    metrics: mapped.metrics,
    steps,
  };
}
