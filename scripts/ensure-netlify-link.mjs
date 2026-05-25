/**
 * Garante que o Netlify CLI aponta para o site oficial (GitHub CD).
 * Uso: node scripts/ensure-netlify-link.mjs
 */
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = JSON.parse(readFileSync(join(root, 'netlify-site.json'), 'utf8'));
const statePath = join(root, '.netlify', 'state.json');

function readLinkedSiteId() {
  if (!existsSync(statePath)) return null;
  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    return state.siteId ?? null;
  } catch {
    return null;
  }
}

const linked = readLinkedSiteId();
if (linked === canonical.site_id) {
  console.log(`Netlify OK: ${canonical.site_name} (${canonical.url})`);
  process.exit(0);
}

if (linked) {
  console.warn(
    `Projeto vinculado ao site errado (${linked}). Esperado: ${canonical.site_id} (${canonical.site_name}).`,
  );
} else {
  console.warn('Projeto não vinculado ao Netlify.');
}

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const link = spawnSync(
  cmd,
  ['netlify', 'link', '--id', canonical.site_id],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);

process.exit(link.status === 0 ? 0 : link.status ?? 1);
