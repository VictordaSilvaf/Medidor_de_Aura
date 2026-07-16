import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === undefined || value === null ? undefined : value;

const envSchema = z
  .object({
    EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
    EXPO_PUBLIC_SUPABASE_KEY: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
    EXPO_PUBLIC_API_URL: z.preprocess(
      emptyToUndefined,
      z.string().url().optional(),
    ),
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.preprocess(
      emptyToUndefined,
      z.string().optional(),
    ),
    EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: z.preprocess(
      emptyToUndefined,
      z.string().optional(),
    ),
    EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID: z.preprocess(
      emptyToUndefined,
      z.string().optional(),
    ),
    EXPO_PUBLIC_EAS_PROJECT_ID: z.preprocess(
      emptyToUndefined,
      z.string().optional(),
    ),
  })
  .refine(
    (data) =>
      Boolean(data.EXPO_PUBLIC_SUPABASE_KEY ?? data.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    {
      message:
        'Set EXPO_PUBLIC_SUPABASE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY',
      path: ['EXPO_PUBLIC_SUPABASE_KEY'],
    },
  );

export type AppEnv = z.infer<typeof envSchema> & {
  /** Resolved publishable/anon key for the Supabase client */
  supabaseKey: string;
};

function readEnv(): AppEnv {
  const parsed = envSchema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_REVENUECAT_API_KEY_IOS:
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID:
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    if (__DEV__) {
      console.error('[env] Invalid environment variables:\n', message);
    }

    throw new Error(
      `Invalid environment variables. Check .env against .env.example.\n${message}`,
    );
  }

  const supabaseKey =
    parsed.data.EXPO_PUBLIC_SUPABASE_KEY ??
    parsed.data.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  return {
    ...parsed.data,
    supabaseKey,
  };
}

export const env = readEnv();

export const apiBaseUrl =
  env.EXPO_PUBLIC_API_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
