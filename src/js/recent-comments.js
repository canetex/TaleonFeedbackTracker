// src/js/recent-comments.js — widget lateral de últimos comentários
import { fetchRecentComments } from './comments.js';
import { escapeHtml, formatRelativeTime, truncateText, worldBadge } from './utils.js';
import { WORLD_COLORS, STORAGE_RECENT_WIDGET_MINIMIZED_KEY } from './constants.js';

const RECENT_LIMIT = 8;

function isWidgetMinimized() {
  try {
    return localStorage.getItem(STORAGE_RECENT_WIDGET_MINIMIZED_KEY) === '1';
  } catch {
    return false;
  }
}

function setWidgetMinimized(minimized) {
  try {
    localStorage.setItem(STORAGE_RECENT_WIDGET_MINIMIZED_KEY, minimized ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function applyWidgetState(minimized) {
  const widget = document.getElementById('recent-comments-widget');
  const toggleBtn = document.getElementById('btn-recent-widget-toggle');
  if (!widget || !toggleBtn) return;

  widget.classList.toggle('is-minimized', minimized);
  toggleBtn.setAttribute('aria-expanded', minimized ? 'false' : 'true');
  toggleBtn.title = minimized ? 'Expandir painel de comentários' : 'Minimizar painel';
  toggleBtn.setAttribute('aria-label', toggleBtn.title);

  const icon = toggleBtn.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', minimized ? 'message-circle' : 'panel-right-close');
    window.lucide?.createIcons();
  }
}

export function bindRecentCommentsWidget() {
  const toggleBtn = document.getElementById('btn-recent-widget-toggle');
  if (!toggleBtn) return;

  applyWidgetState(isWidgetMinimized());

  toggleBtn.addEventListener('click', () => {
    const next = !document.getElementById('recent-comments-widget')?.classList.contains('is-minimized');
    setWidgetMinimized(next);
    applyWidgetState(next);
  });
}

function renderRecentItem(comment) {
  const excerpt = truncateText(comment.content, 100);
  const title = truncateText(comment.suggestion_title || 'Sugestão', 48);

  return `
    <button
      type="button"
      class="recent-comment-item w-full rounded-lg border border-taleon-border bg-taleon-bg/80 p-3 text-left transition hover:border-taleon-gold/50 hover:bg-taleon-bg"
      data-suggestion-id="${escapeHtml(comment.suggestion_id)}"
    >
      <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1 text-xs font-medium text-taleon-text">
          <i data-lucide="user" class="h-3 w-3"></i>
          ${escapeHtml(comment.char_name)}
          ${worldBadge(comment.world, WORLD_COLORS)}
        </span>
        <time class="text-[10px] text-taleon-muted" datetime="${comment.created_at}">${formatRelativeTime(comment.created_at)}</time>
      </div>
      <p class="mb-1.5 line-clamp-2 text-xs leading-relaxed text-taleon-muted">${escapeHtml(excerpt)}</p>
      <p class="truncate text-[10px] font-semibold text-taleon-gold" title="${escapeHtml(comment.suggestion_title || '')}">
        <i data-lucide="layout-grid" class="mr-0.5 inline h-3 w-3"></i>${escapeHtml(title)}
      </p>
    </button>
  `;
}

function bindRecentCommentItems(listEl) {
  listEl.querySelectorAll('.recent-comment-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.suggestionId;
      const suggestion = window.__boardSuggestions?.find((s) => s.id === id);
      if (suggestion && typeof window.openDetailModal === 'function') {
        window.openDetailModal(suggestion);
      }
    });
  });
}

export async function renderRecentCommentsSidebar() {
  const listEl = document.getElementById('recent-comments-list');
  if (!listEl) return;

  listEl.innerHTML =
    '<p class="py-6 text-center text-xs text-taleon-muted">Carregando comentários…</p>';

  try {
    const comments = await fetchRecentComments(RECENT_LIMIT);
    if (!comments.length) {
      listEl.innerHTML =
        '<p class="py-6 text-center text-xs text-taleon-muted">Nenhum comentário ainda.</p>';
      return;
    }

    listEl.innerHTML = comments.map(renderRecentItem).join('');
    window.lucide?.createIcons();
    bindRecentCommentItems(listEl);
  } catch (err) {
    listEl.innerHTML = `<p class="py-4 text-center text-xs text-red-400">${escapeHtml(err.message)}</p>`;
  }
}
