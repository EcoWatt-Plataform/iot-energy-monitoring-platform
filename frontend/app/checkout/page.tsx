"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type BuyerFormData,
  DEFAULT_BUYER_FORM,
  METER_PRODUCTS,
  PLAN_CONFIG,
  clearCheckoutDraft,
  clearPurchaseCart,
  meterHardwareTotal,
  normalizeCart,
  overallTotal,
  readCheckoutDraft,
  readPurchaseCart,
  totalMeters,
  writeCheckoutDraft,
} from "@/lib/purchase";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n);
}

export default function CheckoutPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [cart, setCart] = useState(() => readPurchaseCart());
  const [form, setForm] = useState<BuyerFormData>(() => readCheckoutDraft());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 920);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const latest = normalizeCart(readPurchaseCart());
    setCart(latest);
  }, []);

  useEffect(() => {
    writeCheckoutDraft(form);
  }, [form]);

  const selectedMeters = totalMeters(cart.meters);
  const hasValidCart = Boolean(cart.plan) && selectedMeters > 0;

  const summary = useMemo(() => {
    const planPrice = cart.plan ? PLAN_CONFIG[cart.plan].monthlyPrice : 0;
    const hardware = meterHardwareTotal(cart.meters);
    const total = overallTotal(cart);
    return { planPrice, hardware, total };
  }, [cart]);

  function patchForm<K extends keyof BuyerFormData>(key: K, value: BuyerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!hasValidCart || !cart.plan) {
      return "Falta completar el Paso 1 y Paso 2 en el carrito.";
    }

    if (!form.fullName.trim()) return "Completá nombre y apellido.";
    if (!form.phone.trim()) return "Completá teléfono.";
    if (!form.email.trim()) return "Completá email.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "El email no es válido.";
    if (!form.documentNumber.trim()) return "Completá DNI o CUIT.";
    if (!form.address.trim()) return "Completá dirección.";

    const digits = form.documentNumber.replace(/\D/g, "");
    if (form.documentType === "dni" && (digits.length < 7 || digits.length > 10)) {
      return "El DNI debe tener entre 7 y 10 dígitos.";
    }
    if (form.documentType === "cuit" && digits.length !== 11) {
      return "El CUIT debe tener 11 dígitos.";
    }

    return null;
  }

  async function submitOrder() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequestId(null);

    const validation = validate();
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    if (!cart.plan) {
      setErrorMessage("No se encontró plan seleccionado.");
      return;
    }

    const payload = {
      plan: cart.plan,
      meters: {
        plug: cart.meters.plug,
        panel: cart.meters.panel,
      },
      buyer: {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        document_type: form.documentType,
        document_number: form.documentNumber.trim(),
        address: form.address.trim(),
        property_type: form.propertyType,
      },
    };

    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/checkout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        request_id?: number;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar la solicitud.");
      }

      setRequestId(typeof data.request_id === "number" ? data.request_id : null);
      setSuccessMessage("Formulario enviado correctamente. Te contactaremos a la brevedad.");
      clearCheckoutDraft();
      clearPurchaseCart();
      setForm({ ...DEFAULT_BUYER_FORM });
      setCart({ plan: null, meters: { plug: 0, panel: 0 } });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", padding: isMobile ? "18px" : "36px" }}>
      <h1 style={{ marginTop: 0, marginBottom: "8px", fontSize: isMobile ? "28px" : "40px" }}>
        Paso 3: Carga tus datos
      </h1>
      <p style={{ marginTop: 0, color: "#64748b", marginBottom: "18px" }}>
        Completa tus datos para enviar el formulario de compra.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <span style={stepDone}>Paso 1: Plan</span>
        <span style={stepDone}>Paso 2: Medidores</span>
        <span style={stepActive}>Paso 3: Datos</span>
      </div>

      {errorMessage && <div style={errorBox}>{errorMessage}</div>}
      {successMessage && (
        <div style={successBox}>
          {successMessage}
          {requestId !== null && (
            <div style={{ marginTop: "6px", fontWeight: 700 }}>Solicitud #{requestId}</div>
          )}
        </div>
      )}

      {!hasValidCart ? (
        <section style={panel}>
          <h2 style={{ marginTop: 0 }}>No hay selección de compra</h2>
          <p style={{ color: "#64748b" }}>
            Antes de enviar el formulario, completa el Paso 1 y Paso 2 en el carrito.
          </p>
          <Link href="/carrito" style={linkButton}>
            Ir al carrito
          </Link>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
            alignItems: "start",
          }}
        >
          <section style={panel}>
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Datos del cliente</h2>

            <Field label="Nombre y apellido">
              <input
                value={form.fullName}
                onChange={(e) => patchForm("fullName", e.target.value)}
                style={inputStyle}
                placeholder="Ej: Tomas Sisterna"
              />
            </Field>

            <Field label="Teléfono">
              <input
                value={form.phone}
                onChange={(e) => patchForm("phone", e.target.value)}
                style={inputStyle}
                placeholder="Ej: +54 9 11 1234 5678"
              />
            </Field>

            <Field label="Email">
              <input
                value={form.email}
                onChange={(e) => patchForm("email", e.target.value)}
                style={inputStyle}
                placeholder="tucorreo@dominio.com"
              />
            </Field>

            <div style={{ display: "grid", gap: "10px", gridTemplateColumns: isMobile ? "1fr" : "140px 1fr" }}>
              <Field label="Documento">
                <select
                  value={form.documentType}
                  onChange={(e) => patchForm("documentType", e.target.value === "cuit" ? "cuit" : "dni")}
                  style={inputStyle}
                >
                  <option value="dni">DNI</option>
                  <option value="cuit">CUIT</option>
                </select>
              </Field>

              <Field label="Número">
                <input
                  value={form.documentNumber}
                  onChange={(e) => patchForm("documentNumber", e.target.value)}
                  style={inputStyle}
                  placeholder={form.documentType === "cuit" ? "20123456789" : "30111222"}
                />
              </Field>
            </div>

            <Field label="Dirección">
              <input
                value={form.address}
                onChange={(e) => patchForm("address", e.target.value)}
                style={inputStyle}
                placeholder="Calle, numero, localidad"
              />
            </Field>

            <Field label="Tipo de cliente">
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => patchForm("propertyType", "casa")}
                  style={form.propertyType === "casa" ? choiceActive : choiceBtn}
                >
                  Casa
                </button>
                <button
                  type="button"
                  onClick={() => patchForm("propertyType", "empresa")}
                  style={form.propertyType === "empresa" ? choiceActive : choiceBtn}
                >
                  Empresa
                </button>
              </div>
            </Field>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
              <button type="button" onClick={submitOrder} disabled={submitting} style={submitBtn}>
                {submitting ? "Enviando..." : "Enviar formulario"}
              </button>
              <Link href="/carrito" style={secondaryLink}>
                Volver al carrito
              </Link>
            </div>
          </section>

          <aside style={panel}>
            <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "20px" }}>Resumen final</h2>
            <div style={lineItem}>
              <span>Plan</span>
              <strong>{cart.plan ? PLAN_CONFIG[cart.plan].label : "-"}</strong>
            </div>
            <div style={lineItem}>
              <span>EcoWatt Plug</span>
              <strong>
                {cart.meters.plug} x {money(METER_PRODUCTS.plug.price)}
              </strong>
            </div>
            <div style={lineItem}>
              <span>EcoWatt Panel</span>
              <strong>
                {cart.meters.panel} x {money(METER_PRODUCTS.panel.price)}
              </strong>
            </div>
            <div style={lineItem}>
              <span>Total medidores</span>
              <strong>{selectedMeters}</strong>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />

            <div style={lineItem}>
              <span>Suscripción mensual</span>
              <strong>{money(summary.planPrice)}</strong>
            </div>
            <div style={lineItem}>
              <span>Hardware</span>
              <strong>{money(summary.hardware)}</strong>
            </div>
            <div style={{ ...lineItem, fontSize: "16px" }}>
              <strong>Total inicial</strong>
              <strong>{money(summary.total)}</strong>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
      <span style={{ fontSize: "13px", color: "#475569" }}>{props.label}</span>
      {props.children}
    </label>
  );
}

