import type { AuraTierId } from '@/src/features/aura/tiers';

import type { ANALYSIS_STATUSES } from './constants';

export type VideoSource = 'camera' | 'gallery';

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export type PendingCapture = {
  uri: string;
  source: VideoSource;
  durationMs: number;
  fileSizeBytes: number;
  mimeType: string;
  fileName: string;
};

export type VideoAnalysis = {
  id: string;
  user_id: string;
  status: AnalysisStatus;
  source: VideoSource;
  storage_key: string | null;
  content_type: string | null;
  duration_ms: number | null;
  file_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type VideoAnalysisResult = {
  id: string;
  analysis_id: string;
  tier_id: AuraTierId;
  score: number;
  metrics: Record<string, unknown>;
  created_at: string;
};

export type CreateAnalysisResponse = {
  analysis: VideoAnalysis;
  uploadUrl: string;
  storageKey: string;
  headers: Record<string, string>;
};