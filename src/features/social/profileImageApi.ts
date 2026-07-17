import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/src/features/auth/supabase';
import { ensureLibraryPermission } from '@/src/features/video-analysis/permissions';

import { updateProfile } from './profileApi';
import type { Profile } from './types';

export type ProfileImageKind = 'avatar' | 'banner';

function extFromMime(mime: string | undefined): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function contentTypeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Picks an image from the library (expo-image-picker v57).
 * Avatar: square crop; banner: wide crop when the platform supports editing.
 */
export async function pickProfileImage(
  kind: ProfileImageKind,
): Promise<{ uri: string; mimeType?: string } | null> {
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
    aspect: kind === 'avatar' ? [1, 1] : [3, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType };
}

export async function uploadProfileImage(input: {
  userId: string;
  kind: ProfileImageKind;
  uri: string;
  mimeType?: string;
}): Promise<string> {
  const ext = extFromMime(input.mimeType);
  const path = `${input.userId}/${input.kind}.${ext}`;
  const contentType = contentTypeFromExt(ext);
  const bucket = input.kind === 'avatar' ? 'avatars' : 'banners';

  const response = await fetch(input.uri);
  if (!response.ok) throw new Error('IMAGE_READ_FAILED');
  const body = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, body, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Bust CDN/cache after replace
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function pickAndUploadProfileImage(input: {
  userId: string;
  kind: ProfileImageKind;
}): Promise<Profile | null> {
  const picked = await pickProfileImage(input.kind);
  if (!picked) return null;

  const publicUrl = await uploadProfileImage({
    userId: input.userId,
    kind: input.kind,
    uri: picked.uri,
    mimeType: picked.mimeType,
  });

  const patch =
    input.kind === 'avatar'
      ? { avatar_url: publicUrl }
      : { banner_url: publicUrl };

  return updateProfile(input.userId, patch);
}
