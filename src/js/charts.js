// src/js/charts.js
import {
  CATEGORIES,
  CATEGORY_CHART_COLORS,
  CHART_GOLD_GRADIENT,
  SITE_PALETTE,
} from './constants.js';
import { fetchBoardSuggestions } from './suggestions.js';

const chartDefaults = {
  color: SITE_PALETTE.text,
  borderColor: SITE_PALETTE.border,
};

const chartResponsive = {
  responsive: true,
  maintainAspectRatio: true,
};

const doughnutLayout = {
  ...chartResponsive,
  aspectRatio: 1.35,
};

const engagementRadarLayout = {
  ...chartResponsive,
  aspectRatio: 1.25,
};

const LEADERBOARD_TOP_N = 10;

const LEADERBOARD_TOP_GOLD = CHART_GOLD_GRADIENT.slice(0, 3);

let dashboardsRendered = false;

export function areDashboardsRendered() {
  return dashboardsRendered;
}

export function invalidateDashboards() {
  if (dashboardsRendered) destroyCharts();
  dashboardsRendered = false;
}

export function resizeDashboardCharts() {
  const charts = window.__taleonCharts;
  if (!charts) return;
  for (const inst of Object.values(charts)) {
    inst?.resize?.();
  }
}

function destroyCharts() {
  for (const key of ['categoryWorldPie', 'engagement', 'leaderboardVotes', 'leaderboardComments']) {
    const inst = window.__taleonCharts?.[key];
    if (inst) inst.destroy();
  }
  window.__taleonCharts = {};
  dashboardsRendered = false;
}

function categoryChartLabel(category) {
  return category.replace('Novas ', '').slice(0, 22);
}

/** Chart.js: dataset 0 = anel externo; dataset 1 = anel interno (centro). */
const PIE_RING = { OUTER: 0, INNER: 1 };

const WORLD_PIE_COLORS = [CHART_GOLD_GRADIENT[0], CHART_GOLD_GRADIENT[2]];

function categoryWorldPieTooltipPlugins({ categoryLabels, worldLabels }) {
  return {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title(items) {
          const ds = items[0]?.datasetIndex;
          if (ds === PIE_RING.OUTER) return 'Anel externo · Categoria';
          if (ds === PIE_RING.INNER) return 'Anel interno · Servidor';
          return '';
        },
        label(ctx) {
          const name =
            ctx.datasetIndex === PIE_RING.OUTER
              ? categoryLabels[ctx.dataIndex]
              : worldLabels[ctx.dataIndex];
          const n = ctx.parsed;
          return `${name}: ${n} sugestão${n === 1 ? '' : 'ões'}`;
        },
      },
    },
  };
}

