import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type SubscriptionTier = 'free' | 'ascendente' | 'lendario' | 'divino';

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  ascendente: 1,
  lendario: 2,
  divino: 3,
};

const ENTITLEMENT_TO_TIER: Record<string, SubscriptionTier> = {
  ascendente: 'ascendente',
  lendario: 'lendario',
  divino: 'divino',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tierFromEntitlementIds(ids: string[]): SubscriptionTier {
  let best: SubscriptionTier = 'free';
  for (const raw of ids) {
    const mapped = ENTITLEMENT_TO_TIER[raw.toLowerCase()];
    if (mapped && TIER_RANK[mapped] > TIER_RANK[best]) {
      best = mapped;
    }
  }
  return best;
}

function tierFromProductId(productId: string | null | undefined): SubscriptionTier {
  if (!productId) return 'free';
  const lower = productId.toLowerCase();
  if (lower.includes('divino')) return 'divino';
  if (lower.includes('lendario') || lower.includes('lendário')) return 'lendario';
  if (lower.includes('ascendente')) return 'ascendente';
  return 'free';
}

type RcEvent = {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[];
  product_id?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'Webhook not configured' }, 500);

  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${secret}` && auth !== secret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: { event?: RcEvent };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const event = payload.event;
  if (!event?.app_user_id) return json({ ok: true, skipped: 'no app_user_id' });

  const userId = event.app_user_id;
  const eventType = event.type ?? '';

  let tier: SubscriptionTier = 'free';
  let expiresAt: string | null = null;

  if (eventType === 'EXPIRATION' || eventType === 'CANCELLATION') {
    tier = 'free';
    expiresAt = null;
  } else {
    const fromEntitlements = tierFromEntitlementIds(event.entitlement_ids ?? []);
    const fromProduct = tierFromProductId(event.product_id);
    tier =
      TIER_RANK[fromEntitlements] >= TIER_RANK[fromProduct]
        ? fromEntitlements
        : fromProduct;

    if (event.expiration_at_ms) {
      expiresAt = new Date(event.expiration_at_ms).toISOString();
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await service
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
      revenuecat_app_user_id: userId,
    })
    .eq('user_id', userId);

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, userId, tier, expiresAt, eventType });
});
