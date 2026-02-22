export default function PlanAvanzadoPage() {
  return (
    <div style={{ padding: "32px" }}>
      {/* HERO: imagen grande + texto arriba */}
      <div
        style={{
          position: "relative",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid #eee",
        }}
      >
        <img
          src="/avanzado.jpeg"
          alt="Plan Avanzado EcoWatt"
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
          <div style={{ fontSize: "12px", opacity: 0.95, marginBottom: "8px" }}>
            Plan EcoWatt
          </div>

          <h1 style={{ fontSize: "32px", margin: 0, marginBottom: "10px" }}>
            Avanzado
          </h1>

          <p style={{ lineHeight: 1.6, margin: 0, marginBottom: "14px", opacity: 0.95 }}>
            Todo lo del plan Básico, con más capacidad para hogares con varios equipos.
          </p>

          <ul style={{ margin: 0, lineHeight: 1.7 }}>
            <li>Hasta 3 medidores asociados</li>
            <li>Historial de 12 meses</li>
            <li>Comparativas entre dispositivos</li>
            <li>Alertas simples</li>
          </ul>

          <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href="/planes"
              style={{
                display: "inline-block",
                padding: "12px 16px",
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
              href="/carrito?plan=avanzado"
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
          ¿Qué incluye el Plan Avanzado?
        </h2>

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
              <li>Todo lo del plan Básico</li>
              <li>Hasta 3 medidores por cuenta</li>
              <li>Dashboard diario, semanal y mensual</li>
              <li>Comparativas entre medidores</li>
              <li>Historial de 12 meses</li>
              <li>Alertas simples por umbral mensual</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>¿Para quién sirve?</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>Para hogares con varios electrodomésticos</li>
              <li>Para comparar consumos entre equipos</li>
              <li>Para seguir tendencias durante todo el año</li>
            </ul>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "18px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Comparado con Básico</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#333", lineHeight: 1.7 }}>
              <li>De 1 a 3 medidores</li>
              <li>De 3 a 12 meses de historial</li>
              <li>Se habilitan comparativas</li>
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
          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <h2 style={{ fontSize: "28px", marginBottom: "12px" }}>
              La app en el plan Avanzado
            </h2>
            <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
              Mirá más contexto histórico y compara medidores para detectar oportunidades de ahorro.
            </p>
          </div>

          <div style={{ flex: "1 1 280px", display: "flex", justifyContent: "center" }}>
            <img
              src="/medio-app.png"
              alt="Aplicacion EcoWatt - Plan Avanzado"
              style={{
                width: "320px",
                maxWidth: "100%",
                height: "auto",
                borderRadius: "16px",
                border: "1px solid #eee",
              }}
            />
          </div>

          <div style={{ maxWidth: "360px", flex: "1 1 260px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
                Hasta 3 medidores
              </h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Controla varios puntos de consumo en una sola cuenta.
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
                Comparativas
              </h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Compará dispositivos para saber cuáles consumen más y en qué período.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
                Historial y alertas
              </h3>
              <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
                Revisá 12 meses y recibí alertas simples cuando un medidor supera su umbral.
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
