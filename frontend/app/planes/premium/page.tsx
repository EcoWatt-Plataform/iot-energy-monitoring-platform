export default function PlanPremiumPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div
        style={{
          position: "relative",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid #eee",
        }}
      >
        <img
          src="/premium.jpeg"
          alt="Plan Premium EcoWatt"
          style={{
            width: "100%",
            height: "420px",
            objectFit: "cover",
            display: "block",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "22px",
            right: "22px",
            width: "min(430px, 92%)",
            padding: "22px",
            textAlign: "left",
            background: "rgba(255, 255, 255, 0.92)",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.95, marginBottom: "8px" }}>Plan EcoWatt</div>

          <h1 style={{ fontSize: "32px", margin: 0, marginBottom: "6px" }}>Premium</h1>
          <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>ARS 19.900/mes</div>

          <p style={{ lineHeight: 1.6, margin: 0, marginBottom: "14px", opacity: 0.95 }}>
            Plan completo para mayor capacidad y exportacion de datos.
          </p>

          <ul style={{ margin: 0, lineHeight: 1.7 }}>
            <li>Hasta 6 medidores</li>
            <li>Comparativas avanzadas</li>
            <li>Alertas avanzadas</li>
            <li>Exportaciones CSV/PDF/Excel</li>
            <li>Exportaciones exclusivas Premium</li>
          </ul>

          <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href="/planes"
              style={{
                display: "inline-block",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                textDecoration: "none",
                color: "black",
                background: "white",
              }}
            >
              Volver a planes
            </a>

            <a
              href="/carrito?plan=premium"
              style={{
                display: "inline-block",
                padding: "10px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                color: "black",
                background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
              }}
            >
              Elegir este plan
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "40px auto 0" }}>
        <h2 style={{ fontSize: "26px", marginBottom: "12px" }}>¿Qué incluye el Plan Premium?</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "18px",
          }}
        >
          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Incluye</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Todo lo del plan Avanzado</li>
              <li>Hasta 6 medidores por cuenta</li>
              <li>Comparativas avanzadas</li>
              <li>Alertas avanzadas</li>
              <li>Exportaciones CSV/PDF/Excel</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Comparado con Avanzado</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>De 3 a 6 medidores</li>
              <li>Exportaciones exclusivas</li>
              <li>Alertas de mayor nivel</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Ideal para</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Usuarios con mayor volumen de medicion</li>
              <li>Equipos que necesitan reportes</li>
              <li>Analisis y auditoria energetica</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
