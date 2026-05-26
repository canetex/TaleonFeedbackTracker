// src/js/comment-views.js — comentários vistos vs. novos (localStorage)
import { STORAGE_CARD_LAST_VIEWED_KEY } from './constants.js';

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CARD_LAST_VIEWED_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeMap(map) {
  localStorage.setItem(STORAGE_CARD_LAST_VIEWED_KEY, JSON.stringify(map));
}

export function getLastViewedAt(suggestionId) {
  if (!suggestionId) return null;
  return readMap()[suggestionId] || null;
}

export function markCardViewed(suggestionId, at = new Date().toISOString()) {
  if (!suggestionId) return;
  const map = readMap();
  map[suggestionId] = at;
  writeMap(map);
}

/**
 * @param {{ created_at: string }[]} comments
 * @returns {{ seen: number, new: number }}
 */
export function splitCommentsByViewed(comments, suggestionId) {
  const list = comments ?? [];
  if (!list.length) return { seen: 0, new: 0 };

  const lastViewed = getLastViewedAt(suggestionId);
  if (!lastViewed) {
    return { seen: 0, new: list.length };
  }

  const cutoff = new Date(lastViewed).getTime();
  let seen = 0;
  let newCount = 0;

  for (const c of list) {
    const t = new Date(c.created_at).getTime();
    if (Number.isNaN(t) || t <= cutoff) seen += 1;
    else newCount += 1;
  }

  return { seen, new: newCount };
}

export function buildCommentCountersHtml({ seen, new: newCount }) {
  const total = seen + newCount;
  if (total === 0) return '';

  return `<span class="inline-flex items-center gap-1 text-[11px]" title="Comentários vistos (cinza) e novos (dourado)">
    <i data-lucide="message-square" class="h-3 w-3 shrink-0 text-taleon-muted"></i>
    <span class="text-taleon-muted">${seen}</span>
    ${newCount > 0 ? `<span class="font-semibold text-taleon-gold">+${newCount}</span>` : ''}
  </span>`;
}
