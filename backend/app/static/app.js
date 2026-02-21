let monthChart;
let dailyChart;

let selectedDeviceId = null;
let devicesCache = [];

const TOKEN_STORAGE_KEY = "sisterna_bearer_token";
let bearerToken = "";

function toYYYYMM(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined) return "-";
  return Number(n).toFixed(digits);
}

function setLastUpdate() {
  const now = new Date();
  const node = document.getElementById("lastUpdate");
  if (node) node.textContent = now.toLocaleString();
}

function normalizeToken(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/^Bearer\s+/i, "");
}

function tokenInput() {
  return document.getElementById("authToken");
}

function authStatusNode() {
  return document.getElementById("authStatus");
}

function setAuthStatus(message, isError = false) {
  const node = authStatusNode();
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#b91c1c" : "#6b7280";
}

function updateAuthStatus() {
  if (bearerToken) {
    setAuthStatus("Token guardado. Ya podes usar el dashboard.");
  } else {
    setAuthStatus("Falta token. Configuralo para usar el dashboard.", true);
  }
}

function loadStoredToken() {
  try {
    bearerToken = normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {
    bearerToken = "";
  }

  const input = tokenInput();
  if (input) input.value = bearerToken;
  updateAuthStatus();
}

function saveTokenFromInput() {
  const input = tokenInput();
  const token = normalizeToken(input ? input.value : "");

  if (!token) {
    bearerToken = "";
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    updateAuthStatus();
    return;
  }

  bearerToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, bearerToken);
  } catch {}
  updateAuthStatus();
}

function clearToken() {
  bearerToken = "";
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}

  const input = tokenInput();
  if (input) input.value = "";
  updateAuthStatus();
}

function ensureToken() {
  if (!bearerToken) {
    throw new Error("Missing bearer token. Pegalo arriba y presiona 'Guardar token'.");
  }
  return bearerToken;
}

async function apiFetch(url, init = {}) {
  const token = ensureToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers,
  });
}

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function fileNameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;

  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8 && utf8[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return fallback;
    }
  }

  const ascii = disposition.match(/filename="?([^\";]+)"?/i);
  if (ascii && ascii[1]) return ascii[1];
  return fallback;
}

async function downloadCsv(url, fallbackFilename) {
  const res = await apiFetch(url);
  if (!res.ok) {
    const data = await readJsonSafe(res);
    throw new Error(data.error || `Error descargando CSV (${res.status})`);
  }

  const blob = await res.blob();
  const filename = fileNameFromDisposition(
    res.headers.get("Content-Disposition"),
    fallbackFilename
  );

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function renderTable(devices) {
  const tbody = document.querySelector("#deviceTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!devices || devices.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="7">Sin datos</td>';
    tbody.appendChild(tr);
    return;
  }

  devices.forEach((d) => {
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

function renderDeviceAdminTable(devices) {
  const tbody = document.querySelector("#deviceAdminTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!Array.isArray(devices) || devices.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="4">No hay dispositivos</td>';
    tbody.appendChild(tr);
    return;
  }

  devices.forEach((d) => {
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
        <button onclick="deleteDeviceFromUI(${d.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthRange(yyyyMM) {
  const [yStr, mStr] = yyyyMM.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const from = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
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

function selectedMonth() {
  const monthInput = document.getElementById("month");
  return monthInput ? monthInput.value : toYYYYMM(new Date());
}

function selectedDeviceQueryParam() {
  return selectedDeviceId !== null ? `&device_id=${selectedDeviceId}` : "";
}

function csvUrl(path, month) {
  return `/api/v1/export/${path}?month=${encodeURIComponent(month)}${selectedDeviceQueryParam()}`;
}

function csvFallbackName(prefix, month) {
  const suffix = selectedDeviceId !== null ? `_device${selectedDeviceId}` : "";
  return `${prefix}_${month}${suffix}.csv`;
}

async function fetchDaily(deviceId, fromISO, toISO) {
  const url = `/api/v1/metrics/daily?device_id=${deviceId}&from=${fromISO}&to=${toISO}`;
  const res = await apiFetch(url);
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.error || "Error cargando daily");
  return data.days || [];
}

async function loadDailyChart(monthYYYYMM) {
  const { from, to } = monthRange(monthYYYYMM);
  const labels = dateList(from, to);

  const targets =
    selectedDeviceId !== null
      ? devicesCache.filter((d) => d.id === selectedDeviceId)
      : devicesCache.slice();

  const ctx = document.getElementById("dailyChart").getContext("2d");

  if (!targets.length) {
    if (dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: { responsive: true },
    });
    return;
  }

  const results = await Promise.all(
    targets.map(async (dev) => {
      const days = await fetchDaily(dev.id, from, to);
      const map = new Map(days.map((x) => [x.day, Number(x.energy_kwh || 0)]));
      const series = labels.map((day) => (map.has(day) ? map.get(day) : 0));
      return { label: dev.name, data: series };
    })
  );

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: results.map((r) => ({
        label: r.label,
        data: r.data,
        tension: 0.25,
      })),
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
    },
  });
}

async function loadDevices() {
  const res = await apiFetch("/api/v1/devices");
  const devices = await readJsonSafe(res);
  if (!res.ok) throw new Error(devices.error || "Error cargando dispositivos");

  devicesCache = Array.isArray(devices) ? devices : [];

  const sel = document.getElementById("deviceSelect");
  if (!sel) return;

  sel.innerHTML = "";

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
    renderDeviceAdminTable([]);
    return;
  }

  sel.disabled = false;

  devices.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });

  sel.value = "";
  selectedDeviceId = null;

  sel.onchange = () => {
    selectedDeviceId = sel.value ? Number(sel.value) : null;
    loadSummary().catch((error) => {
      alert(error instanceof Error ? error.message : "Error cargando resumen");
    });
  };

  renderDeviceAdminTable(devicesCache);
}

