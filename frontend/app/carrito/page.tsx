"use client";

import { useEffect, useMemo, useState } from "react";

type PlanId = "basico" | "avanzado" | "premium";
type ItemId = PlanId | "dispositivo";

type CartItem = {
  id: ItemId;
  nombre: string;
  precio: number;
  cantidad: number;
};

const STORAGE_KEY = "ecowatt_cart_v2";

// Podés cambiar precios cuando quieras
const PLANES: Record<PlanId, { id: PlanId; nombre: string; precio: number }> = {
  basico: { id: "basico", nombre: "Plan Básico", precio: 1500 },
  avanzado: { id: "avanzado", nombre: "Plan Avanzado", precio: 2900 },
  premium: { id: "premium", nombre: "Plan Premium", precio: 4500 },
};

// ✅ Producto individual (EcoWatt solo)
const DISPOSITIVO = {
  id: "dispositivo" as const,
  nombre: "EcoWatt (dispositivo)",
  precio: 12000,
};

function getQueryParams(): { plan: PlanId | null; item: "dispositivo" | null } {
  if (typeof window === "undefined") return { plan: null, item: null };

  const params = new URLSearchParams(window.location.search);

  const plan = params.get("plan");
  const item = params.get("item");

  const validPlan: PlanId | null =
    plan === "basico" || plan === "avanzado" || plan === "premium" ? plan : null;

  const validItem: "dispositivo" | null = item === "dispositivo" ? "dispositivo" : null;

  return { plan: validPlan, item: validItem };
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n);
}

