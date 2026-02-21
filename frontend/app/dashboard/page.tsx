"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { createClient } from "@/lib/supabase/client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title
);

type Plan = "basico" | "avanzado" | "premium";
type DownloadKind = "monthly" | "daily" | "alerts";

type Device = { id: number; name: string };

type DailyPoint = { date: string; kwh: number };
type DailyChartDataset = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  pointRadius: number;
  tension: number;
};
type DailyChartData = { labels: string[]; datasets: DailyChartDataset[] };
type BarChartDataset = {
  label: string;
  data: number[];
  borderColor?: string | string[];
  backgroundColor?: string | string[];
  borderWidth?: number;
};
type BarChartData = { labels: string[]; datasets: BarChartDataset[] };
type DailyMetricsDay = { day?: string; energy_kwh?: number; energy_wh?: number };
type DailyMetricsResponse = { days?: DailyMetricsDay[]; error?: string };

type SummaryDevice = {
  id: number;
  name: string;
  energy_kwh: number;
  energy_wh?: number;
  monthly_threshold_wh?: number;
};
type AlertItem = {
  device_id?: number;
  device_name: string;
  energy_wh: number;
  threshold_wh: number;
  exceed_wh?: number;
  exceed_pct?: number;
  crossed_at?: string | null;
  type?: string;
};

type SummaryResponse = {
  month: string;
  device_id?: number | null;
  month_total_kwh?: number;
  month_measurements?: number;
  top_consumer?: SummaryDevice | null;
  devices?: SummaryDevice[];
  alerts?: AlertItem[];
};

const PLAN_LABELS: Record<Plan, string> = {
  basico: "Básico",
  avanzado: "Avanzado",
  premium: "Premium",
};

function normalizePlan(value: unknown): Plan {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();

  if (raw === "premium" || raw === "plan_premium" || raw === "pro") {
    return "premium";
  }
  if (raw === "avanzado" || raw === "advanced" || raw === "plan_avanzado") {
    return "avanzado";
  }
  return "basico";
}

function resolvePlanFromMetadata(metadata: unknown): Plan {
  if (!metadata || typeof metadata !== "object") {
    return "basico";
  }

  const meta = metadata as Record<string, unknown>;
  return normalizePlan(
    meta.plan ??
      meta.subscription_plan ??
      meta.subscription ??
      meta.tier ??
      meta.plan_name
  );
}

function fallbackCsvFilename(kind: DownloadKind, month: string, deviceId: number | null) {
  const prefix =
    kind === "monthly" ? "measurements" : kind === "daily" ? "daily" : "alerts";

  let filename = `${prefix}_${month}`;
  if (deviceId !== null) filename += `_device${deviceId}`;
  return `${filename}.csv`;
}

function filenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;

  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return fallback;
    }
  }

  const ascii = disposition.match(/filename="?([^\";]+)"?/i);
  if (ascii?.[1]) return ascii[1];
  return fallback;
}

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthDateRange(month: string) {
  const [yRaw, mRaw] = month.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error("Mes inválido. Usa formato YYYY-MM.");
  }

  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getErrorMessage(error: unknown, fallback = "Error") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function startOfWeekLabel(isoDate: string) {
  return `Semana de ${isoDate}`;
}

const DAILY_WINDOW_SIZE_MOBILE = 7;
const WEEKLY_WINDOW_SIZE_MOBILE = 4;
const MONTHLY_WINDOW_SIZE_MOBILE = 5;
const COMPARE_WINDOW_SIZE_MOBILE = 5;

function sliceBarChartWindow(
  data: BarChartData,
  start: number,
  size: number
): BarChartData {
  const end = start + size;
  return {
    labels: data.labels.slice(start, end),
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      data: dataset.data.slice(start, end),
      backgroundColor: Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor.slice(start, end)
        : dataset.backgroundColor,
      borderColor: Array.isArray(dataset.borderColor)
        ? dataset.borderColor.slice(start, end)
        : dataset.borderColor,
    })),
  };
}

/** =========================
 *  COLORES (EcoWatt vibe)
 *  ========================= */
const PALETTE = [
  "#6992EB",
  "#9B6CEB",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#A855F7",
];

function colorForIndex(i: number) {
  return PALETTE[i % PALETTE.length];
}

function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function groupWeekly(points: DailyPoint[]) {
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    const sum = chunk.reduce((acc, p) => acc + (Number(p.kwh) || 0), 0);
    const label = chunk[0]?.date
      ? startOfWeekLabel(chunk[0].date)
      : `Semana ${out.length + 1}`;
    out.push({ label, value: sum });
  }
  return out;
}

function sumMonthly(points: DailyPoint[]) {
  return points.reduce((acc, p) => acc + (Number(p.kwh) || 0), 0);
}

