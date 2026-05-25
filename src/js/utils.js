// src/js/utils.js
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
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
