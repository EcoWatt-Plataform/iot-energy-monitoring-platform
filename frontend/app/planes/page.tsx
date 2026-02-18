export default function PlanesPage() {
  return (
    <div style={{ padding: "40px" }}>
      {/* TÍTULO */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "40px", marginBottom: "8px" }}>Planes EcoWatt</h1>
        <p
          style={{
            color: "#555",
            maxWidth: "800px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Elegí el plan que mejor se adapte a la cantidad de dispositivos que querés
          monitorear.
        </p>
      </div>

      {/* TARJETAS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          maxWidth: "1100px",
          margin: "0 auto",
          alignItems: "stretch",
          textAlign: "center",
        }}
      >
        <PlanCard
          name="Básico"
          imageSrc="/basico.jpeg"
          tagline="Ideal para empezar"
          features={["Hasta 1 dispositivo", "Consumo en tiempo real", "Historial básico"]}
          href="/planes/basico"
        />

        <PlanCard
          name="Avanzado"
          imageSrc="/avanzado.jpeg"
          tagline="Para hogares"
          features={[
            "Hasta 5 dispositivos",
            "Gráficos día/semana/mes",
            "Historial extendido",
          ]}
          href="/planes/avanzado"
        />

        <PlanCard
          name="Premium"
          imageSrc="/premium.jpeg"
          tagline="Monitoreo completo"
          features={["Hasta 20 dispositivos", "Alertas avanzadas", "Reportes detallados"]}
          href="/planes/premium"
          recommended
        />
      </div>
      {/* ===== DISPOSITIVO INDIVIDUAL ===== */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "50px auto 0",
          padding: "0 10px",
        }}
      >
        <div
          style={{
            borderRadius: "20px",
            border: "1px solid #eee",
            background: "white",
            padding: "28px",
            display: "flex",
            alignItems: "center",
            gap: "28px",
            flexWrap: "wrap",
            boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
          }}
        >
          {/* Imagen */}
          <div
            style={{
              flex: "0 0 260px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src="/dispo.jpeg"
              alt="Dispositivo EcoWatt"
              style={{
                width: "100%",
                maxWidth: "240px",
                borderRadius: "16px",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Texto */}
          <div style={{ flex: "1 1 300px" }}>
            <h2 style={{ margin: 0, fontSize: "26px" }}>
              ¿Querés solo el dispositivo?
            </h2>

            <p
              style={{
                marginTop: "12px",
                marginBottom: "18px",
                color: "#555",
                lineHeight: 1.6,
              }}
            >
              Comprá EcoWatt sin suscripción y empezá a monitorear un solo
              electrodoméstico desde el primer día.
            </p>

            <a
              href="/carrito?item=dispositivo"
              style={{
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: "12px",
                textDecoration: "none",
                color: "black",
                background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
                fontWeight: 700,
              }}
            >
              Agregar al carrito
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard(props: {
  name: string;
  imageSrc: string;
  tagline: string;
  features: string[];
  href: string;
  recommended?: boolean;
}) {
  const { name, imageSrc, tagline, features, href, recommended } = props;

  // Wrapper con borde degradé (solo para Premium)
  const wrapperStyle: React.CSSProperties = recommended
    ? {
        position: "relative",
        borderRadius: "20px",
        padding: "2px", // grosor del borde
        background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
        transform: "translateY(-8px)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
      }
    : {};

  const cardStyle: React.CSSProperties = {
    borderRadius: recommended ? "18px" : "16px",
    padding: "20px",
    background: "white",
    border: recommended ? "1px solid rgba(0,0,0,0.06)" : "1px solid #eee",
    height: "100%",
  };

  const buttonStyle: React.CSSProperties = recommended
    ? {
        display: "inline-block",
        padding: "10px 14px",
        borderRadius: "10px",
        textDecoration: "none",
        color: "white",
        background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
        fontWeight: 700,
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow: "0 10px 24px rgba(105,146,235,0.28)",
      }
    : {
        display: "inline-block",
        padding: "10px 14px",
        borderRadius: "10px",
        textDecoration: "none",
        color: "black",
        background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
        fontWeight: 600,
        border: "1px solid rgba(0,0,0,0.06)",
      };

  return (
    <div style={wrapperStyle}>
      {/* Chip “Recomendado” */}
      {recommended && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            padding: "6px 10px",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
            border: "1px solid rgba(0,0,0,0.08)",
            fontSize: "12px",
            fontWeight: 800,
            color: "#f8f6f6",
            backdropFilter: "blur(6px)",
          }}
        >
          Recomendado
        </div>
      )}

      <div style={cardStyle}>
        <div
          style={{
            height: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            marginBottom: "12px",
          }}
        >
          <img
            src={imageSrc}
            alt={`Ilustración plan ${name}`}
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        </div>

        <h2 style={{ fontSize: "24px", margin: 0, marginBottom: "8px" }}>{name}</h2>
        <p style={{ color: "#555", marginTop: 0, marginBottom: "16px" }}>{tagline}</p>

        <ul style={{ margin: 0, color: "#333", lineHeight: 1.7 }}>
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        <div style={{ marginTop: "18px" }}>
          <a href={href} style={buttonStyle}>
            Ver detalles
          </a>
        </div>
      </div>
    </div>
  );
}