function fadeUp(delayMs = 0): React.CSSProperties {
  return {
    animation: `ecoDashboardFadeUp 460ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both`,
  };
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [plan, setPlan] = useState<Plan>("basico");
  const [planLoading, setPlanLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState<DownloadKind | null>(null);
  const [copyingToken, setCopyingToken] = useState(false);
  const [tokenCopyMessage, setTokenCopyMessage] = useState<string | null>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [month, setMonth] = useState<string>(toYYYYMM(new Date()));

  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  // daily (cuando elegís UN dispositivo)
  const [daily, setDaily] = useState<DailyPoint[]>([]);

  // dailyByDevice (cuando elegís TODOS)
  const [dailyByDevice, setDailyByDevice] = useState<Record<number, DailyPoint[]>>(
    {}
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasLoadedDaily, setHasLoadedDaily] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [dailyWindowStart, setDailyWindowStart] = useState(0);
  const [weeklyWindowStart, setWeeklyWindowStart] = useState(0);
  const [monthlyWindowStart, setMonthlyWindowStart] = useState(0);
  const [compareWindowStart, setCompareWindowStart] = useState(0);
  const [chartAnimationSeed, setChartAnimationSeed] = useState(0);

  // Selector de período (según plan)
  type Period = "daily" | "weekly" | "monthly" | "compare";
  const [period, setPeriod] = useState<Period>("daily");

  function handlePeriodTabClick(nextPeriod: Period) {
    setPeriod(nextPeriod);
    // Fuerza remount del grafico para reactivar animacion en cada click.
    setChartAnimationSeed((prev) => prev + 1);
  }

  const deviceOptions = useMemo(() => {
    return [{ id: 0, name: "Todos (comparar)" }, ...devices];
  }, [devices]);

  /** =========================
   *  DESCARGABLES (solo Premium)
   *  ========================= */
  const csvUrl = useMemo(() => {
    // CSV completo (mediciones)
    let u = `/api/v1/export/measurements.csv?month=${encodeURIComponent(month)}`;
    if (selectedDeviceId !== null) u += `&device_id=${selectedDeviceId}`;
    return u;
  }, [month, selectedDeviceId]);

  const dailyCsvUrl = useMemo(() => {
    // CSV diario
    let u = `/api/v1/export/daily.csv?month=${encodeURIComponent(month)}`;
    if (selectedDeviceId !== null) u += `&device_id=${selectedDeviceId}`;
    return u;
  }, [month, selectedDeviceId]);

  const alertsCsvUrl = useMemo(() => {
    // CSV alertas
    let u = `/api/v1/export/alerts.csv?month=${encodeURIComponent(month)}`;
    if (selectedDeviceId !== null) u += `&device_id=${selectedDeviceId}`;
    return u;
  }, [month, selectedDeviceId]);

  /** =========================
   *  FETCHES
   *  ========================= */
  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message || "No se pudo validar la sesion.");
    }

    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Sesion expirada. Inicia sesion nuevamente.");
    }

    return token;
  }

  async function copyAccessToken() {
    setTokenCopyMessage(null);
    setCopyingToken(true);

    try {
      const token = await getAccessToken();

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = token;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        textarea.remove();
        if (!success) {
          throw new Error(
            "Tu navegador no permite el copiado automático al portapapeles. Copia el token manualmente desde la interfaz."
          );
        }
      }

      setTokenCopyMessage("Token copiado al portapapeles.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo copiar el token. Intenta nuevamente.";
      setTokenCopyMessage(message);
    } finally {
      setCopyingToken(false);
    }
  }

  async function authFetch(url: string, init: RequestInit = {}) {
    const token = await getAccessToken();
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...init,
      headers,
    });
  }

  async function downloadCsv(kind: DownloadKind, url: string) {
    try {
      setErr(null);
      setDownloadingCsv(kind);

      const res = await authFetch(url);
      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const payload = await res.json();
          throw new Error(payload.error || `No se pudo descargar el CSV (${res.status}).`);
        }
        throw new Error(`No se pudo descargar el CSV (${res.status}).`);
      }

      const blob = await res.blob();
      const fallback = fallbackCsvFilename(kind, month, selectedDeviceId);
      const filename = filenameFromDisposition(
        res.headers.get("Content-Disposition"),
        fallback
      );

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo descargar el archivo.";
      setErr(message);
    } finally {
      setDownloadingCsv(null);
    }
  }

  async function loadDevices() {
    const res = await authFetch("/api/v1/devices");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error cargando dispositivos");
    setDevices(Array.isArray(data) ? data : []);
  }

  async function loadSummary(nextMonth = month, nextDeviceId = selectedDeviceId) {
    let url = `/api/v1/metrics/summary_month?month=${encodeURIComponent(nextMonth)}`;
    if (nextDeviceId !== null) url += `&device_id=${nextDeviceId}`;

    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error cargando resumen");
    setSummary(data);
  }

  function toDailyPoints(payload: DailyMetricsResponse): DailyPoint[] {
    const days = Array.isArray(payload.days) ? payload.days : [];
    return days
      .map((d) => {
        const date = String(d.day || "");
        const kwh =
          d.energy_kwh !== undefined
            ? Number(d.energy_kwh)
            : Number(d.energy_wh || 0) / 1000;
        return { date, kwh };
      })
      .filter((d) => d.date && Number.isFinite(d.kwh));
  }

  async function fetchDailyForDevice(deviceId: number, nextMonth: string) {
    const { from, to } = monthDateRange(nextMonth);
    const url = `/api/v1/metrics/daily?device_id=${deviceId}&from=${from}&to=${to}`;

    const res = await authFetch(url);
    const data = (await res.json()) as DailyMetricsResponse;
    if (!res.ok) {
      throw new Error(data.error || `Error cargando métricas diarias (${res.status}).`);
    }
    return toDailyPoints(data);
  }

  /**
   * Diario:
   * - Si hay device seleccionado -> usa /metrics/daily
   * - Si es "Todos" -> consulta /metrics/daily por cada device
   */
  async function loadDaily(nextMonth = month, nextDeviceId = selectedDeviceId) {
    // Caso A: Un dispositivo
    if (nextDeviceId !== null) {
      setDailyByDevice({});
      const points = await fetchDailyForDevice(nextDeviceId, nextMonth);
      setDaily(points);
      return;
    }

    // Caso B: Todos
    setDaily([]);
    if (!devices.length) {
      setDailyByDevice({});
      return;
    }

    const entries = await Promise.all(
      devices.map(async (d) => {
        try {
          const points = await fetchDailyForDevice(d.id, nextMonth);
          return { deviceId: d.id, points, failed: false } as const;
        } catch {
          return { deviceId: d.id, points: [] as DailyPoint[], failed: true } as const;
        }
      })
    );

    if (entries.every((e) => e.failed)) {
      throw new Error("No se pudieron cargar las métricas diarias. Intenta refrescar.");
    }

    const obj: Record<number, DailyPoint[]> = {};
    for (const entry of entries) obj[entry.deviceId] = entry.points;
    setDailyByDevice(obj);
  }

  async function refreshAll() {
    setLoading(true);
    setHasLoadedDaily(false);
    setErr(null);
    setSummary(null);
    try {
      await loadSummary(month, selectedDeviceId);
      await loadDaily(month, selectedDeviceId);
      setHasLoadedDaily(true);
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadDevices();
      } catch (e: unknown) {
        setErr(getErrorMessage(e));
      }
    })();
  }, []);

  useEffect(() => {
    function onResize() {
      setIsMobileViewport(window.innerWidth < 768);
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        setPlan(resolvePlanFromMetadata(user?.user_metadata));
      } catch {
        if (!mounted) return;
        setPlan("basico");
      } finally {
        if (mounted) setPlanLoading(false);
      }
    }

    loadPlan();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setPlan(resolvePlanFromMetadata(session?.user?.user_metadata));
      setPlanLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedDeviceId, devices.length]);

  /** =========================
   *  TRANSFORMACIONES
   *  ========================= */

  // comparativo: usa summary.devices
  const compare = useMemo(() => {
    const list = summary?.devices || [];
    return list.map((d) => ({ label: d.name, value: Number(d.energy_kwh || 0) }));
  }, [summary]);

  /** =========================
   *  CHART DATASETS
   *  ========================= */

  // ---------- DAILY ----------
  const dailyLineData = useMemo<DailyChartData>(() => {
    // 1 device
    if (selectedDeviceId !== null) {
      const color = "#6992EB";
      return {
        labels: daily.map((p) => p.date),
        datasets: [
          {
            label: "kWh por día",
            data: daily.map((p) => p.kwh),
            borderColor: color,
            backgroundColor: withAlpha(color, 0.22),
            pointRadius: 2,
            tension: 0.35,
          },
        ],
      };
    }

    // Todos: un dataset por device
    const ids = devices.map((d) => d.id);

    const labelSet = new Set<string>();
    ids.forEach((id) =>
      (dailyByDevice[id] || []).forEach((p) => labelSet.add(p.date))
    );
    const labels = Array.from(labelSet).sort();

    const datasets = ids.map((id, i) => {
      const dev = devices.find((d) => d.id === id);
      const map = new Map((dailyByDevice[id] || []).map((p) => [p.date, p.kwh]));
      const color = colorForIndex(i);

      return {
        label: dev?.name ?? `Dispositivo ${id}`,
        data: labels.map((dt) => map.get(dt) ?? 0),
        borderColor: color,
        backgroundColor: withAlpha(color, 0.16),
        pointRadius: 2,
        tension: 0.35,
      };
    });

    return { labels, datasets };
  }, [selectedDeviceId, daily, devices, dailyByDevice]);

  const totalDailyPoints = dailyLineData.labels.length;
  const dailyWindowSize = isMobileViewport
    ? Math.min(DAILY_WINDOW_SIZE_MOBILE, Math.max(1, totalDailyPoints))
    : totalDailyPoints;
  const maxDailyWindowStart = Math.max(0, totalDailyPoints - dailyWindowSize);
  const clampedDailyWindowStart = Math.min(dailyWindowStart, maxDailyWindowStart);

  useEffect(() => {
    if (!isMobileViewport) {
      setDailyWindowStart(0);
      return;
    }
    setDailyWindowStart(maxDailyWindowStart);
  }, [isMobileViewport, maxDailyWindowStart, month, selectedDeviceId]);

  const dailyChartData = useMemo<DailyChartData>(() => {
    if (!isMobileViewport || totalDailyPoints <= DAILY_WINDOW_SIZE_MOBILE) {
      return dailyLineData;
    }

    const start = clampedDailyWindowStart;
    const end = start + dailyWindowSize;
    return {
      labels: dailyLineData.labels.slice(start, end),
      datasets: dailyLineData.datasets.map((dataset) => ({
        ...dataset,
        data: dataset.data.slice(start, end),
      })),
    };
  }, [
    clampedDailyWindowStart,
    dailyLineData,
    dailyWindowSize,
    isMobileViewport,
    totalDailyPoints,
  ]);

  const dailyWindowLabel =
    totalDailyPoints === 0
      ? ""
      : `${clampedDailyWindowStart + 1}-${Math.min(
          totalDailyPoints,
          clampedDailyWindowStart + dailyWindowSize
        )} de ${totalDailyPoints}`;

  // ---------- WEEKLY ----------
  const weeklyBarData = useMemo<BarChartData>(() => {
    // 1 device: barras por semana
    if (selectedDeviceId !== null) {
      const items = groupWeekly(daily);
      const base = "#9B6CEB";
      return {
        labels: items.map((x) => x.label),
        datasets: [
          {
            label: "kWh por semana",
            data: items.map((x) => x.value),
            borderColor: base,
            backgroundColor: withAlpha(base, 0.35),
          },
        ],
      };
    }

    // Todos: barras agrupadas (una serie por device)
    const ids = devices.map((d) => d.id);

    const weeklyById: Record<number, { label: string; value: number }[]> = {};
    ids.forEach((id) => (weeklyById[id] = groupWeekly(dailyByDevice[id] || [])));

    const labelSet = new Set<string>();
    ids.forEach((id) => weeklyById[id].forEach((w) => labelSet.add(w.label)));
    const labels = Array.from(labelSet);

    const datasets = ids.map((id, i) => {
      const dev = devices.find((d) => d.id === id);
      const map = new Map(weeklyById[id].map((w) => [w.label, w.value]));
      const color = colorForIndex(i);

      return {
        label: dev?.name ?? `Dispositivo ${id}`,
        data: labels.map((lb) => map.get(lb) ?? 0),
        borderColor: color,
        backgroundColor: withAlpha(color, 0.35),
      };
    });

    return { labels, datasets };
  }, [selectedDeviceId, daily, devices, dailyByDevice]);

  const totalWeeklyPoints = weeklyBarData.labels.length;
  const weeklyWindowSize = isMobileViewport
    ? Math.min(WEEKLY_WINDOW_SIZE_MOBILE, Math.max(1, totalWeeklyPoints))
    : totalWeeklyPoints;
  const maxWeeklyWindowStart = Math.max(0, totalWeeklyPoints - weeklyWindowSize);
  const clampedWeeklyWindowStart = Math.min(weeklyWindowStart, maxWeeklyWindowStart);

  useEffect(() => {
    if (!isMobileViewport) {
      setWeeklyWindowStart(0);
      return;
    }
    setWeeklyWindowStart(maxWeeklyWindowStart);
  }, [isMobileViewport, maxWeeklyWindowStart, month, selectedDeviceId]);

  const weeklyChartData = useMemo<BarChartData>(() => {
    if (!isMobileViewport || totalWeeklyPoints <= WEEKLY_WINDOW_SIZE_MOBILE) {
      return weeklyBarData;
    }
    return sliceBarChartWindow(
      weeklyBarData,
      clampedWeeklyWindowStart,
      weeklyWindowSize
    );
  }, [
    clampedWeeklyWindowStart,
    isMobileViewport,
    totalWeeklyPoints,
    weeklyBarData,
    weeklyWindowSize,
  ]);

  const weeklyWindowLabel =
    totalWeeklyPoints === 0
      ? ""
      : `${clampedWeeklyWindowStart + 1}-${Math.min(
          totalWeeklyPoints,
          clampedWeeklyWindowStart + weeklyWindowSize
        )} de ${totalWeeklyPoints}`;

  // ---------- MONTHLY ----------
  const monthlyBarData = useMemo<BarChartData>(() => {
    // 1 device: 1 barra
    if (selectedDeviceId !== null) {
      const sum = sumMonthly(daily);
      const base = "#9B6CEB";
      return {
        labels: [month],
        datasets: [
          {
            label: "kWh (mes)",
            data: [sum],
            borderColor: base,
            backgroundColor: withAlpha(base, 0.35),
          },
        ],
      };
    }

    // Todos: 1 barra por device (comparativo mensual)
    const labels = devices.map((d) => d.name);
    const data = devices.map((d) => sumMonthly(dailyByDevice[d.id] || []));
    const colors = devices.map((_, i) => withAlpha(colorForIndex(i), 0.55));
    const borders = devices.map((_, i) => colorForIndex(i));

    return {
      labels,
      datasets: [
        {
          label: `kWh por dispositivo (${month})`,
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
        },
      ],
    };
  }, [selectedDeviceId, daily, devices, dailyByDevice, month]);

  const totalMonthlyPoints = monthlyBarData.labels.length;
  const monthlyWindowSize = isMobileViewport
    ? Math.min(MONTHLY_WINDOW_SIZE_MOBILE, Math.max(1, totalMonthlyPoints))
    : totalMonthlyPoints;
  const maxMonthlyWindowStart = Math.max(0, totalMonthlyPoints - monthlyWindowSize);
  const clampedMonthlyWindowStart = Math.min(monthlyWindowStart, maxMonthlyWindowStart);

  useEffect(() => {
    if (!isMobileViewport) {
      setMonthlyWindowStart(0);
      return;
    }
    setMonthlyWindowStart(maxMonthlyWindowStart);
  }, [isMobileViewport, maxMonthlyWindowStart, month, selectedDeviceId]);

  const monthlyChartData = useMemo<BarChartData>(() => {
    if (!isMobileViewport || totalMonthlyPoints <= MONTHLY_WINDOW_SIZE_MOBILE) {
      return monthlyBarData;
    }
    return sliceBarChartWindow(
      monthlyBarData,
      clampedMonthlyWindowStart,
      monthlyWindowSize
    );
  }, [
    clampedMonthlyWindowStart,
    isMobileViewport,
    monthlyBarData,
    monthlyWindowSize,
    totalMonthlyPoints,
  ]);

  const monthlyWindowLabel =
    totalMonthlyPoints === 0
      ? ""
      : `${clampedMonthlyWindowStart + 1}-${Math.min(
          totalMonthlyPoints,
          clampedMonthlyWindowStart + monthlyWindowSize
        )} de ${totalMonthlyPoints}`;

  // ---------- COMPARE ----------
  const compareBarData = useMemo<BarChartData>(() => {
    const bg = compare.map((_, i) => withAlpha(colorForIndex(i), 0.55));
    const border = compare.map((_, i) => colorForIndex(i));

    return {
      labels: compare.map((x) => x.label),
      datasets: [
        {
          label: "Comparativo por dispositivo",
          data: compare.map((x) => x.value),
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
        },
      ],
    };
  }, [compare]);

  const totalComparePoints = compareBarData.labels.length;
  const compareWindowSize = isMobileViewport
    ? Math.min(COMPARE_WINDOW_SIZE_MOBILE, Math.max(1, totalComparePoints))
    : totalComparePoints;
  const maxCompareWindowStart = Math.max(0, totalComparePoints - compareWindowSize);
  const clampedCompareWindowStart = Math.min(compareWindowStart, maxCompareWindowStart);

  useEffect(() => {
    if (!isMobileViewport) {
      setCompareWindowStart(0);
      return;
    }
    setCompareWindowStart(maxCompareWindowStart);
  }, [isMobileViewport, maxCompareWindowStart, month, selectedDeviceId]);

  const compareChartData = useMemo<BarChartData>(() => {
    if (!isMobileViewport || totalComparePoints <= COMPARE_WINDOW_SIZE_MOBILE) {
      return compareBarData;
    }
    return sliceBarChartWindow(
      compareBarData,
      clampedCompareWindowStart,
      compareWindowSize
    );
  }, [
    clampedCompareWindowStart,
    compareBarData,
    compareWindowSize,
    isMobileViewport,
    totalComparePoints,
  ]);

  const compareWindowLabel =
    totalComparePoints === 0
      ? ""
      : `${clampedCompareWindowStart + 1}-${Math.min(
          totalComparePoints,
          clampedCompareWindowStart + compareWindowSize
        )} de ${totalComparePoints}`;

  const commonOptions = useMemo(() => {
    return {
      responsive: true,
      animation: {
        duration: 750,
        easing: "easeOutQuart" as const,
      },
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: { ticks: { color: "#666" }, grid: { color: "rgba(0,0,0,0.06)" } },
        y: { ticks: { color: "#666" }, grid: { color: "rgba(0,0,0,0.06)" } },
      },
    };
  }, []);

  const dailyOptions = useMemo(() => {
    return {
      ...commonOptions,
      maintainAspectRatio: !isMobileViewport,
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Consumo diario (kWh/día)" },
      },
      scales: {
        ...commonOptions.scales,
        x: {
          ...commonOptions.scales.x,
          ticks: {
            ...commonOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: isMobileViewport ? 7 : 14,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    };
  }, [commonOptions, isMobileViewport]);

  const weeklyOptions = useMemo(() => {
    return {
      ...commonOptions,
      maintainAspectRatio: !isMobileViewport,
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Consumo semanal" },
      },
      scales: {
        ...commonOptions.scales,
        x: {
          ...commonOptions.scales.x,
          ticks: {
            ...commonOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: isMobileViewport ? WEEKLY_WINDOW_SIZE_MOBILE : 12,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    };
  }, [commonOptions, isMobileViewport]);

  const monthlyOptions = useMemo(() => {
    return {
      ...commonOptions,
      maintainAspectRatio: !isMobileViewport,
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Consumo mensual" },
      },
      scales: {
        ...commonOptions.scales,
        x: {
          ...commonOptions.scales.x,
          ticks: {
            ...commonOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: isMobileViewport ? MONTHLY_WINDOW_SIZE_MOBILE : 12,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    };
  }, [commonOptions, isMobileViewport]);

  const compareOptions = useMemo(() => {
    return {
      ...commonOptions,
      maintainAspectRatio: !isMobileViewport,
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Comparativo por dispositivo" },
      },
      scales: {
        ...commonOptions.scales,
        x: {
          ...commonOptions.scales.x,
          ticks: {
            ...commonOptions.scales.x.ticks,
            autoSkip: true,
            maxTicksLimit: isMobileViewport ? COMPARE_WINDOW_SIZE_MOBILE : 12,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      },
    };
  }, [commonOptions, isMobileViewport]);

  /** =========================
   *  REGLAS POR PLAN
   *  ========================= */
  const allowedPeriods: Period[] = useMemo(() => {
    if (plan === "basico") return ["daily"];
    if (plan === "avanzado") return ["daily", "weekly", "monthly"];
    return ["daily", "weekly", "monthly", "compare"]; // premium
  }, [plan]);

  useEffect(() => {
    if (!allowedPeriods.includes(period)) setPeriod(allowedPeriods[0]);
  }, [allowedPeriods, period]);

  useEffect(() => {
    if (!tokenCopyMessage) return;
    const timeoutId = window.setTimeout(() => {
      setTokenCopyMessage(null);
    }, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [tokenCopyMessage]);

  // Alertas según plan
  const canSeeAlerts = plan !== "basico";
  const canDownload = plan === "premium";
  const alerts = summary?.alerts || [];
  const summaryDevices = summary?.devices || [];

  const noDailyData =
    selectedDeviceId !== null
      ? daily.length === 0
      : Object.values(dailyByDevice).every((arr) => (arr || []).length === 0);
  const shouldShowNoDailyData =
    period === "daily" &&
    hasLoadedDaily &&
    !loading &&
    !err &&
    noDailyData &&
    (selectedDeviceId !== null || devices.length > 0);

  return (
    <div style={dashboardPageStyle}>
      <main style={dashboardContentStyle} className="dashboard-main">
      <h1 style={{ fontSize: "34px", marginBottom: "6px", ...fadeUp(0) }}>Dashboard</h1>
      <p style={{ color: "#666", marginTop: 0, ...fadeUp(40) }}>
        Plan activo: {planLoading ? "Cargando..." : PLAN_LABELS[plan]}
      </p>

      {/* Filtros */}
      <div
        className="dashboard-filters"
        style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "end", marginBottom: "18px", ...fadeUp(80) }}
      >
        <div className="dashboard-filter-field" style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Mes</label>
          <input className="dashboard-control-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
        </div>

        <div className="dashboard-filter-field" style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>
            Dispositivo ({devices.length})
          </label>
          <select
            className="dashboard-control-input"
            value={selectedDeviceId ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSelectedDeviceId(v === 0 ? null : v);
            }}
            style={inputStyle}
          >
            {deviceOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={refreshAll} disabled={loading} style={refreshBtn} className="dashboard-lift-btn dashboard-control-btn">
          {loading ? "Cargando..." : "Refrescar"}
        </button>

        {/* DESCARGABLES SOLO PREMIUM */}
        {canDownload && (
          <div className="dashboard-download-row" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              style={dlBtn}
              className="dashboard-lift-btn dashboard-control-btn"
              disabled={downloadingCsv !== null}
              onClick={() => downloadCsv("monthly", csvUrl)}
            >
              {downloadingCsv === "monthly" ? "Descargando..." : "CSV mensual"}
            </button>
            <button
              type="button"
              style={dlBtn}
              className="dashboard-lift-btn dashboard-control-btn"
              disabled={downloadingCsv !== null}
              onClick={() => downloadCsv("daily", dailyCsvUrl)}
            >
              {downloadingCsv === "daily" ? "Descargando..." : "CSV diario"}
            </button>
            <button
              type="button"
              style={dlBtn}
              className="dashboard-lift-btn dashboard-control-btn"
              disabled={downloadingCsv !== null}
              onClick={() => downloadCsv("alerts", alertsCsvUrl)}
            >
              {downloadingCsv === "alerts" ? "Descargando..." : "CSV alertas"}
            </button>
          </div>
        )}
        {!planLoading && !canDownload && (
          <span style={{ color: "#666", fontSize: "13px" }}>
            Descargas CSV disponibles solo para plan Premium.
          </span>
        )}
      </div>

      {err && (
        <div style={{ border: "1px solid #ffb3b3", background: "#ffecec", padding: "12px", borderRadius: "12px", ...fadeUp(120) }}>
          {err}
        </div>
      )}

      {/* Cards */}
      <div className="dashboard-summary-grid" style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: "18px" }}>
        <Card title="Total del mes" value={summary?.month_total_kwh !== undefined ? `${summary.month_total_kwh.toFixed(2)} kWh` : "—"} delayMs={140} />
        <Card title="Mediciones del mes" value={summary?.month_measurements !== undefined ? String(summary.month_measurements) : "—"} delayMs={180} />
      </div>

      {/* Gráficos */}
      <section style={{ ...sectionBox, ...fadeUp(220) }} className="dashboard-surface">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Gráficos</h2>
            <p style={{ margin: "6px 0 0", color: "#666" }}>
              {selectedDeviceId === null ? "Modo: Todos (comparar)" : "Modo: Dispositivo"}
            </p>
          </div>

          <div className="dashboard-period-tabs" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {allowedPeriods.includes("daily") && (
              <button type="button" onClick={() => handlePeriodTabClick("daily")} style={tabBtn(period === "daily")} className="dashboard-lift-btn">
                Diario
              </button>
            )}
            {allowedPeriods.includes("weekly") && (
              <button type="button" onClick={() => handlePeriodTabClick("weekly")} style={tabBtn(period === "weekly")} className="dashboard-lift-btn">
                Semanal
              </button>
            )}
            {allowedPeriods.includes("monthly") && (
              <button type="button" onClick={() => handlePeriodTabClick("monthly")} style={tabBtn(period === "monthly")} className="dashboard-lift-btn">
                Mensual
              </button>
            )}
            {allowedPeriods.includes("compare") && (
              <button type="button" onClick={() => handlePeriodTabClick("compare")} style={tabBtn(period === "compare")} className="dashboard-lift-btn">
                Comparativo
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          {period === "daily" && isMobileViewport && totalDailyPoints > DAILY_WINDOW_SIZE_MOBILE && (
            <div className="dashboard-chart-window-controls">
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página anterior de datos diarios"
                onClick={() =>
                  setDailyWindowStart((prev) =>
                    Math.max(0, prev - DAILY_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedDailyWindowStart <= 0}
              >
                Anterior
              </button>
              <span
                className="dashboard-chart-window-label"
                role="status"
                aria-live="polite"
              >
                {dailyWindowLabel}
              </span>
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página siguiente de datos diarios"
                onClick={() =>
                  setDailyWindowStart((prev) =>
                    Math.min(maxDailyWindowStart, prev + DAILY_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedDailyWindowStart >= maxDailyWindowStart}
              >
                Siguiente
              </button>
            </div>
          )}

          {period === "weekly" && isMobileViewport && totalWeeklyPoints > WEEKLY_WINDOW_SIZE_MOBILE && (
            <div className="dashboard-chart-window-controls">
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página anterior de datos semanales"
                onClick={() =>
                  setWeeklyWindowStart((prev) =>
                    Math.max(0, prev - WEEKLY_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedWeeklyWindowStart <= 0}
              >
                Anterior
              </button>
              <span
                className="dashboard-chart-window-label"
                role="status"
                aria-live="polite"
              >
                {weeklyWindowLabel}
              </span>
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página siguiente de datos semanales"
                onClick={() =>
                  setWeeklyWindowStart((prev) =>
                    Math.min(maxWeeklyWindowStart, prev + WEEKLY_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedWeeklyWindowStart >= maxWeeklyWindowStart}
              >
                Siguiente
              </button>
            </div>
          )}

          {period === "monthly" && isMobileViewport && totalMonthlyPoints > MONTHLY_WINDOW_SIZE_MOBILE && (
            <div className="dashboard-chart-window-controls">
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página anterior de datos mensuales"
                onClick={() =>
                  setMonthlyWindowStart((prev) =>
                    Math.max(0, prev - MONTHLY_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedMonthlyWindowStart <= 0}
              >
                Anterior
              </button>
              <span
                className="dashboard-chart-window-label"
                role="status"
                aria-live="polite"
              >
                {monthlyWindowLabel}
              </span>
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página siguiente de datos mensuales"
                onClick={() =>
                  setMonthlyWindowStart((prev) =>
                    Math.min(maxMonthlyWindowStart, prev + MONTHLY_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedMonthlyWindowStart >= maxMonthlyWindowStart}
              >
                Siguiente
              </button>
            </div>
          )}

          {period === "compare" && isMobileViewport && totalComparePoints > COMPARE_WINDOW_SIZE_MOBILE && (
            <div className="dashboard-chart-window-controls">
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página anterior de datos comparativos"
                onClick={() =>
                  setCompareWindowStart((prev) =>
                    Math.max(0, prev - COMPARE_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedCompareWindowStart <= 0}
              >
                Anterior
              </button>
              <span
                className="dashboard-chart-window-label"
                role="status"
                aria-live="polite"
              >
                {compareWindowLabel}
              </span>
              <button
                type="button"
                className="dashboard-lift-btn"
                style={tabBtn(false)}
                aria-label="Página siguiente de datos comparativos"
                onClick={() =>
                  setCompareWindowStart((prev) =>
                    Math.min(maxCompareWindowStart, prev + COMPARE_WINDOW_SIZE_MOBILE)
                  )
                }
                disabled={clampedCompareWindowStart >= maxCompareWindowStart}
              >
                Siguiente
              </button>
            </div>
          )}

          {period === "daily" && (
            <div style={isMobileViewport ? { height: "290px" } : undefined}>
              <Bar
                key={`chart-daily-${chartAnimationSeed}`}
                data={dailyChartData as unknown as ChartData<"bar", number[], string>}
                options={dailyOptions as unknown as ChartOptions<"bar">}
              />
            </div>
          )}

          {period === "weekly" && (
            <div style={isMobileViewport ? { height: "290px" } : undefined}>
              <Bar
                key={`chart-weekly-${chartAnimationSeed}`}
                data={weeklyChartData as unknown as ChartData<"bar", number[], string>}
                options={weeklyOptions as unknown as ChartOptions<"bar">}
              />
            </div>
          )}

          {period === "monthly" && (
            <div style={isMobileViewport ? { height: "290px" } : undefined}>
              <Bar
                key={`chart-monthly-${chartAnimationSeed}`}
                data={monthlyChartData as unknown as ChartData<"bar", number[], string>}
                options={monthlyOptions as unknown as ChartOptions<"bar">}
              />
            </div>
          )}

          {period === "compare" && (
            <div style={isMobileViewport ? { height: "290px" } : undefined}>
              <Bar
                key={`chart-compare-${chartAnimationSeed}`}
                data={compareChartData as unknown as ChartData<"bar", number[], string>}
                options={compareOptions as unknown as ChartOptions<"bar">}
              />
            </div>
          )}

          {shouldShowNoDailyData && (
            <p style={{ marginTop: "10px", color: "#666" }}>No hay datos diarios para este mes.</p>
          )}
        </div>
      </section>

      <section style={{ ...sectionBox, ...fadeUp(260) }} className="dashboard-surface">
        <AlertsSummaryCard canSeeAlerts={canSeeAlerts} alerts={alerts} devices={summaryDevices} />
      </section>

      <section style={{ ...sectionBox, ...fadeUp(300) }} className="dashboard-surface">
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>
          Usa esta opcion solo cuando necesites pegar el token en el dashboard backend.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
          <button
            type="button"
            onClick={copyAccessToken}
            disabled={copyingToken}
            style={secondaryBtn}
            className="dashboard-lift-btn"
          >
            {copyingToken ? "Copiando token..." : "Copiar access token"}
          </button>
          {tokenCopyMessage && <span style={{ color: "#666", fontSize: "13px" }}>{tokenCopyMessage}</span>}
        </div>
      </section>

      <style jsx global>{`
        @keyframes ecoDashboardFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dashboard-surface {
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }

        .dashboard-surface:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.09);
        }

        .dashboard-lift-btn {
          transition: transform 170ms ease, box-shadow 170ms ease, filter 170ms ease;
        }

        .dashboard-lift-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
          filter: saturate(1.04);
        }

        .dashboard-lift-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        .dashboard-alert-row {
          transition: border-color 220ms ease, background-color 220ms ease, transform 220ms ease, box-shadow 220ms ease;
        }

        .dashboard-alert-row:hover {
          border-color: rgba(59, 130, 246, 0.28);
          background: rgba(239, 246, 255, 0.78);
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
        }

        .dashboard-chart-window-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }

        .dashboard-chart-window-label {
          font-size: 12px;
          color: #475569;
          font-weight: 600;
          text-align: center;
          min-width: 88px;
        }

        @media (max-width: 768px) {
          .dashboard-main {
            max-width: 100% !important;
          }

          .dashboard-filters {
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .dashboard-filter-field {
            width: 100% !important;
          }

          .dashboard-control-input {
            width: 100% !important;
            min-height: 42px;
          }

          .dashboard-control-btn {
            width: 100% !important;
            justify-content: center !important;
          }

          .dashboard-download-row {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .dashboard-summary-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-period-tabs {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .dashboard-surface {
            padding: 12px !important;
          }

          .dashboard-chart-window-controls {
            gap: 6px;
          }

          .dashboard-chart-window-controls button {
            flex: 1;
            padding: 8px 10px !important;
          }

          .dashboard-chart-window-label {
            flex: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dashboard-surface,
          .dashboard-lift-btn,
          .dashboard-alert-row {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      </main>
    </div>
  );
}

/* ================= UI Helpers ================= */

function Card(props: { title: string; value: string; delayMs?: number }) {
  return (
    <div style={{ ...summaryCardStyle, ...fadeUp(props.delayMs ?? 0) }} className="dashboard-surface">
      <div style={{ fontSize: "12px", color: "#666" }}>{props.title}</div>
      <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 800 }}>{props.value}</div>
    </div>
  );
}

function formatCrossedAtLabel(value: string | null | undefined) {
  if (!value) return "Momento de cruce no disponible";

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Momento de cruce no disponible";

  return `Supero umbral: ${dt.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function AlertsSummaryCard(props: {
  canSeeAlerts: boolean;
  alerts: AlertItem[];
  devices: SummaryDevice[];
}) {
  const { canSeeAlerts, alerts, devices } = props;
  const [openDeviceId, setOpenDeviceId] = useState<number | null>(null);
  const alertsByDevice = new Map<number, AlertItem>();
  for (const alert of alerts) {
    if (alert.device_id !== undefined && alert.device_id !== null) {
      alertsByDevice.set(alert.device_id, alert);
    }
  }

  const deviceProgress = [...devices]
    .map((d) => {
      const energyWh = Math.max(
        0,
        Number(
          d.energy_wh !== undefined
            ? d.energy_wh
            : Number(d.energy_kwh || 0) * 1000
        )
      );
      const thresholdWh = Math.max(0, Number(d.monthly_threshold_wh || 0));
      const rawPct = thresholdWh > 0 ? (energyWh / thresholdWh) * 100 : 0;
      const progressPct = Math.max(0, rawPct);
      const clampedPct = Math.min(100, progressPct);
      const exceeded = thresholdWh > 0 && energyWh > thresholdWh;
      const remainingWh = Math.max(0, thresholdWh - energyWh);
      const alert = alertsByDevice.get(d.id);

      return {
        id: d.id,
        name: d.name,
        energyWh,
        thresholdWh,
        progressPct,
        clampedPct,
        exceeded,
        remainingWh,
        crossedAt: alert?.crossed_at ?? null,
      };
    })
    .sort((a, b) => b.progressPct - a.progressPct);

  return (
    <div style={summaryCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
        <div style={{ fontSize: "12px", color: "#666" }}>Alertas</div>
        {canSeeAlerts && (
          <span
            style={{
              fontSize: "11px",
              borderRadius: "999px",
              padding: "3px 8px",
              fontWeight: 700,
              background: alerts.length ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
              color: alerts.length ? "#991b1b" : "#166534",
            }}
          >
            {alerts.length ? `${alerts.length} activas` : "Sin activas"}
          </span>
        )}
      </div>

      {!canSeeAlerts ? (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#666", lineHeight: 1.4 }}>
          Disponible en planes Avanzado y Premium.
        </div>
      ) : deviceProgress.length === 0 ? (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#666" }}>
          No hay dispositivos para este período.
        </div>
      ) : (
        <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
          {deviceProgress.map((d) => {
            const isOpen = openDeviceId === d.id;
            return (
              <div
                key={`alert-device-${d.id}`}
                className="dashboard-alert-row"
                style={{
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  background: "rgba(248,250,252,0.85)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenDeviceId((prev) => (prev === d.id ? null : d.id));
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`alert-device-panel-${d.id}`}
                  style={{
                    cursor: "pointer",
                    display: "grid",
                    gap: "4px",
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px", color: "#111827" }}>{d.name}</strong>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          borderRadius: "999px",
                          padding: "2px 7px",
                          fontWeight: 700,
                          background: d.exceeded
                            ? "rgba(239,68,68,0.14)"
                            : "rgba(59,130,246,0.14)",
                          color: d.exceeded ? "#991b1b" : "#1d4ed8",
                        }}
                      >
                        {Math.round(d.progressPct)}%
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          transition: "transform 220ms ease",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      >
                        v
                      </span>
                    </div>
                  </div>
                  {d.exceeded ? (
                    <span style={{ fontSize: "12px", color: "#b91c1c" }}>
                      {formatCrossedAtLabel(d.crossedAt)}
                    </span>
                  ) : d.thresholdWh > 0 ? (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Faltan {Math.round(d.remainingWh)} Wh para superar el umbral
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Sin umbral configurado
                    </span>
                  )}
                </button>

                <div
                  id={`alert-device-panel-${d.id}`}
                  style={{
                    marginTop: isOpen ? "8px" : "0",
                    display: "grid",
                    gap: "6px",
                    maxHeight: isOpen ? "160px" : "0",
                    opacity: isOpen ? 1 : 0,
                    overflow: "hidden",
                    transition: "max-height 260ms ease, opacity 220ms ease, margin-top 220ms ease",
                  }}
                >
                    <div
                      style={{
                        height: "8px",
                        borderRadius: "999px",
                        background: "rgba(15,23,42,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${d.clampedPct}%`,
                          height: "100%",
                          background:
                            d.exceeded
                              ? "linear-gradient(90deg, rgba(245,158,11,0.9), rgba(239,68,68,0.9))"
                              : "linear-gradient(90deg, rgba(59,130,246,0.9), rgba(16,185,129,0.9))",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                        fontSize: "12px",
                        color: "#475569",
                      }}
                    >
                      <span>Consumo: {Math.round(d.energyWh)} Wh</span>
                      <span>Umbral: {Math.round(d.thresholdWh)} Wh</span>
                    </div>
                    {d.exceeded ? (
                      <div style={{ fontSize: "12px", color: "#991b1b", fontWeight: 700 }}>
                        Exceso: {Math.round(Math.max(0, d.energyWh - d.thresholdWh))} Wh
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>
                        Progreso: {Math.round(d.progressPct)}% del umbral
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const sectionBox: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: "16px",
  padding: "16px",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  marginTop: "18px",
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: "14px",
  padding: "14px",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
};

const dashboardPageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 84px)",
  padding: "24px 16px 40px",
  background:
    "radial-gradient(circle at 10% 12%, rgba(105,146,235,0.16), transparent 34%), radial-gradient(circle at 88% 88%, rgba(34,197,94,0.14), transparent 38%), linear-gradient(180deg, #f7f9fd 0%, #eef3fb 100%)",
};

const dashboardContentStyle: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px 12px",
};

const refreshBtn: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  background: "black",
  color: "white",
};

const secondaryBtn: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  background: "white",
  color: "#111827",
  fontWeight: 600,
};

const dlBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  padding: "10px 12px",
  border: "1px solid #ddd",
  color: "black",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

function tabBtn(active: boolean): React.CSSProperties {
  return {
    border: "1px solid #ddd",
    borderRadius: "999px",
    padding: "8px 12px",
    cursor: "pointer",
    background: active ? "black" : "white",
    color: active ? "white" : "black",
    fontWeight: 700,
  };
}
