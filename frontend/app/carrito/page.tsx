"use client";

import { useEffect, useMemo, useState } from "react";

type PlanId = "basico" | "avanzado" | "premium";

type CartItem = {
  id: PlanId;
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

function getPlanFromUrl(): PlanId | null {
  // Solo corre en el navegador (Client Component)
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");

  if (plan === "basico" || plan === "avanzado" || plan === "premium") return plan;
  return null;
}

export default function CarritoPage() {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];

    const raw = localStorage.getItem(STORAGE_KEY);
    let cart: CartItem[] = [];
    try {
      cart = raw ? JSON.parse(raw) : [];
    } catch {
      // Invalid JSON in storage, start fresh
      cart = [];
    }

    const planFromUrl = getPlanFromUrl();
    if (!planFromUrl) return cart;

    const plan = PLANES[planFromUrl];
    const existe = cart.some((item) => item.id === plan.id);

    return existe
      ? cart.map((item) =>
          item.id === plan.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      : [...cart, { ...plan, cantidad: 1 }];
  });

  // Persist the initial cart update from URL to localStorage
  useEffect(() => {
    const planFromUrl = getPlanFromUrl();
    if (planFromUrl) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Silently fail if localStorage is not available
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function guardar(nuevo: CartItem[]) {
    setItems(nuevo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
  }

  function setCantidad(id: PlanId, cantidad: number) {
    const qty = Math.max(1, Math.min(99, cantidad));
    const nuevo = items.map((x) => (x.id === id ? { ...x, cantidad: qty } : x));
    guardar(nuevo);
  }

  function sumar(id: PlanId) {
    const nuevo = items.map((x) =>
      x.id === id ? { ...x, cantidad: Math.min(99, x.cantidad + 1) } : x
    );
    guardar(nuevo);
  }

  function restar(id: PlanId) {
    const nuevo = items
      .map((x) => (x.id === id ? { ...x, cantidad: x.cantidad - 1 } : x))
      .filter((x) => x.cantidad > 0);
    guardar(nuevo);
  }

  function eliminar(id: PlanId) {
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
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "40px", marginBottom: "10px" }}>
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
          <div style={{ marginTop: "14px" }}>
            <a
              href="/planes"
              style={{
                display: "inline-block",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                textDecoration: "none",
                color: "black",
              }}
            >
              Ver planes
            </a>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {/* TABLA IZQUIERDA */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: "16px",
              background: "white",
              overflow: "hidden",
            }}
          >
            {/* Header de tabla */}
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
              <div>PLAN</div>
              <div style={{ textAlign: "right" }}>PRECIO</div>
              <div style={{ textAlign: "center" }}>CANTIDAD</div>
              <div style={{ textAlign: "right" }}>SUBTOTAL</div>
            </div>

            {/* Filas */}
            {items.map((item) => {
              const subtotal = item.precio * item.cantidad;
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
                  {/* Plan + borrar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => eliminar(item.id)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "999px",
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                      }}
                      title="Eliminar"
                      aria-label="Eliminar"
                    >
                      ×
                    </button>
                    <div style={{ fontWeight: 700 }}>{item.nombre}</div>
                  </div>

                  {/* Precio */}
                  <div style={{ textAlign: "right" }}>${item.precio}</div>

                  {/* Cantidad */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => restar(item.id)}
                      style={qtyBtn}
                      aria-label="Restar"
                      title="Restar"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={item.cantidad}
                      onChange={(e) =>
                        setCantidad(item.id, Number(e.target.value))
                      }
                      style={{
                        width: "64px",
                        padding: "10px",
                        borderRadius: "12px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => sumar(item.id)}
                      style={qtyBtn}
                      aria-label="Sumar"
                      title="Sumar"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div style={{ textAlign: "right", fontWeight: 700 }}>
                    ${subtotal}
                  </div>
                </div>
              );
            })}

            {/* Acciones abajo */}
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <a
                href="/planes"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  textDecoration: "none",
                  color: "black",
                  background: "white",
                }}
              >
                Seguir viendo planes
              </a>

              <button
                type="button"
                onClick={vaciar}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Vaciar carrito
              </button>
            </div>
          </div>

          {/* TOTALES DERECHA */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: "16px",
              background: "white",
              padding: "16px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "14px",
                fontSize: "18px",
              }}
            >
              Totales del carrito
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#555",
              }}
            >
              <span>Total parcial</span>
              <span>${totalParcial}</span>
            </div>

            <div
              style={{
                marginTop: "10px",
                borderTop: "1px solid #eee",
                paddingTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
              }}
            >
              <span>Total</span>
              <span>${totalParcial}</span>
            </div>

            <a
              href="/checkout"
              style={{
                marginTop: "14px",
                display: "block",
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: "12px",
                color: "black",
                textDecoration: "none",
                background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
                fontWeight: 700,
              }}
            >
              Continuar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: 1,
};
