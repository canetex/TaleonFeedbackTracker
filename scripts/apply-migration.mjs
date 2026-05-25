/**
 * Aplica um arquivo SQL de supabase/migrations/ via Postgres.
 * Uso: node scripts/apply-migration.mjs 006_vote_ip_limits.sql
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const fileArg = process.argv[2] || '006_vote_ip_limits.sql';

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

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const dbPassword =
  env.SUPABASE_PASSWORD ||
  env.SUPABASE_DB_PASSWORD ||
  env.SUPABASE_DATABASE_PASSWORD;

if (!projectRef || !dbPassword) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_PASSWORD no .env');
  process.exit(1);
}

const sqlPath = join(root, 'supabase', 'migrations', fileArg);
const sql = readFileSync(sqlPath, 'utf8');
const pg = await import('pg');
const enc = encodeURIComponent(dbPassword);
const hosts = [
  `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`,
  `postgresql://postgres.${projectRef}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
];

for (const connectionString of hosts) {
  const client = new pg.default.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log(`Migration aplicada: ${fileArg}`);
    process.exit(0);
  } catch (err) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    console.warn('Falha:', err.message);
  }
}

process.exit(1);
