// src/js/charts.js
import {
  CATEGORIES,
  CATEGORY_CHART_COLORS,
  SITE_PALETTE,
  WORLD_COLORS,
} from './constants.js';
import { fetchBoardSuggestions } from './suggestions.js';

const chartDefaults = {
  color: SITE_PALETTE.text,
  borderColor: SITE_PALETTE.border,
};

const doughnutLegend = {
  position: 'bottom',
  labels: { boxWidth: 10, font: { size: 9 }, color: SITE_PALETTE.text, padding: 8 },
};

const chartResponsive = {
  responsive: true,
  maintainAspectRatio: true,
};

const doughnutLayout = {
  ...chartResponsive,
  aspectRatio: 1.35,
};

const radarLayout = {
  ...chartResponsive,
  aspectRatio: 1.25,
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
    const eng = Math.abs(s.vote_score ?? 0) + (s.comment_count ?? 0);
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
            backgroundColor: CATEGORY_CHART_COLORS,
            borderColor: SITE_PALETTE.border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...doughnutLayout,
        plugins: { legend: doughnutLegend },
      },
    });
  }

  const worldsCtx = document.getElementById('chart-worlds-doughnut');
  if (worldsCtx) {
    window.__taleonCharts.worlds = new Chart(worldsCtx, {
      type: 'doughnut',
      data: {
        labels: ['SAN', 'AURA'],
        datasets: [
          {
            data: [byWorld.SAN, byWorld.AURA],
            backgroundColor: [WORLD_COLORS.SAN, WORLD_COLORS.AURA],
            borderColor: SITE_PALETTE.border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...doughnutLayout,
        plugins: { legend: doughnutLegend },
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
            borderColor: SITE_PALETTE.gold,
            backgroundColor: 'rgba(193, 160, 86, 0.25)',
            pointBackgroundColor: SITE_PALETTE.gold,
            pointBorderColor: SITE_PALETTE.border,
          },
        ],
      },
      options: {
        ...radarLayout,
        scales: {
          r: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: SITE_PALETTE.muted,
              backdropColor: 'transparent',
              font: { size: 8 },
            },
            grid: { color: SITE_PALETTE.border },
            angleLines: { color: SITE_PALETTE.border },
            pointLabels: { color: SITE_PALETTE.text, font: { size: 8 } },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: SITE_PALETTE.text, font: { size: 9 }, boxWidth: 10 },
          },
        },
      },
    });
  }
}
