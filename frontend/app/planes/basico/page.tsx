export default function PlanBasicoPage() {
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
          src="/basico.jpeg"
          alt="Plan Basico EcoWatt"
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
            width: "min(420px, 92%)",
            padding: "22px",
            textAlign: "left",
            background: "rgba(255, 255, 255, 0.92)",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.98, marginBottom: "8px" }}>Plan EcoWatt</div>

          <h1 style={{ fontSize: "32px", margin: 0, marginBottom: "6px" }}>Basico</h1>
          <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>ARS 7.900/mes</div>

          <p style={{ lineHeight: 1.6, margin: 0, marginBottom: "14px", opacity: 0.95 }}>
            Plan SaaS para comenzar con monitoreo esencial.
          </p>

          <ul style={{ margin: 0, lineHeight: 1.7 }}>
            <li>Hasta 1 medidor</li>
            <li>Historial 3 meses</li>
            <li>Dashboard diario y mensual</li>
            <li>Alertas simples</li>
            <li>Sin exportaciones</li>
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
              href="/carrito?plan=basico"
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
        <h2 style={{ fontSize: "26px", marginBottom: "12px" }}>¿Qué incluye el Plan Básico?</h2>

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
              <li>Hasta 1 medidor</li>
              <li>Historial de 3 meses</li>
              <li>Dashboard diario y mensual</li>
              <li>Alertas simples</li>
              <li>Sin exportaciones CSV/PDF/Excel</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Limitaciones</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Capacidad máxima: 1 medidor</li>
              <li>No incluye comparativas avanzadas</li>
              <li>No incluye exportaciones</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Ideal para</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Primeros pasos con EcoWatt</li>
              <li>Monitorear un equipo clave</li>
              <li>Uso residencial simple</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
