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

const engagementBarLayout = {
  ...chartResponsive,
  aspectRatio: 1.35,
};

const LEADERBOARD_TOP_N = 10;

const LEADERBOARD_TOP_GOLD = CHART_GOLD_GRADIENT.slice(0, 3);

function destroyCharts() {
  for (const key of ['categoryWorldPie', 'engagement', 'leaderboardVotes', 'leaderboardComments']) {
    const inst = window.__taleonCharts?.[key];
    if (inst) inst.destroy();
  }
  window.__taleonCharts = {};
}

function categoryChartLabel(category) {
  return category.replace('Novas ', '').slice(0, 22);
}

/** Legenda/tooltip para doughnut com anel externo (categorias) e interno (SAN/AURA). */
function multiSeriesPiePlugins({ categoryLabels, worldLabels }) {
  return {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        font: { size: 9 },
        color: SITE_PALETTE.text,
        padding: 6,
        generateLabels(chart) {
          const labels = [];
          const meta0 = chart.getDatasetMeta(0);
          const meta1 = chart.getDatasetMeta(1);
          categoryLabels.forEach((text, i) => {
            const arc = meta0.data[i];
            labels.push({
              text,
              fillStyle: arc?.options?.backgroundColor ?? CATEGORY_CHART_COLORS[i],
              strokeStyle: SITE_PALETTE.border,
              lineWidth: 1,
              hidden: !chart.isDatasetVisible(0) || meta0.data[i]?.hidden,
              index: i,
              datasetIndex: 0,
            });
          });
          worldLabels.forEach((text, i) => {
            const arc = meta1.data[i];
            labels.push({
              text,
              fillStyle: arc?.options?.backgroundColor ?? CHART_GOLD_GRADIENT[i],
              strokeStyle: SITE_PALETTE.border,
              lineWidth: 1,
              hidden: !chart.isDatasetVisible(1) || meta1.data[i]?.hidden,
              index: i,
              datasetIndex: 1,
            });
          });
          return labels;
        },
      },
      onClick(_mouseEvent, legendItem, legend) {
        const meta = legend.chart.getDatasetMeta(legendItem.datasetIndex);
        meta.hidden = meta.hidden === null ? !legend.chart.data.datasets[legendItem.datasetIndex].hidden : null;
        legend.chart.update();
      },
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const dsLabel = ctx.dataset.label || '';
          const name =
            ctx.datasetIndex === 0
              ? categoryLabels[ctx.dataIndex]
              : worldLabels[ctx.dataIndex];
          return `${dsLabel}: ${name} — ${ctx.formattedValue}`;
        },
      },
    },
  };
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
  const countByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  const saldoByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  let votesUpTotal = 0;
  let votesDownTotal = 0;

  for (const s of suggestions) {
    if (byCategory[s.category] !== undefined) byCategory[s.category]++;
    if (byWorld[s.world] !== undefined) byWorld[s.world]++;
    if (s.status === 'approved') {
      votesUpTotal += s.vote_up_count ?? 0;
      votesDownTotal += s.vote_down_count ?? 0;
      if (countByCategory[s.category] !== undefined) {
        countByCategory[s.category]++;
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
  const worldLabels = ['SAN', 'AURA'];
  const pieCtx = document.getElementById('chart-category-doughnut');
  if (pieCtx) {
    window.__taleonCharts.categoryWorldPie = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: [...categoryLabels, ...worldLabels],
        datasets: [
          {
            label: 'Categoria',
            data: CATEGORIES.map((c) => byCategory[c]),
            backgroundColor: CATEGORY_CHART_COLORS,
            borderColor: CHART_GOLD_GRADIENT,
            borderWidth: 1,
            radius: '100%',
            cutout: '52%',
          },
          {
            label: 'Mundo',
            data: [byWorld.SAN, byWorld.AURA],
            backgroundColor: [CHART_GOLD_GRADIENT[0], CHART_GOLD_GRADIENT[2]],
            borderColor: [CHART_GOLD_GRADIENT[0], CHART_GOLD_GRADIENT[2]],
            borderWidth: 1,
            radius: '48%',
            cutout: '0%',
          },
        ],
      },
      options: {
        ...doughnutLayout,
        plugins: multiSeriesPiePlugins({ categoryLabels, worldLabels }),
      },
    });
  }

  const engagementLabels = CATEGORIES.map((c) => c.split(' ').slice(0, 3).join(' '));
  const saldoValues = CATEGORIES.map((c) => saldoByCategory[c]);
  const engagementCtx = document.getElementById('chart-engagement-category');
  if (engagementCtx) {
    window.__taleonCharts.engagement = new Chart(engagementCtx, {
      type: 'bar',
      data: {
        labels: engagementLabels,
        datasets: [
          {
            label: 'Sugestões aprovadas',
            data: CATEGORIES.map((c) => countByCategory[c]),
            backgroundColor: 'rgba(193, 160, 86, 0.88)',
            borderColor: SITE_PALETTE.gold,
            borderWidth: 1,
            yAxisID: 'y',
            order: 2,
          },
          {
            label: 'Saldo de votos',
            data: saldoValues,
            backgroundColor: saldoValues.map((v) =>
              v < 0 ? 'rgba(125, 133, 144, 0.55)' : 'rgba(240, 212, 138, 0.42)'
            ),
            borderColor: saldoValues.map((v) =>
              v < 0 ? SITE_PALETTE.muted : CHART_GOLD_GRADIENT[0]
            ),
            borderWidth: 1,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        ...engagementBarLayout,
        datasets: {
          bar: {
            grouped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.9,
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: SITE_PALETTE.text, font: { size: 9 }, boxWidth: 10 },
          },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                if (items.length < 2) return [];
                const cat = CATEGORIES[items[0].dataIndex];
                if (!cat) return [];
                return [`Categoria: ${cat}`];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: SITE_PALETTE.text, font: { size: 8 }, maxRotation: 45, minRotation: 25 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            position: 'left',
            title: {
              display: true,
              text: 'Sugestões',
              color: SITE_PALETTE.muted,
              font: { size: 9 },
            },
            ticks: { color: SITE_PALETTE.muted, font: { size: 8 }, stepSize: 1 },
            grid: { color: SITE_PALETTE.border },
          },
          y1: {
            position: 'right',
            title: {
              display: true,
              text: 'Saldo',
              color: SITE_PALETTE.gold,
              font: { size: 9 },
            },
            ticks: { color: SITE_PALETTE.gold, font: { size: 8 } },
            grid: { drawOnChartArea: false },
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
}
