import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  metadataBase: new URL("https://ecowatt.ar"),
  title: "EcoWatt",
  description: "Monitoreo inteligente del consumo energetico",
  icons: {
    icon: [{ url: "/logo.PNG", type: "image/png" }],
    shortcut: "/logo.PNG",
    apple: "/logo.PNG",
  },
  openGraph: {
    title: "EcoWatt",
    description: "Monitoreo inteligente del consumo energetico",
    url: "https://ecowatt.ar",
    siteName: "EcoWatt",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "/og-ecowatt.jpg",
        width: 1200,
        height: 630,
        alt: "EcoWatt - Monitoreo inteligente del consumo energetico",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EcoWatt",
    description: "Monitoreo inteligente del consumo energetico",
    images: ["/og-ecowatt.jpg"],
  },
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
        <Header />

        <div style={{ paddingTop: "84px" }}>{children}</div>

        <footer
          style={{
            marginTop: "80px",
            backgroundColor: "black",
            color: "white",
            padding: "32px 24px",
          }}
        >
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
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <img src="/logo.PNG" alt="EcoWatt" style={{ height: "28px", width: "auto" }} />
            </Link>

            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
              <Link href="/producto" style={{ color: "white", textDecoration: "none" }}>
                Producto
              </Link>
              <Link href="/planes" style={{ color: "white", textDecoration: "none" }}>
                Planes
              </Link>
              <Link href="/soporte" style={{ color: "white", textDecoration: "none" }}>
                Soporte
              </Link>
            </div>
          </div>

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
            <span>(c) 2026 EcoWatt. Todos los derechos reservados.</span>
            <span>Monitoreo inteligente del consumo energetico</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
