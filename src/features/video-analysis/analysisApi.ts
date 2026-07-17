import { File, UploadType } from 'expo-file-system';

import { supabase } from '@/src/features/auth/supabase';
import type { VideoVisibility } from '@/src/features/social/types';

import type {
  CreateAnalysisResponse,
  VideoAnalysis,
  VideoAnalysisResult,
  VideoSource,
} from './types';
import { QuotaExceededError } from '@/src/features/monetization/quotaErrors';
import type { SubscriptionTier } from '@/src/features/monetization/subscriptionTiers';

function parseInvokeError(data: unknown): never {
  if (data && typeof data === 'object' && 'error' in data) {
    const payload = data as Record<string, unknown>;
    if (payload.error === 'quota_exceeded') {
      throw new QuotaExceededError(
        (payload.tier as SubscriptionTier) ?? 'free',
        Number(payload.dailyUsed ?? 0),
        Number(payload.monthlyUsed ?? 0),
        Number(payload.dailyLimit ?? 0),
        Number(payload.monthlyLimit ?? 0),
      );
    }
    throw new Error(String(payload.error));
  }
  throw new Error('Request failed');
}

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    parseInvokeError(data);
  }
  if (error) {
    throw new Error(error.message || `Falha ao chamar ${name}`);
  }
  return data as T;
}

export async function createAnalysisAndUploadUrl(input: {
  source: VideoSource;
  durationMs: number;
  fileSizeBytes: number;
  contentType: string;
  fileName: string;
  visibility: VideoVisibility;
  challengeId?: string | null;
}): Promise<CreateAnalysisResponse> {
  return invokeFunction<CreateAnalysisResponse>('create-analysis', {
    source: input.source,
    durationMs: input.durationMs,
    fileSizeBytes: input.fileSizeBytes,
    contentType: input.contentType,
    fileName: input.fileName,
    visibility: input.visibility,
    challengeId: input.challengeId ?? null,
  });
}

export async function uploadVideoToR2(input: {
  localUri: string;
  uploadUrl: string;
  contentType: string;
  headers?: Record<string, string>;
  onProgress?: (ratio: number) => void;
}): Promise<void> {
  const file = new File(input.localUri);
  const result = await file.upload(input.uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': input.contentType,
      ...(input.headers ?? {}),
    },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) {
        input.onProgress?.(bytesSent / totalBytes);
      }
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falhou (HTTP ${result.status}).`);
  }
}

export async function confirmUpload(analysisId: string): Promise<VideoAnalysis> {
  const data = await invokeFunction<{ analysis: VideoAnalysis }>(
    'confirm-upload',
    { analysisId },
  );
  return data.analysis;
}

export async function fetchVideoPlaybackUrls(
  analysisIds: string[],
): Promise<Record<string, string>> {
  if (!analysisIds.length) return {};
  const data = await invokeFunction<{ urls: Record<string, string> }>(
    'get-video-urls',
    { analysisIds },
  );
  return data.urls ?? {};
}

export async function fetchAnalysis(id: string): Promise<VideoAnalysis> {
  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as VideoAnalysis;
}

export async function fetchAnalysisResult(
  analysisId: string,
): Promise<VideoAnalysisResult | null> {
  const { data, error } = await supabase
    .from('video_analysis_results')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as VideoAnalysisResult | null;
}

export type AnalysisListItem = VideoAnalysis & {
  result: VideoAnalysisResult | null;
};

/** Últimas análises do usuário com resultado (se completed). */
export async function fetchMyAnalyses(
  userId: string,
  limit = 20,
): Promise<AnalysisListItem[]> {
  const { data, error } = await supabase
    .from('video_analyses')
    .select('*, video_analysis_results(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { video_analysis_results: results, ...analysis } = row as VideoAnalysis & {
      video_analysis_results: VideoAnalysisResult[] | VideoAnalysisResult | null;
    };
    const result = Array.isArray(results) ? (results[0] ?? null) : results;
    return {
      ...(analysis as VideoAnalysis),
      result,
    };
  });
}

export async function submitPendingCapture(input: {
  uri: string;
  source: VideoSource;
  durationMs: number;
  fileSizeBytes: number;
  mimeType: string;
  fileName: string;
  visibility: VideoVisibility;
  challengeId?: string | null;
  onUploadProgress?: (ratio: number) => void;
}): Promise<VideoAnalysis> {
  const created = await createAnalysisAndUploadUrl({
    source: input.source,
    durationMs: input.durationMs,
    fileSizeBytes: input.fileSizeBytes,
    contentType: input.mimeType,
    fileName: input.fileName,
    visibility: input.visibility,
    challengeId: input.challengeId,
  });

  await uploadVideoToR2({
    localUri: input.uri,
    uploadUrl: created.uploadUrl,
    contentType: input.mimeType,
    headers: created.headers,
    onProgress: input.onUploadProgress,
  });

  return confirmUpload(created.analysis.id);
}
