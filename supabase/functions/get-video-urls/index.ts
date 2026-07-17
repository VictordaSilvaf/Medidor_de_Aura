import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

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
  const userClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({ analysisIds: [] }));
  const analysisIds = Array.isArray(body.analysisIds)
    ? [...new Set(body.analysisIds.filter((id: unknown) => typeof id === 'string'))].slice(0, 40)
    : [];
  if (!analysisIds.length) return json({ urls: {} });

  // This query intentionally uses the caller's JWT, so video_analyses RLS
  // decides which private/owned or completed/public objects may be signed.
  const { data: analyses, error } = await userClient
    .from('video_analyses')
    .select('id, storage_key')
    .in('id', analysisIds)
    .not('storage_key', 'is', null);
  if (error) return json({ error: error.message }, 403);

  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const bucket = Deno.env.get('R2_BUCKET_NAME');
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return json({ error: 'R2 is not configured on the server' }, 500);
  }

  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const entries = await Promise.all(
    (analyses ?? []).map(async (analysis) => {
      const endpoint =
        `https://${accountId}.r2.cloudflarestorage.com/${bucket}/` +
        `${analysis.storage_key}?X-Amz-Expires=900`;
      const signed = await r2.sign(new Request(endpoint, { method: 'GET' }), {
        aws: { signQuery: true },
      });
      return [analysis.id, signed.url] as const;
    }),
  );

  return json({ urls: Object.fromEntries(entries) });
});
