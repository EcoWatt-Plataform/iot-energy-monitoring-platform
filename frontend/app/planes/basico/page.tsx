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
          src="/basico.jpeg" // <-- si tu archivo es .jpg o .jpeg, cambialo acá
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
            padding: "18px",
            textAlign: "left",
            color: "black",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.55)",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.98, marginBottom: "8px" }}>
            Plan EcoWatt
          </div>

          <h1 style={{ fontSize: "32px", margin: 0, marginBottom: "10px" }}>
            Básico
          </h1>

          <p style={{ lineHeight: 1.6, margin: 0, marginBottom: "14px", opacity: 0.95 }}>
            Ideal para empezar y monitorear un dispositivo clave con datos en tiempo real.
          </p>

          <ul style={{ margin: 0, lineHeight: 1.7 }}>
            <li>Hasta 1 dispositivo</li>
            <li>Consumo en vivo</li>
            <li>Historial básico</li>
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
              <li>Monitoreo en tiempo real</li>
              <li>Gráfico diario</li>
              <li>Historial básico (limitado)</li>
              <li>Acceso a la plataforma web</li>
            </ul>
          </div>

          {/* Para quién */}
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
              <li>Solo 1 dispositivo</li>
              <li>Menos historial que planes superiores</li>
              <li>Sin reportes avanzados</li>
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
            <h2 style={{ fontSize: "28px", marginBottom: "12px" }}>La app en el plan Básico</h2>
            <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
              Visualizá lo esencial: consumo en vivo y un resumen diario para entender tus hábitos.
            </p>
          </div>

          {/* MEDIO (CELULAR) */}
          <div style={{ flex: "1 1 280px", display: "flex", justifyContent: "center" }}>
            <img
              src="/medio-app.png" // <-- tu imagen del celular (si es .jpg, cambialo)
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

          {/* DERECHA (3 bloques, versión “básico” con menos cosas) */}
          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Consumo en vivo</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Mirá en tiempo real cuánto está consumiendo el dispositivo.
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Resumen diario</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Revisá el consumo del día con una visualización simple.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Historial básico</h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Consultá un historial limitado para detectar patrones.
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