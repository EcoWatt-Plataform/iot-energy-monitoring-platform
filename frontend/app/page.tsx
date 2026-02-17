"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
const HERO_IMG = "/banner1.jpeg";

type Slide = {
  id: number;
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export default function HomePage() {
  const slides: Slide[] = useMemo(
    () => [
      {
        id: 1,
        title: "Te ayudamos a entender y ahorrar",
        subtitle: "Realizá un seguimiento del consumo energético.",
        primaryCta: { label: "Leer más", href: "/producto" },
      },
      {
        id: 2,
        title: "Históricos claros y alertas inteligentes",
        subtitle: "Compará días, semanas y meses y detectá consumos anómalos a tiempo.",
        primaryCta: { label: "Abrir dashboard", href: "/dashboard" },
        secondaryCta: { label: "Ver planes", href: "/planes" },
      },
      {
        id: 3,
        title: "Ahorrá más con el Plan Premium",
        subtitle: "Accedé a análisis avanzados, alertas y comparaciones para optimizar tu consumo.",
        primaryCta: { label: "Ver plan", href: "/planes/premium" },
      },
    ],
    []
  );

  const [index, setIndex] = useState(0);
  const current = slides[index];

  function prev() {
    setIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
  }

  function next() {
    setIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
  }

  return (
    <div>
      {/* ================= HERO FULL SCREEN (SLIDER) ================= */}
      <section
        style={{
          position: "relative",
          borderRadius: "24px",
          height: "calc(100vh + 64px)",
          width: "100%",
          overflow: "hidden",
          marginTop: "-84px",
        }}
      >
        {/* Imagen de fondo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('${HERO_IMG}')`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.02)",
          }}
        />

        {/* Overlay suave para que el texto se lea */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.25) 100%)",
          }}
        />

        {/* Contenido del slide (derecha) */}
        <div
          style={{
            position: "absolute",
            right: "6%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(560px, 92%)",
            color: "white",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "52px", lineHeight: 1.05 }}>
            {current.title}
          </h1>

          <p style={{ marginTop: "16px", fontSize: "20px", lineHeight: 1.5 }}>
            {current.subtitle}
          </p>

          <div style={{ marginTop: "22px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href={current.primaryCta.href}
              style={{
                display: "inline-block",
                padding: "12px 16px",
                borderRadius: "12px",
                textDecoration: "none",
                color: "white",
                background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
                fontWeight: 700,
              }}
            >
              {current.primaryCta.label}
            </a>

            {current.secondaryCta ? (
              <a
                href={current.secondaryCta.href}
                style={{
                  display: "inline-block",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.6)",
                  background: "rgba(0,0,0,0.25)",
                  fontWeight: 700,
                }}
              >
                {current.secondaryCta.label}
              </a>
            ) : null}
          </div>
        </div>

        {/* Flechas */}
        <button type="button" onClick={prev} aria-label="Anterior" style={arrowBtn("left")}>
          ‹
        </button>
        <button type="button" onClick={next} aria-label="Siguiente" style={arrowBtn("right")}>
          ›
        </button>

        {/* Dots */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "18px",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
          }}
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir al slide ${s.id}`}
              style={{
                width: i === index ? "26px" : "10px",
                height: "10px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                backgroundColor: i === index ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                transition: "all 160ms ease",
              }}
            />
          ))}
        </div>
      </section>

      {/* ================= CONTENIDO ABAJO ================= */}
      <div style={{ padding: "40px" }}>
        <div style={{ marginTop: "70px" }}>
          <h2 style={{ fontSize: "34px", textAlign: "center", marginBottom: "10px" }}>
            Cómo funciona
          </h2>

          <div
            style={{
              width: "110px",
              height: "6px",
              margin: "14px auto 12px",
              borderRadius: "999px",
              background: "linear-gradient(90deg, transparent, #6992eb, #9b6ceb, transparent)",
              filter: "blur(0.2px)",
            }}
          />

          <p style={{ textAlign: "center", color: "#666", marginTop: 0, marginBottom: "28px" }}>
            Solo 3 pasos para empezar a ahorrar energía.
          </p>

          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <StepCard
              title="Conectá el dispositivo"
              img="/conecta.jpeg"
              alt="Conectá el dispositivo"
              text="Conectá EcoWatt al enchufe del equipo que querés monitorear."
            />

            <ArrowBetween />

            <StepCard
              title="Medí en tiempo real"
              img="/medicion.jpeg"
              alt="Medición de consumo"
              text="Visualizá cuánta energía consume cada dispositivo."
            />

            <ArrowBetween />

            <StepCard
              title="Analizá y ahorrá"
              img="/analiza.jpeg"
              alt="Analizá y ahorrá"
              text="Consultá históricos y tomá decisiones para reducir tu consumo."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Helpers ================= */

function StepCard(props: { title: string; img: string; alt: string; text: string }) {
  const { title, img, alt, text } = props;

  return (
    <div
      style={{
        width: "320px",
        border: "1px solid #eee",
        borderRadius: "18px",
        padding: "18px",
        background: "white",
        textAlign: "center",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: "10px", fontSize: "18px" }}>{title}</h3>

      <img
        src={img}
        alt={alt}
        style={{
          width: "100%",
          height: "180px",
          objectFit: "cover",
          borderRadius: "14px",
          marginBottom: "12px",
        }}
      />

      <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

function ArrowBetween() {
  return (
    <div
      aria-hidden
      style={{
        fontSize: "30px",
        color: "rgba(77, 73, 73, 0.35)",
        userSelect: "none",
        padding: "0 6px",
      }}
    >
      &gt;
    </div>
  );
}

function arrowBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    ...(side === "left" ? { left: "18px" } : { right: "18px" }),
    width: "46px",
    height: "46px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    cursor: "pointer",
    fontSize: "34px",
    lineHeight: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}