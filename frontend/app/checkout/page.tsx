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

const CART_KEY = "ecowatt_cart_v2";
const CHECKOUT_KEY = "ecowatt_checkout_draft_v1";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n);
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  // Responsive detector
  const [isMobile, setIsMobile] = useState(false);

  // Datos comprador
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [usageDetails, setUsageDetails] = useState("");

  // =============================
  // DETECTAR MOBILE
  // =============================
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 900);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // =============================
  // CARGAR CARRITO
  // =============================
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const items: CartItem[] = raw ? JSON.parse(raw) : [];
      setCart(Array.isArray(items) ? items : []);
    } catch {
      setCart([]);
    } finally {
      setLoadingCart(false);
    }
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, x) => acc + x.precio * x.cantidad, 0);
  }, [cart]);

  // =============================
  // VALIDACION
  // =============================
  function validate() {
    setErr(null);
    setOkMsg(null);

    if (!cart.length) return "Tu carrito está vacío.";
    if (!fullName.trim()) return "Completá tu nombre.";
    if (!email.trim()) return "Completá tu email.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return "El email no es válido.";

    return null;
  }

  function onSubmit() {
    const msg = validate();
    if (msg) {
      setErr(msg);
      return;
    }

    const payload = {
      buyer: {
        fullName: fullName.trim(),
        email: email.trim(),
        usageDetails: usageDetails.trim(),
      },
      cart,
      totals: { subtotal },
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(payload));
    setOkMsg("Pedido guardado correctamente.");
  }

  if (loadingCart) {
    return (
      <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
        Cargando checkout...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? "18px" : "40px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: isMobile ? "28px" : "40px", marginBottom: "20px" }}>
        Checkout
      </h1>

      {err && (
        <div
          style={{
            background: "#ffecec",
            border: "1px solid #ffb3b3",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "14px",
          }}
        >
          {err}
        </div>
      )}

      {okMsg && (
        <div
          style={{
            background: "#ecfff0",
            border: "1px solid #b7f0c2",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "14px",
          }}
        >
          {okMsg}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 360px",
          gap: "18px",
          alignItems: "start",
        }}
      >
        {/* FORM */}
        <div style={box}>
          <h2 style={{ marginTop: 0, marginBottom: "14px" }}>
            Tus datos
          </h2>

          <Field label="Nombre y apellido">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={input}
            />
          </Field>

          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
          </Field>

          <Field label="¿Para qué y dónde lo vas a usar?">
            <textarea
              value={usageDetails}
              onChange={(e) => setUsageDetails(e.target.value)}
              placeholder="Ej: Cocina y living del local, heladera, horno eléctrico, iluminación..."
              style={{
                ...input,
                minHeight: "100px",
                resize: "vertical",
              }}
            />
          </Field>

          <button onClick={onSubmit} style={primaryBtn}>
            Continuar
          </button>
        </div>

        {/* RESUMEN */}
        <div style={box}>
          <h2 style={{ marginTop: 0, marginBottom: "14px" }}>
            Resumen
          </h2>

          {!cart.length ? (
            <p style={{ margin: 0, color: "#666" }}>
              Tu carrito está vacío.
            </p>
          ) : (
            <>
              {cart.map((x) => (
                <div
                  key={x.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    borderBottom: "1px solid #eee",
                    paddingBottom: "8px",
                  }}
                >
                  <span>
                    {x.nombre} x{x.cantidad}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {money(x.precio * x.cantidad)}
                  </span>
                </div>
              ))}

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: 800,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Total</span>
                <span>{money(subtotal)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= UI Helpers ================= */

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "13px", color: "#555" }}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

const box: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: "16px",
  padding: "20px",
  background: "white",
};

const input: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  width: "100%",
  fontSize: "16px",
};

const primaryBtn: React.CSSProperties = {
  marginTop: "18px",
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  color: "white",
  background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
};