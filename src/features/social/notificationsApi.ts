import { supabase } from '@/src/features/auth/supabase';

export type SocialNotification = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'follow' | 'post_like' | 'comment' | 'comment_like';
  analysis_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export async function sendSocialPush(body: {
  type: 'follow' | 'post_like' | 'comment' | 'comment_like';
  targetUserId?: string;
  analysisId?: string;
  commentId?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-social-push', {
    body,
  });
  if (error) {
    // The social write already succeeded; push delivery is best-effort.
    console.warn('[social-push]', error.message);
  }
}

export async function fetchNotifications(
  userId: string,
  limit = 50,
): Promise<SocialNotification[]> {
  const { data: rows, error } = await supabase
    .from('social_notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id as string))];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url')
    .in('user_id', actorIds);
  if (profileError) throw new Error(profileError.message);

  const actors = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile] as const),
  );
  return rows.flatMap((row) => {
    const actor = actors.get(row.actor_id);
    return actor ? [{ ...row, actor } as SocialNotification] : [];
  });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('social_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const { error } = await supabase.from('user_blocks').upsert(
    { blocker_id: blockerId, blocked_id: blockedId },
    { onConflict: 'blocker_id,blocked_id' },
  );
  if (error) throw new Error(error.message);
}

export async function fetchBlockedUserIds(
  blockerId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.blocked_id as string));
}

export async function reportContent(input: {
  reporterId: string;
  reportedUserId?: string;
  analysisId?: string;
  commentId?: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId ?? null,
    analysis_id: input.analysisId ?? null,
    comment_id: input.commentId ?? null,
    reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
}
