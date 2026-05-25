/**
 * Executa testes E2E Playwright (plan.md §9).
 * Requer: npm install, npx playwright install chromium
 *
 * Variáveis opcionais (.env ou ambiente):
 *   PLAYWRIGHT_BASE_URL — URL do portal (default http://127.0.0.1:4173)
 *   E2E_ADMIN_PASSWORD — senha admin (testes de moderação)
 *   PLAYWRIGHT_SKIP_SERVER=1 — se o site já estiver rodando
 *   PLAYWRIGHT_WORKERS — paralelismo (default 3)
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = t.slice(i + 1).trim();
  }
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_ANON_KEY;
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_JWT && process.env.SUPABASE_ANON_JWT) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_JWT = process.env.SUPABASE_ANON_JWT;
}

if (!process.env.E2E_ADMIN_PASSWORD && process.env.ADMIN_SECRET_PASSWORD) {
  process.env.E2E_ADMIN_PASSWORD = process.env.ADMIN_SECRET_PASSWORD;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error(
    'E2E: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env (ou SUPABASE_URL / SUPABASE_ANON_KEY).',
  );
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npm, ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
if (build.status !== 0) process.exit(build.status ?? 1);

const runtimeConfig = join(root, 'runtime-config.js');
if (!existsSync(runtimeConfig)) {
  console.error('E2E: runtime-config.js não foi gerado. Execute npm run build.');
  process.exit(1);
}

const extraArgs = process.argv.slice(2).filter((a) => a !== '--');
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(cmd, ['playwright', 'test', ...extraArgs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
