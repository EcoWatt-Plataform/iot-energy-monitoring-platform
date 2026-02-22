export default function PlanBasicoPage() {
  return (
    <div style={{ padding: "32px" }}>
      {/* HERO: imagen grande + texto a la derecha */}
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
          alt="Plan Básico EcoWatt"
          style={{
            width: "100%",
            height: "420px",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Panel de texto arriba a la derecha */}
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
          <div style={{ fontSize: "12px", opacity: 0.98, marginBottom: "8px" }}>
            Plan EcoWatt
          </div>

          <h1 style={{ fontSize: "32px", margin: 0, marginBottom: "10px" }}>
            Básico
          </h1>

          <p style={{ lineHeight: 1.6, margin: 0, marginBottom: "14px", opacity: 0.95 }}>
            Ideal para empezar y monitorear un solo medidor con datos claros.
          </p>

          <ul style={{ margin: 0, lineHeight: 1.7 }}>
            <li>1 medidor asociado</li>
            <li>Historial de 3 meses</li>
            <li>Dashboard diario y mensual</li>
            <li>Alertas simples</li>
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

      {/* INFO DEL PLAN */}
      <div style={{ maxWidth: "1100px", margin: "40px auto 0" }}>
        <h2 style={{ fontSize: "26px", marginBottom: "12px" }}>
          ¿Qué incluye el Plan Básico?
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
              <li>1 medidor asociado</li>
              <li>Dashboard diario y mensual</li>
              <li>Historial de 3 meses</li>
              <li>Alertas simples por umbral mensual</li>
              <li>Acceso a la plataforma web</li>
            </ul>
          </div>

          {/* Para quien */}
          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>¿Para quién sirve?</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Para probar EcoWatt por primera vez</li>
              <li>Para monitorear un electrodoméstico específico</li>
              <li>Para un hogar chico o un departamento</li>
            </ul>
          </div>

          {/* Limitaciones */}
          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Limitaciones</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Maximo 1 medidor por cuenta</li>
              <li>Sin gráficos semanales ni comparativo</li>
              <li>Sin exportaciones CSV avanzadas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECCION APP */}
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
            <h2 style={{ fontSize: "28px", marginBottom: "12px" }}>La app en el plan Básico</h2>
            <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
              Visualiza lo esencial con 1 medidor, historial de 3 meses y panel diario/mensual.
            </p>
          </div>

          {/* MEDIO (CELULAR) */}
          <div style={{ flex: "1 1 280px", display: "flex", justifyContent: "center" }}>
            <img
              src="/medio-app.png"
              alt="Aplicación EcoWatt - Plan Básico"
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
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Consumo en vivo</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Mirá en tiempo real cuánto está consumiendo el medidor asociado.
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Dashboard diario y mensual</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Alterna entre vista diaria y mensual para seguir la evolución del consumo.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Alertas simples e historial</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Consulta hasta 3 meses y activa alertas por umbral mensual de energía.
              </p>
            </div>
          </div>
        </div>

        {/* Botones abajo */}
        <div style={{ marginTop: "36px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
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
