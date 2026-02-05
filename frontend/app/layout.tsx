import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/header";

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
        {/* HEADER NUEVO (estilo Rivian) */}
        <Header />

          {/* Derecha: Login */}
          <div>
            <a
            href="/dashboard"
            style={{
              display: "inline-block",
              border: "1px solid white",
              marginLeft: "12px",
              marginRight: "12px",
              padding: "10px 12px",
              borderRadius: "12px",
              background: "black",
              color: "white",
              textDecoration: "none",
            }}
          >
            Ver dashboard de prueba para testing          
          </a>
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
            <a href="/" style={{ display: "flex", alignItems: "center" }}>
              <img
                src="/logo4.PNG"
                alt="EcoWatt"
                style={{ height: "28px", width: "auto" }}
              />
            </a>

            {/* Links */}
            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
              <a href="/producto" style={{ color: "white", textDecoration: "none" }}>
                Producto
              </a>
              <a href="/planes" style={{ color: "white", textDecoration: "none" }}>
                Planes
              </a>
              <a href="/soporte" style={{ color: "white", textDecoration: "none" }}>
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