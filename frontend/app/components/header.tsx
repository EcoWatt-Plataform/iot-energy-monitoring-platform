"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Visual state
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function initAuth() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error(error);
        }

        if (mounted) {
          setUser(data.user ?? null);
          setAuthLoading(false);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          setUser(session?.user ?? null);
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch (error) {
        console.error(error);
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Home: transparent initially. Other pages: white.
  const shouldShowWhiteBar = !isHome || isHovered || isScrolled;
  const textColor = shouldShowWhiteBar ? "black" : "white";

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

  const userBadgeStyle: React.CSSProperties = {
    color: textColor,
    border: `1px solid ${
      shouldShowWhiteBar ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.45)"
    }`,
    background: shouldShowWhiteBar ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.2)",
    padding: "8px 10px",
    borderRadius: "10px",
    fontSize: "13px",
    maxWidth: "220px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const userLabel =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Cuenta";

  const logout = async () => {
    setIsAuthBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      window.alert("No se pudo cerrar sesion. Intenta nuevamente.");
    } finally {
      setIsAuthBusy(false);
    }
  };

  return (
    <header
      style={headerStyle}
      onMouseEnter={isHome ? () => setIsHovered(true) : undefined}
      onMouseLeave={isHome ? () => setIsHovered(false) : undefined}
    >
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
          <span style={{ color: textColor, fontWeight: 700, fontSize: "16px" }}>EcoWatt</span>
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

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Link href="/carrito" style={rightBtnStyle} aria-label="Ir al carrito" title="Carrito">
          Carrito
        </Link>

        {authLoading ? (
          <span style={userBadgeStyle}>Cargando sesion...</span>
        ) : user ? (
          <>
            <span style={userBadgeStyle} title={String(userLabel)}>
              {String(userLabel)}
            </span>
            <Link href="/dashboard" style={rightBtnStyle}>
              Dashboard
            </Link>
            <button type="button" onClick={logout} disabled={isAuthBusy} style={buttonStyle}>
              {isAuthBusy ? "Cerrando..." : "Cerrar sesion"}
            </button>
          </>
        ) : (
          <Link href="/login" style={rightBtnStyle}>
            Iniciar sesion
          </Link>
        )}
      </div>
    </header>
  );
}
