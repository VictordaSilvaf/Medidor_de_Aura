import { ImageManipulator, SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { VideoPlayer, VideoThumbnail } from 'expo-video';

import { supabase } from '@/src/features/auth/supabase';
import { ensureLibraryPermission } from '@/src/features/video-analysis/permissions';

export type ThumbnailSize = 'sm' | 'md' | 'lg';

export const THUMB_WIDTH: Record<ThumbnailSize, number> = {
  sm: 160,
  md: 480,
  lg: 1080,
};

export type FrameCandidate = {
  id: string;
  /** Local preview source for expo-image (SharedRef or uri). */
  preview: VideoThumbnail | string;
};

/** Pick three times across the clip (25%, 50%, 75%). */
export function frameTimesSeconds(durationMs: number): number[] {
  const durationSec = Math.max(0.5, (durationMs || 1000) / 1000);
  return [0.25, 0.5, 0.75].map((ratio) =>
    Math.min(durationSec * 0.95, Math.max(0.05, durationSec * ratio)),
  );
}

export async function generateFrameCandidates(
  player: VideoPlayer,
  durationMs: number,
): Promise<FrameCandidate[]> {
  const times = frameTimesSeconds(durationMs);
  try {
    const thumbs = await player.generateThumbnailsAsync(times, {
      maxWidth: THUMB_WIDTH.lg,
    });
    return thumbs.map((thumb, index) => ({
      id: `frame-${index}`,
      preview: thumb,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('does not exist') ||
      message.includes('IllegalArgumentException')
    ) {
      throw new Error('VIDEO_FILE_MISSING');
    }
    throw error;
  }
}

export async function pickGalleryThumbnail(): Promise<{
  uri: string;
  mimeType?: string;
} | null> {
  const permission = await ensureLibraryPermission();
  if (!permission.granted) {
    throw new Error(
      permission.canAskAgain
        ? 'LIBRARY_PERMISSION_REQUIRED'
        : 'LIBRARY_PERMISSION_DENIED',
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [9, 16],
    quality: 0.9,
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    mimeType: result.assets[0].mimeType,
  };
}

async function saveResizedJpeg(
  source: string | VideoThumbnail,
  width: number,
): Promise<string> {
  if (typeof source === 'string') {
    const result = await manipulateAsync(
      source,
      [{ resize: { width } }],
      { compress: 0.82, format: SaveFormat.JPEG },
    );
    return result.uri;
  }

  const context = ImageManipulator.manipulate(source);
  const rendered = await context.resize({ width }).renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.82,
  });
  return saved.uri;
}

export async function buildThumbnailVariants(
  source: string | VideoThumbnail,
): Promise<Record<ThumbnailSize, string>> {
  const [sm, md, lg] = await Promise.all([
    saveResizedJpeg(source, THUMB_WIDTH.sm),
    saveResizedJpeg(source, THUMB_WIDTH.md),
    saveResizedJpeg(source, THUMB_WIDTH.lg),
  ]);
  return { sm, md, lg };
}

async function uploadThumbFile(input: {
  userId: string;
  analysisId: string;
  size: ThumbnailSize;
  uri: string;
}): Promise<string> {
  const path = `${input.userId}/${input.analysisId}/${input.size}.jpg`;
  const response = await fetch(input.uri);
  if (!response.ok) throw new Error('THUMB_READ_FAILED');
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage.from('thumbnails').upload(path, body, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: '86400',
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadAnalysisThumbnails(input: {
  userId: string;
  analysisId: string;
  source: string | VideoThumbnail;
}): Promise<{
  thumbnail_sm_url: string;
  thumbnail_md_url: string;
  thumbnail_lg_url: string;
}> {
  const variants = await buildThumbnailVariants(input.source);
  const [sm, md, lg] = await Promise.all([
    uploadThumbFile({
      userId: input.userId,
      analysisId: input.analysisId,
      size: 'sm',
      uri: variants.sm,
    }),
    uploadThumbFile({
      userId: input.userId,
      analysisId: input.analysisId,
      size: 'md',
      uri: variants.md,
    }),
    uploadThumbFile({
      userId: input.userId,
      analysisId: input.analysisId,
      size: 'lg',
      uri: variants.lg,
    }),
  ]);

  return {
    thumbnail_sm_url: sm,
    thumbnail_md_url: md,
    thumbnail_lg_url: lg,
  };
}