/** Legenda HTML em duas colunas (evita misturar 6 + 2 fatias na legenda do Chart.js). */
function renderCategoryWorldHtmlLegend({ categoryLabels, categoryCounts, worldLabels, worldCounts }) {
  const catList = document.getElementById('legend-categories');
  const worldList = document.getElementById('legend-worlds');
  if (!catList || !worldList) return;

  catList.innerHTML = categoryLabels
    .map(
      (label, i) => `
    <li class="flex items-center gap-1.5 leading-tight">
      <span class="h-2 w-2 shrink-0 rounded-sm border border-taleon-border" style="background-color:${CATEGORY_CHART_COLORS[i]}"></span>
      <span>${label} <span class="text-taleon-muted">(${categoryCounts[i] ?? 0})</span></span>
    </li>`
    )
    .join('');

  worldList.innerHTML = worldLabels
    .map(
      (label, i) => `
    <li class="flex items-center gap-1.5 leading-tight">
      <span class="h-2 w-2 shrink-0 rounded-sm border border-taleon-border" style="background-color:${WORLD_PIE_COLORS[i]}"></span>
      <span>${label} <span class="text-taleon-muted">(${worldCounts[i] ?? 0})</span></span>
    </li>`
    )
    .join('');
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

/** Clique na barra abre o modal de detalhes da sugestão. */
function leaderboardClickOptions(items) {
  return {
    onClick(_evt, elements) {
      if (!elements?.length) return;
      const suggestion = items[elements[0].index];
      if (suggestion && typeof window.openDetailModal === 'function') {
        window.openDetailModal(suggestion);
      }
    },
    onHover(evt, elements) {
      const target = evt.native?.target;
      if (target) target.style.cursor = elements?.length ? 'pointer' : 'default';
    },
  };
}

/** Degradê: top 3 dourado; demais posições esmaecem até o cinza do tema. */
function leaderboardBarColor(rank, total) {
  if (rank < 3) return LEADERBOARD_TOP_GOLD[rank];
  const steps = Math.max(total - 3, 1);
  const t = (rank - 3) / Math.max(steps - 1, 1);
  const [r, g, b] = mixRgb([154, 125, 62], [48, 54, 61], t);
  return `rgba(${r}, ${g}, ${b}, ${0.92 - t * 0.25})`;
}

/**
 * Leaderboard horizontal (votos ou comentários).
 * @returns {object[]|null} itens renderizados
 */
function renderHorizontalLeaderboard(chartKey, canvasId, items, { datasetLabel, getValue, tooltipLines }) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !items.length) return null;

  const values = items.map(getValue);
  const n = items.length;
  const barColors = items.map((_, rank) => leaderboardBarColor(rank, n));
  const barBorders = items.map((_, rank) =>
    rank < 3 ? LEADERBOARD_TOP_GOLD[rank] : SITE_PALETTE.border
  );
  const barBorderWidths = items.map((_, rank) => (rank < 3 ? 2 : 1));

  window.__taleonCharts[chartKey] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: items.map((s) => truncateLabel(s.title)),
      datasets: [
        {
          label: datasetLabel,
          data: values,
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
      ...leaderboardClickOptions(items),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => {
              const idx = tooltipItems[0]?.dataIndex ?? 0;
              return items[idx]?.title ?? '';
            },
            label: (ctx) => tooltipLines(ctx, items),
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
  return items;
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
  const saldoByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  let votesUpTotal = 0;
  let votesDownTotal = 0;

  for (const s of suggestions) {
    if (byCategory[s.category] !== undefined) byCategory[s.category]++;
    if (byWorld[s.world] !== undefined) byWorld[s.world]++;
    if (s.status === 'approved') {
      votesUpTotal += s.vote_up_count ?? 0;
      votesDownTotal += s.vote_down_count ?? 0;
      if (saldoByCategory[s.category] !== undefined) {
        saldoByCategory[s.category] += s.vote_score ?? 0;
      }
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

  const categoryLabels = CATEGORIES.map(categoryChartLabel);
  const categoryCounts = CATEGORIES.map((c) => byCategory[c]);
  const worldLabels = ['SAN', 'AURA'];
  const worldCounts = [byWorld.SAN, byWorld.AURA];
  const pieCtx = document.getElementById('chart-category-doughnut');
  if (pieCtx) {
    window.__taleonCharts.categoryWorldPie = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: categoryLabels,
        datasets: [
          {
            label: 'Categoria (anel externo)',
            data: categoryCounts,
            backgroundColor: CATEGORY_CHART_COLORS,
            borderColor: CHART_GOLD_GRADIENT,
            borderWidth: 1,
            radius: '100%',
            cutout: '50%',
          },
          {
            label: 'Servidor (anel interno)',
            data: worldCounts,
            backgroundColor: WORLD_PIE_COLORS,
            borderColor: WORLD_PIE_COLORS,
            borderWidth: 1,
            radius: '50%',
            cutout: '0%',
          },
        ],
      },
      options: {
        ...doughnutLayout,
        plugins: categoryWorldPieTooltipPlugins({ categoryLabels, worldLabels }),
      },
    });
    renderCategoryWorldHtmlLegend({
      categoryLabels,
      categoryCounts,
      worldLabels,
      worldCounts,
    });
  }

  const engagementLabels = CATEGORIES.map((c) => c.split(' ').slice(0, 3).join(' '));
  const feedbacksPerCategory = CATEGORIES.map((c) => byCategory[c]);
  const saldoPerCategory = CATEGORIES.map((c) => saldoByCategory[c]);
  const engagementCtx = document.getElementById('chart-engagement-category');
  if (engagementCtx) {
    const axisValues = [...feedbacksPerCategory, ...saldoPerCategory];
    const rMax = Math.max(...axisValues, 1);
    const rMin = Math.min(...axisValues, 0);

    window.__taleonCharts.engagement = new Chart(engagementCtx, {
      type: 'radar',
      data: {
        labels: engagementLabels,
        datasets: [
          {
            label: 'Feedbacks por Categoria',
            data: feedbacksPerCategory,
            borderColor: SITE_PALETTE.gold,
            backgroundColor: 'rgba(193, 160, 86, 0.22)',
            pointBackgroundColor: SITE_PALETTE.gold,
            pointBorderColor: SITE_PALETTE.border,
            pointHoverBackgroundColor: CHART_GOLD_GRADIENT[0],
            pointHoverBorderColor: SITE_PALETTE.border,
            borderWidth: 2,
            fill: true,
          },
          {
            label: 'Saldo de Votos da Categoria',
            data: saldoPerCategory,
            borderColor: CHART_GOLD_GRADIENT[0],
            backgroundColor: 'rgba(240, 212, 138, 0.18)',
            pointBackgroundColor: CHART_GOLD_GRADIENT[0],
            pointBorderColor: SITE_PALETTE.border,
            pointHoverBackgroundColor: CHART_GOLD_GRADIENT[0],
            pointHoverBorderColor: SITE_PALETTE.border,
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      options: {
        ...engagementRadarLayout,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: SITE_PALETTE.text, font: { size: 9 }, boxWidth: 10 },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return CATEGORIES[idx] ?? engagementLabels[idx] ?? '';
              },
              label(ctx) {
                const idx = ctx.dataIndex ?? 0;
                const value = ctx.parsed.r ?? ctx.raw;
                if (ctx.datasetIndex === 0) {
                  return `Feedbacks: ${value}`;
                }
                const saldo = saldoPerCategory[idx];
                return `Saldo de votos: ${saldo > 0 ? '+' : ''}${saldo}`;
              },
            },
          },
        },
        elements: {
          line: { tension: 0.12 },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          r: {
            beginAtZero: rMin >= 0,
            suggestedMin: rMin < 0 ? Math.floor(rMin * 1.12) : 0,
            suggestedMax: Math.ceil(rMax * 1.12),
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
      },
    });
  }

  const approved = suggestions.filter((s) => s.status === 'approved');
  const voteLeaderboard = [...approved]
    .sort((a, b) => (b.vote_score ?? 0) - (a.vote_score ?? 0))
    .slice(0, LEADERBOARD_TOP_N);

  const commentLeaderboard = [...approved]
    .filter((s) => (s.comment_count ?? 0) > 0)
    .sort((a, b) => (b.comment_count ?? 0) - (a.comment_count ?? 0))
    .slice(0, LEADERBOARD_TOP_N);

  const votesRendered = renderHorizontalLeaderboard(
    'leaderboardVotes',
    'chart-vote-leaderboard',
    voteLeaderboard,
    {
      datasetLabel: 'Saldo (positivos − negativos)',
      getValue: (s) => s.vote_score ?? 0,
      tooltipLines: (ctx, items) => {
        const idx = ctx.dataIndex ?? 0;
        const item = items[idx];
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
    }
  );

  const commentsRendered = renderHorizontalLeaderboard(
    'leaderboardComments',
    'chart-comment-leaderboard',
    commentLeaderboard,
    {
      datasetLabel: 'Comentários',
      getValue: (s) => s.comment_count ?? 0,
      tooltipLines: (ctx, items) => {
        const idx = ctx.dataIndex ?? 0;
        const count = ctx.parsed.x;
        const rank = idx + 1;
        return [
          rank <= 3 ? `#${rank} no ranking` : null,
          `Comentários: ${count}`,
        ].filter(Boolean);
      },
    }
  );

  const commentEmptyEl = document.getElementById('comment-leaderboard-empty');
  const commentCanvas = document.getElementById('chart-comment-leaderboard');
  if (commentEmptyEl && commentCanvas) {
    const showEmpty = !commentsRendered;
    commentEmptyEl.classList.toggle('hidden', !showEmpty);
    commentCanvas.classList.toggle('hidden', showEmpty);
  }

  if (votesRendered || commentsRendered) {
    window.__taleonLeaderboards = {
      ...(votesRendered ? { votes: votesRendered } : {}),
      ...(commentsRendered ? { comments: commentsRendered } : {}),
    };
  }

  dashboardsRendered = true;
  requestAnimationFrame(() => resizeDashboardCharts());
}
