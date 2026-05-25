/**
 * Prepara o diretório para GitHub Pages (.nojekyll, <base> opcional).
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

writeFileSync(join(root, '.nojekyll'), '', 'utf8');

let basePath = (process.env.SITE_BASE_PATH || '').trim();
if (basePath && basePath !== '/') {
  basePath = `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
} else if (basePath === '/') {
  basePath = '/';
}

const baseTag =
  basePath && basePath !== '/'
    ? `  <base href="${basePath}" />\n`
    : '';

for (const file of ['index.html', 'admin.html']) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  let html = readFileSync(path, 'utf8');
  if (baseTag && !html.includes('<base ')) {
    html = html.replace(/<head>\s*/i, `<head>\n${baseTag}`);
  }
  writeFileSync(path, html, 'utf8');
}

if (basePath) {
  console.log(`GitHub Pages: base href ${basePath}`);
} else {
  console.log('GitHub Pages: caminhos relativos (sem <base>).');
}
console.log('.nojekyll criado.');
