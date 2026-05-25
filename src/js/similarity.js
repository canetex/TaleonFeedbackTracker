// src/js/similarity.js
import { getSupabase, getSupabaseForFunctions } from './supabase-client.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SIMILARITY_THRESHOLD = 0.5;

let pendingSimilarId = null;
let lastCheckKey = '';
let allowDuplicateSubmit = false;

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(text) {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length >= 3);
}

function tokenSimilarity(a, b) {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

function keywordOverlapScore(a, b) {
  const wa = significantTokens(a);
  const wb = significantTokens(b);
  if (!wa.length || !wb.length) return 0;
  const setB = new Set(wb);
  let shared = 0;
  for (const w of wa) if (setB.has(w)) shared++;
  if (!shared) return 0;
  return shared / Math.min(wa.length, wb.length);
}

function combinedSimilarity(probe, candidate) {
  const full = `${candidate.title} ${candidate.description ?? ''}`;
  return Math.max(
    tokenSimilarity(probe, candidate.title),
    tokenSimilarity(probe, full),
    keywordOverlapScore(probe, full)
  );
}

function pickCandidatesForMatch(rows) {
  const approved = rows.filter((s) => s.status === 'approved');
  return approved.length ? approved : rows;
}

async function loadCandidatesForFallback() {
  let rows;
  if (window.__boardSuggestions?.length) {
    rows = window.__boardSuggestions;
  } else {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('suggestions')
      .select('id, title, description, status')
      .in('status', ['approved', 'pending'])
      .limit(150);
    if (error) throw error;
    rows = data ?? [];
  }

  return pickCandidatesForMatch(rows).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
  }));
}

async function clientFallbackCheck(title, description) {
  const rows = await loadCandidatesForFallback();
  const probe = `${title} ${description}`;
  let best = { id: null, score: 0 };

  for (const s of rows) {
    const score = combinedSimilarity(probe, s);
    if (score > best.score) best = { id: s.id, score };
  }

  return best.score >= SIMILARITY_THRESHOLD ? best.id : null;
}

export async function checkSimilarity(title, description) {
  const key = `${title}::${description}`;
  if (key === lastCheckKey) return pendingSimilarId;
  lastCheckKey = key;

  if (!title || title.length < 5 || !description || description.length < 10) {
    pendingSimilarId = null;
    return null;
  }

  const trimmedTitle = title.trim();
  const trimmedDesc = description.trim();

  try {
    const supabase = getSupabaseForFunctions();
    const { data, error } = await supabase.functions.invoke('check-similarity', {
      body: { title: trimmedTitle, description: trimmedDesc },
    });

    if (error) {
      console.warn('check-similarity invoke:', error.message);
    } else if (data?.similar_id && UUID_RE.test(data.similar_id)) {
      pendingSimilarId = data.similar_id;
      return pendingSimilarId;
  } catch (err) {
    console.warn('check-similarity:', err);
  }

  pendingSimilarId = await clientFallbackCheck(trimmedTitle, trimmedDesc);
  return pendingSimilarId;
}

export function getPendingSimilarityGroupId() {
  return pendingSimilarId;
}

export function clearPendingSimilarity() {
  pendingSimilarId = null;
  lastCheckKey = '';
  allowDuplicateSubmit = false;
}

export function setAllowDuplicateSubmit(value) {
  allowDuplicateSubmit = value;
}

export function shouldAllowDuplicateSubmit() {
  return allowDuplicateSubmit;
}

function findSuggestionById(id) {
  return window.__boardSuggestions?.find((s) => s.id === id);
}

function showSimilarModal(similarId) {
  const modal = document.getElementById('modal-similar');
  const titleMatch = document.getElementById('similar-existing-title');
  const existing = findSuggestionById(similarId);
  if (titleMatch) {
    titleMatch.textContent = existing?.title ?? 'Sugestão existente';
  }
  modal?.classList.remove('hidden');
  window.lucide?.createIcons();
}

/**
 * Antes de enviar o formulário: garante checagem e bloqueia se houver duplicata
 * (salvo se o usuário escolheu "Criar de qualquer forma").
 */
export async function guardSubmitSimilarity(title, description) {
  const similarId = await checkSimilarity(title, description);
  if (!similarId) return true;
  if (allowDuplicateSubmit) return true;
  showSimilarModal(similarId);
  return false;
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
    showSimilarModal(similarId);
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
    setAllowDuplicateSubmit(true);
    modal?.classList.add('hidden');
  });

  document.querySelectorAll('[data-close-similar]').forEach((btn) => {
    btn.addEventListener('click', () => modal?.classList.add('hidden'));
  });

  document.getElementById('form-suggestion')?.addEventListener('reset', () => {
    clearPendingSimilarity();
  });
}
