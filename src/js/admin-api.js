// src/js/admin-api.js
import { getSupabase } from './supabase-client.js';

const SESSION_KEY = 'taleon_admin_password';

export function getAdminPassword() {
  return sessionStorage.getItem(SESSION_KEY) || '';
}

export function setAdminPassword(password) {
  sessionStorage.setItem(SESSION_KEY, password);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function verifyAdminPassword(password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('verify_admin_password', {
    p_password: password,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchPendingSuggestions(password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_list_pending', {
    p_password: password,
  });
  if (error) {
    if (error.message?.includes('invalid_admin_password')) {
      throw new Error('Senha de administrador incorreta.');
    }
    throw error;
  }
  return data ?? [];
}

export async function approveSuggestion(password, suggestionId, category) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('admin_approve_suggestion', {
    p_password: password,
    p_suggestion_id: suggestionId,
    p_category: category?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteSuggestion(password, suggestionId) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('admin_delete_suggestion', {
    p_password: password,
    p_suggestion_id: suggestionId,
  });
  if (error) throw error;
}
