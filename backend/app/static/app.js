let chart;

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

async function loadSummary() {
  const month = document.getElementById("month").value;
  const res = await fetch(`/api/v1/metrics/summary_month?month=${encodeURIComponent(month)}`);
  const data = await res.json();

  // Total mes
  document.getElementById("monthTotal").textContent =
    data.month_total_kwh !== undefined ? `${fmt(data.month_total_kwh, 2)} kWh` : "—";
  document.getElementById("monthMeasurements").textContent =
    data.month_measurements !== undefined ? `${data.month_measurements} mediciones` : "—";

  // Top consumidor
  const top = data.top_consumer;
  document.getElementById("topConsumer").textContent =
    top ? `${top.name} — ${fmt(top.energy_kwh, 2)} kWh` : "Sin datos";

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
  const values = (data.devices || []).map(d => Number(d.energy_kwh || 0).toFixed(2));

  const ctx = document.getElementById("barChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "kWh", data: values }] },
    options: { responsive: true }
  });

  // Tabla
  renderTable(data.devices);

  // Marca de tiempo local
  setLastUpdate();
}

document.getElementById("refresh").addEventListener("click", loadSummary);

(function init() {
  document.getElementById("month").value = toYYYYMM(new Date());
  loadSummary();
})();
