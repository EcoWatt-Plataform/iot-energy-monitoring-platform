export default function PlanesPage() {
  return (
    <div style={{ padding: "40px" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "40px", marginBottom: "8px" }}>Planes EcoWatt</h1>
        <p
          style={{
            color: "#555",
            maxWidth: "860px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Servicio SaaS mensual. Elegi el plan segun la cantidad de
          medidores que necesites monitorear.
        </p>
      </div>

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
          name="Basico"
          imageSrc="/basico.jpeg"
          tagline="ARS 7.900/mes"
          features={[
            "Hasta 1 medidor",
            "Historial 3 meses",
            "Dashboard diario y mensual",
            "Sin exportaciones",
          ]}
          href="/planes/basico"
        />

        <PlanCard
          name="Avanzado"
          imageSrc="/avanzado.jpeg"
          tagline="ARS 12.900/mes"
          features={[
            "Hasta 3 medidores",
            "Historial 12 meses",
            "Comparativas",
            "Sin exportaciones",
          ]}
          href="/planes/avanzado"
        />

        <PlanCard
          name="Premium"
          imageSrc="/premium.jpeg"
          tagline="ARS 19.900/mes"
          features={[
            "Hasta 6 medidores",
            "Comparativas avanzadas",
            "Exportaciones CSV/PDF/Excel",
            "Exclusivo Premium",
          ]}
          href="/planes/premium"
          recommended
        />
      </div>

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
          <div
            style={{
              flex: "0 0 260px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src="/dispo.jpeg"
              alt="Hardware EcoWatt"
              style={{
                width: "100%",
                maxWidth: "240px",
                borderRadius: "16px",
                objectFit: "contain",
              }}
            />
          </div>

          <div style={{ flex: "1 1 300px" }}>
            <h2 style={{ margin: 0, fontSize: "26px" }}>Hardware EcoWatt (venta unica)</h2>

            <p
              style={{
                marginTop: "12px",
                marginBottom: "18px",
                color: "#555",
                lineHeight: 1.6,
              }}
            >
              Tipos de medidor: EcoWatt Plug o EcoWatt Panel. Podes sumar fases extra
              como adicional.
            </p>

            <ul style={{ margin: 0, paddingLeft: "18px", color: "#1f2937", lineHeight: 1.7 }}>
              <li>EcoWatt Plug: ARS 49.900</li>
              <li>EcoWatt Panel 1 fase (1 pinza CT): ARS 149.900</li>
              <li>EcoWatt Panel 3 fases (3 pinzas CT): ARS 219.900</li>
              <li>Fase extra (CT + configuracion): ARS 34.900</li>
            </ul>

            <a
              href="/carrito"
              style={{
                marginTop: "16px",
                display: "inline-block",
                padding: "12px 18px",
                borderRadius: "12px",
                textDecoration: "none",
                color: "black",
                background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
                fontWeight: 700,
              }}
            >
              Configurar compra
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

  const wrapperStyle: React.CSSProperties = recommended
    ? {
        position: "relative",
        borderRadius: "20px",
        padding: "2px",
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

  const buttonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: "10px",
    textDecoration: "none",
    color: recommended ? "white" : "black",
    background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
    fontWeight: recommended ? 700 : 600,
    border: recommended
      ? "1px solid rgba(255,255,255,0.22)"
      : "1px solid rgba(0,0,0,0.06)",
    boxShadow: recommended ? "0 10px 24px rgba(105,146,235,0.28)" : "none",
  };

  return (
    <div style={wrapperStyle}>
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
            alt={`Ilustracion plan ${name}`}
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        </div>

        <h2 style={{ fontSize: "24px", margin: 0, marginBottom: "4px" }}>{name}</h2>
        <p style={{ color: "#111827", marginTop: 0, marginBottom: "16px", fontWeight: 700 }}>
          {tagline}
        </p>

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
