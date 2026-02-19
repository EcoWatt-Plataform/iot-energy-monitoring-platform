"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // true cuando el mouse está encima del header
  const [isHovered, setIsHovered] = useState(false);

  // true cuando se hizo scroll hacia abajo
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setIsHovered(false);     
      setIsScrolled(true);
      return;
    }

    function onScroll() {
      setIsScrolled(window.scrollY > 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // En Home: transparente al inicio. En otras páginas: fondo blanco siempre
  const shouldShowWhiteBar = !isHome || isHovered || isScrolled;

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

  // ✅ esto es lo único que necesitamos para los íconos PNG
  const iconFilter = shouldShowWhiteBar ? "invert(0)" : "invert(1)";

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
          <Link href="/planes" style={linkStyle}>Planes</Link>
          <Link href="/soporte" style={linkStyle}>Soporte</Link>
        </nav>
      </div>

      {/* Derecha: Carrito + Login */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <a href="/carrito">
          <img
            src="/ImgCarrito.png"
            alt="Carrito"
            style={{
              width: "22px",
              height: "22px",
              filter: iconFilter,          // cambia con el header
              transition: "0.2s",
            }}
          />
        </a>

        <a
          href="/login"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "0.2s",
          }}
        >
          <img
            src="/IniciarSesion.png"
            alt="Login"
            style={{
              width: "20px",
              filter: iconFilter,          // cambia con el header
              transition: "0.2s",
            }}
          />
        </a>
      </div>
    </header>
  );
}