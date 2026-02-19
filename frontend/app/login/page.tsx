import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    auth_error?: string;
    next?: string;
  }>;
};

function getErrorText(code: string | undefined) {
  if (!code) return null;
  if (code === "missing_code") return "Falto el codigo de autenticacion.";
  if (code === "exchange_failed") return "No se pudo validar la sesion en Supabase.";
  if (code === "supabase_not_configured") return "Supabase no esta configurado correctamente.";
  if (code === "login_required") return "Debes iniciar sesion para entrar al dashboard.";
  return "Ocurrio un error de autenticacion.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(next);
    }
  } catch {
    // Continue to render the login page if Supabase env is missing.
  }

  return <LoginForm initialError={getErrorText(params.auth_error)} nextPath={next} />;
}
