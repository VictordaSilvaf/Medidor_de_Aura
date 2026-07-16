import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'Unauthorized' }, 401);

  const { analysisId } = await req.json().catch(() => ({ analysisId: null }));
  if (!analysisId) return json({ error: 'analysisId required' }, 400);

  const service = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing, error: fetchError } = await service
    .from('video_analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) return json({ error: 'Analysis not found' }, 404);
  if (existing.status !== 'pending_upload' && existing.status !== 'uploaded') {
    return json({ analysis: existing });
  }

  const { data: analysis, error: updateError } = await service
    .from('video_analyses')
    .update({ status: 'queued' })
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (updateError) return json({ error: updateError.message }, 500);

  await service.from('video_analysis_events').insert({
    analysis_id: analysisId,
    step: 'queued',
    detail: { via: 'confirm-upload' },
  });

  return json({ analysis });
});
