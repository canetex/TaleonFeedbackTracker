// src/js/app.js
import { isSupabaseConfigured } from './supabase-client.js';
import { fetchApprovedSuggestions, bindSuggestionForm } from './suggestions.js';
import { renderBoard, setBoardRefreshCallback } from './board.js';
import { bindDetailModal, bindCardDetailOpen } from './detail-modal.js';

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
    const suggestions = await fetchApprovedSuggestions();
    renderBoard(suggestions);
    const footer = document.querySelector('[data-app-footer]');
    if (footer) footer.textContent = 'Feedback Portal Taleon · Dados ao vivo (Supabase)';
  } catch (err) {
    showToast(err.message || 'Falha ao carregar sugestões.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

async function init() {
  setBoardRefreshCallback(loadBoard);
  bindSuggestionForm();
  bindDetailModal();
  bindCardDetailOpen();
  window.onCommentAdded = () => loadBoard();
  await loadBoard();
}

init();