async function loadSummary() {
  const month = selectedMonth();
  let url = `/api/v1/metrics/summary_month?month=${encodeURIComponent(month)}`;
  if (selectedDeviceId !== null) url += `&device_id=${selectedDeviceId}`;

  const res = await apiFetch(url);
  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(data.error || "Error cargando resumen");
  }

  const topTitle = document.getElementById("topTitle");
  if (topTitle) {
    topTitle.textContent = data.device_id
      ? "Dispositivo seleccionado"
      : "Top consumidor del mes";
  }

  const selected = data.devices && data.devices.length ? data.devices[0] : null;
  const topConsumer = document.getElementById("topConsumer");
  if (topConsumer) {
    topConsumer.textContent = selected
      ? `${selected.name} - ${fmt(selected.energy_kwh, 2)} kWh`
      : "Sin datos";
  }

  const monthTotal = document.getElementById("monthTotal");
  if (monthTotal) {
    monthTotal.textContent =
      data.month_total_kwh !== undefined
        ? `${fmt(data.month_total_kwh, 2)} kWh`
        : "-";
  }

  const monthMeasurements = document.getElementById("monthMeasurements");
  if (monthMeasurements) {
    monthMeasurements.textContent =
      data.month_measurements !== undefined
        ? `${data.month_measurements} mediciones`
        : "-";
  }

  const ul = document.getElementById("alerts");
  if (ul) {
    ul.innerHTML = "";
    if (!data.alerts || data.alerts.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Sin alertas";
      ul.appendChild(li);
    } else {
      data.alerts.forEach((a) => {
        const li = document.createElement("li");
        li.textContent = `${a.device_name}: ${Math.round(a.energy_wh)} Wh > ${Math.round(a.threshold_wh)} Wh`;
        ul.appendChild(li);
      });
    }
  }

  const labels = (data.devices || []).map((d) => d.name);
  const values = (data.devices || []).map((d) => Number(d.energy_kwh || 0));

  const ctx = document.getElementById("barChart").getContext("2d");
  if (monthChart) monthChart.destroy();
  monthChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "kWh", data: values }] },
    options: { responsive: true },
  });

  renderTable(data.devices || []);
  setLastUpdate();
  await loadDailyChart(month);
}

async function createDeviceFromUI() {
  const name = document.getElementById("newDeviceName").value.trim();
  const thr = Number(document.getElementById("newDeviceThreshold").value);

  if (!name) {
    alert("Pone un nombre para el dispositivo.");
    return;
  }
  if (!Number.isFinite(thr) || thr < 0) {
    alert("Threshold invalido.");
    return;
  }

  try {
    const res = await apiFetch("/api/v1/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, monthly_threshold_wh: thr }),
    });

    const data = await readJsonSafe(res);
    if (!res.ok) {
      alert(data.error || "Error creando dispositivo");
      return;
    }

    alert(
      `Dispositivo creado: ${data.name}\nID: ${data.id}\nAPI KEY: ${data.api_key}\n\nGuardala en un lugar seguro.`
    );

    document.getElementById("newDeviceName").value = "";
    await loadDevices();
    await loadSummary();
  } catch (error) {
    alert(error instanceof Error ? error.message : "Error creando dispositivo");
  }
}

