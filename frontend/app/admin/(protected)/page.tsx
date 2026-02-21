"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Plan = "basico" | "avanzado" | "premium";
type Role = "user" | "admin";

type AdminUser = {
  id: string;
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  full_name: string | null;
  plan: Plan;
  role: Role;
  is_admin: boolean;
  device_count: number;
};

type AdminUsersResponse = {
  users?: AdminUser[];
  error?: string;
};

const PLAN_OPTIONS: Plan[] = ["basico", "avanzado", "premium"];
const ROLE_OPTIONS: Role[] = ["user", "admin"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message || "No se pudo validar la sesión.");
    const token = data.session?.access_token;
    if (!token) throw new Error("Sesión vencida. Iniciá sesión de nuevo.");
    return token;
  }

  async function adminFetch(url: string, init: RequestInit = {}) {
    const token = await getAccessToken();
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }

  async function ensureAdminSession() {
    const res = await adminFetch("/api/v1/admin/me");
    if (res.status === 401 || res.status === 403) {
      await supabase.auth.signOut();
      router.push("/admin/login?auth_error=login_required&next=/admin");
      return false;
    }
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "No se pudo validar permisos de administrador.");
    }
    return true;
  }

  async function loadUsers(nextSearch = search) {
    const searchParam = nextSearch.trim();
    let url = "/api/v1/admin/users?per_page=200";
    if (searchParam) {
      url += `&search=${encodeURIComponent(searchParam)}`;
    }

    const res = await adminFetch(url);
    const payload = (await res.json().catch(() => ({}))) as AdminUsersResponse;
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        await supabase.auth.signOut();
        router.push("/admin/login?auth_error=login_required&next=/admin");
        return;
      }
      throw new Error(payload.error || "No se pudo cargar el listado de cuentas.");
    }

    setUsers(Array.isArray(payload.users) ? payload.users : []);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setErrorText(null);
        const allowed = await ensureAdminSession();
        if (!allowed || !mounted) return;
        await loadUsers("");
      } catch (error: unknown) {
        if (!mounted) return;
        const message =
          error instanceof Error ? error.message : "No se pudo cargar el panel admin.";
        setErrorText(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setRefreshing(true);
    setErrorText(null);
    try {
      await loadUsers(search);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo refrescar el listado.";
      setErrorText(message);
    } finally {
      setRefreshing(false);
    }
  }

  async function updateUser(userId: string, patch: Partial<Pick<AdminUser, "plan" | "role">>) {
    setActiveAction(userId);
    setErrorText(null);
    try {
      const res = await adminFetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const payload = (await res.json().catch(() => ({}))) as AdminUser & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo actualizar la cuenta.");
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? payload : u)));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar la cuenta.";
      setErrorText(message);
    } finally {
      setActiveAction(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    const confirmed = window.confirm(
      `¿Eliminar la cuenta ${email}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setActiveAction(userId);
    setErrorText(null);
    try {
      const res = await adminFetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo eliminar la cuenta.");
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la cuenta.";
      setErrorText(message);
    } finally {
      setActiveAction(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main
      style={{
        maxWidth: "1180px",
        margin: "0 auto",
        padding: "24px 16px 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "32px" }}>Panel Admin</h1>
          <p style={{ margin: "8px 0 0", color: "#4b5563" }}>
            Gestioná las cuentas registradas en la plataforma.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={refresh} disabled={refreshing} style={ghostBtnStyle}>
            {refreshing ? "Actualizando..." : "Refrescar"}
          </button>
          <button type="button" onClick={logout} style={ghostBtnStyle}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <section
        style={{
          marginTop: "16px",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "12px",
          background: "white",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email, nombre o id"
            style={{
              ...inputStyle,
              flex: "1 1 240px",
            }}
          />
          <button
            type="button"
            onClick={() => loadUsers(search)}
            disabled={refreshing}
            style={primaryBtnStyle}
          >
            Buscar
          </button>
        </div>
      </section>

      {errorText && (
        <div
          style={{
            marginTop: "14px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: "12px",
            padding: "10px 12px",
          }}
        >
          {errorText}
        </div>
      )}

      <section
        style={{
          marginTop: "14px",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          background: "white",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "18px", color: "#4b5563" }}>Cargando cuentas...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "18px", color: "#4b5563" }}>No hay cuentas para mostrar.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                  <Th>Email</Th>
                  <Th>Nombre</Th>
                  <Th>Plan</Th>
                  <Th>Rol</Th>
                  <Th>Dispositivos</Th>
                  <Th>Alta</Th>
                  <Th>Último login</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const busy = activeAction === user.id;
                  return (
                    <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <Td>{user.email || "—"}</Td>
                      <Td>{user.full_name || "—"}</Td>
                      <Td>
                        <select
                          value={user.plan}
                          disabled={busy}
                          onChange={(e) =>
                            updateUser(user.id, { plan: e.target.value as Plan })
                          }
                          style={selectStyle}
                        >
                          {PLAN_OPTIONS.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <select
                          value={user.role}
                          disabled={busy}
                          onChange={(e) =>
                            updateUser(user.id, { role: e.target.value as Role })
                          }
                          style={selectStyle}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>{user.device_count}</Td>
                      <Td>{formatDate(user.created_at)}</Td>
                      <Td>{formatDate(user.last_sign_in_at)}</Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => deleteUser(user.id, user.email)}
                          disabled={busy}
                          style={dangerBtnStyle}
                        >
                          Eliminar
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        fontSize: "12px",
        color: "#475569",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td style={{ padding: "10px 12px", fontSize: "14px", color: "#0f172a" }}>
      {children}
    </td>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  padding: "7px 9px",
  fontSize: "13px",
  background: "white",
};

const primaryBtnStyle: React.CSSProperties = {
  border: "1px solid #111827",
  borderRadius: "10px",
  padding: "10px 14px",
  background: "#111827",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "9px 12px",
  background: "white",
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  border: "1px solid #ef4444",
  borderRadius: "8px",
  padding: "7px 10px",
  background: "#ef4444",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
