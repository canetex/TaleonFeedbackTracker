// src/js/suggestions.js
import { getSupabase } from './supabase-client.js';
import { CATEGORIES } from './constants.js';
import {
  getPendingSimilarityGroupId,
  clearPendingSimilarity,
  guardSubmitSimilarity,
  setAllowDuplicateSubmit,
} from './similarity.js';
import { getPendingImageUrls, clearPendingImages } from './imgur.js';

export async function fetchBoardSuggestions() {
  const supabase = getSupabase();

  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('id, created_at, char_name, world, category, title, description, similarity_group_id, status, image_urls')
    .in('status', ['approved', 'pending'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!suggestions?.length) return [];

  const approvedIds = suggestions.filter((s) => s.status === 'approved').map((s) => s.id);

  let scoreById = {};
  let commentCountById = {};

  if (approvedIds.length > 0) {
    const [{ data: votes }, { data: comments }] = await Promise.all([
      supabase.from('votes').select('suggestion_id, vote_type').in('suggestion_id', approvedIds),
      supabase.from('comments').select('suggestion_id').in('suggestion_id', approvedIds),
    ]);

    for (const id of approvedIds) scoreById[id] = 0;
    for (const v of votes ?? []) {
      scoreById[v.suggestion_id] += v.vote_type === 'up' ? 1 : -1;
    }
    for (const c of comments ?? []) {
      commentCountById[c.suggestion_id] = (commentCountById[c.suggestion_id] || 0) + 1;
    }
  }

  return suggestions.map((s) => ({
    ...s,
    vote_score: s.status === 'approved' ? (scoreById[s.id] ?? 0) : 0,
    comment_count: s.status === 'approved' ? (commentCountById[s.id] ?? 0) : 0,
  }));
}

/** @deprecated use fetchBoardSuggestions */
export const fetchApprovedSuggestions = fetchBoardSuggestions;

export async function createSuggestion(payload) {
  const supabase = getSupabase();
  const { error } = await supabase.from('suggestions').insert({
    char_name: payload.char_name.trim(),
    world: payload.world,
    category: payload.category,
    title: payload.title.trim(),
    description: payload.description.trim(),
    status: 'pending',
    similarity_group_id: payload.similarity_group_id ?? null,
    image_urls: payload.image_urls?.length ? payload.image_urls : [],
  });

  if (error) throw error;
}

export function bindSuggestionForm(onSuccess) {
  const modal = document.getElementById('modal-suggestion');
  const form = document.getElementById('form-suggestion');
  const btnOpen = document.getElementById('btn-new-suggestion');
  const btnClose = document.querySelectorAll('[data-close-modal]');
  const selectCategory = document.getElementById('suggestion-category');

  if (selectCategory) {
    selectCategory.innerHTML = CATEGORIES.map(
      (c) => `<option value="${c}">${c}</option>`
    ).join('');
  }

  btnOpen?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  btnClose.forEach((el) => {
    el.addEventListener('click', () => {
      modal?.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = String(fd.get('title') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim();

    const canSubmit = await guardSubmitSimilarity(title, description);
    if (!canSubmit) return;

    const payload = {
      char_name: fd.get('char_name'),
      world: fd.get('world'),
      category: fd.get('category'),
      title,
      description,
      similarity_group_id: getPendingSimilarityGroupId(),
      image_urls: getPendingImageUrls(),
    };

    try {
      await createSuggestion(payload);
      setAllowDuplicateSubmit(false);
      clearPendingSimilarity();
      clearPendingImages();
      form.reset();
      modal?.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      window.showToast?.(
        'Sugestão enviada! Aparece na Home como PENDENTE APROVACAO até a equipe aprovar.'
      );
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      window.showToast?.(err.message || 'Erro ao enviar sugestão.');
    }
  });
}
