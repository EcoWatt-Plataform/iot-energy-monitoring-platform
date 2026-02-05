"use client";

import { useMemo, useState } from "react";

const HERO_IMG = "/banner1.jpeg"; 

type Slide = {
  id: number;
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  showGraphs?: boolean;
  graphs?: { src: string; style?: React.CSSProperties }[];
};

export default function HomePage() {
  const slides: Slide[] = useMemo(
    () => [
      {
        id: 1,
        title: "Te ayudamos a entender y ahorrar",
        subtitle: "Realizá un seguimiento del consumo energético.",
        primaryCta: { label: "Leer más", href: "/producto" },
        showGraphs: false,
      },
      {
        id: 2,
        title: "Ahorrá más con el Plan Premium",
        subtitle:
          "Accedé a análisis avanzados, alertas y comparaciones para optimizar tu consumo.",
        primaryCta: { label: "Ver plan", href: "/planes/premium" },
        showGraphs: true,
      },
      {
        id: 3,
        title: "Históricos claros y alertas inteligentes",
        subtitle:
          "Compará días, semanas y meses y detectá consumos anómalos a tiempo.",
        primaryCta: { label: "Abrir dashboard", href: "/dashboard" },
        secondaryCta: { label: "Ver planes", href: "/planes" },
        showGraphs: true,
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

        {/* Capa opcional para mejorar lectura del texto (muy suave) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.00) 20%, rgba(0,0,0,0.06) 60%, rgba(0,0,0,0.10) 100%)",
          }}
        />

        {/* Contenido del slide (derecha) */}
        <div
          style={{
            position: "absolute",
            right: "6%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(520px, 92%)",
            color: "white",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "52px", lineHeight: 1.05 }}>
            {current.title}
          </h1>

          <p style={{ marginTop: "16px", fontSize: "20px", lineHeight: 1.5 }}>
            {current.subtitle}
          </p>

          <a
            href="/producto"
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
              color: "black",
              textDecoration: "none",
            }}
          >
            Leer más
          </a>
          
        </div>
      </section>
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
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.65)",
    cursor: "pointer",
    fontSize: "34px",
    lineHeight: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}