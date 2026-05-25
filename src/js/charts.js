// src/js/charts.js
import { CATEGORIES } from './constants.js';
import { fetchBoardSuggestions } from './suggestions.js';

const CHART_COLORS = [
  '#c1a056',
  '#007bff',
  '#6f42c1',
  '#3fb950',
  '#d29922',
  '#7d8590',
];

const chartDefaults = {
  color: '#e6edf3',
  borderColor: '#30363d',
};

function destroyCharts() {
  for (const key of ['doughnut', 'worlds', 'radar']) {
    const inst = window.__taleonCharts?.[key];
    if (inst) inst.destroy();
  }
  window.__taleonCharts = {};
}

export async function renderDashboards() {
  const section = document.getElementById('dashboards-section');
  if (!section || typeof Chart === 'undefined') return;

  const suggestions = await fetchBoardSuggestions();
  destroyCharts();
  window.__taleonCharts = window.__taleonCharts || {};

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  const byWorld = { SAN: 0, AURA: 0 };
  const engagementByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));

  for (const s of suggestions) {
    if (byCategory[s.category] !== undefined) byCategory[s.category]++;
    if (byWorld[s.world] !== undefined) byWorld[s.world]++;
    const eng =
      Math.abs(s.vote_score ?? 0) + (s.comment_count ?? 0);
    if (engagementByCategory[s.category] !== undefined) {
      engagementByCategory[s.category] += eng;
    }
  }

  Chart.defaults.color = chartDefaults.color;
  Chart.defaults.borderColor = chartDefaults.borderColor;

  const doughnutCtx = document.getElementById('chart-category-doughnut');
  if (doughnutCtx) {
    window.__taleonCharts.doughnut = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: CATEGORIES.map((c) => c.replace('Novas ', '').slice(0, 22)),
        datasets: [
          {
            data: CATEGORIES.map((c) => byCategory[c]),
            backgroundColor: CHART_COLORS,
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        },
      },
    });
  }

  const worldsCtx = document.getElementById('chart-worlds-bar');
  if (worldsCtx) {
    window.__taleonCharts.worlds = new Chart(worldsCtx, {
      type: 'bar',
      data: {
        labels: ['SAN', 'AURA'],
        datasets: [
          {
            label: 'Sugestões',
            data: [byWorld.SAN, byWorld.AURA],
            backgroundColor: ['#007bff', '#6f42c1'],
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  const radarCtx = document.getElementById('chart-engagement-radar');
  if (radarCtx) {
    window.__taleonCharts.radar = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: CATEGORIES.map((c) => c.split(' ').slice(0, 3).join(' ')),
        datasets: [
          {
            label: 'Engajamento (votos + comentários)',
            data: CATEGORIES.map((c) => engagementByCategory[c]),
            borderColor: '#c1a056',
            backgroundColor: 'rgba(193, 160, 86, 0.25)',
            pointBackgroundColor: '#c1a056',
          },
        ],
      },
      options: {
        scales: {
          r: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: '#30363d' },
            angleLines: { color: '#30363d' },
          },
        },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }
}
