"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type BuyerFormData,
  DEFAULT_BUYER_FORM,
  METER_PRODUCTS,
  PLAN_CONFIG,
  clearCheckoutDraft,
  clearCheckoutIdempotencyDraft,
  clearPurchaseCart,
  meterHardwareTotal,
  normalizeCart,
  overallTotal,
  readCheckoutDraft,
  readCheckoutIdempotencyDraft,
  readPurchaseCart,
  totalMeters,
  writeCheckoutDraft,
  writeCheckoutIdempotencyDraft,
} from "@/lib/purchase";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `checkout_${crypto.randomUUID()}`;
  }
  return `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

type SubmittedOrder = {
  requestId: number | null;
  plan: string;
  metersTotal: number;
  total: number;
  buyerEmail: string;
  buyerPhone: string;
  submittedAt: string;
  idempotentReplay: boolean;
};

export default function CheckoutPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [cart, setCart] = useState(() => readPurchaseCart());
  const [form, setForm] = useState<BuyerFormData>(() => readCheckoutDraft());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);

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

    if (!form.fullName.trim()) return "Completa nombre y apellido.";
    if (!form.phone.trim()) return "Completa telefono.";
    if (!form.email.trim()) return "Completa email.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "El email no es valido.";
    if (!form.documentNumber.trim()) return "Completa DNI o CUIT.";
    if (!form.address.trim()) return "Completa direccion.";

    const digits = form.documentNumber.replace(/\D/g, "");
    if (form.documentType === "dni" && (digits.length < 7 || digits.length > 10)) {
      return "El DNI debe tener entre 7 y 10 digitos.";
    }
    if (form.documentType === "cuit" && digits.length !== 11) {
      return "El CUIT debe tener 11 digitos.";
    }

    return null;
  }

  async function submitOrder() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequestId(null);
    setSubmittedOrder(null);

    const validation = validate();
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    if (!cart.plan) {
      setErrorMessage("No se encontro plan seleccionado.");
      return;
    }

    const payloadBase = {
      plan: cart.plan,
      meters: {
        plug: cart.meters.plug,
        panel_1f: cart.meters.panel_1f,
        panel_3f: cart.meters.panel_3f,
        extra_phase: cart.meters.extra_phase,
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

    const fingerprint = JSON.stringify(payloadBase);
    const previousIdempotency = readCheckoutIdempotencyDraft();
    const idempotencyKey =
      previousIdempotency && previousIdempotency.fingerprint === fingerprint
        ? previousIdempotency.key
        : createIdempotencyKey();
    writeCheckoutIdempotencyDraft({ fingerprint, key: idempotencyKey });

    const payload = {
      ...payloadBase,
      idempotency_key: idempotencyKey,
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
        idempotent_replay?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar la solicitud.");
      }

      const nextRequestId = typeof data.request_id === "number" ? data.request_id : null;
      setRequestId(nextRequestId);
      setSuccessMessage("Formulario enviado correctamente. Te contactaremos a la brevedad.");
      setSubmittedOrder({
        requestId: nextRequestId,
        plan: cart.plan,
        metersTotal: selectedMeters,
        total: summary.total,
        buyerEmail: payloadBase.buyer.email,
        buyerPhone: payloadBase.buyer.phone,
        submittedAt: new Date().toISOString(),
        idempotentReplay: Boolean(data.idempotent_replay),
      });
      clearCheckoutDraft();
      clearCheckoutIdempotencyDraft();
      clearPurchaseCart();
      setForm({ ...DEFAULT_BUYER_FORM });
      setCart({ plan: null, meters: { plug: 0, panel_1f: 0, panel_3f: 0, extra_phase: 0 } });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedOrder) {
    return (
      <div style={{ maxWidth: "980px", margin: "0 auto", padding: isMobile ? "18px" : "36px" }}>
        <section style={successScreenCard}>
          <div style={successChip}>Solicitud enviada</div>
          <h1 style={{ marginTop: "10px", marginBottom: "8px", fontSize: isMobile ? "30px" : "42px" }}>
            Confirmacion de compra
          </h1>
          <p style={{ marginTop: 0, color: "#475569", marginBottom: "16px" }}>
            Recibimos tus datos correctamente. Nuestro equipo se va a contactar para continuar con
            la gestion.
          </p>

          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <SummaryCard label="Solicitud" value={submittedOrder.requestId ? `#${submittedOrder.requestId}` : "-"} />
            <SummaryCard label="Plan" value={submittedOrder.plan} />
            <SummaryCard label="Medidores" value={String(submittedOrder.metersTotal)} />
            <SummaryCard label="Total inicial" value={money(submittedOrder.total)} />
            <SummaryCard label="Email de contacto" value={submittedOrder.buyerEmail} />
            <SummaryCard label="Telefono de contacto" value={submittedOrder.buyerPhone} />
            <SummaryCard
              label="Fecha de envio"
              value={new Date(submittedOrder.submittedAt).toLocaleString("es-AR")}
            />
            <SummaryCard
              label="Estado del envio"
              value={submittedOrder.idempotentReplay ? "Reintento detectado (sin duplicado)" : "Registrado"}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
            <Link href="/soporte" style={linkButton}>
              Contactar soporte
            </Link>
            <Link href="/carrito" style={secondaryLink}>
              Cargar otra solicitud
            </Link>
            <Link href="/" style={secondaryLink}>
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    );
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
          <h2 style={{ marginTop: 0 }}>No hay seleccion de compra</h2>
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

            <Field label="Telefono">
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

              <Field label="Numero">
                <input
                  value={form.documentNumber}
                  onChange={(e) => patchForm("documentNumber", e.target.value)}
                  style={inputStyle}
                  placeholder={form.documentType === "cuit" ? "20123456789" : "30111222"}
                />
              </Field>
            </div>

            <Field label="Direccion">
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
              <span>EcoWatt Panel 1F</span>
              <strong>
                {cart.meters.panel_1f} x {money(METER_PRODUCTS.panel_1f.price)}
              </strong>
            </div>
            <div style={lineItem}>
              <span>EcoWatt Panel 3F</span>
              <strong>
                {cart.meters.panel_3f} x {money(METER_PRODUCTS.panel_3f.price)}
              </strong>
            </div>
            <div style={lineItem}>
              <span>Fase extra</span>
              <strong>
                {cart.meters.extra_phase} x {money(METER_PRODUCTS.extra_phase.price)}
              </strong>
            </div>
            <div style={lineItem}>
              <span>Total medidores</span>
              <strong>{selectedMeters}</strong>
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />

            <div style={lineItem}>
              <span>Suscripcion mensual</span>
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

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "10px 12px",
        background: "white",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{props.label}</div>
      <div style={{ fontSize: "15px", color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
        {props.value}
      </div>
    </div>
  );
}

const successScreenCard: React.CSSProperties = {
  border: "1px solid #bae6fd",
  borderRadius: "18px",
  padding: "20px",
  background: "linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)",
  boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
};

const successChip: React.CSSProperties = {
  display: "inline-block",
  border: "1px solid #86efac",
  background: "#ecfdf3",
  color: "#166534",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 700,
};

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
