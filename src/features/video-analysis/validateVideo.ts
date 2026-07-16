import { File } from 'expo-file-system';

import {
  ACCEPTED_VIDEO_MIME_TYPES,
  MAX_VIDEO_DURATION_MS,
  MAX_VIDEO_FILE_SIZE_BYTES,
} from './constants';

export type ValidatedVideo = {
  uri: string;
  durationMs: number;
  fileSizeBytes: number;
  mimeType: string;
  fileName: string;
};

function guessMimeType(uri: string, reported?: string | null): string {
  if (reported && reported.startsWith('video/')) return reported;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
}

function guessFileName(uri: string, mimeType: string): string {
  const last = uri.split('/').pop()?.split('?')[0];
  if (last && /\.(mp4|mov|m4v)$/i.test(last)) return last;
  return mimeType === 'video/quicktime' ? 'capture.mov' : 'capture.mp4';
}

export function validateVideoMeta(input: {
  uri: string;
  durationMs: number | null | undefined;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
}): ValidatedVideo {
  const durationMs = input.durationMs ?? 0;
  if (!durationMs || durationMs <= 0) {
    throw new Error('Não foi possível ler a duração do vídeo.');
  }
  if (durationMs > MAX_VIDEO_DURATION_MS) {
    throw new Error('O vídeo precisa ter no máximo 1 minuto.');
  }

  const file = new File(input.uri);
  const fileSizeBytes = input.fileSizeBytes ?? file.size;
  if (!fileSizeBytes || fileSizeBytes <= 0) {
    throw new Error('Não foi possível ler o tamanho do vídeo.');
  }
  if (fileSizeBytes > MAX_VIDEO_FILE_SIZE_BYTES) {
    throw new Error('O vídeo precisa ter no máximo 50 MB.');
  }

  const mimeType = guessMimeType(input.uri, input.mimeType);
  if (
    !(ACCEPTED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType) &&
    !mimeType.startsWith('video/')
  ) {
    throw new Error('Formato de vídeo não suportado. Use MP4 ou MOV.');
  }

  return {
    uri: input.uri,
    durationMs,
    fileSizeBytes,
    mimeType,
    fileName: guessFileName(input.uri, mimeType),
  };
}