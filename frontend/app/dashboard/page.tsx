"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

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

type Device = { id: number; name: string };

type DailyPoint = { date: string; kwh: number };

type SummaryDevice = { id: number; name: string; energy_kwh: number };

type SummaryResponse = {
  month: string;
  device_id?: number | null;
  month_total_kwh?: number;
  month_measurements?: number;
  top_consumer?: SummaryDevice | null;
  devices?: SummaryDevice[];
  alerts?: { device_name: string; energy_wh: number; threshold_wh: number }[];
};

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfWeekLabel(isoDate: string) {
  return `Semana de ${isoDate}`;
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

/** =========================
 *  CSV PARSER (daily.csv)
 *  ========================= */
function parseDailyCsv(text: string): DailyPoint[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0];
  const sep = header.includes(";") ? ";" : ",";
  const cols = header.split(sep).map((s) => s.trim().toLowerCase());

  const dateIdx = cols.findIndex(
    (c) => c.includes("date") || c.includes("day") || c.includes("fecha")
  );
  const kwhIdx = cols.findIndex((c) => c.includes("kwh"));

  const safeDateIdx = dateIdx >= 0 ? dateIdx : 0;
  const safeKwhIdx = kwhIdx >= 0 ? kwhIdx : 1;

  const out: DailyPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(sep).map((s) => s.trim());
    const date = row[safeDateIdx];
    const raw = row[safeKwhIdx];
    if (!date) continue;

    const num = Number(String(raw).replace(",", "."));
    if (Number.isFinite(num)) out.push({ date, kwh: num });
  }
  return out;
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

