/**
 * Define GEMINI_API_KEY como secret de Edge Functions no Supabase (Management API).
 * Requer no .env: GEMINI_API_KEY e SUPABASE_ACCESS_TOKEN (PAT em https://supabase.com/dashboard/account/tokens)
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const token = env.SUPABASE_ACCESS_TOKEN;
const geminiKey = env.GEMINI_API_KEY;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL no .env');
  process.exit(1);
}
if (!token) {
  console.error(`
SUPABASE_ACCESS_TOKEN ausente.

1. Crie um Personal Access Token: https://supabase.com/dashboard/account/tokens
2. Adicione ao .env: SUPABASE_ACCESS_TOKEN=sbp_...
3. Execute novamente: npm run secrets:gemini
`);
  process.exit(1);
}
if (!geminiKey || geminiKey.includes('sua-chave')) {
  console.error('Defina GEMINI_API_KEY no .env');
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify([{ name: 'GEMINI_API_KEY', value: geminiKey }]),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`Falha (${res.status}):`, body);
  process.exit(1);
}

console.log('Secret GEMINI_API_KEY configurado no projeto', projectRef);

const listRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (listRes.ok) {
  const secrets = await listRes.json();
  const names = (Array.isArray(secrets) ? secrets : []).map((s) => s.name).filter(Boolean);
  console.log('Secrets no projeto:', names.join(', ') || '(nenhum listado)');
}