export default function CarritoPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  // Responsive detector
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 900);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 1) cargar carrito guardado
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      setItems([]);
    }
  }, []);

  // 2) si viene ?plan=... o ?item=dispositivo -> sumar 1 (o agregar si no existe)
  useEffect(() => {
    const { plan, item } = getQueryParams();
    if (!plan && !item) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const cart: CartItem[] = raw ? JSON.parse(raw) : [];

    let toAdd: { id: ItemId; nombre: string; precio: number } | null = null;

    if (plan) toAdd = PLANES[plan];
    if (item === "dispositivo") toAdd = DISPOSITIVO;

    if (!toAdd) return;

    const idx = cart.findIndex((x) => x.id === toAdd.id);
    let nuevo: CartItem[];

    if (idx >= 0) {
      nuevo = cart.map((x) =>
        x.id === toAdd!.id ? { ...x, cantidad: Math.min(99, x.cantidad + 1) } : x
      );
    } else {
      nuevo = [...cart, { ...toAdd, cantidad: 1 }];
    }

    setItems(nuevo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));

    // limpiar query para evitar duplicar al refrescar
    window.history.replaceState({}, "", "/carrito");
  }, []);

  function guardar(nuevo: CartItem[]) {
    setItems(nuevo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
  }

  function setCantidad(id: ItemId, cantidad: number) {
    const qty = Math.max(1, Math.min(99, Number.isFinite(cantidad) ? cantidad : 1));
    const nuevo = items.map((x) => (x.id === id ? { ...x, cantidad: qty } : x));
    guardar(nuevo);
  }

  function eliminar(id: ItemId) {
    guardar(items.filter((x) => x.id !== id));
  }

  function vaciar() {
    guardar([]);
  }

  const totalParcial = useMemo(
    () => items.reduce((acc, x) => acc + x.precio * x.cantidad, 0),
    [items]
  );

  return (
    <div
      style={{
        padding: isMobile ? "18px" : "40px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: isMobile ? "28px" : "40px", marginBottom: "10px" }}>
        Revisá tu carrito
      </h1>
      <p style={{ color: "#555", marginTop: 0, marginBottom: "26px" }}>
        Podés ajustar cantidades y ver el subtotal.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: "14px",
            padding: "18px",
            background: "white",
          }}
        >
          <p style={{ margin: 0 }}>Tu carrito está vacío.</p>
          <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a href="/planes" style={secondaryBtn}>
              Ver planes
            </a>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 360px",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {/* ITEMS */}
          <div style={box}>
            {/* Header “tabla” solo desktop */}
            {!isMobile && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 170px 120px",
                  padding: "14px 16px",
                  borderBottom: "1px solid #eee",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  color: "#555",
                }}
              >
                <div>ITEM</div>
                <div style={{ textAlign: "right" }}>PRECIO</div>
                <div style={{ textAlign: "center" }}>CANTIDAD</div>
                <div style={{ textAlign: "right" }}>SUBTOTAL</div>
              </div>
            )}

            {/* Filas / cards */}
            <div style={{ padding: isMobile ? "0" : "0" }}>
              {items.map((item) => {
                const subtotal = item.precio * item.cantidad;

                // ✅ MOBILE: item como “card”
                if (isMobile) {
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid #f2f2f2",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => eliminar(item.id)}
                          style={removeBtn}
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          ×
                        </button>
                        <div style={{ fontWeight: 800 }}>{item.nombre}</div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ color: "#666", fontSize: "13px" }}>Precio</div>
                        <div style={{ textAlign: "right", fontWeight: 700 }}>{money(item.precio)}</div>

                        <div style={{ color: "#666", fontSize: "13px" }}>Cantidad</div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={item.cantidad}
                            onChange={(e) => setCantidad(item.id, Number(e.target.value))}
                            style={qtyInput}
                          />
                        </div>

                        <div style={{ color: "#666", fontSize: "13px" }}>Subtotal</div>
                        <div style={{ textAlign: "right", fontWeight: 800 }}>{money(subtotal)}</div>
                      </div>
                    </div>
                  );
                }

                // ✅ DESKTOP: tabla
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 170px 120px",
                      padding: "16px",
                      borderBottom: "1px solid #f2f2f2",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => eliminar(item.id)}
                        style={removeBtn}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        ×
                      </button>
                      <div style={{ fontWeight: 800 }}>{item.nombre}</div>
                    </div>

                    <div style={{ textAlign: "right" }}>{money(item.precio)}</div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={item.cantidad}
                        onChange={(e) => setCantidad(item.id, Number(e.target.value))}
                        style={qtyInput}
                      />
                    </div>

                    <div style={{ textAlign: "right", fontWeight: 800 }}>{money(subtotal)}</div>
                  </div>
                );
              })}
            </div>

            {/* Acciones abajo */}
            <div style={{ padding: "14px 16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a href="/planes" style={secondaryBtn}>
                Seguir viendo planes
              </a>

              <button type="button" onClick={vaciar} style={secondaryBtnAsButton}>
                Vaciar carrito
              </button>
            </div>
          </div>

          {/* TOTALES */}
          <div style={box}>
            <h2 style={{ marginTop: 0, marginBottom: "14px", fontSize: "18px" }}>
              Totales del carrito
            </h2>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}>
              <span>Total parcial</span>
              <span>{money(totalParcial)}</span>
            </div>

            <div
              style={{
                marginTop: "10px",
                borderTop: "1px solid #eee",
                paddingTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
              }}
            >
              <span>Total</span>
              <span>{money(totalParcial)}</span>
            </div>

            <a href="/checkout" style={primaryLinkBtn}>
              Continuar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Styles ================= */

const box: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: "16px",
  background: "white",
  overflow: "hidden",
};

const removeBtn: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: 1,
};

const qtyInput: React.CSSProperties = {
  width: "76px",
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  textAlign: "center",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  textDecoration: "none",
  color: "black",
  background: "white",
};

const secondaryBtnAsButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};

const primaryLinkBtn: React.CSSProperties = {
  marginTop: "14px",
  display: "block",
  textAlign: "center",
  padding: "12px 14px",
  borderRadius: "12px",
  color: "black",
  textDecoration: "none",
  background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
  fontWeight: 800,
};