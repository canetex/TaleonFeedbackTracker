// src/js/board.js
import { CATEGORIES, WORLD_COLORS } from './constants.js';
import { castVote, hasVotedLocally } from './votes.js';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function worldBadge(world) {
  const color = WORLD_COLORS[world] || '#30363d';
  return `<span class="rounded px-2 py-0.5 text-xs font-semibold text-white" style="background-color:${color}">${escapeHtml(world)}</span>`;
}

function buildCard(suggestion) {
  const voted = hasVotedLocally(suggestion.id);
  const score = suggestion.vote_score ?? 0;
  const scorePrefix = score > 0 ? '+' : '';
  const desc = suggestion.description
    ? `<p class="mb-3 line-clamp-2 text-xs text-taleon-muted">${escapeHtml(suggestion.description)}</p>`
    : '';
  const commentIcon =
    (suggestion.comment_count ?? 0) > 0
      ? '<i data-lucide="message-square" class="ml-1 h-3 w-3 text-taleon-gold"></i>'
      : '';

  const voteControls = voted
    ? `<div class="flex items-center gap-1 rounded-md border border-taleon-border bg-taleon-bg px-2 py-1">
         <span class="text-sm font-bold text-taleon-gold">${scorePrefix}${score}</span>
       </div>`
    : `<div class="flex items-center gap-0.5 rounded-md border border-taleon-border bg-taleon-bg px-2 py-1" data-vote-wrap="${suggestion.id}">
         <button type="button" data-vote="up" data-id="${suggestion.id}" class="rounded p-0.5 hover:bg-taleon-border" aria-label="Upvote">
           <i data-lucide="thumbs-up" class="h-3.5 w-3.5 text-taleon-muted"></i>
         </button>
         <span class="min-w-[1.5rem] text-center text-sm font-bold text-taleon-gold" data-score="${suggestion.id}">${scorePrefix}${score}</span>
         <button type="button" data-vote="down" data-id="${suggestion.id}" class="rounded p-0.5 hover:bg-taleon-border" aria-label="Downvote">
           <i data-lucide="thumbs-down" class="h-3.5 w-3.5 text-taleon-muted"></i>
         </button>
       </div>`;

  const isPendingCategory = suggestion.category === 'Pendencias de implementação';
  const cardBorder = isPendingCategory ? 'border-taleon-gold/30' : 'border-taleon-border';

  return `
    <article class="suggestion-card rounded-lg border ${cardBorder} bg-taleon-card p-3" data-suggestion-id="${suggestion.id}">
      <div class="mb-2 flex items-start justify-between gap-2">
        ${voteControls}
        ${worldBadge(suggestion.world)}
      </div>
      <h3 class="mb-2 font-bold leading-snug">${escapeHtml(suggestion.title)}</h3>
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

function buildColumn(category, items) {
  const isPendingCol = category === 'Pendencias de implementação';
  const headerIcon = isPendingCol
    ? '<i data-lucide="alert-circle" class="h-4 w-4 shrink-0 text-taleon-gold"></i>'
    : '';
  const countClass = isPendingCol
    ? 'rounded-full bg-taleon-gold/20 px-2 py-0.5 text-xs font-medium text-taleon-gold'
    : 'rounded-full bg-taleon-border px-2 py-0.5 text-xs font-medium text-taleon-muted';

  const cards =
    items.length > 0
      ? items.map(buildCard).join('')
      : '<p class="rounded-lg border border-dashed border-taleon-border px-3 py-6 text-center text-xs text-taleon-muted">Nenhuma sugestão aprovada</p>';

  return `
    <section class="flex w-72 shrink-0 flex-col sm:w-80" aria-label="${escapeHtml(category)}">
      <div class="mb-3 flex items-center ${isPendingCol ? 'gap-2' : 'justify-between gap-2'} rounded-lg border border-taleon-border bg-taleon-card px-3 py-2">
        ${headerIcon}
        <h2 class="${isPendingCol ? 'flex-1' : ''} text-sm font-bold leading-tight">${escapeHtml(category)}</h2>
        <span class="${countClass}">${items.length}</span>
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
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const type = btn.dataset.vote;
      try {
        await castVote(id, type);
        if (typeof refreshFn === 'function') await refreshFn();
      } catch (err) {
        window.showToast?.(err.message || 'Erro ao registrar voto.');
      }
    });
  });
}
