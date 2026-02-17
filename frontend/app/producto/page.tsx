import Link from "next/link";

export default function ProductoPage() {
  return (
    <div>
      {/* BARRA STICKY (solo /producto) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "white",
          borderBottom: "1px solid #eee",
          padding: "12px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "0 16px",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>EcoWatt Socket</div>
          </div>

          <Link
            href="/planes"
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "black",
              color: "white",
              cursor: "pointer",
            }}
          >
            Ver planes
          </Link>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div style={{ padding: "40px" }}>
        {/* TÍTULO DE LA PÁGINA (centrado) */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "40px", marginBottom: "8px" }}>
            Control y monitoreo del consumo
          </h1>
          <p
            style={{
              color: "#555",
              maxWidth: "800px",
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            Medí el consumo de tus dispositivos, analizá históricos y tomá
            decisiones para ahorrar energía.
          </p>
        </div>

        {/* SECCIÓN 1: Texto izquierda, imagen derecha */}
        <Section
          title="Visión en cada dispositivo"
          text="EcoWatt te ayuda a comprender el consumo energético de tus dispositivos y detectar cuáles generan mayor gasto. Conectá, medí y empezá a visualizar."
          imgSrc="/app-view.jpg"
          imgAlt="Visión por dispositivo"
          reverse={false}
        />

        {/* SECCIÓN 2: Imagen izquierda, texto derecha */}
        <Section
          title="Consumos en espera deshabilitados"
          text="EcoWatt te permite reducir consumos innecesarios cuando no usás ciertos equipos. Podés programar encendidos y apagados para horarios específicos."
          imgSrc="/fridge.jpeg"
          imgAlt="Consumos en espera"
          reverse={true}
        />

        {/* SECCIÓN 3: Texto izquierda, imagen derecha */}
        <Section
          title="Hecho para cada electrodoméstico"
          text="Podés medir y gestionar dispositivos conectados a enchufe o a circuitos específicos. Ideal para identificar consumos altos en equipos habituales del día a día."
          imgSrc="/electrodomestico.jpg"
          imgAlt="Electrodomésticos"
          reverse={false}
        />

        {/* SECCIÓN 4: Texto izquierda + imagen medio + texto derecha */}
        <div
          style={{
            marginTop: "56px",
            display: "flex",
            gap: "32px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* IZQUIERDA */}
          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <h2 style={{ fontSize: "32px", marginBottom: "12px" }}>
              Ver en vivo o retroceder en el tiempo.
            </h2>
            <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
              La aplicación EcoWatt te muestra lo que está sucediendo ahora mismo
              o retrocede en el tiempo con gráficos históricos detallados.
            </p>
          </div>

          {/* MEDIO (IMAGEN) */}
          <div
            style={{
              flex: "1 1 280px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src="/medio-app.png"
              alt="App EcoWatt con gráficos"
              style={{
                width: "320px",
                maxWidth: "100%",
                height: "auto",
                borderRadius: "16px",
                border: "1px solid #eee",
              }}
            />
          </div>

          {/* DERECHA */}
          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
                Visualiza tu consumo en vivo
              </h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Sepa exactamente cuánto consume un dispositivo al encenderlo.
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
                Conviértete en tu propio experto en energía
              </h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Compara días, semanas y meses en gráficos detallados.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
                Vigila los costos
              </h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Introduce tus tarifas energéticas y controla tus costos.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÓN VOLVER */}
        <div style={{ marginTop: "56px" }}>
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
    </div>
  );
}

/**
 * Sección reutilizable (para alternar izquierda/derecha).
 * reverse=false  => texto izquierda / imagen derecha
 * reverse=true   => imagen izquierda / texto derecha
 */
function Section(props: {
  title: string;
  text: string;
  imgSrc: string;
  imgAlt: string;
  reverse: boolean;
}) {
  const { title, text, imgSrc, imgAlt, reverse } = props;

  return (
    <div
      style={{
        marginTop: "44px",
        display: "flex",
        gap: "32px",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: reverse ? "row-reverse" : "row",
        flexWrap: "wrap",
      }}
    >
      <div style={{ maxWidth: "520px", flex: "1 1 320px" }}>
        <h2 style={{ fontSize: "28px", marginBottom: "12px" }}>{title}</h2>
        <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>{text}</p>
      </div>

      <img
        src={imgSrc}
        alt={imgAlt}
        style={{
          width: "min(420px, 100%)",
          borderRadius: "16px",
          border: "1px solid #eee",
          flex: "1 1 280px",
        }}
      />
    </div>
  );
}