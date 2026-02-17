"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // true cuando el mouse está encima del header
  const [isHovered, setIsHovered] = useState(false);

  // En Home: transparente al inicio y cambia con hover.
  // En otras páginas: fondo blanco siempre.
  const shouldShowWhiteBar = !isHome || isHovered;

  const headerStyle: React.CSSProperties = {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(1100px, calc(100% - 32px))",
    zIndex: 50,
    height: "64px",
    display: "flex",
    alignItems: "center",
    padding: "0 18px",
    transition: "all 180ms ease",
    borderRadius: "16px",
    backgroundColor: shouldShowWhiteBar ? "rgba(255,255,255,0.92)" : "transparent",
    backdropFilter: shouldShowWhiteBar ? "blur(8px)" : "none",
    WebkitBackdropFilter: shouldShowWhiteBar ? "blur(8px)" : "none",
    border: shouldShowWhiteBar ? "1px solid rgba(0,0,0,0.08)" : "1px solid transparent",
    boxShadow: shouldShowWhiteBar ? "0 10px 30px rgba(0,0,0,0.12)" : "none",
  };

  const textColor = shouldShowWhiteBar ? "black" : "white";

  const linkStyle: React.CSSProperties = {
    color: textColor,
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: "10px",
    transition: "background 160ms ease",
    fontWeight: 500,
  };

  const rightBtnStyle: React.CSSProperties = {
    color: textColor,
    textDecoration: "none",
    border: `1px solid ${
      shouldShowWhiteBar ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.65)"
    }`,
    padding: "8px 12px",
    borderRadius: "10px",
    transition: "all 160ms ease",
    fontWeight: 500,
  };

  const buttonStyle: React.CSSProperties = {
    ...rightBtnStyle,
    background: "transparent",
    cursor: "pointer",
    font: "inherit",
  };

  const supabase = createClient();

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
  };


  return (
    <header
      style={headerStyle}
      onMouseEnter={isHome ? () => setIsHovered(true) : undefined}
      onMouseLeave={isHome ? () => setIsHovered(false) : undefined}
    >
      {/* Izquierda: Logo + menú pegado al logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <img src="/logo4.PNG" alt="EcoWatt" style={{ height: "30px", width: "auto" }} />
          <span style={{ color: textColor, fontWeight: 700, fontSize: "16px" }}>
            EcoWatt
          </span>
        </Link>

        <nav style={{ display: "flex", gap: "6px" }}>
          <Link href="/planes" style={linkStyle}>
            Planes
          </Link>
          <Link href="/soporte" style={linkStyle}>
            Soporte
          </Link>
        </nav>
      </div>

      {/* Derecha: Carrito + Login */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Link
          href="/carrito"
          style={rightBtnStyle}
          aria-label="Ir al carrito"
          title="Carrito"
        >
          Carrito
        </Link>
        
        <button type="button" onClick={login} style={buttonStyle}>
          Ingresar con Google
        </button>
      </div>
    </header>
  );
}