async function updateDeviceFromUI(deviceId) {
  const nameEl = document.getElementById(`dev-name-${deviceId}`);
  const thrEl = document.getElementById(`dev-thr-${deviceId}`);

  const payload = {
    name: nameEl.value.trim(),
    monthly_threshold_wh: Number(thrEl.value),
  };

  try {
    const res = await apiFetch(`/api/v1/devices/${deviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await readJsonSafe(res);
    if (!res.ok) {
      alert(data.error || "Error actualizando dispositivo");
      return;
    }

    await loadDevices();
    await loadSummary();
  } catch (error) {
    alert(error instanceof Error ? error.message : "Error actualizando dispositivo");
  }
}

async function deleteDeviceFromUI(deviceId) {
  const ok = confirm(`Eliminar el dispositivo ${deviceId} y todas sus mediciones?`);
  if (!ok) return;

  try {
    const res = await apiFetch(`/api/v1/devices/${deviceId}`, { method: "DELETE" });
    const data = await readJsonSafe(res);

    if (!res.ok) {
      alert(data.error || "Error eliminando dispositivo");
      return;
    }

    if (selectedDeviceId === deviceId) selectedDeviceId = null;
    await loadDevices();
    await loadSummary();
  } catch (error) {
    alert(error instanceof Error ? error.message : "Error eliminando dispositivo");
  }
}

window.updateDeviceFromUI = updateDeviceFromUI;
window.deleteDeviceFromUI = deleteDeviceFromUI;

async function refreshDashboard(showAlerts = true) {
  try {
    await loadDevices();
    await loadSummary();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el dashboard.";
    setAuthStatus(message, true);
    if (showAlerts) alert(message);
  }
}

function bindEvents() {
  const refreshBtn = document.getElementById("refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshDashboard(true);
    });
  }

  const createBtn = document.getElementById("createDeviceBtn");
  if (createBtn) {
    createBtn.addEventListener("click", createDeviceFromUI);
  }

  const saveTokenBtn = document.getElementById("saveTokenBtn");
  if (saveTokenBtn) {
    saveTokenBtn.addEventListener("click", async () => {
      saveTokenFromInput();
      await refreshDashboard(false);
    });
  }

  const clearTokenBtn = document.getElementById("clearTokenBtn");
  if (clearTokenBtn) {
    clearTokenBtn.addEventListener("click", clearToken);
  }

  const authInput = tokenInput();
  if (authInput) {
    authInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      saveTokenFromInput();
      await refreshDashboard(false);
    });
  }

  const downloadCsvBtn = document.getElementById("downloadCsv");
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", async () => {
      try {
        const month = selectedMonth();
        await downloadCsv(
          csvUrl("measurements.csv", month),
          csvFallbackName("measurements", month)
        );
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error descargando CSV.");
      }
    });
  }

  const downloadDailyBtn = document.getElementById("downloadDailyCsv");
  if (downloadDailyBtn) {
    downloadDailyBtn.addEventListener("click", async () => {
      try {
        const month = selectedMonth();
        await downloadCsv(
          csvUrl("daily.csv", month),
          csvFallbackName("daily", month)
        );
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error descargando CSV diario.");
      }
    });
  }

  const downloadAlertsBtn = document.getElementById("downloadAlertsCsv");
  if (downloadAlertsBtn) {
    downloadAlertsBtn.addEventListener("click", async () => {
      try {
        const month = selectedMonth();
        await downloadCsv(
          csvUrl("alerts.csv", month),
          csvFallbackName("alerts", month)
        );
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error descargando CSV alertas.");
      }
    });
  }
}

(async function init() {
  const monthInput = document.getElementById("month");
  if (monthInput) monthInput.value = toYYYYMM(new Date());

  loadStoredToken();
  bindEvents();

  if (bearerToken) {
    await refreshDashboard(false);
  }
})();
