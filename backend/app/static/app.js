
let chart;

function toYYYYMM(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function loadSummary() {
  const month = document.getElementById("month").value;
  const res = await fetch(`/api/v1/metrics/summary_month?month=${encodeURIComponent(month)}`);
  const data = await res.json();

  const top = data.top_consumer;
  document.getElementById("topConsumer").textContent =
    top ? `${top.name} — ${Math.round(top.energy_wh)} Wh` : "Sin datos";

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

  const labels = data.devices.map(d => d.name);
  const values = data.devices.map(d => Math.round(d.energy_wh));

  const ctx = document.getElementById("barChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Wh", data: values }] },
    options: { responsive: true }
  });
}

document.getElementById("refresh").addEventListener("click", loadSummary);

(function init() {
  document.getElementById("month").value = toYYYYMM(new Date());
  loadSummary();
})();
