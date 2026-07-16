import { supabase } from '@/src/features/auth/supabase';

import type { Profile } from './types';

export type SocialCounts = {
  posts: number;
  followers: number;
  following: number;
};

export type FollowListItem = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
};

export async function fetchSocialCounts(
  userId: string,
): Promise<SocialCounts> {
  const { data, error } = await supabase.rpc('profile_social_counts', {
    target_user_id: userId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    posts: Number(row?.posts ?? 0),
    followers: Number(row?.followers ?? 0),
    following: Number(row?.following ?? 0),
  };
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function followUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) return;
  const { error } = await supabase.from('follows').upsert(
    { follower_id: followerId, following_id: followingId },
    { onConflict: 'follower_id,following_id' },
  );
  if (error) throw new Error(error.message);
}

export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw new Error(error.message);
}

export async function fetchFollowers(
  userId: string,
  limit = 80,
): Promise<FollowListItem[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return hydrateProfiles((data ?? []).map((r) => r.follower_id as string));
}

export async function fetchFollowing(
  userId: string,
  limit = 80,
): Promise<FollowListItem[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return hydrateProfiles((data ?? []).map((r) => r.following_id as string));
}

async function hydrateProfiles(userIds: string[]): Promise<FollowListItem[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, level')
    .in('user_id', userIds);
  if (error) throw new Error(error.message);
  const byId = new Map((data ?? []).map((p) => [p.user_id, p] as const));
  return userIds
    .map((id) => {
      const p = byId.get(id);
      if (!p) return null;
      return {
        user_id: p.user_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        level: p.level,
      } satisfies FollowListItem;
    })
    .filter(Boolean) as FollowListItem[];
}

export async function fetchPublicPostsGrid(userId: string, limit = 30) {
  const { data: analyses, error } = await supabase
    .from('video_analyses')
    .select('id, created_at, posted_at')
    .eq('user_id', userId)
    .eq('visibility', 'public')
    .eq('status', 'completed')
    .order('posted_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!analyses?.length) return [];

  const ids = analyses.map((a) => a.id);
  const { data: results } = await supabase
    .from('video_analysis_results')
    .select('analysis_id, score, tier_id')
    .in('analysis_id', ids);

  const byId = new Map(
    (results ?? []).map((r) => [r.analysis_id, r] as const),
  );

  return analyses
    .map((a) => {
      const r = byId.get(a.id);
      if (!r) return null;
      return {
        id: a.id,
        score: r.score as number,
        tier_id: r.tier_id as string,
        created_at: a.created_at as string,
      };
    })
    .filter(Boolean) as {
    id: string;
    score: number;
    tier_id: string;
    created_at: string;
  }[];
}

export type PublicProfileBundle = {
  profile: Profile;
  counts: SocialCounts;
  amFollowing: boolean;
  posts: Awaited<ReturnType<typeof fetchPublicPostsGrid>>;
};

export async function fetchPublicProfileBundle(
  username: string,
  viewerId?: string | null,
): Promise<PublicProfileBundle | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username.replace(/[\\%_]/g, '\\$&'))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) return null;

  const [counts, posts, following] = await Promise.all([
    fetchSocialCounts(profile.user_id),
    fetchPublicPostsGrid(profile.user_id),
    viewerId && viewerId !== profile.user_id
      ? isFollowing(viewerId, profile.user_id)
      : Promise.resolve(false),
  ]);

  return {
    profile: profile as Profile,
    counts,
    amFollowing: following,
    posts,
  };
}
