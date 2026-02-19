"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register" | "recovery";

type LoginFormProps = {
  initialError: string | null;
  nextPath: string;
  initialMode?: Mode;
};

type DocumentType = "DNI" | "CUIT";

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
  locality: string;
  province: string;
  country: string;
  phone: string;
  acceptedTerms: boolean;
};

const INITIAL_REGISTER_FORM: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  documentType: "DNI",
  documentNumber: "",
  birthDate: "",
  locality: "",
  province: "",
  country: "",
  phone: "",
  acceptedTerms: false,
};

function normalizeNextPath(nextPath: string) {
  if (!nextPath.startsWith("/")) return "/dashboard";
  return nextPath;
}

export default function LoginForm({
  initialError,
  nextPath,
  initialMode = "login",
}: LoginFormProps) {
  const router = useRouter();
  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(INITIAL_REGISTER_FORM);
  const [busyAction, setBusyAction] = useState<
    null | "google" | "login" | "register" | "recovery" | "updatePassword"
  >(null);
  const [errorText, setErrorText] = useState<string | null>(initialError);
  const [successText, setSuccessText] = useState<string | null>(null);

  const isBusy = busyAction !== null;

  const cardStyle: React.CSSProperties = {
    width: "min(620px, 94vw)",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    background: "white",
    boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #111827",
    background: "#111827",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  };

  const ghostButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px 12px",
    fontSize: "14px",
  };

  const modeButtonStyle = (active: boolean): React.CSSProperties => ({
    border: "1px solid #d1d5db",
    borderRadius: "999px",
    padding: "8px 14px",
    background: active ? "#111827" : "white",
    color: active ? "white" : "#111827",
    fontWeight: 600,
    cursor: "pointer",
  });

  function clearAlerts() {
    setErrorText(null);
    setSuccessText(null);
  }

  function updateRegisterField<K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
  }

  function getAuthBaseUrl() {
    const runtimeOrigin =
      typeof window !== "undefined" ? window.location.origin : "";
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const baseUrl = configuredSiteUrl || runtimeOrigin;
    return baseUrl.replace(/\/$/, "");
  }

  useEffect(() => {
    if (mode !== "recovery") {
      setHasRecoverySession(false);
      return;
    }

    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function syncRecoverySession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (mounted) {
          setHasRecoverySession(Boolean(user));
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mounted) return;
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            setHasRecoverySession(Boolean(session?.user));
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        console.error(error);
        if (mounted) {
          setHasRecoverySession(false);
        }
      }
    }

    syncRecoverySession();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [mode]);

  async function loginWithGoogle() {
    clearAlerts();
    setBusyAction("google");

    try {
      const normalizedBaseUrl = getAuthBaseUrl();
      const supabase = createClient();
      const callbackUrl = `${normalizedBaseUrl}/auth/callback?next=${encodeURIComponent(
        safeNextPath
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo iniciar sesion con Google.";
      setErrorText(message);
      setBusyAction(null);
    }
  }

  async function loginWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAlerts();
    setBusyAction("login");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        throw error;
      }

      router.push(safeNextPath);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesion con email y contrasena.";
      setErrorText(message);
      setBusyAction(null);
    }
  }

  async function sendRecoveryEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAlerts();

    const email = loginEmail.trim();
    if (!email) {
      setErrorText("Ingresa tu email para recuperar la contrasena.");
      return;
    }

    setBusyAction("recovery");

    try {
      const supabase = createClient();
      const normalizedBaseUrl = getAuthBaseUrl();
      const recoveryNext = "/login?mode=recovery";
      const callbackUrl = `${normalizedBaseUrl}/auth/callback?next=${encodeURIComponent(
        recoveryNext
      )}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl,
      });

      if (error) {
        throw error;
      }

      setSuccessText("Te enviamos un enlace para recuperar tu contrasena.");
      setBusyAction(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo enviar el enlace de recuperacion.";
      setErrorText(message);
      setBusyAction(null);
    }
  }

  async function updatePasswordAfterRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAlerts();

    if (recoveryPassword.length < 8) {
      setErrorText("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (recoveryPassword !== recoveryConfirmPassword) {
      setErrorText("Las nuevas contrasenas no coinciden.");
      return;
    }

    setBusyAction("updatePassword");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: recoveryPassword,
      });

      if (error) {
        throw error;
      }

      setSuccessText("Contrasena actualizada. Ya puedes ingresar.");
      setRecoveryPassword("");
      setRecoveryConfirmPassword("");
      setBusyAction(null);
      setMode("login");
      router.push(safeNextPath);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contrasena.";
      setErrorText(message);
      setBusyAction(null);
    }
  }

  async function registerWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAlerts();

    if (registerForm.password.length < 8) {
      setErrorText("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorText("Las contrasenas no coinciden.");
      return;
    }

    if (!registerForm.acceptedTerms) {
      setErrorText("Debes aceptar los terminos y condiciones para continuar.");
      return;
    }

    setBusyAction("register");

    try {
      const supabase = createClient();
      const normalizedBaseUrl = getAuthBaseUrl();
      const callbackUrl = `${normalizedBaseUrl}/auth/callback?next=${encodeURIComponent(
        safeNextPath
      )}`;

      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email.trim(),
        password: registerForm.password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: `${registerForm.firstName.trim()} ${registerForm.lastName.trim()}`.trim(),
            first_name: registerForm.firstName.trim(),
            last_name: registerForm.lastName.trim(),
            document_type: registerForm.documentType,
            document_number: registerForm.documentNumber.trim(),
            birth_date: registerForm.birthDate,
            locality: registerForm.locality.trim(),
            province: registerForm.province.trim(),
            country: registerForm.country.trim(),
            phone: registerForm.phone.trim() || null,
            accepted_terms: true,
            accepted_terms_at: new Date().toISOString(),
            terms_version: "1.0",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.push(safeNextPath);
        router.refresh();
        return;
      }

      setSuccessText(
        "Cuenta creada. Revisa tu email para confirmar la cuenta antes de ingresar."
      );
      setMode("login");
      setLoginEmail(registerForm.email.trim());
      setRegisterForm(INITIAL_REGISTER_FORM);
      setBusyAction(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la cuenta en este momento.";
      setErrorText(message);
      setBusyAction(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 84px)",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px 40px",
        background:
          "radial-gradient(circle at 12% 18%, rgba(105,146,235,0.22), transparent 38%), radial-gradient(circle at 88% 80%, rgba(34,197,94,0.18), transparent 42%), #f8fafc",
      }}
    >
      <section style={cardStyle}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              clearAlerts();
            }}
            style={modeButtonStyle(mode === "login")}
            disabled={isBusy}
          >
            Iniciar sesion
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              clearAlerts();
            }}
            style={modeButtonStyle(mode === "register")}
            disabled={isBusy}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("recovery");
              clearAlerts();
            }}
            style={modeButtonStyle(mode === "recovery")}
            disabled={isBusy}
          >
            Recuperar contrasena
          </button>
        </div>

        <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.15 }}>
          {mode === "login"
            ? "Iniciar sesion"
            : mode === "register"
              ? "Crear cuenta en EcoWatt"
              : "Recuperar contrasena"}
        </h1>
        <p style={{ margin: "10px 0 0", color: "#4b5563" }}>
          {mode === "login"
            ? "Elige como quieres ingresar a tu cuenta."
            : mode === "register"
              ? "Completa tus datos para crear tu cuenta personal."
              : "Te enviaremos un enlace para recuperar el acceso."}
        </p>

        {errorText && (
          <div
            style={{
              marginTop: "16px",
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: "12px",
              padding: "10px 12px",
              fontSize: "14px",
            }}
          >
            {errorText}
          </div>
        )}

        {successText && (
          <div
            style={{
              marginTop: "16px",
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              borderRadius: "12px",
              padding: "10px 12px",
              fontSize: "14px",
            }}
          >
            {successText}
          </div>
        )}

        {mode === "login" ? (
          <>
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={isBusy}
              style={{ ...buttonStyle, marginTop: "18px" }}
            >
              {busyAction === "google" ? "Redirigiendo..." : "Continuar con Google"}
            </button>

            <div
              style={{
                margin: "18px 0",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              <span style={{ height: "1px", flex: 1, background: "#e5e7eb" }} />
              <span>o con email personal</span>
              <span style={{ height: "1px", flex: 1, background: "#e5e7eb" }} />
            </div>

            <form onSubmit={loginWithEmail}>
              <label
                style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
              >
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
                style={inputStyle}
              />

              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#374151",
                  marginBottom: "6px",
                  marginTop: "12px",
                }}
              >
                Contrasena
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Tu contrasena"
                autoComplete="current-password"
                required
                style={inputStyle}
              />

              <button
                type="submit"
                disabled={isBusy}
                style={{ ...ghostButtonStyle, marginTop: "14px" }}
              >
                {busyAction === "login" ? "Ingresando..." : "Ingresar con email"}
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setMode("recovery");
                  clearAlerts();
                }}
                style={{
                  marginTop: "10px",
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  fontSize: "13px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Olvide mi contrasena
              </button>
            </form>
          </>
        ) : mode === "register" ? (
          <form onSubmit={registerWithEmail} style={{ marginTop: "16px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Nombre
                </label>
                <input
                  type="text"
                  value={registerForm.firstName}
                  onChange={(e) => updateRegisterField("firstName", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Apellido
                </label>
                <input
                  type="text"
                  value={registerForm.lastName}
                  onChange={(e) => updateRegisterField("lastName", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => updateRegisterField("email", e.target.value)}
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Telefono (opcional)
                </label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => updateRegisterField("phone", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Contrasena
                </label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => updateRegisterField("password", e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Confirmar contrasena
                </label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => updateRegisterField("confirmPassword", e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Tipo de documento
                </label>
                <select
                  value={registerForm.documentType}
                  onChange={(e) =>
                    updateRegisterField("documentType", e.target.value as DocumentType)
                  }
                  required
                  style={inputStyle}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                </select>
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Numero de documento
                </label>
                <input
                  type="text"
                  value={registerForm.documentNumber}
                  onChange={(e) => updateRegisterField("documentNumber", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={registerForm.birthDate}
                  onChange={(e) => updateRegisterField("birthDate", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Localidad
                </label>
                <input
                  type="text"
                  value={registerForm.locality}
                  onChange={(e) => updateRegisterField("locality", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Provincia
                </label>
                <input
                  type="text"
                  value={registerForm.province}
                  onChange={(e) => updateRegisterField("province", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Pais
                </label>
                <input
                  type="text"
                  value={registerForm.country}
                  onChange={(e) => updateRegisterField("country", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginTop: "14px",
                fontSize: "13px",
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={registerForm.acceptedTerms}
                onChange={(e) => updateRegisterField("acceptedTerms", e.target.checked)}
                required
                style={{ marginTop: "2px" }}
              />
              <span>
                Acepto los{" "}
                <Link href="/terminos" target="_blank" rel="noopener noreferrer">
                  terminos y condiciones
                </Link>{" "}
                de EcoWatt.
              </span>
            </label>

            <button
              type="submit"
              disabled={isBusy}
              style={{ ...buttonStyle, marginTop: "14px" }}
            >
              {busyAction === "register" ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={hasRecoverySession ? updatePasswordAfterRecovery : sendRecoveryEmail}
            style={{ marginTop: "16px" }}
          >
            {hasRecoverySession ? (
              <>
                <p style={{ margin: "0 0 12px", color: "#4b5563", fontSize: "14px" }}>
                  Ya validamos tu enlace. Define una nueva contrasena.
                </p>

                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Nueva contrasena
                </label>
                <input
                  type="password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  style={inputStyle}
                />

                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                    marginTop: "12px",
                  }}
                >
                  Confirmar nueva contrasena
                </label>
                <input
                  type="password"
                  value={recoveryConfirmPassword}
                  onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  style={inputStyle}
                />

                <button
                  type="submit"
                  disabled={isBusy}
                  style={{ ...buttonStyle, marginTop: "14px" }}
                >
                  {busyAction === "updatePassword"
                    ? "Actualizando..."
                    : "Actualizar contrasena"}
                </button>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 12px", color: "#4b5563", fontSize: "14px" }}>
                  Ingresa tu email y te enviaremos un enlace de recuperacion.
                </p>

                <label
                  style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "6px" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  style={inputStyle}
                />

                <button
                  type="submit"
                  disabled={isBusy}
                  style={{ ...buttonStyle, marginTop: "14px" }}
                >
                  {busyAction === "recovery" ? "Enviando..." : "Enviar enlace de recuperacion"}
                </button>
              </>
            )}
          </form>
        )}

        <Link href="/" style={{ display: "inline-block", marginTop: "16px", fontSize: "14px" }}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
