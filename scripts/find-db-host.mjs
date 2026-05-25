import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const ref = 'ookdulhtbjrjmuzqitih';
const pass = env.SUPABASE_PASSWORD;
const pg = (await import('pg')).default;

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'sa-east-1', 'ca-central-1',
];

const prefixes = ['aws-0', 'aws-1'];

for (const prefix of prefixes) {
  for (const region of regions) {
    for (const port of [5432, 6543]) {
      const url = `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@${prefix}-${region}.pooler.supabase.com:${port}/postgres`;
      const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
      try {
        await c.connect();
        console.log('OK', prefix, region, port);
        await c.end();
        process.exit(0);
      } catch (e) {
        if (e.message.includes('password authentication failed')) {
          console.log('AUTH_FAIL', prefix, region, port);
        }
      }
      try { await c.end(); } catch { /* */ }
    }
  }
}
console.log('Nenhum host encontrado');
