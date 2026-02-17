"use client";

import React, { useEffect, useMemo, useState } from "react";
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

// =====================
// Types / helpers (FUERA del componente)
// =====================
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

type Period = "daily" | "weekly" | "monthly" | "compare";

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfWeekLabel(isoDate: string) {
  return `Semana de ${isoDate}`;
}

const PALETTE = ["#6992EB", "#9B6CEB", "#22C55E", "#F59E0B", "#EF4444", "#14B8A6", "#A855F7"];
function colorForIndex(i: number) {
  return PALETTE[i % PALETTE.length];
}
function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function parseDailyCsv(text: string): DailyPoint[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0];
  const sep = header.includes(";") ? ";" : ",";
  const cols = header.split(sep).map((s) => s.trim().toLowerCase());

  const dateIdx = cols.findIndex((c) => c.includes("date") || c.includes("day") || c.includes("fecha"));
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
    const label = chunk[0]?.date ? startOfWeekLabel(chunk[0].date) : `Semana ${out.length + 1}`;
    out.push({ label, value: sum });
  }
  return out;
}
function sumMonthly(points: DailyPoint[]) {
  return points.reduce((acc, p) => acc + (Number(p.kwh) || 0), 0);
}

// =====================
// Component (SOLO 1 export default)
// =====================
export default function DashboardClient() {
  const [plan, setPlan] = useState<Plan>("basico");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [month, setMonth] = useState<string>(toYYYYMM(new Date()));
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [dailyByDevice, setDailyByDevice] = useState<Record<number, DailyPoint[]>>({});

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("daily");

  const deviceOptions = useMemo(() => [{ id: 0, name: "Todos (comparar)" }, ...devices], [devices]);

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

  async function loadDaily(nextMonth = month, nextDeviceId = selectedDeviceId) {
    if (nextDeviceId !== null) {
      setDailyByDevice({});
      const url = `/api/v1/export/daily.csv?month=${encodeURIComponent(nextMonth)}&device_id=${nextDeviceId}`;
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok) throw new Error(`Error cargando CSV diario (${res.status}).`);
      setDaily(parseDailyCsv(text));
      return;
    }

    setDaily([]);
    if (!devices.length) {
      setDailyByDevice({});
      return;
    }

    const entries = await Promise.all(
      devices.map(async (d) => {
        const url = `/api/v1/export/daily.csv?month=${encodeURIComponent(nextMonth)}&device_id=${d.id}`;
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
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices().catch((e: unknown) => setErr(e instanceof Error ? e.message : "Error"));
  }, []);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedDeviceId, devices.length]);

  const compare = useMemo(() => {
    const list = summary?.devices || [];
    return list.map((d) => ({ label: d.name, value: Number(d.energy_kwh || 0) }));
  }, [summary]);

  // … acá pegá el resto de tus useMemo de charts + JSX (tal cual) …
  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      {err && <pre>{err}</pre>}
      {/* Pegá tu UI completa acá */}
      <button onClick={refreshAll} disabled={loading}>
        {loading ? "Cargando..." : "Refrescar"}
      </button>
    </div>
  );
}
