// src/js/app.js
import { isSupabaseConfigured } from './supabase-client.js';
import { fetchBoardSuggestions, bindSuggestionForm } from './suggestions.js';
import { renderBoard, setBoardRefreshCallback } from './board.js';
import { bindDetailModal, bindCardDetailOpen } from './detail-modal.js';
import { bindSimilarityFlow } from './similarity.js';
import { bindSuggestionImageUpload } from './storage-upload.js';
import { renderDashboards } from './charts.js';
import { fetchVoteQuota, renderVoteQuotaHeader } from './votes.js';
import { renderRecentCommentsSidebar } from './recent-comments.js';

function showToast(message) {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-message');
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.classList.remove('hidden', 'opacity-0');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 4500);
}

window.showToast = showToast;

function setLoading(visible) {
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('hidden', !visible);
}

function showConfigBanner() {
  const banner = document.getElementById('config-banner');
  if (banner) banner.classList.remove('hidden');
}

async function loadBoard() {
  if (!isSupabaseConfigured()) {
    showConfigBanner();
    return;
  }

  setLoading(true);
  try {
    await fetchVoteQuota().catch((quotaErr) => console.warn('quota de votos:', quotaErr));
    renderVoteQuotaHeader();
    const suggestions = await fetchBoardSuggestions();
    renderBoard(suggestions);
    renderRecentCommentsSidebar().catch((sidebarErr) => console.warn('sidebar:', sidebarErr));
    const footer = document.querySelector('[data-app-footer]');
    if (footer) footer.textContent = 'Feedback Portal Taleon · Dados ao vivo (Supabase)';
    renderDashboards().catch((chartErr) => console.error(chartErr));
  } catch (err) {
    showToast(err.message || 'Falha ao carregar sugestões.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

async function init() {
  setBoardRefreshCallback(loadBoard);
  bindSuggestionForm(loadBoard);
  bindDetailModal();
  bindCardDetailOpen();
  bindSimilarityFlow();
  bindSuggestionImageUpload();
  window.onCommentAdded = () => loadBoard();
  await loadBoard();
}

init();
