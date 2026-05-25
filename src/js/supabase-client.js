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
  const anonKey = cfg.supabaseAnonKey || window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const jwtAnonKey =
    cfg.supabaseJwtAnonKey ||
    window.NEXT_PUBLIC_SUPABASE_ANON_JWT ||
    (typeof anonKey === 'string' && anonKey.startsWith('eyJ') ? anonKey : '');
  return {
    supabaseUrl: cfg.supabaseUrl || window.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: anonKey,
    supabaseJwtAnonKey: jwtAnonKey,
  };
}

/** Cliente com JWT anon — obrigatório para supabase.functions.invoke (verify_jwt). */
let functionsClient = null;
let functionsClientKey = null;

export function getSupabaseForFunctions() {
  const { supabaseUrl, supabaseJwtAnonKey, supabaseAnonKey } = getSupabaseConfig();
  const key = supabaseJwtAnonKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    throw new Error('Configure supabaseJwtAnonKey (JWT anon) para chamar Edge Functions.');
  }
  if (!functionsClient || functionsClientKey !== key) {
    functionsClient = createClient(supabaseUrl, key);
    functionsClientKey = key;
  }
  return functionsClient;
}
