import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/dashboard";
  const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const appBaseUrl = configuredSiteUrl || origin;

  if (!code) {
    return NextResponse.redirect(`${appBaseUrl}/login?auth_error=missing_code`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${appBaseUrl}/login?auth_error=exchange_failed`);
    }
  } catch {
    return NextResponse.redirect(`${appBaseUrl}/login?auth_error=supabase_not_configured`);
  }

  return NextResponse.redirect(`${appBaseUrl}${safeNext}`);
}
