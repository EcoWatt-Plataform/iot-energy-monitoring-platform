import Link from "next/link";

export default function TerminosPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px 20px 48px",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: "34px", marginBottom: "10px" }}>Terminos y condiciones</h1>
      <p style={{ color: "#4b5563", marginTop: 0 }}>
        Ultima actualizacion: 19 de febrero de 2026
      </p>

      <section style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "22px" }}>1. Uso de la plataforma</h2>
        <p>
          EcoWatt permite visualizar informacion de consumo energetico para uso personal o
          empresarial. El usuario se compromete a utilizar la plataforma de forma licita y
          respetando la normativa vigente.
        </p>
      </section>

      <section style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "22px" }}>2. Cuenta y datos</h2>
        <p>
          El usuario es responsable de la veracidad de los datos que informa al registrarse y de
          mantener su credencial de acceso en forma segura.
        </p>
      </section>

      <section style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "22px" }}>3. Privacidad</h2>
        <p>
          Los datos personales y de consumo se procesan para habilitar el servicio, mejorar la
          experiencia y cumplir obligaciones legales. El usuario puede solicitar actualizacion o
          eliminacion de datos mediante los canales de soporte.
        </p>
      </section>

      <section style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "22px" }}>4. Modificaciones</h2>
        <p>
          EcoWatt puede actualizar estos terminos. Cuando exista una modificacion relevante, se
          informara por los medios habituales de la plataforma.
        </p>
      </section>

      <section style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "22px" }}>5. Contacto</h2>
        <p>
          Ante consultas sobre estos terminos, puedes comunicarte desde la seccion de soporte en
          el sitio.
        </p>
      </section>

      <Link href="/login" style={{ display: "inline-block", marginTop: "20px" }}>
        Volver a login
      </Link>
    </main>
  );
}
