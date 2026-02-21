import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLoginForm from "./admin-login-form";

type AdminLoginPageProps = {
  searchParams: Promise<{
    auth_error?: string;
    next?: string;
  }>;
};

function getErrorText(code: string | undefined) {
  if (!code) return null;
  if (code === "supabase_not_configured") {
    return "Supabase no está configurado correctamente.";
  }
  if (code === "login_required") {
    return "Debes iniciar sesión para entrar al panel de administración.";
  }
  return "No se pudo iniciar sesión en administración.";
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/admin";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(next);
    }
  } catch {
    // Render login page to show configuration errors from client checks.
  }

  return <AdminLoginForm initialError={getErrorText(params.auth_error)} nextPath={next} />;
}
