import { File, UploadType } from 'expo-file-system';

import { supabase } from '@/src/features/auth/supabase';
import type { VideoVisibility } from '@/src/features/social/types';

import type {
  CreateAnalysisResponse,
  VideoAnalysis,
  VideoAnalysisResult,
  VideoSource,
} from './types';

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    throw new Error(error.message || `Falha ao chamar ${name}`);
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
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
