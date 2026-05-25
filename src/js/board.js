// src/js/board.js
import { CATEGORIES, WORLD_COLORS } from './constants.js';
import {
  castVote,
  canVoteOnSuggestion,
  validateVoteBeforeCast,
} from './votes.js';
import { escapeHtml, formatDate, worldBadge, normalizeImageUrls, renderImageThumb } from './utils.js';

const PENDING_LABEL = 'PENDENTE APROVACAO';

function isPendingApproval(suggestion) {
  return suggestion.status === 'pending';
}

function pendingBadge() {
  return `<span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 bg-amber-900/50 border border-amber-600/50">${PENDING_LABEL}</span>`;
}

function buildVoteControls(suggestion) {
  if (isPendingApproval(suggestion)) {
    return `<div class="flex items-center gap-1 rounded-md border border-amber-600/30 bg-amber-900/20 px-2 py-1" title="Votos após aprovação">
      <i data-lucide="clock" class="h-3.5 w-3.5 text-amber-400"></i>
    </div>`;
  }

  const score = suggestion.vote_score ?? 0;
  const scorePrefix = score > 0 ? '+' : '';
  const canUp = canVoteOnSuggestion(suggestion.id, 'up');
  const canDown = canVoteOnSuggestion(suggestion.id, 'down');

  const upDisabled = canUp ? '' : ' disabled opacity-40 cursor-not-allowed';
  const downDisabled = canDown ? '' : ' disabled opacity-40 cursor-not-allowed';

  return `<div class="flex items-center gap-0.5 rounded-md border border-taleon-border bg-taleon-bg px-2 py-1" data-vote-wrap="${suggestion.id}">
    <button type="button" data-vote="up" data-id="${suggestion.id}" class="rounded p-0.5 hover:bg-taleon-border"${upDisabled} aria-label="Upvote">
      <i data-lucide="thumbs-up" class="h-3.5 w-3.5 text-taleon-muted"></i>
    </button>
    <span class="min-w-[1.5rem] text-center text-sm font-bold text-taleon-gold" data-score="${suggestion.id}">${scorePrefix}${score}</span>
    <button type="button" data-vote="down" data-id="${suggestion.id}" class="rounded p-0.5 hover:bg-taleon-border"${downDisabled} aria-label="Downvote">
      <i data-lucide="thumbs-down" class="h-3.5 w-3.5 text-taleon-muted"></i>
    </button>
  </div>`;
}

function buildCard(suggestion) {
  const pending = isPendingApproval(suggestion);
  const images = normalizeImageUrls(suggestion.image_urls);
  const thumb = images.length
    ? `<div class="mb-2">${renderImageThumb(images[0], 'h-14 w-full max-w-[120px]')}</div>`
    : '';
  const desc = suggestion.description
    ? `<p class="mb-3 line-clamp-2 text-xs text-taleon-muted">${escapeHtml(suggestion.description)}</p>`
    : '';
  const commentIcon =
    !pending && (suggestion.comment_count ?? 0) > 0
      ? '<i data-lucide="message-square" class="ml-1 h-3 w-3 text-taleon-gold"></i>'
      : '';

  const isPendingCategory = suggestion.category === 'Pendencias de implementação';
  let cardBorder = 'border-taleon-border';
  if (pending) cardBorder = 'border-amber-600/40 border-dashed';
  else if (isPendingCategory) cardBorder = 'border-taleon-gold/30';

  return `
    <article class="suggestion-card cursor-pointer rounded-lg border ${cardBorder} ${pending ? 'bg-taleon-card/80 opacity-95' : 'bg-taleon-card'} p-3" data-suggestion-id="${suggestion.id}" title="${pending ? 'Aguardando aprovação da equipe' : 'Ver detalhes e comentários'}">
      ${pending ? `<div class="mb-2">${pendingBadge()}</div>` : ''}
      <div class="mb-2 flex items-start justify-between gap-2">
        ${buildVoteControls(suggestion)}
        ${worldBadge(suggestion.world, WORLD_COLORS)}
      </div>
      <h3 class="mb-2 font-bold leading-snug ${pending ? 'text-taleon-muted' : ''}">${escapeHtml(suggestion.title)}</h3>
      ${thumb}
      ${desc}
      <footer class="flex items-center justify-between border-t border-taleon-border pt-2 text-xs text-taleon-muted">
        <span class="inline-flex items-center gap-1">
          <i data-lucide="user" class="h-3 w-3"></i> ${escapeHtml(suggestion.char_name)}
          ${commentIcon}
        </span>
        <time datetime="${suggestion.created_at}">${formatDate(suggestion.created_at)}</time>
      </footer>
    </article>
  `;
}

function sortColumnItems(items) {
  return [...items].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function buildColumn(category, items) {
  const sorted = sortColumnItems(items);
  const isPendingCol = category === 'Pendencias de implementação';
  const headerIcon = isPendingCol
    ? '<i data-lucide="alert-circle" class="h-4 w-4 shrink-0 text-taleon-gold"></i>'
    : '';
  const countClass = isPendingCol
    ? 'rounded-full bg-taleon-gold/20 px-2 py-0.5 text-xs font-medium text-taleon-gold'
    : 'rounded-full bg-taleon-border px-2 py-0.5 text-xs font-medium text-taleon-muted';

  const cards =
    sorted.length > 0
      ? sorted.map(buildCard).join('')
      : '<p class="rounded-lg border border-dashed border-taleon-border px-3 py-6 text-center text-xs text-taleon-muted">Nenhuma sugestão nesta categoria</p>';

  return `
    <section class="flex w-64 shrink-0 flex-col sm:w-72" aria-label="${escapeHtml(category)}">
      <div class="mb-3 flex items-center ${isPendingCol ? 'gap-2' : 'justify-between gap-2'} rounded-lg border border-taleon-border bg-taleon-card px-3 py-2">
        ${headerIcon}
        <h2 class="${isPendingCol ? 'flex-1' : ''} text-sm font-bold leading-tight">${escapeHtml(category)}</h2>
        <span class="${countClass}">${sorted.length}</span>
      </div>
      <div class="flex flex-1 flex-col gap-3" data-column-body="${escapeHtml(category)}">
        ${cards}
      </div>
    </section>
  `;
}

export function renderBoard(suggestions) {
  const board = document.getElementById('board');
  if (!board) return;

  window.__boardSuggestions = suggestions;

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const s of suggestions) {
    if (byCategory[s.category]) byCategory[s.category].push(s);
  }

  board.innerHTML = CATEGORIES.map((cat) => buildColumn(cat, byCategory[cat] || [])).join('');
  window.lucide?.createIcons();
  bindVoteHandlers(onBoardRefresh);
}

let onBoardRefresh = null;

export function setBoardRefreshCallback(fn) {
  onBoardRefresh = fn;
}

function bindVoteHandlers(refreshFn) {
  document.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.vote;
      if (btn.disabled) return;
      try {
        validateVoteBeforeCast(id, type);
        await castVote(id, type);
        if (typeof refreshFn === 'function') await refreshFn();
      } catch (err) {
        window.showToast?.(err.message || 'Erro ao registrar voto.');
      }
    });
  });
}
