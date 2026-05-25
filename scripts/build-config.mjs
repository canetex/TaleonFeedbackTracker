/**
 * Gera src/js/config.js a partir das variáveis de ambiente (build Netlify / local).
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

if (!url || !key) {
  console.error(
    'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_URL / SUPABASE_ANON_KEY).'
  );
  process.exit(1);
}

const outDir = join(root, 'src', 'js');
mkdirSync(outDir, { recursive: true });

const content = `// Gerado em build — não editar manualmente
window.TALEON_CONFIG = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(key)},
};
window.NEXT_PUBLIC_SUPABASE_URL = ${JSON.stringify(url)};
window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(key)};
`;

writeFileSync(join(outDir, 'config.js'), content, 'utf8');
console.log('config.js gerado para deploy.');
