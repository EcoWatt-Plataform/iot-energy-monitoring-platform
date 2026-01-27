export default function PlanPremiumPage() {
  return (
    <div style={{ padding: "32px" }}>
      {/* HERO: imagen grande + texto arriba (sin recuadro) */}
      <div
        style={{
          position: "relative",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid #eee",
        }}
      >
        {/* Imagen como background para poder mover encuadre */}
        <img
          src="/basico.jpeg" // <-- si tu archivo es .jpg o .jpeg, cambialo acá
          alt="Plan Básico EcoWatt"
          style={{
            width: "100%",
            height: "420px",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Texto arriba a la derecha (sin caja) */}
        <div
          style={{
            position: "absolute",
            top: "22px",
            right: "22px",
            width: "min(460px, 92%)",
            textAlign: "left",
            color: "black",
            textShadow: "0 2px 10px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.95, marginBottom: "8px" }}>
            Plan EcoWatt
          </div>

          <h1 style={{ fontSize: "32px", margin: 0, marginBottom: "10px" }}>
            Premium
          </h1>

          <p style={{ lineHeight: 1.6, margin: 0, marginBottom: "14px", opacity: 0.95 }}>
            Para monitoreo completo: más dispositivos, más historial y funciones avanzadas para ahorrar al máximo.
          </p>

          <ul style={{ margin: 0, lineHeight: 1.7 }}>
            <li>Hasta 20 dispositivos</li>
            <li>Historial extendido (12 meses)</li>
            <li>Alertas avanzadas</li>
            <li>Reportes detallados</li>
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
              href="/login"
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

      {/* INFO DEL PLAN */}
      <div style={{ maxWidth: "1100px", margin: "40px auto 0" }}>
        <h2 style={{ fontSize: "26px", marginBottom: "12px" }}>
          ¿Qué incluye el Plan Premium?
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "18px",
          }}
        >
          {/* Incluye */}
          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Incluye</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Monitoreo en tiempo real</li>
              <li>Historial extendido (hasta 12 meses)</li>
              <li>Gráficos avanzados y comparativas</li>
              <li>Alertas avanzadas ante consumos anómalos</li>
              <li>Reportes detallados (descargables)</li>
            </ul>
          </div>

          {/* Para quién */}
          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>¿Para quién sirve?</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Para hogares grandes o muchos dispositivos</li>
              <li>Para usuarios que quieren máximo control</li>
              <li>Para analizar consumo y costos en detalle</li>
            </ul>
          </div>

          {/* Comparado con Avanzado */}
          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Comparado con Avanzado</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Más dispositivos (hasta 20)</li>
              <li>Más historial</li>
              <li>Alertas y reportes avanzados</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECCIÓN “APP” estilo: texto izq + imagen medio + texto der */}
      <div style={{ maxWidth: "1100px", margin: "56px auto 0" }}>
        <div
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* IZQUIERDA */}
          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <h2 style={{ fontSize: "28px", marginBottom: "12px" }}>
              La app en el plan Premium
            </h2>
            <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
              Análisis completo: alertas, comparativas, reportes y un historial amplio para tomar decisiones con datos.
            </p>
          </div>

          {/* MEDIO (CELULAR) */}
          <div style={{ flex: "1 1 280px", display: "flex", justifyContent: "center" }}>
            <img
              src="/medio-app.png" // <-- tu imagen del celular
              alt="Aplicación EcoWatt - Plan Premium"
              style={{
                width: "320px",
                maxWidth: "100%",
                height: "auto",
                borderRadius: "16px",
                border: "1px solid #eee",
              }}
            />
          </div>

          {/* DERECHA (premium: más completo) */}
          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Alertas avanzadas</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Detectá consumos anómalos y recibí notificaciones para actuar rápido.
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Comparativas completas</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Compará dispositivos y períodos para identificar oportunidades de ahorro.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Reportes detallados</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Obtené reportes listos para revisar (y luego exportar) con tus métricas principales.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "36px",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/planes"
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              textDecoration: "none",
              color: "black",
            }}
          >
            Volver a planes
          </a>

          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 16px",
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
  );
}