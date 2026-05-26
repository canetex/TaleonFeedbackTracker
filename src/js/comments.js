// src/js/comments.js
import { getSupabase } from './supabase-client.js';

export async function fetchComments(suggestionId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('comments')
    .select('id, created_at, char_name, world, content, image_urls')
    .eq('suggestion_id', suggestionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Últimos comentários de sugestões aprovadas (barra lateral). */
export async function fetchRecentComments(limit = 8) {
  const supabase = getSupabase();

  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, created_at, char_name, world, content, suggestion_id')
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (error) throw error;
  if (!comments?.length) return [];

  const suggestionIds = [...new Set(comments.map((c) => c.suggestion_id))];
  const { data: suggestions, error: sugErr } = await supabase
    .from('suggestions')
    .select('id, title, status')
    .in('id', suggestionIds)
    .eq('status', 'approved');

  if (sugErr) throw sugErr;

  const titleById = Object.fromEntries((suggestions ?? []).map((s) => [s.id, s.title]));

  return comments
    .filter((c) => titleById[c.suggestion_id])
    .slice(0, limit)
    .map((c) => ({
      ...c,
      suggestion_title: titleById[c.suggestion_id],
    }));
}

export async function createComment(suggestionId, payload) {
  const supabase = getSupabase();
  const { error } = await supabase.from('comments').insert({
    suggestion_id: suggestionId,
    char_name: payload.char_name.trim(),
    world: payload.world,
    content: payload.content.trim(),
    image_urls: payload.image_urls?.length ? payload.image_urls : [],
  });

  if (error) throw error;
}
