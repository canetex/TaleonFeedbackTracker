// src/js/comments.js
import { getSupabase } from './supabase-client.js';

export async function fetchComments(suggestionId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('comments')
    .select('id, created_at, char_name, world, content')
    .eq('suggestion_id', suggestionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createComment(suggestionId, payload) {
  const supabase = getSupabase();
  const { error } = await supabase.from('comments').insert({
    suggestion_id: suggestionId,
    char_name: payload.char_name.trim(),
    world: payload.world,
    content: payload.content.trim(),
  });

  if (error) throw error;
}
