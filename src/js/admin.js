// src/js/admin.js
import { isSupabaseConfigured } from './supabase-client.js';
import {
  verifyAdminPassword,
  fetchPendingSuggestions,
  approveSuggestion,
  deleteSuggestion,
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
} from './admin-api.js';
import { escapeHtml, formatDate, worldBadge, renderImageGallery } from './utils.js';
import { CATEGORIES, WORLD_COLORS } from './constants.js';

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

function showPanel(panel) {
  document.getElementById('panel-login')?.classList.toggle('hidden', panel !== 'login');
  document.getElementById('panel-admin')?.classList.toggle('hidden', panel !== 'admin');
  document.getElementById('btn-admin-logout')?.classList.toggle('hidden', panel !== 'admin');
}

function categorySelectOptions(selected) {
  return CATEGORIES.map(
    (cat) =>
      `<option value="${escapeHtml(cat)}"${cat === selected ? ' selected' : ''}>${escapeHtml(cat)}</option>`,
  ).join('');
}

function renderPendingCard(item) {
  return `
    <article class="rounded-lg border border-taleon-border bg-taleon-card p-4" data-pending-id="${item.id}">
      <div class="mb-2 flex flex-wrap items-start justify-between gap-2">
        <span class="text-xs text-taleon-muted">Categoria enviada: <span class="text-taleon-gold">${escapeHtml(item.category)}</span></span>
        ${worldBadge(item.world, WORLD_COLORS)}
      </div>
      <h3 class="mb-2 text-base font-bold">${escapeHtml(item.title)}</h3>
      <p class="mb-3 text-sm text-taleon-muted whitespace-pre-wrap">${escapeHtml(item.description)}</p>
      ${renderImageGallery(item.image_urls, { size: 'detail' })}
      <p class="mb-3 text-xs text-taleon-muted">
        <i data-lucide="user" class="inline h-3 w-3"></i> ${escapeHtml(item.char_name)}
        · <time datetime="${item.created_at}">${formatDate(item.created_at)}</time>
      </p>
      <div class="mb-3 rounded-lg border border-taleon-border bg-taleon-bg p-3">
        <label class="mb-1 block text-xs font-medium text-taleon-muted" for="category-${item.id}">
          Categoria no portal (ao aprovar)
        </label>
        <select
          id="category-${item.id}"
          data-category-select
          class="w-full rounded-lg border border-taleon-border bg-taleon-card px-3 py-2 text-sm outline-none focus:border-taleon-gold"
        >${categorySelectOptions(item.category)}</select>
      </div>
      <div class="flex flex-wrap gap-2 border-t border-taleon-border pt-3">
        <button type="button" data-approve="${item.id}" class="inline-flex items-center gap-1 rounded-lg border border-green-600/40 bg-green-900/20 px-3 py-1.5 text-sm font-semibold text-green-400 hover:bg-green-900/40">
          <i data-lucide="check" class="h-4 w-4"></i> Aprovar
        </button>
        <button type="button" data-delete="${item.id}" class="inline-flex items-center gap-1 rounded-lg border border-red-600/40 bg-red-900/20 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-900/40">
          <i data-lucide="trash-2" class="h-4 w-4"></i> Excluir
        </button>
      </div>
    </article>
  `;
}

async function loadPending() {
  const password = getAdminPassword();
  const list = document.getElementById('pending-list');
  const count = document.getElementById('pending-count');
  if (!list) return;

  list.innerHTML = '<p class="text-sm text-taleon-muted py-8 text-center">Carregando pendências…</p>';

  try {
    const items = await fetchPendingSuggestions(password);
    if (count) count.textContent = String(items.length);

    if (!items.length) {
      list.innerHTML =
        '<p class="rounded-lg border border-dashed border-taleon-border px-4 py-12 text-center text-sm text-taleon-muted">Nenhuma sugestão pendente.</p>';
      return;
    }

    list.innerHTML = items.map(renderPendingCard).join('');
    window.lucide?.createIcons();
    bindPendingActions(password);
  } catch (err) {
    list.innerHTML = `<p class="text-sm text-red-400 py-4 text-center">${escapeHtml(err.message)}</p>`;
    if (err.message?.includes('incorreta')) {
      clearAdminPassword();
      showPanel('login');
    }
  }
}

function bindPendingActions(password) {
  document.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.approve;
      const card = btn.closest('[data-pending-id]');
      const category = card?.querySelector('[data-category-select]')?.value;
      if (!category) {
        showToast('Selecione uma categoria.');
        return;
      }
      if (!confirm('Aprovar esta sugestão e publicá-la no portal com a categoria selecionada?')) return;
      try {
        await approveSuggestion(password, id, category);
        showToast('Sugestão aprovada!');
        await loadPending();
      } catch (err) {
        showToast(err.message || 'Erro ao aprovar.');
      }
    });
  });

  document.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delete;
      if (!confirm('Excluir permanentemente esta sugestão?')) return;
      try {
        await deleteSuggestion(password, id);
        showToast('Sugestão excluída.');
        await loadPending();
      } catch (err) {
        showToast(err.message || 'Erro ao excluir.');
      }
    });
  });
}

async function init() {
  if (!isSupabaseConfigured()) {
    document.getElementById('config-banner')?.classList.remove('hidden');
    return;
  }

  const formLogin = document.getElementById('form-admin-login');
  const btnLogout = document.getElementById('btn-admin-logout');

  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = new FormData(formLogin).get('password');
    try {
      const ok = await verifyAdminPassword(password);
      if (!ok) {
        showToast('Senha incorreta.');
        return;
      }
      setAdminPassword(password);
      showPanel('admin');
      await loadPending();
    } catch (err) {
      showToast(err.message || 'Falha na autenticação.');
    }
  });

  btnLogout?.addEventListener('click', () => {
    clearAdminPassword();
    showPanel('login');
    formLogin?.reset();
  });

  if (getAdminPassword()) {
    showPanel('admin');
    await loadPending();
  } else {
    showPanel('login');
  }
}

init();