export default function DashboardPage() {
  // SIMULACIÓN DE PLAN (para probar sin login)
  const [plan, setPlan] = useState<Plan>("basico");

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

  // Selector de período (según plan)
  type Period = "daily" | "weekly" | "monthly" | "compare";
  const [period, setPeriod] = useState<Period>("daily");

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

  async function loadDevices() {
    const res = await fetch("/api/v1/devices");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error cargando dispositivos");
    setDevices(Array.isArray(data) ? data : []);
  }

  async function loadSummary(nextMonth = month, nextDeviceId = selectedDeviceId) {
    let url = `/api/v1/metrics/summary_month?month=${encodeURIComponent(nextMonth)}`;
    if (nextDeviceId !== null) url += `&device_id=${nextDeviceId}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error cargando resumen");
    setSummary(data);
  }

  /**
   * Diario:
   * - Si hay device seleccionado -> baja 1 CSV y llena daily
   * - Si es "Todos" -> baja CSV de cada device y llena dailyByDevice
   */
  async function loadDaily(nextMonth = month, nextDeviceId = selectedDeviceId) {
    // Caso A: Un dispositivo
    if (nextDeviceId !== null) {
      setDailyByDevice({});
      const url = `/api/v1/export/daily.csv?month=${encodeURIComponent(
        nextMonth
      )}&device_id=${nextDeviceId}`;

      const res = await fetch(url);
      const text = await res.text();

      if (!res.ok) throw new Error(`Error cargando CSV diario (${res.status}).`);

      setDaily(parseDailyCsv(text));
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
        const url = `/api/v1/export/daily.csv?month=${encodeURIComponent(
          nextMonth
        )}&device_id=${d.id}`;
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) return [d.id, [] as DailyPoint[]] as const;
        return [d.id, parseDailyCsv(text)] as const;
      })
    );

    const obj: Record<number, DailyPoint[]> = {};
    for (const [id, pts] of entries) obj[id] = pts;
    setDailyByDevice(obj);
  }

  async function refreshAll() {
    setLoading(true);
    setErr(null);
    setSummary(null);
    try {
      await loadSummary(month, selectedDeviceId);
      await loadDaily(month, selectedDeviceId);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadDevices();
      } catch (e: any) {
        setErr(e.message || "Error");
      }
    })();
  }, []);

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
  const dailyLineData = useMemo(() => {
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

  // ---------- WEEKLY ----------
  const weeklyBarData = useMemo(() => {
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

  // ---------- MONTHLY ----------
  const monthlyBarData = useMemo(() => {
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

  const commonOptions = useMemo(() => {
    return {
      responsive: true,
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
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Consumo diario (kWh/día)" },
      },
    };
  }, [commonOptions]);

  const weeklyOptions = useMemo(() => {
    return {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Consumo semanal" },
      },
    };
  }, [commonOptions]);

  const monthlyOptions = useMemo(() => {
    return {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: { display: true, text: "Consumo mensual" },
      },
    };
  }, [commonOptions]);

  // Comparativo (premium) con colores distintos por barra
  function makeCompareBar(title: string, items: { label: string; value: number }[]) {
    const bg = items.map((_, i) => withAlpha(colorForIndex(i), 0.55));
    const border = items.map((_, i) => colorForIndex(i));

    return {
      data: {
        labels: items.map((x) => x.label),
        datasets: [
          {
            label: title,
            data: items.map((x) => x.value),
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...commonOptions,
        plugins: { ...commonOptions.plugins, title: { display: true, text: title } },
      },
    };
  }

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

  // Alertas según plan
  const canSeeAlerts = plan !== "basico";
  // Descargables solo premium
  const canDownload = plan === "premium";

  const noDailyData =
    selectedDeviceId !== null
      ? daily.length === 0
      : Object.values(dailyByDevice).every((arr) => (arr || []).length === 0);

  return (
    <main style={{ padding: "28px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "34px", marginBottom: "6px" }}>Dashboard</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Probando con datos reales del backend. (Plan simulado)
      </p>

      {/* Plan simulado */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "14px 0 22px" }}>
        <span style={{ fontWeight: 700 }}>Plan:</span>
        <button type="button" onClick={() => setPlan("basico")} style={planBtn(plan === "basico")}>
          Básico
        </button>
        <button type="button" onClick={() => setPlan("avanzado")} style={planBtn(plan === "avanzado")}>
          Avanzado
        </button>
        <button type="button" onClick={() => setPlan("premium")} style={planBtn(plan === "premium")}>
          Premium
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "end", marginBottom: "18px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Mes</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Dispositivo</label>
          <select
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

        <button type="button" onClick={refreshAll} disabled={loading} style={refreshBtn}>
          {loading ? "Cargando..." : "Refrescar"}
        </button>

        {/* DESCARGABLES SOLO PREMIUM */}
        {canDownload && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a style={dlBtn} href={csvUrl}>
              Descargar CSV (completo)
            </a>
            <a style={dlBtn} href={dailyCsvUrl}>
              CSV diario
            </a>
            <a style={dlBtn} href={alertsCsvUrl}>
              CSV alertas
            </a>
          </div>
        )}
      </div>

      {err && (
        <div style={{ border: "1px solid #ffb3b3", background: "#ffecec", padding: "12px", borderRadius: "12px" }}>
          {err}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "18px" }}>
        <Card title="Total del mes" value={summary?.month_total_kwh !== undefined ? `${summary.month_total_kwh.toFixed(2)} kWh` : "—"} />
        <Card title="Mediciones del mes" value={summary?.month_measurements !== undefined ? String(summary.month_measurements) : "—"} />
        <Card title="Dispositivos" value={devices.length ? String(devices.length) : "—"} />
      </div>

      {/* Gráficos */}
      <section style={sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Gráficos</h2>
            <p style={{ margin: "6px 0 0", color: "#666" }}>
              {selectedDeviceId === null ? "Modo: Todos (comparar)" : "Modo: Dispositivo"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {allowedPeriods.includes("daily") && (
              <button type="button" onClick={() => setPeriod("daily")} style={tabBtn(period === "daily")}>
                Diario
              </button>
            )}
            {allowedPeriods.includes("weekly") && (
              <button type="button" onClick={() => setPeriod("weekly")} style={tabBtn(period === "weekly")}>
                Semanal
              </button>
            )}
            {allowedPeriods.includes("monthly") && (
              <button type="button" onClick={() => setPeriod("monthly")} style={tabBtn(period === "monthly")}>
                Mensual
              </button>
            )}
            {allowedPeriods.includes("compare") && (
              <button type="button" onClick={() => setPeriod("compare")} style={tabBtn(period === "compare")}>
                Comparativo
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          {period === "daily" && <Line data={dailyLineData as any} options={dailyOptions as any} />}

          {period === "weekly" && <Bar data={weeklyBarData as any} options={weeklyOptions as any} />}

          {period === "monthly" && <Bar data={monthlyBarData as any} options={monthlyOptions as any} />}

          {period === "compare" && <Bar {...makeCompareBar("Comparativo por dispositivo", compare)} />}

          {period === "daily" && noDailyData && (
            <p style={{ marginTop: "10px", color: "#666" }}>No hay datos diarios para este mes.</p>
          )}
        </div>
      </section>

      {/* Alertas SOLO si NO es Básico */}
      {canSeeAlerts && (
        <section style={sectionBox}>
          <h2 style={{ marginTop: 0 }}>Alertas</h2>
          <ul style={{ margin: 0, paddingLeft: "18px", color: "#333" }}>
            {(summary?.alerts || []).map((a, idx) => (
              <li key={idx}>
                {a.device_name}: {Math.round(a.energy_wh)} Wh &gt; {Math.round(a.threshold_wh)} Wh
              </li>
            ))}
            {(!summary?.alerts || summary.alerts.length === 0) && <li>Sin alertas</li>}
          </ul>
        </section>
      )}
    </main>
  );
}

/* ================= UI Helpers ================= */

function Card(props: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: "14px", padding: "14px", background: "white" }}>
      <div style={{ fontSize: "12px", color: "#666" }}>{props.title}</div>
      <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 800 }}>{props.value}</div>
    </div>
  );
}

const sectionBox: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: "16px",
  padding: "16px",
  background: "white",
  marginTop: "18px",
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

// ✅ Botones descargables
const dlBtn: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "10px",
  padding: "10px 12px",
  border: "1px solid #ddd",
  textDecoration: "none",
  color: "black",
  background: "white",
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

function planBtn(active: boolean): React.CSSProperties {
  return {
    border: "1px solid #ddd",
    borderRadius: "999px",
    padding: "6px 12px",
    cursor: "pointer",
    background: active ? "black" : "white",
    color: active ? "white" : "black",
    fontWeight: 700,
  };
}
