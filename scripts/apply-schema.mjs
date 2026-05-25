/**
 * Aplica migrations SQL no Supabase via conexão Postgres direta.
 * Requer no .env: SUPABASE_DB_PASSWORD (senha do banco no Dashboard → Settings → Database)
 * Opcional: SUPABASE_ACCESS_TOKEN para usar Management API (--linked) via CLI.
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

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const dbPassword =
  env.SUPABASE_PASSWORD ||
  env.SUPABASE_DB_PASSWORD ||
  env.SUPABASE_DATABASE_PASSWORD ||
  env.DATABASE_PASSWORD;
const adminPassword = env.ADMIN_SECRET_PASSWORD;

if (!projectRef) {
  console.error('SUPABASE_URL inválida no .env');
  process.exit(1);
}

async function runWithPg() {
  if (!dbPassword) return false;
  const pg = await import('pg');
  const enc = encodeURIComponent(dbPassword);
  const regions = [
    'us-east-1',
    'us-west-1',
    'eu-west-1',
    'eu-central-1',
    'ap-southeast-1',
    'sa-east-1',
  ];
  const hosts = [
    `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:${enc}@aws-0-${projectRef}.pooler.supabase.com:6543/postgres`,
  ];
  for (const region of regions) {
    hosts.push(
      `postgresql://postgres.${projectRef}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.${projectRef}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`
    );
  }

  const sqlPath = join(root, 'supabase', 'migrations', '001_initial_schema.sql');
  let sql = readFileSync(sqlPath, 'utf8');
  if (adminPassword) {
    const escaped = adminPassword.replace(/'/g, "''");
    sql += `\n\nUPDATE public.config SET value = '${escaped}', updated_at = now() WHERE key = 'admin_password';\n`;
  }

  for (const connectionString of hosts) {
    const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log('Conectado:', connectionString.replace(dbPassword, '***'));
      await client.query(sql);
      await client.end();
      console.log('Schema aplicado com sucesso.');
      return true;
    } catch (err) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      console.warn('Falha em host:', err.message);
    }
  }
  return false;
}

async function main() {
  if (await runWithPg()) return;

  console.error(`
Não foi possível aplicar o schema automaticamente.

Adicione ao .env uma das opções:

1) SUPABASE_DB_PASSWORD=<senha do Postgres>
   (Supabase Dashboard → Project Settings → Database → Database password)

2) SUPABASE_ACCESS_TOKEN=<Personal Access Token>
   (https://supabase.com/dashboard/account/tokens)
   Depois execute:
   npx supabase link --project-ref ${projectRef}
   npx supabase db query -f supabase/migrations/001_initial_schema.sql --linked
`);
  process.exit(1);
}

main();
