import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoWatt",
  description: "Monitoreo inteligente del consumo energético",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: "white", color: "black" }}
      >
        {/* ================= HEADER ================= */}
        <header
          style={{
            backgroundColor: "black",
            color: "white",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* IZQUIERDA: Logo (clickeable) + Menú */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {/* Logo clickeable -> vuelve a Home */}
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
                color: "white",
              }}
            >
              <img
                src="/logo2.jpeg"
                alt="EcoWatt"
                style={{ height: "32px", width: "auto" }}
              />
              <span style={{ fontWeight: 600, fontSize: "18px" }}>EcoWatt</span>
            </a>

            {/* Menú al lado del logo */}
            <nav style={{ display: "flex", gap: "20px" }}>
              <a
                href="/planes"
                style={{ color: "white", textDecoration: "none" }}
              >
                Planes
              </a>
              <a
                href="/soporte"
                style={{ color: "white", textDecoration: "none" }}
              >
                Soporte
              </a>
            </nav>
          </div>

          {/* Derecha: Login */}
          <div>
            <a
              href="/login"
              style={{
                color: "white",
                textDecoration: "none",
                border: "1px solid white",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              Iniciar sesión
            </a>
          </div>
        </header>

        {/* ================= CONTENIDO ================= */}
        {children}

        {/* ================= FOOTER ================= */}
        <footer
          style={{
            marginTop: "80px",
            backgroundColor: "black",
            color: "white",
            padding: "32px 24px",
          }}
        >
          {/* Parte superior */}
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Logo */}
            <img
              src="/logo2.jpeg"
              alt="EcoWatt"
              style={{ height: "28px", width: "auto" }}
            />

            {/* Links */}
            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
              <a
                href="/producto"
                style={{ color: "white", textDecoration: "none" }}
              >
                Producto
              </a>
              <a
                href="/planes"
                style={{ color: "white", textDecoration: "none" }}
              >
                Planes
              </a>
              <a
                href="/soporte"
                style={{ color: "white", textDecoration: "none" }}
              >
                Soporte
              </a>
            </div>
          </div>

          {/* Línea inferior */}
          <div
            style={{
              maxWidth: "1100px",
              margin: "18px auto 0",
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingTop: "14px",
              fontSize: "14px",
              color: "rgba(255,255,255,0.75)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span>©️ 2026 EcoWatt. Todos los derechos reservados.</span>
            <span>Monitoreo inteligente del consumo energético</span>
          </div>
        </footer>
      </body>
    </html>
  );
}