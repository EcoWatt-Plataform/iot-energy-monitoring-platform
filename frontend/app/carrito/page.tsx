"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type MeterType,
  type PlanId,
  METER_PRODUCTS,
  PLAN_CONFIG,
  getPlanMaxMeters,
  meterHardwareTotal,
  normalizeCart,
  overallTotal,
  readPurchaseCart,
  totalMeters,
  writePurchaseCart,
} from "@/lib/purchase";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n);
}

function queryPlan(): PlanId | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const plan = (params.get("plan") || "").trim().toLowerCase();
  if (plan === "basico" || plan === "avanzado" || plan === "premium") {
    return plan as PlanId;
  }
  return null;
}

function initialCart(): ReturnType<typeof readPurchaseCart> {
  const base = readPurchaseCart();
  const fromQuery = queryPlan();
  if (!fromQuery) return base;
  return writePurchaseCart(normalizeCart({ ...base, plan: fromQuery }));
}

export default function CarritoPage() {
  const [cart, setCart] = useState(() => initialCart());
  const [isMobile, setIsMobile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const maxMeters = getPlanMaxMeters(cart.plan);
  const selectedMeters = totalMeters(cart.meters);
  const canContinue = Boolean(cart.plan) && selectedMeters > 0;

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 920);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const fromQuery = queryPlan();
    if (!fromQuery) return;
    window.history.replaceState({}, "", "/carrito");
  }, []);

  function updateCart(next: typeof cart) {
    const stored = writePurchaseCart(next);
    setCart(stored);
  }

  function selectPlan(plan: PlanId) {
    setNotice(null);
    updateCart({ ...cart, plan });
  }

  function clearSelection() {
    setNotice(null);
    updateCart({ plan: cart.plan, meters: { plug: 0, panel: 0 } });
  }

  function setMeterQty(type: MeterType, qtyInput: number) {
    if (!cart.plan) {
      setNotice("Primero selecciona un plan en el Paso 1.");
      return;
    }

    const max = PLAN_CONFIG[cart.plan].maxMeters;
    const qty = Math.max(0, Math.floor(Number.isFinite(qtyInput) ? qtyInput : 0));

    const nextMeters = { ...cart.meters, [type]: qty };
    const total = totalMeters(nextMeters);

    if (total > max) {
      const otherType: MeterType = type === "plug" ? "panel" : "plug";
      const overflow = total - max;
      nextMeters[otherType] = Math.max(0, nextMeters[otherType] - overflow);
      setNotice(
        `Tu plan ${PLAN_CONFIG[cart.plan].label} permite hasta ${max} medidor(es).`
      );
    } else {
      setNotice(null);
    }

    updateCart({ ...cart, meters: nextMeters });
  }

  const meterRows = useMemo(() => {
    return (Object.keys(METER_PRODUCTS) as MeterType[]).map((type) => {
      const product = METER_PRODUCTS[type];
      const qty = cart.meters[type];
      const subtotal = qty * product.price;
      const disablePlus = !cart.plan || selectedMeters >= maxMeters;

      return {
        type,
        ...product,
        qty,
        subtotal,
        disablePlus,
      };
    });
  }, [cart.meters, cart.plan, selectedMeters, maxMeters]);

  const planPrice = cart.plan ? PLAN_CONFIG[cart.plan].monthlyPrice : 0;
  const hardwareTotal = meterHardwareTotal(cart.meters);
  const total = overallTotal(cart);

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", padding: isMobile ? "18px" : "36px" }}>
      <h1 style={{ marginTop: 0, marginBottom: "8px", fontSize: isMobile ? "28px" : "40px" }}>
        Proceso de compra
      </h1>
      <p style={{ marginTop: 0, color: "#475569", marginBottom: "18px" }}>
        Paso 1: elige plan. Paso 2: define medidores EcoWatt Plug o EcoWatt Panel.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <span style={stepBadge}>Paso 1: Plan</span>
        <span style={stepBadge}>Paso 2: Medidores</span>
        <span style={stepBadge}>Paso 3: Datos</span>
      </div>

      {notice && (
        <div style={noticeStyle}>
          {notice}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <section style={boxStyle}>
            <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Paso 1: Selecciona tu plan</h2>
            <p style={{ marginTop: 0, color: "#64748b", fontSize: "14px" }}>
              Compara rapidamente y selecciona el plan antes de elegir medidores.
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              {(Object.keys(PLAN_CONFIG) as PlanId[]).map((planId) => {
                const plan = PLAN_CONFIG[planId];
                const active = cart.plan === planId;
                return (
                  <article
                    key={`plan-${planId}`}
                    style={{
                      border: active ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "14px",
                      background: active ? "#eff6ff" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                      <strong style={{ fontSize: "18px" }}>{plan.label}</strong>
                      {active && (
                        <span style={selectedChip}>Seleccionado</span>
                      )}
                    </div>
                    <p style={{ color: "#475569", marginTop: "8px", marginBottom: "10px", fontSize: "14px" }}>
                      {plan.summary}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155", lineHeight: 1.6 }}>
                      <li>{plan.maxMeters} medidor(es) maximo</li>
                      <li>Historial {plan.historyMonths} meses</li>
                      <li>{plan.dashboard}</li>
                      <li>Alertas {plan.alerts.toLowerCase()}</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => selectPlan(planId)}
                      style={{ ...btnPrimary, marginTop: "12px", width: "100%" }}
                    >
                      {active ? "Plan activo" : `Elegir ${plan.label}`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section style={boxStyle}>
            <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Paso 2: Selecciona medidores</h2>
            {!cart.plan ? (
              <p style={{ margin: 0, color: "#64748b" }}>
                Primero selecciona un plan para habilitar los medidores.
              </p>
            ) : (
              <>
                <p style={{ marginTop: 0, color: "#64748b" }}>
                  Plan {PLAN_CONFIG[cart.plan].label}: puedes agregar hasta {maxMeters} medidor(es).
                </p>

                <div style={{ display: "grid", gap: "12px" }}>
                  {meterRows.map((meter) => (
                    <article
                      key={`meter-${meter.type}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "12px",
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                        <div>
                          <strong>{meter.label}</strong>
                          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                            {meter.description}
                          </p>
                        </div>
                        <strong>{money(meter.price)}</strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setMeterQty(meter.type, meter.qty - 1)}
                          disabled={meter.qty <= 0}
                          style={qtyBtn}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={maxMeters}
                          value={meter.qty}
                          onChange={(e) => setMeterQty(meter.type, Number(e.target.value))}
                          style={qtyInput}
                        />
                        <button
                          type="button"
                          onClick={() => setMeterQty(meter.type, meter.qty + 1)}
                          disabled={meter.disablePlus}
                          style={qtyBtn}
                        >
                          +
                        </button>
                        <span style={{ marginLeft: "auto", fontWeight: 700 }}>
                          Subtotal: {money(meter.subtotal)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <aside style={boxStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "20px" }}>Resumen</h2>
          <div style={summaryRow}>
            <span>Plan</span>
            <strong>{cart.plan ? PLAN_CONFIG[cart.plan].label : "Sin seleccionar"}</strong>
          </div>
          <div style={summaryRow}>
            <span>Maximo medidores</span>
            <strong>{cart.plan ? maxMeters : "-"}</strong>
          </div>
          <div style={summaryRow}>
            <span>Seleccionados</span>
            <strong>
              {selectedMeters}{cart.plan ? ` / ${maxMeters}` : ""}
            </strong>
          </div>
          <div style={summaryRow}>
            <span>EcoWatt Plug</span>
            <strong>{cart.meters.plug}</strong>
          </div>
          <div style={summaryRow}>
            <span>EcoWatt Panel</span>
            <strong>{cart.meters.panel}</strong>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />

          <div style={summaryRow}>
            <span>Suscripcion mensual</span>
            <strong>{money(planPrice)}</strong>
          </div>
          <div style={summaryRow}>
            <span>Hardware</span>
            <strong>{money(hardwareTotal)}</strong>
          </div>
          <div style={{ ...summaryRow, fontSize: "16px" }}>
            <strong>Total inicial</strong>
            <strong>{money(total)}</strong>
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            <Link
              href={canContinue ? "/checkout" : "#"}
              style={canContinue ? btnPrimary : btnDisabled}
              onClick={(e) => {
                if (!canContinue) {
                  e.preventDefault();
                  setNotice("Selecciona plan y al menos 1 medidor para continuar al Paso 3.");
                }
              }}
            >
              Ir al Paso 3
            </Link>

            <button type="button" onClick={clearSelection} style={btnSecondary}>
              Limpiar medidores
            </button>

            <Link href="/planes" style={btnSecondaryLink}>
              Volver a planes
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#fff",
  padding: "16px",
};

const stepBadge: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  color: "#334155",
  background: "#f8fafc",
};

const selectedChip: React.CSSProperties = {
  borderRadius: "999px",
  padding: "2px 8px",
  fontSize: "11px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 700,
};

const noticeStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#9f1239",
  borderRadius: "10px",
  padding: "10px 12px",
  marginBottom: "16px",
};

const summaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "8px",
  color: "#334155",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-block",
  textAlign: "center",
  border: "none",
  borderRadius: "12px",
  padding: "12px 14px",
  background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
  color: "#111827",
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: "#cbd5e1",
  color: "#64748b",
  cursor: "not-allowed",
};

const btnSecondary: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  background: "#fff",
  color: "#0f172a",
  padding: "10px 12px",
  cursor: "pointer",
};

const btnSecondaryLink: React.CSSProperties = {
  ...btnSecondary,
  textAlign: "center",
  textDecoration: "none",
  display: "inline-block",
};

const qtyBtn: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: 1,
};

const qtyInput: React.CSSProperties = {
  width: "86px",
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  textAlign: "center",
};
