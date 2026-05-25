/**
 * Gera arquivos de config Supabase para deploy (GitHub Pages / local).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const jwtAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_JWT ||
  process.env.SUPABASE_ANON_JWT ||
  (key.startsWith('eyJ') ? key : '');

if (!url || !key) {
  console.error(
    'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_URL / SUPABASE_ANON_KEY).'
  );
  process.exit(1);
}

const content = `// Gerado em build — não editar manualmente
window.TALEON_CONFIG = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(key)},
  supabaseJwtAnonKey: ${JSON.stringify(jwtAnonKey)},
};
window.NEXT_PUBLIC_SUPABASE_URL = ${JSON.stringify(url)};
window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(key)};
window.NEXT_PUBLIC_SUPABASE_ANON_JWT = ${JSON.stringify(jwtAnonKey)};
`;

const jsDir = join(root, 'src', 'js');
mkdirSync(jsDir, { recursive: true });
writeFileSync(join(jsDir, 'config.js'), content, 'utf8');
writeFileSync(join(root, 'runtime-config.js'), content, 'utf8');
console.log('config.js e runtime-config.js gerados para deploy.');
