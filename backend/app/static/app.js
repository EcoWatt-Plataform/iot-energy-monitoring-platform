let monthChart;
let dailyChart;

let selectedDeviceId = null;
let devicesCache = [];


function toYYYYMM(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(digits);
}

function setLastUpdate() {
  const now = new Date();
  document.getElementById("lastUpdate").textContent = now.toLocaleString();
}

function renderTable(devices) {
  const tbody = document.querySelector("#deviceTable tbody");
  tbody.innerHTML = "";

  if (!devices || devices.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7">Sin datos</td>`;
    tbody.appendChild(tr);
    return;
  }

  devices.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${fmt(d.energy_kwh, 2)}</td>
      <td>${d.measurement_count}</td>
      <td>${fmt(d.avg_power, 1)}</td>
      <td>${fmt(d.max_power, 1)}</td>
      <td>${fmt(d.avg_voltage, 1)}</td>
      <td>${fmt(d.avg_current, 2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadDevices() {
  const res = await fetch("/api/v1/devices");
  const devices = await res.json();

  devicesCache = Array.isArray(devices) ? devices : [];

  const sel = document.getElementById("deviceSelect");
  sel.innerHTML = "";

  // Opción para comparar todos
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "Todos (comparar)";
  sel.appendChild(allOpt);

  if (!Array.isArray(devices) || devices.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sin dispositivos";
    sel.appendChild(opt);
    sel.disabled = true;
    selectedDeviceId = null;
    return;
  }

  sel.disabled = false;

  devices.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });

  // Default: Todos (comparar)
  sel.value = "";
  selectedDeviceId = null;

  // Listener único (no se duplica)
  sel.onchange = () => {
    selectedDeviceId = sel.value ? Number(sel.value) : null;
    loadSummary();
  };
  renderDeviceAdminTable(devicesCache);

}

async function createDeviceFromUI() {
  const name = document.getElementById("newDeviceName").value.trim();
  const thr = Number(document.getElementById("newDeviceThreshold").value);

  if (!name) {
    alert("Poné un nombre para el dispositivo.");
    return;
  }
  if (!Number.isFinite(thr) || thr < 0) {
    alert("Threshold inválido.");
    return;
  }

  const res = await fetch("/api/v1/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, monthly_threshold_wh: thr })
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Error creando dispositivo");
    return;
  }

  // Mostrar API key (solo se ve acá al crearlo)
  alert(`Dispositivo creado: ${data.name}\nID: ${data.id}\nAPI KEY: ${data.api_key}\n\nGuardala en un lugar seguro.`);

  document.getElementById("newDeviceName").value = "";
  await loadDevices();   // refresca dropdown + admin table
  loadSummary();         // refresca resumen
}

async function updateDeviceFromUI(deviceId) {
  const nameEl = document.getElementById(`dev-name-${deviceId}`);
  const thrEl = document.getElementById(`dev-thr-${deviceId}`);

  const payload = {
    name: nameEl.value.trim(),
    monthly_threshold_wh: Number(thrEl.value)
  };

  const res = await fetch(`/api/v1/devices/${deviceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Error actualizando dispositivo");
    return;
  }

  await loadDevices();
  loadSummary();
}

function renderDeviceAdminTable(devices) {
  const tbody = document.querySelector("#deviceAdminTable tbody");
  tbody.innerHTML = "";

  if (!Array.isArray(devices) || devices.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4">No hay dispositivos</td>`;
    tbody.appendChild(tr);
    return;
  }

  devices.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>
        <input id="dev-name-${d.id}" type="text" value="${d.name}" />
      </td>
      <td>
        <input id="dev-thr-${d.id}" type="number" min="0" step="1" value="${d.monthly_threshold_wh ?? 0}" />
      </td>
      <td>
        <button onclick="updateDeviceFromUI(${d.id})">Guardar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
function pad2(n) { return String(n).padStart(2, "0"); }

function monthRange(yyyyMM) {
  const [yStr, mStr] = yyyyMM.split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1..12
  const from = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate(); // día final del mes
  const to = `${y}-${pad2(m)}-${pad2(lastDay)}`;
  return { from, to };
}

function dateList(fromISO, toISO) {
  const out = [];
  const start = new Date(fromISO + "T00:00:00");
  const end = new Date(toISO + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

async function fetchDaily(deviceId, fromISO, toISO) {
  const url = `/api/v1/metrics/daily?device_id=${deviceId}&from=${fromISO}&to=${toISO}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error cargando daily");
  return data.days || [];
}

async function loadDailyChart(monthYYYYMM) {
  const { from, to } = monthRange(monthYYYYMM);
  const labels = dateList(from, to);

  // Elegidos: uno o todos
  const targets = (selectedDeviceId !== null)
    ? devicesCache.filter(d => d.id === selectedDeviceId)
    : devicesCache.slice();

  // Si no hay dispositivos, limpiar chart
  if (!targets.length) {
    const ctx = document.getElementById("dailyChart").getContext("2d");
    if (dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctx, { type: "line", data: { labels: [], datasets: [] } });
    return;
  }

  // Traer daily de todos en paralelo
  const results = await Promise.all(targets.map(async (dev) => {
    const days = await fetchDaily(dev.id, from, to);
    const map = new Map(days.map(x => [x.day, Number(x.energy_kwh || 0)]));
    const series = labels.map(day => map.has(day) ? map.get(day) : 0);
    return { label: dev.name, data: series };
  }));

  const ctx = document.getElementById("dailyChart").getContext("2d");
  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: results.map(r => ({
        label: r.label,
        data: r.data,
        tension: 0.25
      }))
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false }
    }
  });
}


async function loadSummary() {
  const month = document.getElementById("month").value;
  let url = `/api/v1/metrics/summary_month?month=${encodeURIComponent(month)}`;
  if (selectedDeviceId !== null) url += `&device_id=${selectedDeviceId}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Error cargando resumen");
    return;
  }

  // Cambiar el título según si hay filtro por device
  const topTitle = document.getElementById("topTitle");
  if (topTitle) {
    topTitle.textContent = data.device_id ? "Dispositivo seleccionado" : "Top consumidor del mes";
  }

  // Mostrar el valor (si filtrás, data.devices[0] es el seleccionado)
  const selected = (data.devices && data.devices.length) ? data.devices[0] : null;
  document.getElementById("topConsumer").textContent =
    selected ? `${selected.name} — ${fmt(selected.energy_kwh, 2)} kWh` : "Sin datos";

  // Total mes
  document.getElementById("monthTotal").textContent =
    data.month_total_kwh !== undefined ? `${fmt(data.month_total_kwh, 2)} kWh` : "—";
  document.getElementById("monthMeasurements").textContent =
    data.month_measurements !== undefined ? `${data.month_measurements} mediciones` : "—";

  // Alertas
  const ul = document.getElementById("alerts");
  ul.innerHTML = "";
  if (!data.alerts || data.alerts.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sin alertas";
    ul.appendChild(li);
  } else {
    data.alerts.forEach(a => {
      const li = document.createElement("li");
      li.textContent = `${a.device_name}: ${Math.round(a.energy_wh)} Wh > ${Math.round(a.threshold_wh)} Wh`;
      ul.appendChild(li);
    });
  }

  // Bar chart (kWh)
  const labels = (data.devices || []).map(d => d.name);
  const values = (data.devices || []).map(d => Number(d.energy_kwh || 0));

  const ctx = document.getElementById("barChart").getContext("2d");
  if (monthChart) monthChart.destroy();
  monthChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "kWh", data: values }] },
    options: { responsive: true }
  });

  // Tabla
  renderTable(data.devices);

  // Marca de tiempo local
  setLastUpdate();
  //actualizar daily chart
  await loadDailyChart(month);
}

document.getElementById("refresh").addEventListener("click", loadSummary);

(async function init() {
  document.getElementById("month").value = toYYYYMM(new Date());
  await loadDevices();
  document.getElementById("createDeviceBtn").addEventListener("click", createDeviceFromUI);
  loadSummary();
})();

