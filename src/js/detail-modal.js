// src/js/detail-modal.js
import { fetchComments, createComment } from './comments.js';
import { fetchSuggestionVoteStats } from './suggestions.js';
import {
  bindCommentImageUpload,
  clearPendingCommentImages,
  getPendingCommentImageUrls,
} from './storage-upload.js';
import { escapeHtml, formatDate, worldBadge, renderImageGallery } from './utils.js';
import { WORLD_COLORS } from './constants.js';
import { markCardViewed } from './comment-views.js';
import { renderBoard } from './board.js';

let currentSuggestion = null;

function renderCommentsList(comments) {
  const list = document.getElementById('detail-comments-list');
  if (!list) return;

  if (!comments.length) {
    list.innerHTML =
      '<p class="text-sm text-taleon-muted py-4 text-center">Nenhum comentário ainda. Seja o primeiro!</p>';
    return;
  }

  list.innerHTML = comments
    .map(
      (c) => `
    <article class="rounded-lg border border-taleon-border bg-taleon-bg px-3 py-2">
      <div class="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-taleon-muted">
        <span class="inline-flex items-center gap-1 font-medium text-taleon-text">
          <i data-lucide="user" class="h-3 w-3"></i> ${escapeHtml(c.char_name)}
          ${worldBadge(c.world, WORLD_COLORS)}
        </span>
        <time datetime="${c.created_at}">${formatDate(c.created_at)}</time>
      </div>
      <p class="text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(c.content)}</p>
      ${renderImageGallery(c.image_urls, { size: 'detail' })}
    </article>
  `
    )
    .join('');
  window.lucide?.createIcons();
}

function renderDetailVoteStats({ vote_up_count, vote_down_count, vote_score }) {
  const voteUpEl = document.getElementById('detail-vote-up');
  const voteDownEl = document.getElementById('detail-vote-down');
  const voteScoreEl = document.getElementById('detail-vote-score');
  const up = vote_up_count ?? 0;
  const down = vote_down_count ?? 0;
  const score = vote_score ?? up - down;

  if (voteUpEl) voteUpEl.textContent = String(up);
  if (voteDownEl) voteDownEl.textContent = String(down);
  if (voteScoreEl) {
    voteScoreEl.textContent = score > 0 ? `+${score}` : String(score);
  }
}

function syncBoardSuggestionVoteStats(suggestionId, stats) {
  if (!window.__boardSuggestions?.length) return;
  const idx = window.__boardSuggestions.findIndex((s) => s.id === suggestionId);
  if (idx === -1) return;
  window.__boardSuggestions[idx] = {
    ...window.__boardSuggestions[idx],
    ...stats,
  };
}

function syncBoardCommentViewStats(suggestionId, comments) {
  if (!window.__boardSuggestions?.length) return;
  const idx = window.__boardSuggestions.findIndex((s) => s.id === suggestionId);
  if (idx === -1) return;
  window.__boardSuggestions[idx] = {
    ...window.__boardSuggestions[idx],
    comments_seen: comments?.length ?? 0,
    comments_new: 0,
  };
}

