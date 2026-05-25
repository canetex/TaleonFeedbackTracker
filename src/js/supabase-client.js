// src/js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

let client = null;

export function getSupabase() {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configure src/js/config.js ou variáveis NEXT_PUBLIC_SUPABASE_* com URL e chave publishable.'
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export function isSupabaseConfigured() {
  const cfg = window.TALEON_CONFIG || {};
  const url = cfg.supabaseUrl || window.NEXT_PUBLIC_SUPABASE_URL;
  const key = cfg.supabaseAnonKey || window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key && !String(url).includes('SEU_PROJETO'));
}

export function getSupabaseConfig() {
  const cfg = window.TALEON_CONFIG || {};
  return {
    supabaseUrl: cfg.supabaseUrl || window.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: cfg.supabaseAnonKey || window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
