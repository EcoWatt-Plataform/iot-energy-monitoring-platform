"use client";

import { useEffect, useMemo, useState } from "react";

type Device = {
  id: number;
  name: string;
  monthly_threshold_wh?: number;
};

type SummaryDevice = { id: number; name: string; energy_kwh: number };
type SummaryResponse = {
  month: string;
  device_id?: number | null;
  month_total_kwh?: number;
  month_measurements?: number;
  top_consumer?: { id: number; name: string; energy_kwh: number } | null;
  devices?: SummaryDevice[];
  alerts?: { device_name: string; energy_wh: number; threshold_wh: number }[];
};

function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [month, setMonth] = useState<string>(toYYYYMM(new Date()));
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const deviceOptions = useMemo(() => {
    return [{ id: 0, name: "Todos (comparar)" }, ...devices];
  }, [devices]);
  const csvUrl = useMemo(() => {
    let u = `/api/v1/export/measurements.csv?month=${encodeURIComponent(month)}`;
    if (selectedDeviceId !== null) u += `&device_id=${selectedDeviceId}`;
    return u;
  }, [month, selectedDeviceId]);
  const dailyCsvUrl = useMemo(() => {
    let u = `/api/v1/export/daily.csv?month=${encodeURIComponent(month)}`;
    if (selectedDeviceId !== null) u += `&device_id=${selectedDeviceId}`;
    return u;
  }, [month, selectedDeviceId]);
  const alertsCsvUrl = useMemo(() => {
    let u = `/api/v1/export/alerts.csv?month=${encodeURIComponent(month)}`;
    if (selectedDeviceId !== null) u += `&device_id=${selectedDeviceId}`;
    return u;
  }, [month, selectedDeviceId]);



  async function loadDevices() {
    const res = await fetch("/api/v1/devices");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error cargando dispositivos");
    setDevices(Array.isArray(data) ? data : []);
  }

  async function loadSummary(nextMonth = month, nextDeviceId = selectedDeviceId) {
    setLoading(true);
    setErr(null);
    try {
      let url = `/api/v1/metrics/summary_month?month=${encodeURIComponent(nextMonth)}`;
      if (nextDeviceId !== null) url += `&device_id=${nextDeviceId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando resumen");
      setSummary(data);
    } catch (e: any) {
      setErr(e.message || "Error");
      setSummary(null);
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
    loadSummary(month, selectedDeviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedDeviceId]);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard (Next)</h1>
            <p className="text-sm text-neutral-500">
              Consume la API del backend vía <code>/api/*</code> (rewrite).
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500">Mes</label>
              <input
                className="rounded-lg border px-3 py-2"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-neutral-500">Dispositivo</label>
              <select
                className="rounded-lg border px-3 py-2"
                value={selectedDeviceId ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSelectedDeviceId(v === 0 ? null : v);
                }}
              >
                {deviceOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              className="rounded-lg bg-black px-4 py-2 text-white"
              onClick={() => loadSummary()}
              disabled={loading}
            >
              {loading ? "Cargando..." : "Refrescar"}
            </button>


            <a className="rounded-lg border px-4 py-2" href={csvUrl}>
              Descargar .CSV
            </a>

            <a className="rounded-lg border px-4 py-2" href={dailyCsvUrl}>
              CSV diario
            </a>
            
            <a className="rounded-lg border px-4 py-2" href={alertsCsvUrl}>
              CSV alertas
            </a>

          </div>
        </header>

        {err && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
            {err}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">Total del mes</div>
            <div className="mt-1 text-2xl font-semibold">
              {summary?.month_total_kwh !== undefined ? `${summary.month_total_kwh.toFixed(2)} kWh` : "—"}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">Mediciones del mes</div>
            <div className="mt-1 text-2xl font-semibold">
              {summary?.month_measurements !== undefined ? summary.month_measurements : "—"}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">
              {selectedDeviceId !== null ? "Dispositivo seleccionado" : "Top consumidor del mes"}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {selectedDeviceId !== null
                ? (summary?.devices?.[0] ? `${summary.devices[0].name} — ${summary.devices[0].energy_kwh.toFixed(2)} kWh` : "—")
                : (summary?.top_consumer ? `${summary.top_consumer.name} — ${summary.top_consumer.energy_kwh.toFixed(2)} kWh` : "—")}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Comparación (kWh por dispositivo)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="border-b p-2">Dispositivo</th>
                  <th className="border-b p-2">kWh</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.devices || []).map((d) => (
                  <tr key={d.id}>
                    <td className="border-b p-2">{d.name}</td>
                    <td className="border-b p-2">{Number(d.energy_kwh || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {(!summary?.devices || summary.devices.length === 0) && (
                  <tr>
                    <td className="p-2" colSpan={2}>
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Alertas</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {(summary?.alerts || []).map((a, idx) => (
              <li key={idx}>
                {a.device_name}: {Math.round(a.energy_wh)} Wh &gt; {Math.round(a.threshold_wh)} Wh
              </li>
            ))}
            {(!summary?.alerts || summary.alerts.length === 0) && <li>Sin alertas</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