export async function openDetailModal(suggestion) {
  currentSuggestion = suggestion;
  clearPendingCommentImages();
  const modal = document.getElementById('modal-detail');
  if (!modal) return;

  const pending = suggestion.status === 'pending';
  const pendingBadge = pending
    ? '<span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 bg-amber-900/50 border border-amber-600/50">PENDENTE APROVACAO</span>'
    : '';

  document.getElementById('detail-title').textContent = suggestion.title;
  document.getElementById('detail-meta').innerHTML = `
    ${pendingBadge}
    ${worldBadge(suggestion.world, WORLD_COLORS)}
    <span class="text-xs text-taleon-muted">${escapeHtml(suggestion.category)}</span>
    <span class="text-xs text-taleon-muted">· ${escapeHtml(suggestion.char_name)}</span>
    <span class="text-xs text-taleon-muted">· ${formatDate(suggestion.created_at)}</span>
  `;
  document.getElementById('detail-description').textContent = suggestion.description || '';
  const galleryEl = document.getElementById('detail-images');
  if (galleryEl) {
    const galleryHtml = renderImageGallery(suggestion.image_urls, { size: 'detail' });
    galleryEl.innerHTML = galleryHtml;
    galleryEl.classList.toggle('hidden', !galleryHtml);
  }

  const voteWrap = document.getElementById('detail-vote-wrap');
  if (pending) {
    voteWrap?.classList.add('hidden');
  } else {
    voteWrap?.classList.remove('hidden');
    renderDetailVoteStats({
      vote_up_count: suggestion.vote_up_count,
      vote_down_count: suggestion.vote_down_count,
      vote_score: suggestion.vote_score,
    });

    fetchSuggestionVoteStats(suggestion.id)
      .then((stats) => {
        if (currentSuggestion?.id !== suggestion.id) return;
        currentSuggestion = { ...currentSuggestion, ...stats };
        syncBoardSuggestionVoteStats(suggestion.id, stats);
        renderDetailVoteStats(stats);
        window.lucide?.createIcons();
      })
      .catch((err) => {
        console.error('Falha ao carregar votos da sugestão:', err);
      });
  }

  const commentForm = document.getElementById('form-comment');
  const commentPendingNotice = document.getElementById('detail-comments-pending-notice');
  if (pending) {
    commentForm?.classList.add('hidden');
    commentPendingNotice?.classList.remove('hidden');
  } else {
    commentForm?.classList.remove('hidden');
    commentPendingNotice?.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  const list = document.getElementById('detail-comments-list');
  if (pending) {
    if (list) {
      list.innerHTML =
        '<p class="text-sm text-amber-200/90 py-4 text-center">Comentários e votos ficam disponíveis após aprovação da equipe.</p>';
    }
  } else {
    if (list) list.innerHTML = '<p class="text-sm text-taleon-muted py-4 text-center">Carregando comentários…</p>';
    try {
      const comments = await fetchComments(suggestion.id);
      renderCommentsList(comments);
      markCardViewed(suggestion.id);
      syncBoardCommentViewStats(suggestion.id, comments);
    } catch (err) {
      if (list) list.innerHTML = `<p class="text-sm text-red-400 py-2">${escapeHtml(err.message)}</p>`;
    }
  }

  window.lucide?.createIcons();
}

export function bindDetailModal() {
  const modal = document.getElementById('modal-detail');
  const form = document.getElementById('form-comment');
  const closeBtns = document.querySelectorAll('[data-close-detail]');

  bindCommentImageUpload();

  closeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewedId = currentSuggestion?.id;
      modal?.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      clearPendingCommentImages();
      currentSuggestion = null;
      if (viewedId && window.__boardSuggestions?.length) {
        renderBoard(window.__boardSuggestions);
      }
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentSuggestion) return;

    const fd = new FormData(form);
    try {
      await createComment(currentSuggestion.id, {
        char_name: fd.get('char_name'),
        world: fd.get('world'),
        content: fd.get('content'),
        image_urls: getPendingCommentImageUrls(),
      });
      form.reset();
      clearPendingCommentImages();
      const comments = await fetchComments(currentSuggestion.id);
      renderCommentsList(comments);
      markCardViewed(currentSuggestion.id);
      syncBoardCommentViewStats(currentSuggestion.id, comments);
      window.showToast?.('Comentário publicado!');
      if (typeof window.onCommentAdded === 'function') {
        window.onCommentAdded(currentSuggestion.id);
      }
    } catch (err) {
      window.showToast?.(err.message || 'Erro ao enviar comentário.');
    }
  });
}

window.openDetailModal = openDetailModal;

export function bindCardDetailOpen() {
  document.getElementById('board')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-vote]') || e.target.closest('button')) return;
    const card = e.target.closest('[data-suggestion-id]');
    if (!card) return;
    const id = card.dataset.suggestionId;
    const suggestion = window.__boardSuggestions?.find((s) => s.id === id);
    if (suggestion) openDetailModal(suggestion);
  });
}
