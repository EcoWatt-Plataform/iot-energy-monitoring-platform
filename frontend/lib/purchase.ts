export type PlanId = "basico" | "avanzado" | "premium";
export type MeterType = "plug" | "panel";
export type DocumentType = "dni" | "cuit";
export type PropertyType = "casa" | "empresa";

export type MeterSelection = {
  plug: number;
  panel: number;
};

export type PurchaseCart = {
  plan: PlanId | null;
  meters: MeterSelection;
};

export type BuyerFormData = {
  fullName: string;
  phone: string;
  email: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  propertyType: PropertyType;
};

type LegacyPlanId = PlanId;
type LegacyItemId = LegacyPlanId | "dispositivo";
type LegacyCartItem = {
  id: LegacyItemId;
  nombre: string;
  precio: number;
  cantidad: number;
};

export const PURCHASE_CART_KEY = "ecowatt_purchase_cart_v3";
export const CHECKOUT_DRAFT_KEY = "ecowatt_checkout_form_v3";

export const PLAN_CONFIG: Record<
  PlanId,
  {
    label: string;
    monthlyPrice: number;
    maxMeters: number;
    historyMonths: number;
    dashboard: string;
    alerts: string;
    summary: string;
  }
> = {
  basico: {
    label: "Basico",
    monthlyPrice: 1500,
    maxMeters: 1,
    historyMonths: 3,
    dashboard: "Diario y mensual",
    alerts: "Simples",
    summary: "Ideal para empezar y monitorear 1 medidor.",
  },
  avanzado: {
    label: "Avanzado",
    monthlyPrice: 2900,
    maxMeters: 3,
    historyMonths: 12,
    dashboard: "Diario, semanal, mensual y comparativo",
    alerts: "Simples",
    summary: "Incluye Basico y permite hasta 3 medidores.",
  },
  premium: {
    label: "Premium",
    monthlyPrice: 4500,
    maxMeters: 6,
    historyMonths: 24,
    dashboard: "Completo con comparativas avanzadas",
    alerts: "Avanzadas",
    summary: "Para monitoreo intensivo con hasta 6 medidores.",
  },
};

export const METER_PRODUCTS: Record<
  MeterType,
  {
    label: string;
    price: number;
    description: string;
  }
> = {
  plug: {
    label: "EcoWatt Plug",
    price: 12000,
    description: "Medidor enchufable para electrodomesticos individuales.",
  },
  panel: {
    label: "EcoWatt Panel",
    price: 18000,
    description: "Medidor de tablero para circuitos completos del hogar o negocio.",
  },
};

export const DEFAULT_CART: PurchaseCart = {
  plan: null,
  meters: { plug: 0, panel: 0 },
};

export const DEFAULT_BUYER_FORM: BuyerFormData = {
  fullName: "",
  phone: "",
  email: "",
  documentType: "dni",
  documentNumber: "",
  address: "",
  propertyType: "casa",
};

export function totalMeters(meters: MeterSelection): number {
  return sanitizeQty(meters.plug) + sanitizeQty(meters.panel);
}

export function getPlanMaxMeters(plan: PlanId | null): number {
  if (!plan) return 0;
  return PLAN_CONFIG[plan].maxMeters;
}

export function meterHardwareTotal(meters: MeterSelection): number {
  return (
    sanitizeQty(meters.plug) * METER_PRODUCTS.plug.price +
    sanitizeQty(meters.panel) * METER_PRODUCTS.panel.price
  );
}

export function overallTotal(cart: PurchaseCart): number {
  const planMonthly = cart.plan ? PLAN_CONFIG[cart.plan].monthlyPrice : 0;
  return planMonthly + meterHardwareTotal(cart.meters);
}

