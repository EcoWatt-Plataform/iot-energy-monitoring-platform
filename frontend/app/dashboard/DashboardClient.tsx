"use client";

import { useEffect, useState } from "react";

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

export default function DashboardClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId] = useState<number | null>(null);
  const [month] = useState<string>(toYYYYMM(new Date()));
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  const [, setDaily] = useState<DailyPoint[]>([]);
  const [, setDailyByDevice] = useState<Record<number, DailyPoint[]>>({});

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      {err && <pre>{err}</pre>}
      {summary && <p>Mes actual: {summary.month}</p>}
      <button onClick={refreshAll} disabled={loading}>
        {loading ? "Cargando..." : "Refrescar"}
      </button>
    </div>
  );
}
