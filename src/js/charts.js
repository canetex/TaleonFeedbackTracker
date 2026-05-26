// src/js/charts.js
import {
  CATEGORIES,
  CATEGORY_CHART_COLORS,
  CHART_GOLD_GRADIENT,
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

const LEADERBOARD_TOP_GOLD = CHART_GOLD_GRADIENT.slice(0, 3);

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

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Degradê: top 3 dourado; demais posições esmaecem até o cinza do tema. */
function leaderboardBarColor(rank, total) {
  if (rank < 3) return LEADERBOARD_TOP_GOLD[rank];
  const steps = Math.max(total - 3, 1);
  const t = (rank - 3) / Math.max(steps - 1, 1);
  const [r, g, b] = mixRgb([154, 125, 62], [48, 54, 61], t);
  return `rgba(${r}, ${g}, ${b}, ${0.92 - t * 0.25})`;
}

function renderCommunityStats({ feedbackTotal, votesUp, votesDown }) {
  const votesTotal = votesUp + votesDown;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  set('stat-feedback-total', feedbackTotal);
  set('stat-votes-up', votesUp);
  set('stat-votes-down', votesDown);
  set('stat-votes-total', votesTotal);
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
  let votesUpTotal = 0;
  let votesDownTotal = 0;

  for (const s of suggestions) {
    if (byCategory[s.category] !== undefined) byCategory[s.category]++;
    if (byWorld[s.world] !== undefined) byWorld[s.world]++;
    const eng = Math.abs(s.vote_score ?? 0) + (s.comment_count ?? 0);
    if (engagementByCategory[s.category] !== undefined) {
      engagementByCategory[s.category] += eng;
    }
    if (s.status === 'approved') {
      votesUpTotal += s.vote_up_count ?? 0;
      votesDownTotal += s.vote_down_count ?? 0;
    }
  }

  renderCommunityStats({
    feedbackTotal: suggestions.length,
    votesUp: votesUpTotal,
    votesDown: votesDownTotal,
  });
  window.lucide?.createIcons();

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
            backgroundColor: CATEGORY_CHART_COLORS.map((c) => c),
            borderColor: CHART_GOLD_GRADIENT.map((c) => c),
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
            borderColor: [SITE_PALETTE.san, SITE_PALETTE.aura],
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
            backgroundColor: 'rgba(193, 160, 86, 0.22)',
            pointBackgroundColor: CHART_GOLD_GRADIENT,
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
    const n = leaderboard.length;
    const barColors = leaderboard.map((_, rank) => leaderboardBarColor(rank, n));
    const barBorders = leaderboard.map((_, rank) =>
      rank < 3 ? LEADERBOARD_TOP_GOLD[rank] : SITE_PALETTE.border
    );
    const barBorderWidths = leaderboard.map((_, rank) => (rank < 3 ? 2 : 1));

    window.__taleonCharts.leaderboard = new Chart(leaderboardCtx, {
      type: 'bar',
      data: {
        labels: leaderboard.map((s) => truncateLabel(s.title)),
        datasets: [
          {
            label: 'Saldo (positivos − negativos)',
            data: scores,
            backgroundColor: barColors,
            borderColor: barBorders,
            borderWidth: barBorderWidths,
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
              label: (ctx) => {
                const idx = ctx.dataIndex ?? 0;
                const item = leaderboard[idx];
                const up = item?.vote_up_count ?? 0;
                const down = item?.vote_down_count ?? 0;
                const saldo = ctx.parsed.x;
                const rank = idx + 1;
                return [
                  rank <= 3 ? `#${rank} no ranking` : null,
                  `Saldo: ${saldo > 0 ? '+' : ''}${saldo}`,
                  `Positivos: ${up} · Negativos: ${down}`,
                ].filter(Boolean);
              },
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
