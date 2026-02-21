"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Plan = "basico" | "avanzado" | "premium";
type Role = "user" | "admin";
type DocumentType = "DNI" | "CUIT";
type DocumentTypeValue = DocumentType | "";

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
  document_type: DocumentType | null;
  document_number: string | null;
  dni: string | null;
  cuit: string | null;
  phone: string | null;
  birth_date: string | null;
  locality: string | null;
  province: string | null;
  country: string | null;
  address: string | null;
};

type AdminUsersResponse = {
  users?: AdminUser[];
  error?: string;
};

type UpdateUserPatch = Partial<{
  plan: Plan;
  role: Role;
  full_name: string | null;
  email: string;
  password: string;
  document_type: DocumentType | null;
  document_number: string | null;
  phone: string | null;
  birth_date: string | null;
  locality: string | null;
  province: string | null;
  country: string | null;
  address: string | null;
}>;

type ProfileDraft = {
  document_type: DocumentTypeValue;
  document_number: string;
  phone: string;
  birth_date: string;
  address: string;
  locality: string;
  province: string;
  country: string;
};

const PLAN_OPTIONS: Plan[] = ["basico", "avanzado", "premium"];
const ROLE_OPTIONS: Role[] = ["user", "admin"];

function formatDate(value: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDocument(user: AdminUser) {
  const type = user.document_type;
  const number = user.document_number || user.dni || user.cuit;
  if (!type && !number) return "-";
  if (type && number) return `${type}: ${number}`;
  return number || "-";
}

function formatAddress(user: AdminUser) {
  if (user.address) return user.address;
  const parts = [user.locality, user.province, user.country].filter(Boolean);
  if (parts.length === 0) return "-";
  return parts.join(", ");
}

function formatDateInput(value: string | null) {
  if (!value) return "";
  if (value.length >= 10) return value.slice(0, 10);
  return "";
}

function buildProfileDraft(user: AdminUser): ProfileDraft {
  return {
    document_type: user.document_type ?? "",
    document_number: user.document_number || user.dni || user.cuit || "",
    phone: user.phone || "",
    birth_date: formatDateInput(user.birth_date),
    address: user.address || "",
    locality: user.locality || "",
    province: user.province || "",
    country: user.country || "",
  };
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
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPlan, setNewPlan] = useState<Plan>("basico");
  const [newRole, setNewRole] = useState<Role>("user");
  const [newDocumentType, setNewDocumentType] = useState<DocumentType>("DNI");
  const [newDocumentNumber, setNewDocumentNumber] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLocality, setNewLocality] = useState("");
  const [newProvince, setNewProvince] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [profileDrafts, setProfileDrafts] = useState<Record<string, ProfileDraft>>({});

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message || "No se pudo validar la sesion.");
    const token = data.session?.access_token;
    if (!token) throw new Error("Sesion vencida. Inicia sesion de nuevo.");
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

    const nextUsers = Array.isArray(payload.users) ? payload.users : [];
    setUsers(nextUsers);
    setDraftNames((prev) => {
      const next: Record<string, string> = {};
      for (const user of nextUsers) {
        next[user.id] = prev[user.id] ?? user.full_name ?? "";
      }
      return next;
    });
    setProfileDrafts((prev) => {
      const next: Record<string, ProfileDraft> = {};
      for (const user of nextUsers) {
        next[user.id] = prev[user.id] ?? buildProfileDraft(user);
      }
      return next;
    });
    setExpandedUsers((prev) => {
      const next: Record<string, boolean> = {};
      for (const user of nextUsers) {
        if (prev[user.id]) next[user.id] = true;
      }
      return next;
    });
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

  async function updateUser(userId: string, patch: UpdateUserPatch) {
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
      setDraftNames((prev) => ({ ...prev, [userId]: payload.full_name || "" }));
      setProfileDrafts((prev) => ({ ...prev, [userId]: buildProfileDraft(payload) }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar la cuenta.";
      setErrorText(message);
    } finally {
      setActiveAction(null);
    }
  }

  async function createUser() {
    const email = newEmail.trim().toLowerCase();
    const password = newPassword;
    const fullName = newFullName.trim();

    if (!email) {
      setErrorText("El email es obligatorio para crear un usuario.");
      return;
    }
    if (password.length < 6) {
      setErrorText("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    setActiveAction("create-user");
    setErrorText(null);
    try {
      const res = await adminFetch("/api/v1/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || null,
          plan: newPlan,
          role: newRole,
          document_type: newDocumentType,
          document_number: newDocumentNumber.trim() || null,
          phone: newPhone.trim() || null,
          birth_date: newBirthDate || null,
          address: newAddress.trim() || null,
          locality: newLocality.trim() || null,
          province: newProvince.trim() || null,
          country: newCountry.trim() || null,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as AdminUser & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo crear la cuenta.");
      }

      setUsers((prev) => [payload, ...prev]);
      setDraftNames((prev) => ({ ...prev, [payload.id]: payload.full_name || "" }));
      setProfileDrafts((prev) => ({ ...prev, [payload.id]: buildProfileDraft(payload) }));
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewPlan("basico");
      setNewRole("user");
      setNewDocumentType("DNI");
      setNewDocumentNumber("");
      setNewPhone("");
      setNewBirthDate("");
      setNewAddress("");
      setNewLocality("");
      setNewProvince("");
      setNewCountry("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo crear la cuenta.";
      setErrorText(message);
    } finally {
      setActiveAction(null);
    }
  }

  async function saveUserName(userId: string) {
    const fullName = (draftNames[userId] || "").trim();
    const currentUser = users.find((u) => u.id === userId);
    const currentName = (currentUser?.full_name || "").trim();
    if (fullName === currentName) return;
    await updateUser(userId, { full_name: fullName || null });
  }

  async function deleteUser(userId: string, email: string) {
    const confirmed = window.confirm(
      `Eliminar la cuenta ${email}? Esta accion no se puede deshacer.`
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
      setDraftNames((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setProfileDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setExpandedUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
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

  function openUserDashboard(userId: string) {
    const target = `/dashboard?as_user_id=${encodeURIComponent(userId)}`;
    if (typeof window !== "undefined") {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(target);
  }

  function toggleUserDetails(user: AdminUser) {
    setExpandedUsers((prev) => ({ ...prev, [user.id]: !prev[user.id] }));
    setProfileDrafts((prev) => {
      if (prev[user.id]) return prev;
      return { ...prev, [user.id]: buildProfileDraft(user) };
    });
  }

  function setProfileField(userId: string, field: keyof ProfileDraft, value: string) {
    setProfileDrafts((prev) => {
      const current = prev[userId] ?? {
        document_type: "",
        document_number: "",
        phone: "",
        birth_date: "",
        address: "",
        locality: "",
        province: "",
        country: "",
      };
      return {
        ...prev,
        [userId]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  async function saveUserProfile(userId: string) {
    const user = users.find((item) => item.id === userId);
    const draft = profileDrafts[userId];
    if (!user || !draft) return;

    const patch: UpdateUserPatch = {};

    const documentType = draft.document_type || null;
    if (documentType !== (user.document_type ?? null)) {
      patch.document_type = documentType;
    }

    const currentDocument = (user.document_number || user.dni || user.cuit || "").trim() || null;
    const nextDocument = draft.document_number.trim() || null;
    if (nextDocument !== currentDocument) {
      patch.document_number = nextDocument;
    }

    const currentPhone = (user.phone || "").trim() || null;
    const nextPhone = draft.phone.trim() || null;
    if (nextPhone !== currentPhone) {
      patch.phone = nextPhone;
    }

    const currentBirthDate = formatDateInput(user.birth_date) || null;
    const nextBirthDate = draft.birth_date || null;
    if (nextBirthDate !== currentBirthDate) {
      patch.birth_date = nextBirthDate;
    }

    const currentAddress = (user.address || "").trim() || null;
    const nextAddress = draft.address.trim() || null;
    if (nextAddress !== currentAddress) {
      patch.address = nextAddress;
    }

    const currentLocality = (user.locality || "").trim() || null;
    const nextLocality = draft.locality.trim() || null;
    if (nextLocality !== currentLocality) {
      patch.locality = nextLocality;
    }

    const currentProvince = (user.province || "").trim() || null;
    const nextProvince = draft.province.trim() || null;
    if (nextProvince !== currentProvince) {
      patch.province = nextProvince;
    }

    const currentCountry = (user.country || "").trim() || null;
    const nextCountry = draft.country.trim() || null;
    if (nextCountry !== currentCountry) {
      patch.country = nextCountry;
    }

    if (Object.keys(patch).length === 0) return;
    await updateUser(userId, patch);
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
            Gestiona las cuentas registradas en la plataforma.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={refresh} disabled={refreshing} style={ghostBtnStyle}>
            {refreshing ? "Actualizando..." : "Refrescar"}
          </button>
          <button type="button" onClick={logout} style={ghostBtnStyle}>
            Cerrar sesion
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

      <section
        style={{
          marginTop: "14px",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "12px",
          background: "white",
        }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>Alta de usuario</h2>
        <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            style={inputStyle}
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Contrasena inicial"
            type="password"
            style={inputStyle}
          />
          <input
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            placeholder="Nombre completo"
            style={inputStyle}
          />
          <select
            value={newDocumentType}
            onChange={(e) => setNewDocumentType(e.target.value as DocumentType)}
            style={selectStyle}
          >
            <option value="DNI">Documento: DNI</option>
            <option value="CUIT">Documento: CUIT</option>
          </select>
          <input
            value={newDocumentNumber}
            onChange={(e) => setNewDocumentNumber(e.target.value)}
            placeholder="Numero de documento"
            style={inputStyle}
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Telefono"
            style={inputStyle}
          />
          <input
            type="date"
            value={newBirthDate}
            onChange={(e) => setNewBirthDate(e.target.value)}
            style={inputStyle}
          />
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Direccion (calle/altura)"
            style={inputStyle}
          />
          <input
            value={newLocality}
            onChange={(e) => setNewLocality(e.target.value)}
            placeholder="Localidad"
            style={inputStyle}
          />
          <input
            value={newProvince}
            onChange={(e) => setNewProvince(e.target.value)}
            placeholder="Provincia"
            style={inputStyle}
          />
          <input
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            placeholder="Pais"
            style={inputStyle}
          />
          <select value={newPlan} onChange={(e) => setNewPlan(e.target.value as Plan)} style={selectStyle}>
            {PLAN_OPTIONS.map((plan) => (
              <option key={`new-plan-${plan}`} value={plan}>
                Plan: {plan}
              </option>
            ))}
          </select>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} style={selectStyle}>
            {ROLE_OPTIONS.map((role) => (
              <option key={`new-role-${role}`} value={role}>
                Rol: {role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createUser}
            disabled={activeAction === "create-user"}
            style={primaryBtnStyle}
          >
            {activeAction === "create-user" ? "Creando..." : "Crear usuario"}
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1540px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                  <Th>User ID</Th>
                  <Th>Email</Th>
                  <Th>Nombre</Th>
                  <Th>Documento</Th>
                  <Th>Telefono</Th>
                  <Th>Direccion</Th>
                  <Th>Plan</Th>
                  <Th>Rol</Th>
                  <Th>Dispositivos</Th>
                  <Th>Alta</Th>
                  <Th>Ultimo login</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const busy = activeAction === user.id;
                  const showDetails = Boolean(expandedUsers[user.id]);
                  const draft = profileDrafts[user.id] ?? buildProfileDraft(user);
                  return (
                    <Fragment key={user.id}>
                      <tr style={{ borderBottom: showDetails ? "none" : "1px solid #f1f5f9" }}>
                        <Td>
                          <code style={{ fontSize: "12px" }}>{user.id}</code>
                        </Td>
                        <Td>{user.email || "-"}</Td>
                        <Td>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              value={draftNames[user.id] ?? ""}
                              onChange={(e) =>
                                setDraftNames((prev) => ({ ...prev, [user.id]: e.target.value }))
                              }
                              disabled={busy}
                              style={{
                                ...inputStyle,
                                padding: "7px 9px",
                                fontSize: "13px",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => saveUserName(user.id)}
                              disabled={busy}
                              style={secondaryActionBtnStyle}
                            >
                              Guardar
                            </button>
                          </div>
                        </Td>
                        <Td>{formatDocument(user)}</Td>
                        <Td>{user.phone || "-"}</Td>
                        <Td>{formatAddress(user)}</Td>
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
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => toggleUserDetails(user)}
                              disabled={busy}
                              style={secondaryActionBtnStyle}
                            >
                              {showDetails ? "Ocultar ficha" : "Ver ficha"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openUserDashboard(user.id)}
                              disabled={busy}
                              style={secondaryActionBtnStyle}
                            >
                              Dashboard
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser(user.id, user.email)}
                              disabled={busy}
                              style={dangerBtnStyle}
                            >
                              Eliminar
                            </button>
                          </div>
                        </Td>
                      </tr>

                      {showDetails && (
                        <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                          <td colSpan={12} style={{ padding: "12px" }}>
                            <div
                              style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                padding: "12px",
                                background: "white",
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gap: "8px",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                }}
                              >
                                <DetailItem label="User ID" value={user.id} />
                                <DetailItem
                                  label="Email confirmado"
                                  value={formatDate(user.email_confirmed_at)}
                                />
                                <DetailItem
                                  label="Fecha de nacimiento"
                                  value={draft.birth_date || "-"}
                                />
                                <DetailItem
                                  label="Direccion resumida"
                                  value={formatAddress(user)}
                                />
                              </div>

                              <div
                                style={{
                                  marginTop: "10px",
                                  display: "grid",
                                  gap: "8px",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                }}
                              >
                                <div>
                                  <div style={fieldLabelStyle}>Tipo de documento</div>
                                  <select
                                    value={draft.document_type}
                                    onChange={(e) =>
                                      setProfileField(
                                        user.id,
                                        "document_type",
                                        e.target.value as DocumentTypeValue
                                      )
                                    }
                                    disabled={busy}
                                    style={{ ...selectStyle, width: "100%" }}
                                  >
                                    <option value="">Sin definir</option>
                                    <option value="DNI">DNI</option>
                                    <option value="CUIT">CUIT</option>
                                  </select>
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Numero documento</div>
                                  <input
                                    value={draft.document_number}
                                    onChange={(e) =>
                                      setProfileField(user.id, "document_number", e.target.value)
                                    }
                                    disabled={busy}
                                    placeholder="DNI/CUIT"
                                    style={inputStyle}
                                  />
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Telefono</div>
                                  <input
                                    value={draft.phone}
                                    onChange={(e) => setProfileField(user.id, "phone", e.target.value)}
                                    disabled={busy}
                                    placeholder="Telefono"
                                    style={inputStyle}
                                  />
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Nacimiento</div>
                                  <input
                                    type="date"
                                    value={draft.birth_date}
                                    onChange={(e) => setProfileField(user.id, "birth_date", e.target.value)}
                                    disabled={busy}
                                    style={inputStyle}
                                  />
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Direccion</div>
                                  <input
                                    value={draft.address}
                                    onChange={(e) => setProfileField(user.id, "address", e.target.value)}
                                    disabled={busy}
                                    placeholder="Calle y numero"
                                    style={inputStyle}
                                  />
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Localidad</div>
                                  <input
                                    value={draft.locality}
                                    onChange={(e) => setProfileField(user.id, "locality", e.target.value)}
                                    disabled={busy}
                                    placeholder="Localidad"
                                    style={inputStyle}
                                  />
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Provincia</div>
                                  <input
                                    value={draft.province}
                                    onChange={(e) => setProfileField(user.id, "province", e.target.value)}
                                    disabled={busy}
                                    placeholder="Provincia"
                                    style={inputStyle}
                                  />
                                </div>

                                <div>
                                  <div style={fieldLabelStyle}>Pais</div>
                                  <input
                                    value={draft.country}
                                    onChange={(e) => setProfileField(user.id, "country", e.target.value)}
                                    disabled={busy}
                                    placeholder="Pais"
                                    style={inputStyle}
                                  />
                                </div>
                              </div>

                              <div style={{ marginTop: "10px" }}>
                                <button
                                  type="button"
                                  onClick={() => saveUserProfile(user.id)}
                                  disabled={busy}
                                  style={primaryBtnStyle}
                                >
                                  Guardar ficha
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "14px", color: "#0f172a", wordBreak: "break-word" }}>{value}</div>
    </div>
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

const secondaryActionBtnStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "7px 10px",
  background: "white",
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "4px",
};



