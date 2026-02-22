"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const isHome = pathname === "/";

  // Visual state
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    function onResize() {
      const isMobile = window.innerWidth < 768;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setIsMobileMenuOpen(false);
      }
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [isMobileMenuOpen]);

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

  const shouldShowWhiteBar = !isHome || isHovered || isScrolled;
  const textColor = shouldShowWhiteBar ? "#111827" : "#ffffff";
  const isMobile = isMobileViewport;

  const headerStyle: React.CSSProperties = {
    position: "fixed",
    top: isMobile ? "10px" : "16px",
    left: "50%",
    transform: "translateX(-50%)",
    width: isMobile ? "calc(100% - 20px)" : "min(1100px, calc(100% - 32px))",
    zIndex: 50,
    minHeight: isMobile ? "56px" : "64px",
    display: "flex",
    alignItems: "center",
    padding: isMobile ? "8px 12px" : "0 18px",
    transition: "all 180ms ease",
    borderRadius: isMobile ? "14px" : "16px",
    backgroundColor: shouldShowWhiteBar ? "rgba(255,255,255,0.92)" : "transparent",
    backdropFilter: shouldShowWhiteBar ? "blur(8px)" : "none",
    WebkitBackdropFilter: shouldShowWhiteBar ? "blur(8px)" : "none",
    border: shouldShowWhiteBar ? "1px solid rgba(0,0,0,0.08)" : "1px solid transparent",
    boxShadow: shouldShowWhiteBar ? "0 10px 30px rgba(0,0,0,0.12)" : "none",
  };

  const linkStyle: React.CSSProperties = {
    color: textColor,
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: "10px",
    transition: "background 160ms ease",
    fontWeight: 500,
    fontSize: "14px",
  };

  const iconFilter = shouldShowWhiteBar ? "invert(0)" : "invert(1)";

  const rightBtnStyle: React.CSSProperties = {
    color: textColor,
    textDecoration: "none",
    border: `1px solid ${
      shouldShowWhiteBar ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.65)"
    }`,
    padding: "7px 10px",
    borderRadius: "9px",
    transition: "all 160ms ease",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: 1.2,
  };

  const buttonStyle: React.CSSProperties = {
    ...rightBtnStyle,
    background: "transparent",
    cursor: "pointer",
    font: "inherit",
  };

  const iconBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "999px",
    transition: "0.2s",
  };

  const userBadgeStyle: React.CSSProperties = {
    color: textColor,
    border: `1px solid ${
      shouldShowWhiteBar ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.45)"
    }`,
    background: shouldShowWhiteBar ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.2)",
    padding: "7px 9px",
    borderRadius: "10px",
    fontSize: "12px",
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const menuToggleStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: `1px solid ${
      shouldShowWhiteBar ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)"
    }`,
    background: shouldShowWhiteBar ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.14)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  };

  const hamburgerLineStyle: React.CSSProperties = {
    width: "18px",
    height: "2px",
    borderRadius: "999px",
    background: textColor,
    transition: "transform 180ms ease, opacity 180ms ease",
    transformOrigin: "center",
  };

  const mobileMenuStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    borderRadius: "14px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.97)",
    boxShadow: "0 14px 28px rgba(0,0,0,0.12)",
    padding: "10px",
    display: "grid",
    gap: "8px",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  const mobileNavLinkStyle: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    color: "#111827",
    fontWeight: 600,
    fontSize: "14px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(15,23,42,0.08)",
    background: "rgba(255,255,255,0.9)",
  };

  const mobileActionBtnStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    color: "#111827",
    textDecoration: "none",
    border: "1px solid rgba(15,23,42,0.1)",
    padding: "9px 12px",
    borderRadius: "10px",
    background: "white",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    lineHeight: 1.2,
  };

  const userLabel =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Cuenta";
  const canAccessAdmin =
    user?.app_metadata?.role === "admin" ||
    user?.app_metadata?.role === "superadmin" ||
    user?.app_metadata?.is_admin === true;

  const logout = async () => {
    setIsAuthBusy(true);
    setIsMobileMenuOpen(false);
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
      ref={headerRef}
      style={headerStyle}
      onMouseEnter={isHome ? () => setIsHovered(true) : undefined}
      onMouseLeave={isHome ? () => setIsHovered(false) : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "18px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : "10px",
            textDecoration: "none",
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img src="/logo.PNG" alt="EcoWatt" style={{ height: isMobile ? "26px" : "30px", width: "auto" }} />
          <span style={{ color: textColor, fontWeight: 700, fontSize: isMobile ? "15px" : "16px" }}>EcoWatt</span>
        </Link>

        <nav style={{ display: isMobile ? "none" : "flex", gap: "6px" }}>
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
          gap: isMobile ? "8px" : "10px",
        }}
      >
        <Link href="/carrito" aria-label="Ir al carrito" title="Carrito" style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/ImgCarrito.png"
            alt="Carrito"
            style={{
              width: isMobile ? "20px" : "22px",
              height: isMobile ? "20px" : "22px",
              filter: iconFilter,
              transition: "0.2s",
            }}
          />
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Abrir menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-header-menu"
            style={menuToggleStyle}
          >
            <span
              style={{
                display: "inline-flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  ...hamburgerLineStyle,
                  transform: isMobileMenuOpen ? "translateY(6px) rotate(45deg)" : "none",
                }}
              />
              <span
                style={{
                  ...hamburgerLineStyle,
                  opacity: isMobileMenuOpen ? 0 : 1,
                }}
              />
              <span
                style={{
                  ...hamburgerLineStyle,
                  transform: isMobileMenuOpen ? "translateY(-6px) rotate(-45deg)" : "none",
                }}
              />
            </span>
          </button>
        ) : authLoading ? (
          <span style={userBadgeStyle}>Cargando sesion...</span>
        ) : user ? (
          <>
            <span style={userBadgeStyle} title={String(userLabel)}>
              {String(userLabel)}
            </span>
            {canAccessAdmin && (
              <Link href="/admin" style={rightBtnStyle}>
                Admin
              </Link>
            )}
            <Link href="/dashboard" style={rightBtnStyle}>
              Dashboard
            </Link>
            <button type="button" onClick={logout} disabled={isAuthBusy} style={buttonStyle}>
              {isAuthBusy ? "Cerrando..." : "Cerrar sesion"}
            </button>
          </>
        ) : (
          <Link href="/login" aria-label="Iniciar sesion" style={iconBtnStyle}>
            <img
              src="/IniciarSesion.png"
              alt="Iniciar sesion"
              style={{ width: "20px", filter: iconFilter, transition: "0.2s" }}
            />
          </Link>
        )}
      </div>

      {isMobile && isMobileMenuOpen && (
        <div id="mobile-header-menu" style={mobileMenuStyle}>
          <Link href="/planes" style={mobileNavLinkStyle} onClick={() => setIsMobileMenuOpen(false)}>
            Planes
          </Link>
          <Link href="/soporte" style={mobileNavLinkStyle} onClick={() => setIsMobileMenuOpen(false)}>
            Soporte
          </Link>
          <Link href="/carrito" style={mobileNavLinkStyle} onClick={() => setIsMobileMenuOpen(false)}>
            Carrito
          </Link>

          <div
            style={{
              borderTop: "1px solid rgba(15,23,42,0.08)",
              marginTop: "2px",
              paddingTop: "8px",
              display: "grid",
              gap: "8px",
            }}
          >
            {authLoading ? (
              <span
                style={{
                  ...mobileActionBtnStyle,
                  cursor: "default",
                  fontWeight: 500,
                  background: "rgba(248,250,252,0.95)",
                }}
              >
                Cargando sesion...
              </span>
            ) : user ? (
              <>
                <span
                  style={{
                    ...mobileActionBtnStyle,
                    cursor: "default",
                    background: "rgba(248,250,252,0.95)",
                  }}
                  title={String(userLabel)}
                >
                  {String(userLabel)}
                </span>
                {canAccessAdmin && (
                  <Link
                    href="/admin"
                    style={mobileActionBtnStyle}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Ir al panel admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  style={mobileActionBtnStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Ir al dashboard
                </Link>
                <button type="button" onClick={logout} disabled={isAuthBusy} style={mobileActionBtnStyle}>
                  {isAuthBusy ? "Cerrando..." : "Cerrar sesion"}
                </button>
              </>
            ) : (
              <Link href="/login" style={mobileActionBtnStyle} onClick={() => setIsMobileMenuOpen(false)}>
                Iniciar sesion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
