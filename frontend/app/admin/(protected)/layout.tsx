import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      redirect("/admin/login?auth_error=login_required&next=/admin");
    }
  } catch {
    redirect("/admin/login?auth_error=supabase_not_configured&next=/admin");
  }

  return <>{children}</>;
}
