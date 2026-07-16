import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED = new Set(['video/mp4', 'video/quicktime']);

type Body = {
  source: 'camera' | 'gallery';
  durationMs: number;
  fileSizeBytes: number;
  contentType: string;
  fileName: string;
  visibility?: 'private' | 'public';
  challengeId?: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extensionFor(contentType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.mov') || contentType === 'video/quicktime') return 'mov';
  return 'mp4';
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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!body?.source || !['camera', 'gallery'].includes(body.source)) {
    return json({ error: 'Invalid source' }, 400);
  }
  if (!body.durationMs || body.durationMs <= 0 || body.durationMs > 60_000) {
    return json({ error: 'durationMs must be 1–60000' }, 400);
  }
  if (!body.fileSizeBytes || body.fileSizeBytes <= 0 || body.fileSizeBytes > MAX_BYTES) {
    return json({ error: 'fileSizeBytes must be 1–50MB' }, 400);
  }
  if (!ACCEPTED.has(body.contentType) && !body.contentType?.startsWith('video/')) {
    return json({ error: 'Unsupported contentType' }, 400);
  }

  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const bucket = Deno.env.get('R2_BUCKET_NAME');
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return json({ error: 'R2 is not configured on the server' }, 500);
  }

  const service = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const ext = extensionFor(body.contentType, body.fileName ?? 'capture.mp4');
  const analysisId = crypto.randomUUID();
  const storageKey = `videos/${user.id}/${analysisId}.${ext}`;

  const visibility =
    body.visibility === 'public' ? 'public' : 'private';

  const { data: analysis, error: insertError } = await service
    .from('video_analyses')
    .insert({
      id: analysisId,
      user_id: user.id,
      status: 'pending_upload',
      source: body.source,
      storage_key: storageKey,
      content_type: body.contentType,
      duration_ms: Math.round(body.durationMs),
      file_size_bytes: body.fileSizeBytes,
      visibility,
      challenge_id: body.challengeId ?? null,
    })
    .select('*')
    .single();

  if (insertError) return json({ error: insertError.message }, 500);

  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${storageKey}`;
  const signed = await r2.sign(
    new Request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': body.contentType,
        'Content-Length': String(body.fileSizeBytes),
      },
    }),
    { aws: { signQuery: true } },
  );

  return json({
    analysis,
    uploadUrl: signed.url,
    storageKey,
    headers: {
      'Content-Type': body.contentType,
    },
  });
});
