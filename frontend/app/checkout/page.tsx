"use client";

import { useEffect, useMemo, useState } from "react";

type PlanId = "basico" | "avanzado" | "premium";

type CartItem = {
  id: PlanId;
  nombre: string;  
  precio: number;
  cantidad: number;
};

const CART_KEY = "ecowatt_cart_v2";
const CHECKOUT_KEY = "ecowatt_checkout_draft_v1";

const MAX_DEVICES_BY_PLAN: Record<PlanId, number> = {
  basico: 1,
  avanzado: 5,
  premium: 20,
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  // Datos comprador
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Config dispositivos
  const [devicesCount, setDevicesCount] = useState(1);
  const [deviceNames, setDeviceNames] = useState<string[]>([""]);

  // UI
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Cargar carrito desde localStorage
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

  // Plan principal (por ahora: 1 plan por compra, el primero del carrito)
  const primaryPlan: PlanId | null = useMemo(() => {
    if (!cart.length) return null;
    return cart[0].id;
  }, [cart]);

  const maxDevices = useMemo(() => {
    if (!primaryPlan) return 1;
    return MAX_DEVICES_BY_PLAN[primaryPlan];
  }, [primaryPlan]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, x) => acc + x.precio * x.cantidad, 0);
  }, [cart]);

  // Mantener devicesCount dentro del límite del plan
  useEffect(() => {
    setDevicesCount((prev) => {
      const next = Math.max(1, Math.min(maxDevices, prev));
      return next;
    });
  }, [maxDevices]);

  // Ajustar array de nombres cuando cambia devicesCount
  useEffect(() => {
    setDeviceNames((prev) => {
      const next = [...prev];
      if (next.length < devicesCount) {
        while (next.length < devicesCount) next.push("");
      } else if (next.length > devicesCount) {
        next.length = devicesCount;
      }
      return next;
    });
  }, [devicesCount]);

  function updateDeviceName(i: number, value: string) {
    setDeviceNames((prev) => prev.map((x, idx) => (idx === i ? value : x)));
  }

  function validate() {
    setErr(null);
    setOkMsg(null);

    if (!cart.length) return "Tu carrito está vacío. Volvé a Planes.";
    if (!fullName.trim()) return "Completá tu nombre y apellido.";
    if (!email.trim()) return "Completá tu email.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "El email no parece válido.";

    // dispositivos
    if (devicesCount < 1 || devicesCount > maxDevices) {
      return `La cantidad de dispositivos debe estar entre 1 y ${maxDevices}.`;
    }
    for (let i = 0; i < deviceNames.length; i++) {
      if (!deviceNames[i].trim()) return `Completá el nombre del dispositivo ${i + 1}.`;
    }

    // regla simple: 1 plan por compra/cuenta
    if (cart.length > 1) {
      return "Por ahora, solo se permite comprar 1 plan por cuenta (te quedó más de un plan en el carrito).";
    }
    if (cart[0].cantidad > 1) {
      return "Por ahora, solo se permite cantidad 1 del plan (una cuenta por compra).";
    }

    return null;
  }

  function onSubmit() {
    const msg = validate();
    if (msg) {
      setErr(msg);
      return;
    }

    const payload = {
      buyer: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || null },
      cart,
      plan: primaryPlan,
      devices: deviceNames.map((n) => ({ name: n.trim() })),
      totals: { subtotal },
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(payload));

    setOkMsg("Listo, guardamos tu pedido. Siguiente paso: pagar.");
  }

  if (loadingCart) {
    return (
      <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
        Cargando checkout...
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "40px", marginBottom: "10px" }}>Checkout</h1>
      <p style={{ color: "#555", marginTop: 0, marginBottom: "26px" }}>
        Completá tus datos y configurá tus dispositivos.
      </p>

      {err && (
        <div
          style={{
            border: "1px solid #ffb3b3",
            background: "#ffecec",
            padding: "12px",
            borderRadius: "12px",
            marginBottom: "14px",
          }}
        >
          {err}
        </div>
      )}

      {okMsg && (
        <div
          style={{
            border: "1px solid #b7f0c2",
            background: "#ecfff0",
            padding: "12px",
            borderRadius: "12px",
            marginBottom: "14px",
          }}
        >
          {okMsg}
          <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a href="/dashboard" style={linkBtn}>
              Ir a Dashboard
            </a>
            <a href="/planes" style={secondaryLinkBtn}>
              Volver a Planes
            </a>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "18px",
          alignItems: "start",
        }}
      >
        {/* IZQUIERDA: FORM */}
        <div style={box}>
          <h2 style={{ marginTop: 0, marginBottom: "14px", fontSize: "18px" }}>Tus datos</h2>

          <Field label="Nombre y apellido">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={input}
              placeholder="Ej: Valentina Peirano"
            />
          </Field>

          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
              placeholder="Ej: vale@mail.com"
            />
          </Field>

          <Field label="Teléfono (opcional)">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={input}
              placeholder="Ej: +54 11 1234-5678"
            />
          </Field>

          <div style={{ height: "1px", background: "#eee", margin: "18px 0" }} />

          <h2 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>
            Configuración de dispositivos
          </h2>
          <p style={{ marginTop: 0, marginBottom: "14px", color: "#666" }}>
            Límite según plan: <b>{primaryPlan ? MAX_DEVICES_BY_PLAN[primaryPlan] : 1}</b>
          </p>

          <Field label="Cantidad de dispositivos">
            <input
              type="number"
              min={1}
              max={maxDevices}
              value={devicesCount}
              onChange={(e) => setDevicesCount(Number(e.target.value))}
              style={input}
            />
          </Field>

          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {deviceNames.map((v, i) => (
              <Field key={i} label={`Dispositivo ${i + 1}`}>
                <input
                  value={v}
                  onChange={(e) => updateDeviceName(i, e.target.value)}
                  style={input}
                  placeholder="Ej: Heladera"
                />
              </Field>
            ))}
          </div>

          <button type="button" onClick={onSubmit} style={primaryBtn}>
            Continuar
          </button>

          <div style={{ marginTop: "12px" }}>
            <a href="/carrito" style={secondaryLinkBtn}>
              Volver al carrito
            </a>
          </div>
        </div>

        {/* DERECHA: RESUMEN */}
        <div style={box}>
          <h2 style={{ marginTop: 0, marginBottom: "14px", fontSize: "18px" }}>
            Resumen
          </h2>

          {!cart.length ? (
            <p style={{ margin: 0, color: "#666" }}>Tu carrito está vacío.</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {cart.map((x) => (
                <div
                  key={x.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    borderBottom: "1px solid #eee",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{x.nombre}</div>
                    <div style={{ color: "#666", fontSize: "14px" }}>Cantidad: {x.cantidad}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{money(x.precio * x.cantidad)}</div>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span style={{ color: "#666" }}>Subtotal</span>
                <span style={{ fontWeight: 800 }}>{money(subtotal)}</span>
              </div>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
}

/* ================= UI Helpers ================= */

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", color: "#666" }}>{props.label}</label>
      {props.children}
    </div>
  );
}

const box: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: "16px",
  background: "white",
  padding: "16px",
};

const input: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px 12px",
};

const primaryBtn: React.CSSProperties = {
  marginTop: "18px",
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
  color: "white",
  background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
};

const linkBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  color: "white",
  background: "black",
};

const secondaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  color: "black",
  border: "1px solid #ddd",
  background: "white",
};