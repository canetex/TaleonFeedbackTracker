// src/js/similarity.js
import { getSupabase } from './supabase-client.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let pendingSimilarId = null;
let lastCheckKey = '';

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSimilarity(a, b) {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

async function clientFallbackCheck(title, description) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('suggestions')
    .select('id, title, description')
    .in('status', ['approved', 'pending'])
    .limit(100);

  const probe = `${title} ${description}`;
  let best = { id: null, score: 0 };

  for (const s of data ?? []) {
    const score = Math.max(
      tokenSimilarity(probe, s.title),
      tokenSimilarity(probe, `${s.title} ${s.description}`)
    );
    if (score > best.score) best = { id: s.id, score };
  }

  return best.score >= 0.7 ? best.id : null;
}

export async function checkSimilarity(title, description) {
  const key = `${title}::${description}`;
  if (key === lastCheckKey) return pendingSimilarId;
  lastCheckKey = key;

  if (!title || title.length < 5 || !description || description.length < 10) {
    pendingSimilarId = null;
    return null;
  }

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.functions.invoke('check-similarity', {
      body: { title: title.trim(), description: description.trim() },
    });

    if (!error && data?.similar_id && UUID_RE.test(data.similar_id)) {
      pendingSimilarId = data.similar_id;
      return pendingSimilarId;
    }
  } catch {
    /* fallback abaixo */
  }

  pendingSimilarId = await clientFallbackCheck(title, description);
  return pendingSimilarId;
}

export function getPendingSimilarityGroupId() {
  return pendingSimilarId;
}

export function clearPendingSimilarity() {
  pendingSimilarId = null;
  lastCheckKey = '';
}

function findSuggestionById(id) {
  return window.__boardSuggestions?.find((s) => s.id === id);
}

export function bindSimilarityFlow() {
  const titleEl = document.getElementById('title');
  const descEl = document.getElementById('description');
  const modal = document.getElementById('modal-similar');
  const checkingEl = document.getElementById('similarity-checking');

  async function runCheck() {
    const title = titleEl?.value?.trim() ?? '';
    const description = descEl?.value?.trim() ?? '';
    if (title.length < 5 || description.length < 10) return;

    checkingEl?.classList.remove('hidden');
    const similarId = await checkSimilarity(title, description);
    checkingEl?.classList.add('hidden');

    if (!similarId) return;

    const existing = findSuggestionById(similarId);
    const titleMatch = document.getElementById('similar-existing-title');
    if (titleMatch) {
      titleMatch.textContent = existing?.title ?? 'Sugestão existente';
    }
    modal?.classList.remove('hidden');
    window.lucide?.createIcons();
  }

  descEl?.addEventListener('blur', runCheck);

  document.getElementById('btn-similar-vote')?.addEventListener('click', () => {
    const id = pendingSimilarId;
    modal?.classList.add('hidden');
    document.getElementById('modal-suggestion')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    if (id) {
      const s = findSuggestionById(id);
      if (s && typeof window.openDetailModal === 'function') {
        window.openDetailModal(s);
      }
    }
  });

  document.getElementById('btn-similar-create-anyway')?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  document.querySelectorAll('[data-close-similar]').forEach((btn) => {
    btn.addEventListener('click', () => modal?.classList.add('hidden'));
  });

  document.getElementById('form-suggestion')?.addEventListener('reset', () => {
    clearPendingSimilarity();
  });
}
