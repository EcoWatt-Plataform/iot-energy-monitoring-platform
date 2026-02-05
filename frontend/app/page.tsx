export default function HomePage() {
  return (
    <div style={{ padding: "40px" }}>
      {/* TÍTULO PRINCIPAL (FUERA DEL BANNER) */}
      <h1
        style={{
          fontSize: "48px",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        Te ayudamos a entender y ahorrar
      </h1>

      {/* HERO / BANNER */}
      <div
        style={{
          position: "relative",
          borderRadius: "24px",
          overflow: "hidden",
        }}
      >
        {/* Imagen como fondo */}
        <div
          style={{
            width: "100%",
            height: "460px",
            backgroundImage: "url('/home.jpeg')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "50% 50%",
          }}
        />

        {/* TEXTO + BOTÓN SOBRE LA IMAGEN */}
        <div
          style={{
            position: "absolute",
            top: "150px",
            right: "10px",
            width: "min(420px, 92%)",
            color: "black",
            textShadow: "0 2px 10px rgba(0,0,0,0.55)",
          }}
        >
          <p style={{ fontSize: "22px", marginBottom: "24px" }}>
            Realizá un seguimiento del consumo energético.
          </p>

          <a
            href="/producto"
            style={{
              display: "inline-block",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "linear-gradient(90deg, #6992eb, #9b6ceb)",
              color: "black",
              textDecoration: "none",
            }}
          >
            Leer más
          </a>
          
        </div>
      </div>
    </div>
  );
}