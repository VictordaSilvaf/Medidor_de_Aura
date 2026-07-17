import { supabase } from '@/src/features/auth/supabase';

import type { PostComment } from './types';
import { sendSocialPush } from './notificationsApi';

export async function likePost(
  analysisId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('post_likes').upsert(
    { analysis_id: analysisId, user_id: userId },
    { onConflict: 'analysis_id,user_id' },
  );
  if (error) throw new Error(error.message);
  void sendSocialPush({ type: 'post_like', analysisId });
}

export async function unlikePost(
  analysisId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('analysis_id', analysisId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchMyLikedPostIds(
  analysisIds: string[],
  userId: string,
): Promise<Set<string>> {
  if (!analysisIds.length || !userId) return new Set();
  const { data, error } = await supabase
    .from('post_likes')
    .select('analysis_id')
    .eq('user_id', userId)
    .in('analysis_id', analysisIds);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.analysis_id as string));
}

export async function fetchComments(
  analysisId: string,
  viewerId?: string | null,
  limit = 30,
  offset = 0,
): Promise<PostComment[]> {
  const { data: rows, error } = await supabase
    .from('post_comments')
    .select(
      'id, analysis_id, user_id, body, parent_id, like_count, created_at',
    )
    .eq('analysis_id', analysisId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const commentIds = rows.map((r) => r.id as string);

  const [{ data: profiles }, likedIds] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', userIds),
    viewerId
      ? fetchMyLikedCommentIds(commentIds, viewerId)
      : Promise.resolve(new Set<string>()),
  ]);

  const profileById = new Map(
    (profiles ?? []).map(
      (p) =>
        [
          p.user_id as string,
          p as {
            user_id: string;
            username: string;
            display_name: string;
            avatar_url: string | null;
          },
        ] as const,
    ),
  );

  return rows
    .map((row) => {
      const profile = profileById.get(row.user_id as string);
      if (!profile) return null;
      return {
        id: row.id as string,
        analysis_id: row.analysis_id as string,
        user_id: row.user_id as string,
        body: row.body as string,
        parent_id: (row.parent_id as string | null) ?? null,
        like_count: (row.like_count as number) ?? 0,
        created_at: row.created_at as string,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        liked_by_me: likedIds.has(row.id as string),
      } satisfies PostComment;
    })
    .filter(Boolean) as PostComment[];
}

async function fetchMyLikedCommentIds(
  commentIds: string[],
  userId: string,
): Promise<Set<string>> {
  if (!commentIds.length) return new Set();
  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.comment_id as string));
}

export async function addComment(input: {
  analysisId: string;
  userId: string;
  body: string;
  parentId?: string | null;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new Error('COMMENT_EMPTY');
  if (body.length > 500) throw new Error('COMMENT_TOO_LONG');

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      analysis_id: input.analysisId,
      user_id: input.userId,
      body,
      parent_id: input.parentId ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  void sendSocialPush({
    type: 'comment',
    analysisId: input.analysisId,
    commentId: data.id,
  });
}

export async function softDeleteComment(
  commentId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function likeComment(
  commentId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('comment_likes').upsert(
    { comment_id: commentId, user_id: userId },
    { onConflict: 'comment_id,user_id' },
  );
  if (error) throw new Error(error.message);
  void sendSocialPush({ type: 'comment_like', commentId });
}

export async function unlikeComment(
  commentId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
