/**
 * Executa testes E2E Playwright (plan.md §9).
 * Requer: npm install, npx playwright install chromium
 *
 * Variáveis opcionais (.env ou ambiente):
 *   PLAYWRIGHT_BASE_URL — URL do portal (default http://127.0.0.1:4173)
 *   E2E_ADMIN_PASSWORD — senha admin (testes de moderação)
 *   PLAYWRIGHT_SKIP_SERVER=1 — se o site já estiver rodando
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

if (!process.env.E2E_ADMIN_PASSWORD && process.env.ADMIN_SECRET_PASSWORD) {
  process.env.E2E_ADMIN_PASSWORD = process.env.ADMIN_SECRET_PASSWORD;
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
