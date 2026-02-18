function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(
      `Missing Supabase env var: ${name}. Set it in frontend/.env.local and restart Next.js.`
    );
  }
  return value;
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", url),
    anonKey: requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)",
      anonKey
    ),
  };
}
