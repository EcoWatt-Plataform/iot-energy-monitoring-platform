"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminLoginFormProps = {
  initialError: string | null;
  nextPath: string;
};

function normalizeNextPath(nextPath: string) {
  return nextPath.startsWith("/") ? nextPath : "/admin";
}

export default function AdminLoginForm({ initialError, nextPath }: AdminLoginFormProps) {
  const router = useRouter();
  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(initialError);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw error;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Sesión inválida. Vuelve a iniciar sesión.");
      }

      const res = await fetch("/api/v1/admin/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        await supabase.auth.signOut();
        if (res.status === 403) {
          throw new Error("Tu cuenta no tiene permisos de administrador.");
        }
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo validar permisos de administrador.");
      }

      router.push(safeNextPath);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión en administración.";
      setErrorText(message);
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px 12px",
    fontSize: "14px",
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 84px)",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      }}
    >
      <section
        style={{
          width: "min(460px, 94vw)",
          border: "1px solid #e5e7eb",
          borderRadius: "18px",
          padding: "24px",
          background: "white",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "8px", fontSize: "28px" }}>
          Admin Login
        </h1>
        <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "18px" }}>
          Ingresá con una cuenta de administrador para gestionar usuarios.
        </p>

        {errorText && (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: "12px",
              padding: "10px 12px",
              marginBottom: "14px",
              fontSize: "14px",
            }}
          >
            {errorText}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "12px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#374151" }}>Email</span>
            <input
              type="email"
              required
              placeholder="admin@ecowatt.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#374151" }}>Contraseña</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: "6px",
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {busy ? "Ingresando..." : "Ingresar como admin"}
          </button>
        </form>

        <div style={{ marginTop: "14px", fontSize: "13px", color: "#4b5563" }}>
          <Link href="/login" style={{ color: "#1d4ed8", textDecoration: "none" }}>
            Ir al login normal
          </Link>
        </div>
      </section>
    </main>
  );
}
