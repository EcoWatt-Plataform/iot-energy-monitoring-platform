import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      redirect("/login?auth_error=login_required&next=/dashboard");
    }
  } catch {
    redirect("/login?auth_error=supabase_not_configured&next=/dashboard");
  }

  return <>{children}</>;
}
