export default function PlanesPage() {
  return (
    <div style={{ padding: "40px" }}>
      {/* TÍTULO */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "40px", marginBottom: "8px" }}>Planes EcoWatt</h1>
        <p style={{ color: "#555", maxWidth: "800px", margin: "0 auto", lineHeight: 1.6 }}>
          Elegí el plan que mejor se adapte a la cantidad de dispositivos que querés monitorear.
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
          features={["Hasta 5 dispositivos", "Gráficos día/semana/mes", "Historial extendido"]}
          href="/planes/avanzado"
        />

        <PlanCard
          name="Premium"
          imageSrc="/premium.jpeg"
          tagline="Monitoreo completo"
          features={["Hasta 20 dispositivos", "Alertas avanzadas", "Reportes detallados"]}
          href="/planes/premium"
        />
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
  const { name, imageSrc, tagline, features, href } = props;

  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "20px",
        background: "white",
      }}
    >
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
        <a
          href={href}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            textDecoration: "none",
            color: "black",
            background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
            fontWeight: 500,
          }}
        >
          Ver detalles
        </a>
      </div>
    </div>
  );
}