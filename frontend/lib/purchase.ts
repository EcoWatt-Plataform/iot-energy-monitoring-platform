export type PlanId = "basico" | "avanzado" | "premium";
export type MeterType = "plug" | "panel_1f" | "panel_3f" | "extra_phase";
export type MeterCountType = "plug" | "panel_1f" | "panel_3f";
export type DocumentType = "dni" | "cuit";
export type PropertyType = "casa" | "empresa";

export type MeterSelection = {
  plug: number;
  panel_1f: number;
  panel_3f: number;
  extra_phase: number;
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
    history: string;
    dashboard: string;
    alerts: string;
    exports: string;
    summary: string;
  }
> = {
  basico: {
    label: "Basico",
    monthlyPrice: 7900,
    maxMeters: 1,
    history: "3 meses",
    dashboard: "Diario y mensual",
    alerts: "Simples",
    exports: "No incluido",
    summary: "Plan base SaaS para empezar con 1 medidor.",
  },
  avanzado: {
    label: "Avanzado",
    monthlyPrice: 12900,
    maxMeters: 3,
    history: "12 meses",
    dashboard: "Diario, semanal, mensual y comparativas",
    alerts: "Simples",
    exports: "No incluido",
    summary: "Incluye Basico y escala hasta 3 medidores.",
  },
  premium: {
    label: "Premium",
    monthlyPrice: 19900,
    maxMeters: 6,
    history: "Extendido",
    dashboard: "Completo con comparativas avanzadas",
    alerts: "Avanzadas",
    exports: "CSV / PDF / Excel",
    summary: "Plan completo con exportaciones exclusivas y hasta 6 medidores.",
  },
};

export const METER_PRODUCTS: Record<
  MeterType,
  {
    label: string;
    price: number;
    description: string;
    countsAsMeter: boolean;
  }
> = {
  plug: {
    label: "EcoWatt Plug",
    price: 49900,
    description: "Enchufable entre toma y dispositivo.",
    countsAsMeter: true,
  },
  panel_1f: {
    label: "EcoWatt Panel 1 fase",
    price: 149900,
    description: "Medidor de tablero 1F, incluye 1 pinza CT.",
    countsAsMeter: true,
  },
  panel_3f: {
    label: "EcoWatt Panel 3 fases",
    price: 219900,
    description: "Medidor de tablero 3F, incluye 3 pinzas CT.",
    countsAsMeter: true,
  },
  extra_phase: {
    label: "Fase extra",
    price: 34900,
    description: "Pinza CT adicional + configuracion.",
    countsAsMeter: false,
  },
};

export const METER_COUNT_TYPES: MeterCountType[] = ["plug", "panel_1f", "panel_3f"];

export const DEFAULT_CART: PurchaseCart = {
  plan: null,
  meters: { plug: 0, panel_1f: 0, panel_3f: 0, extra_phase: 0 },
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
  return (
    sanitizeQty(meters.plug) +
    sanitizeQty(meters.panel_1f) +
    sanitizeQty(meters.panel_3f)
  );
}

export function getPlanMaxMeters(plan: PlanId | null): number {
  if (!plan) return 0;
  return PLAN_CONFIG[plan].maxMeters;
}

export function meterHardwareTotal(meters: MeterSelection): number {
  return (
    sanitizeQty(meters.plug) * METER_PRODUCTS.plug.price +
    sanitizeQty(meters.panel_1f) * METER_PRODUCTS.panel_1f.price +
    sanitizeQty(meters.panel_3f) * METER_PRODUCTS.panel_3f.price +
    sanitizeQty(meters.extra_phase) * METER_PRODUCTS.extra_phase.price
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
  let panel1f = sanitizeQty(meters.panel_1f);
  let panel3f = sanitizeQty(meters.panel_3f);
  let extraPhase = sanitizeQty(meters.extra_phase);

  let total = plug + panel1f + panel3f;
  if (total > maxMeters) {
    let overflow = total - maxMeters;

    const reducePanel3f = Math.min(panel3f, overflow);
    panel3f -= reducePanel3f;
    overflow -= reducePanel3f;

    const reducePanel1f = Math.min(panel1f, overflow);
    panel1f -= reducePanel1f;
    overflow -= reducePanel1f;

    if (overflow > 0) {
      plug = Math.max(0, plug - overflow);
    }
  }

  total = plug + panel1f + panel3f;
  if (total <= 0) {
    extraPhase = 0;
  }

  return {
    plug,
    panel_1f: panel1f,
    panel_3f: panel3f,
    extra_phase: extraPhase,
  };
}

export function normalizeCart(raw: unknown): PurchaseCart {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CART, meters: { ...DEFAULT_CART.meters } };
  }

  if (Array.isArray(raw)) {
    return normalizeLegacyCart(raw as unknown[]);
  }

  const obj = raw as { plan?: unknown; meters?: unknown };
  const rawPlan = String(obj.plan ?? "").trim().toLowerCase();
  const plan: PlanId | null =
    rawPlan === "basico" || rawPlan === "avanzado" || rawPlan === "premium"
      ? (rawPlan as PlanId)
      : null;

  const rawMeters =
    obj.meters && typeof obj.meters === "object"
      ? (obj.meters as Partial<Record<MeterType | "panel", unknown>>)
      : {};

  const meters: MeterSelection = {
    plug: sanitizeQty(rawMeters.plug),
    panel_1f: sanitizeQty(rawMeters.panel_1f ?? rawMeters.panel),
    panel_3f: sanitizeQty(rawMeters.panel_3f),
    extra_phase: sanitizeQty(rawMeters.extra_phase),
  };

  const maxMeters = getPlanMaxMeters(plan);
  return {
    plan,
    meters: plan ? clampMetersToLimit(meters, maxMeters) : { ...DEFAULT_CART.meters },
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
  const meters = clampMetersToLimit(
    { plug: legacyDeviceQty, panel_1f: 0, panel_3f: 0, extra_phase: 0 },
    maxMeters
  );
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
