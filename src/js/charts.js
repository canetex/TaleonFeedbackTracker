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

const LEADERBOARD_TOP_N = 10;

function destroyCharts() {
  for (const key of ['doughnut', 'worlds', 'radar', 'leaderboard']) {
    const inst = window.__taleonCharts?.[key];
    if (inst) inst.destroy();
  }
  window.__taleonCharts = {};
}

function truncateLabel(title, maxLen = 28) {
  const t = (title || '').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
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

  const approved = suggestions.filter((s) => s.status === 'approved');
  const leaderboard = [...approved]
    .sort((a, b) => (b.vote_score ?? 0) - (a.vote_score ?? 0))
    .slice(0, LEADERBOARD_TOP_N);

  const leaderboardCtx = document.getElementById('chart-vote-leaderboard');
  if (leaderboardCtx && leaderboard.length > 0) {
    const scores = leaderboard.map((s) => s.vote_score ?? 0);
    const barColors = scores.map((score) =>
      score > 0
        ? 'rgba(193, 160, 86, 0.85)'
        : score < 0
          ? 'rgba(125, 133, 144, 0.75)'
          : 'rgba(48, 54, 61, 0.9)'
    );

    window.__taleonCharts.leaderboard = new Chart(leaderboardCtx, {
      type: 'bar',
      data: {
        labels: leaderboard.map((s) => truncateLabel(s.title)),
        datasets: [
          {
            label: 'Saldo (positivos − negativos)',
            data: scores,
            backgroundColor: barColors,
            borderColor: SITE_PALETTE.border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return leaderboard[idx]?.title ?? '';
              },
              label: (ctx) => `Saldo: ${ctx.parsed.x > 0 ? '+' : ''}${ctx.parsed.x}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: SITE_PALETTE.muted, font: { size: 9 } },
            grid: { color: SITE_PALETTE.border },
          },
          y: {
            ticks: { color: SITE_PALETTE.text, font: { size: 9 } },
            grid: { display: false },
          },
        },
      },
    });
  }
}