function sanitizeQty(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function clampMetersToLimit(meters: MeterSelection, maxMeters: number): MeterSelection {
  let plug = sanitizeQty(meters.plug);
  let panel = sanitizeQty(meters.panel);
  let total = plug + panel;

  if (total <= maxMeters) {
    return { plug, panel };
  }

  let overflow = total - maxMeters;
  const panelReduction = Math.min(panel, overflow);
  panel -= panelReduction;
  overflow -= panelReduction;
  if (overflow > 0) {
    plug = Math.max(0, plug - overflow);
  }

  total = plug + panel;
  if (total > maxMeters) {
    plug = Math.max(0, maxMeters - panel);
  }

  return { plug, panel };
}

export function normalizeCart(raw: unknown): PurchaseCart {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CART, meters: { ...DEFAULT_CART.meters } };
  }

  const maybeLegacy = raw as { id?: unknown; items?: unknown };
  if (Array.isArray(maybeLegacy)) {
    return normalizeLegacyCart(maybeLegacy);
  }

  const obj = raw as { plan?: unknown; meters?: unknown };
  const rawPlan = String(obj.plan ?? "").trim().toLowerCase();
  const plan: PlanId | null =
    rawPlan === "basico" || rawPlan === "avanzado" || rawPlan === "premium"
      ? (rawPlan as PlanId)
      : null;

  const rawMeters =
    obj.meters && typeof obj.meters === "object"
      ? (obj.meters as { plug?: unknown; panel?: unknown })
      : {};
  const meters = {
    plug: sanitizeQty(rawMeters.plug),
    panel: sanitizeQty(rawMeters.panel),
  };

  const maxMeters = getPlanMaxMeters(plan);
  return {
    plan,
    meters: plan ? clampMetersToLimit(meters, maxMeters) : { plug: 0, panel: 0 },
  };
}

function normalizeLegacyCart(raw: unknown[]): PurchaseCart {
  const items = raw as LegacyCartItem[];
  let plan: PlanId | null = null;
  let legacyDeviceQty = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (item.id === "basico" || item.id === "avanzado" || item.id === "premium") {
      plan = item.id;
    }
    if (item.id === "dispositivo") {
      legacyDeviceQty += sanitizeQty(item.cantidad);
    }
  }

  if (!plan) {
    return { ...DEFAULT_CART, meters: { ...DEFAULT_CART.meters } };
  }

  const maxMeters = getPlanMaxMeters(plan);
  const meters = clampMetersToLimit({ plug: legacyDeviceQty, panel: 0 }, maxMeters);
  return { plan, meters };
}

export function readPurchaseCart(): PurchaseCart {
  if (typeof window === "undefined") {
    return { ...DEFAULT_CART, meters: { ...DEFAULT_CART.meters } };
  }

  try {
    const raw = localStorage.getItem(PURCHASE_CART_KEY);
    if (raw) {
      return normalizeCart(JSON.parse(raw));
    }

    const legacyRaw = localStorage.getItem("ecowatt_cart_v2");
    if (legacyRaw) {
      return normalizeCart(JSON.parse(legacyRaw));
    }
  } catch {
    return { ...DEFAULT_CART, meters: { ...DEFAULT_CART.meters } };
  }

  return { ...DEFAULT_CART, meters: { ...DEFAULT_CART.meters } };
}

export function writePurchaseCart(cart: PurchaseCart): PurchaseCart {
  const normalized = normalizeCart(cart);
  if (typeof window !== "undefined") {
    localStorage.setItem(PURCHASE_CART_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearPurchaseCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PURCHASE_CART_KEY);
}

export function readCheckoutDraft(): BuyerFormData {
  if (typeof window === "undefined") return { ...DEFAULT_BUYER_FORM };
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return { ...DEFAULT_BUYER_FORM };
    const parsed = JSON.parse(raw) as Partial<BuyerFormData>;
    return {
      fullName: String(parsed.fullName ?? ""),
      phone: String(parsed.phone ?? ""),
      email: String(parsed.email ?? ""),
      documentType: parsed.documentType === "cuit" ? "cuit" : "dni",
      documentNumber: String(parsed.documentNumber ?? ""),
      address: String(parsed.address ?? ""),
      propertyType: parsed.propertyType === "empresa" ? "empresa" : "casa",
    };
  } catch {
    return { ...DEFAULT_BUYER_FORM };
  }
}

export function writeCheckoutDraft(form: BuyerFormData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(form));
}

export function clearCheckoutDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHECKOUT_DRAFT_KEY);
}