const panel: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
  background: "#fff",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "11px 12px",
  fontSize: "15px",
  width: "100%",
};

const submitBtn: React.CSSProperties = {
  border: "none",
  borderRadius: "12px",
  padding: "12px 14px",
  background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryLink: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "12px 14px",
  color: "#0f172a",
  textDecoration: "none",
};

const choiceBtn: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  padding: "10px 12px",
  background: "#fff",
  cursor: "pointer",
};

const choiceActive: React.CSSProperties = {
  ...choiceBtn,
  border: "1px solid #2563eb",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 700,
};

const lineItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "8px",
  color: "#334155",
};

const errorBox: React.CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#9f1239",
  borderRadius: "10px",
  padding: "10px 12px",
  marginBottom: "14px",
};

const successBox: React.CSSProperties = {
  border: "1px solid #bbf7d0",
  background: "#ecfdf3",
  color: "#166534",
  borderRadius: "10px",
  padding: "10px 12px",
  marginBottom: "14px",
};

const stepDone: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  background: "#eff6ff",
  color: "#1d4ed8",
};

const stepActive: React.CSSProperties = {
  border: "1px solid #16a34a",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  background: "#ecfdf3",
  color: "#166534",
};

const linkButton: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "12px",
  padding: "11px 14px",
  textDecoration: "none",
  background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
  color: "#111827",
  fontWeight: 700,
};
