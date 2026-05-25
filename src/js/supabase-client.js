// src/js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

let client = null;

export function getSupabase() {
  if (client) return client;

  const cfg = window.TALEON_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
    throw new Error(
      'Configure src/js/config.js (copie de config.example.js) com SUPABASE_URL e SUPABASE_ANON_KEY.'
    );
  }

  client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return client;
}

export function isSupabaseConfigured() {
  const cfg = window.TALEON_CONFIG;
  return Boolean(cfg?.supabaseUrl && cfg?.supabaseAnonKey && !cfg.supabaseUrl.includes('SEU_PROJETO'));
}
