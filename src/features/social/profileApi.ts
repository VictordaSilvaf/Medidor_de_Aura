import { supabase } from '@/src/features/auth/supabase';
import type { AppDispatch } from '@/src/core/store';

import { setMyProfile, setProfileLoading } from './profileSlice';
import { fetchBlockedUserIds } from './notificationsApi';
import type { Profile, VideoVisibility } from './types';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_]/g, '');
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

export async function bootstrapProfile(
  dispatch: AppDispatch,
  userId: string | undefined,
) {
  if (!userId) {
    dispatch(setMyProfile(null));
    return;
  }
  dispatch(setProfileLoading(true));
  try {
    const profile = await fetchMyProfile(userId);
    dispatch(setMyProfile(profile));
  } catch {
    dispatch(setMyProfile(null));
  }
}

export async function createProfile(input: {
  userId: string;
  displayName: string;
  username: string;
  bio?: string;
  defaultVisibility?: VideoVisibility;
}): Promise<Profile> {
  const username = normalizeUsername(input.username);
  if (!USERNAME_RE.test(username)) {
    throw new Error('USERNAME_INVALID');
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: input.userId,
      display_name: input.displayName.trim() || username,
      username,
      bio: input.bio?.trim() ?? '',
      default_visibility: input.defaultVisibility ?? 'public',
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('USERNAME_TAKEN');
    throw new Error(error.message);
  }
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'display_name'
      | 'bio'
      | 'avatar_url'
      | 'banner_url'
      | 'default_visibility'
      | 'is_public_profile'
    >
  > & { username?: string },
): Promise<Profile> {
  const payload: Record<string, unknown> = { ...patch };
  if (patch.username) {
    const username = normalizeUsername(patch.username);
    if (!USERNAME_RE.test(username)) throw new Error('USERNAME_INVALID');
    payload.username = username;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('USERNAME_TAKEN');
    throw new Error(error.message);
  }
  return data as Profile;
}

export async function fetchProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const normalized = normalizeUsername(username);
  // Escape LIKE wildcards so `_` is literal (usernames may contain it).
  const pattern = normalized.replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', pattern)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

export type UserSearchHit = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
};

/** Search public profiles by username or display_name (contains, case-insensitive). */
export async function searchUsers(
  query: string,
  limit = 30,
  viewerId?: string | null,
): Promise<UserSearchHit[]> {
  const raw = query.trim();
  if (raw.length < 1) return [];
  const escaped = raw.replace(/[\\%_]/g, '\\$&');
  const pattern = `%${escaped}%`;

  // Two queries avoid PostgREST .or() quoting pitfalls with % wildcards.
  const [byUsername, byName] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, level')
      .eq('is_public_profile', true)
      .ilike('username', pattern)
      .order('username', { ascending: true })
      .limit(limit),
    supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, level')
      .eq('is_public_profile', true)
      .ilike('display_name', pattern)
      .order('username', { ascending: true })
      .limit(limit),
  ]);

  if (byUsername.error) throw new Error(byUsername.error.message);
  if (byName.error) throw new Error(byName.error.message);

  const blocked = viewerId
    ? await fetchBlockedUserIds(viewerId)
    : new Set<string>();
  const seen = new Set<string>();
  const merged: UserSearchHit[] = [];
  for (const row of [...(byUsername.data ?? []), ...(byName.data ?? [])]) {
    if (seen.has(row.user_id) || blocked.has(row.user_id)) continue;
    seen.add(row.user_id);
    merged.push(row as UserSearchHit);
    if (merged.length >= limit) break;
  }
  return merged;
}
