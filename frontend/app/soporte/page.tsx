"use client";

import { useState } from "react";
import Link from "next/link";

export default function SoportePage() {
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviado(true);
  }

  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* TÍTULO */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <h1 style={{ fontSize: "44px", marginBottom: "10px" }}>Soporte</h1>
        <p style={{ color: "#555", margin: 0, lineHeight: 1.6 }}>
          Estamos para ayudarte. Enviá tu consulta o revisá las preguntas frecuentes.
        </p>
      </div>

      {/* FORMULARIO */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: "16px",
          padding: "22px",
          backgroundColor: "white",
          marginBottom: "44px",
        }}
      >
        <h2 style={{ fontSize: "22px", marginTop: 0, marginBottom: "14px" }}>
          Enviar una consulta
        </h2>

        {enviado && (
          <div
            style={{
              border: "1px solid rgba(34,197,94,0.35)",
              backgroundColor: "rgba(34,197,94,0.12)",
              padding: "12px 14px",
              borderRadius: "12px",
              marginBottom: "16px",
              color: "#166534",
            }}
          >
            ¡Gracias! Recibimos tu mensaje y te responderemos a la brevedad.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            {/* Nombre */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#333" }}>
                Nombre y apellido *
              </label>
              <input
                required
                type="text"
                placeholder="Ej: Juan Pérez"
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#333" }}>Email *</label>
              <input
                required
                type="email"
                placeholder="Ej: juan@mail.com"
                style={inputStyle}
              />
            </div>

            {/* Motivo */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#333" }}>Motivo *</label>
              <select required style={inputStyle as React.CSSProperties} defaultValue="">
                <option value="" disabled>
                  Seleccioná una opción
                </option>
                <option>Planes</option>
                <option>Producto / Instalación</option>
                <option>Cuenta / Login</option>
                <option>Problemas técnicos</option>
                <option>Facturación</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          {/* Mensaje */}
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", color: "#333" }}>Mensaje *</label>
            <textarea
              required
              placeholder="Contanos tu consulta con el mayor detalle posible..."
              rows={6}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          {/* Botón */}
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                color: "white",
                background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                fontWeight: 600,
              }}
            >
              Enviar consulta
            </button>
          </div>
        </form>
      </div>

      {/* FAQ */}
      <div>
        <h2 style={{ fontSize: "22px", marginTop: 0, marginBottom: "14px" }}>
          Preguntas frecuentes
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <FAQ
            q="¿Qué es EcoWatt y qué mide?"
            a="EcoWatt permite monitorear el consumo energético de tus dispositivos, visualizar el consumo en tiempo real y analizar históricos para entender hábitos y reducir el gasto energético."
          />
          <FAQ
            q="¿Cómo se instala el dispositivo?"
            a="EcoWatt se instala de forma sencilla. El dispositivo se conecta al punto de medición y luego se vincula desde la plataforma para comenzar a registrar el consumo."
          />
          <FAQ
            q="¿Puedo ver el consumo en tiempo real?"
            a="Sí. EcoWatt muestra el consumo en vivo y permite observar cómo varía el gasto energético al encender o apagar un dispositivo."
          />
          <FAQ
            q="¿Qué información histórica puedo consultar?"
            a="Podés acceder a gráficos de consumo por día, semana y mes. El nivel de detalle disponible depende del plan contratado."
          />
          <FAQ
            q="¿Cuántos dispositivos puedo monitorear?"
            a="La cantidad de dispositivos que podés monitorear depende del plan elegido (Básico, Avanzado o Premium). Cada plan establece un límite diferente."
          />
          <FAQ
            q="¿Necesito conexión a internet para usar EcoWatt?"
            a="Sí. La conexión a internet es necesaria para visualizar los datos en la plataforma y mantener la información actualizada."
          />
          <FAQ
            q="¿Cómo cambio de plan?"
            a="El cambio de plan se realiza desde la sección Planes, donde podés seleccionar la opción que mejor se adapte a tus necesidades."
          />
          <FAQ
            q="Tengo un problema técnico, ¿cómo me contacto?"
            a="Podés comunicarte con el equipo de soporte a través del formulario de esta página, seleccionando el motivo correspondiente y detallando el inconveniente."
          />
        </div>
      </div>

      {/* Botón volver */}
      <div style={{ marginTop: "44px", textAlign: "center" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 18px",
            borderRadius: "10px",
            border: "1px solid #ddd",
            textDecoration: "none",
            color: "black",
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

/* ---------- estilos reutilizables ---------- */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  outline: "none",
  fontSize: "14px",
};

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: "14px",
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "14px 14px",
          background: "white",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          fontSize: "15px",
          fontWeight: 600,
        }}
      >
        <span>{q}</span>
        <span style={{ fontSize: "18px", lineHeight: 1 }}>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px", color: "#555", lineHeight: 1.6 }}>
          {a}
        </div>
      )}
    </div>
  );
}