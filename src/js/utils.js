// src/js/utils.js
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export function formatRelativeTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} d`;
  return formatDate(iso);
}

export function truncateText(text, maxLen = 80) {
  const t = (text || '').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

export function worldBadge(world, colors) {
  const color = colors[world] || '#30363d';
  return `<span class="rounded px-2 py-0.5 text-xs font-semibold text-white" style="background-color:${color}">${escapeHtml(world)}</span>`;
}

export function normalizeImageUrls(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((u) => typeof u === 'string' && u.startsWith('http'));
  return [];
}

export function renderImageThumb(url, className = 'h-12 w-12') {
  const safe = escapeHtml(url);
  return `<img src="${safe}" alt="" class="${className} rounded border border-taleon-border object-cover" loading="lazy" onerror="this.classList.add('hidden')" />`;
}

export function renderImageGallery(urls, { size = 'detail' } = {}) {
  const list = normalizeImageUrls(urls);
  if (!list.length) return '';
  const imgClass =
    size === 'detail'
      ? 'max-h-48 w-full rounded-lg border border-taleon-border object-contain bg-taleon-bg'
      : 'h-12 w-12 rounded border border-taleon-border object-cover';
  return `<div class="flex flex-wrap gap-2 ${size === 'detail' ? 'flex-col sm:flex-row' : ''}">${list
    .map(
      (url) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="inline-block">${renderImageThumb(url, imgClass)}</a>`
    )
    .join('')}</div>`;
}
