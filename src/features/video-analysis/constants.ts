/** Limite de duração do vídeo (gravação e galeria). */
export const MAX_VIDEO_DURATION_MS = 60_000;

/** Limite de tamanho do arquivo enviado ao R2. */
export const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Contagem regressiva antes de iniciar a gravação. */
export const RECORD_COUNTDOWN_SECONDS = 3;

/**
 * Formato canônico: H.264 em contêiner MP4.
 * iOS pode entregar .mov (QuickTime); Android tipicamente .mp4.
 * Aceitamos ambos no upload; o worker trata os dois.
 */
export const ACCEPTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
] as const;

export const ANALYSIS_STATUSES = [
  'pending_upload',
  'uploaded',
  'queued',
  'processing',
  'completed',
  'failed',
] as const;