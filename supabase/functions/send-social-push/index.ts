import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const service = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const body = await req.json().catch(() => ({}));
  const type = body.type as
    | 'follow'
    | 'post_like'
    | 'comment'
    | 'comment_like';
  let recipientId: string | null = null;
  let analysisId: string | null = body.analysisId ?? null;

  if (type === 'follow' && typeof body.targetUserId === 'string') {
    const { data } = await userClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_id', body.targetUserId)
      .maybeSingle();
    recipientId = data?.following_id ?? null;
  } else if (type === 'post_like' && analysisId) {
    const [{ data: like }, { data: analysis }] = await Promise.all([
      userClient
        .from('post_likes')
        .select('user_id')
        .eq('analysis_id', analysisId)
        .eq('user_id', user.id)
        .maybeSingle(),
      userClient
        .from('video_analyses')
        .select('user_id')
        .eq('id', analysisId)
        .maybeSingle(),
    ]);
    if (like) recipientId = analysis?.user_id ?? null;
  } else if (
    (type === 'comment' || type === 'comment_like') &&
    typeof body.commentId === 'string'
  ) {
    const { data: comment } = await userClient
      .from('post_comments')
      .select('user_id, analysis_id')
      .eq('id', body.commentId)
      .maybeSingle();
    if (comment) {
      analysisId = comment.analysis_id;
      if (type === 'comment') {
        const { data: analysis } = await userClient
          .from('video_analyses')
          .select('user_id')
          .eq('id', comment.analysis_id)
          .maybeSingle();
        if (comment.user_id === user.id) recipientId = analysis?.user_id ?? null;
      } else {
        const { data: like } = await userClient
          .from('comment_likes')
          .select('user_id')
          .eq('comment_id', body.commentId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (like) recipientId = comment.user_id;
      }
    }
  }

  if (!recipientId || recipientId === user.id) return json({ sent: 0 });

  const [{ data: actor }, { data: tokens }] = await Promise.all([
    service
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle(),
    service
      .from('device_push_tokens')
      .select('token')
      .eq('user_id', recipientId),
  ]);
  if (!tokens?.length) return json({ sent: 0 });

  const actions = {
    follow: 'começou a seguir você',
    post_like: 'curtiu sua publicação',
    comment: 'comentou na sua publicação',
    comment_like: 'curtiu seu comentário',
  };
  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    title: 'Medidor de Aura',
    body: `${actor?.display_name ?? 'Alguém'} ${actions[type]}`,
    data: { type, analysisId },
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  return json({ sent: response.ok ? messages.length : 0 }, response.ok ? 200 : 502);
});
