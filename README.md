# Feedback Portal Taleon (SAN / AURA)

Portal de sugestões e feedback da comunidade Taleon, organizado em colunas estilo Trello por categoria, com votação, comentários, moderação administrativa e dashboards analíticos.

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | HTML5, [Tailwind CSS](https://tailwindcss.com/) (CDN), JavaScript vanilla (ES6+) |
| **Backend / Banco** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **IA (similaridade)** | Google Gemini via Supabase Edge Functions |
| **Gráficos** | [Chart.js](https://www.chartjs.org/) |
| **Ícones** | Lucide (CDN) |
| **Deploy** | [GitHub Pages](https://pages.github.com/) (GitHub Actions) |
| **Testes E2E** | Playwright |

Não há framework SPA: o projeto é estático e leve, publicado via GitHub Pages.

## Identidade visual

Paleta alinhada ao site Taleon SAN (modo escuro):

| Uso | Hex |
|-----|-----|
| Fundo principal | `#0a0e14` |
| Cards e containers | `#161b22` |
| Bordas e divisores | `#30363d` |
| Destaques / hover | `#c1a056` |
| Texto principal | `#e6edf3` |
| Texto secundário | `#7d8590` |

## Estrutura do repositório

```
├── index.html              # Portal público (board + formulário)
├── admin.html              # Moderação (pendentes)
├── src/js/                 # Módulos ES6
├── supabase/migrations/    # SQL e políticas RLS
├── scripts/                # build-config, E2E, secrets
└── .github/workflows/      # Deploy GitHub Pages
```

## Variáveis de ambiente

Copie `.env.example` para `.env` (nunca commite o `.env`).

| Variável | Obrigatória no build | Uso |
|----------|----------------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` ou `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY` | Sim | Chave publishable (front-end) |
| `NEXT_PUBLIC_SUPABASE_ANON_JWT` ou `SUPABASE_ANON_JWT` | Recomendada | JWT anon — Edge Functions com `verify_jwt` |
| `ADMIN_SECRET_PASSWORD` | Local / E2E | Senha do painel admin |
| `SUPABASE_PASSWORD` | Só local | `npm run db:apply` |
| `SITE_BASE_PATH` | Só GitHub Pages | Ex.: `/TaleonFeedbackTracker/` — ver deploy abaixo |

O comando `npm run build` gera `runtime-config.js` e `src/js/config.js` com essas chaves.

---

## Deploy — GitHub Pages

Produção via **GitHub Actions** (workflow [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml)). Cada push em `main` publica o site.

### Passo 1 — Ativar GitHub Pages no repositório

1. Abra o repositório no GitHub: **canetex/TaleonFeedbackTracker**
2. **Settings** → **Pages**
3. Em **Build and deployment** → **Source**, escolha **GitHub Actions** (não “Deploy from branch” manual)
4. Salve. O primeiro deploy roda após o push do workflow ou em **Actions** → **Deploy GitHub Pages** → **Run workflow**

### Passo 2 — Secrets (variáveis do Supabase no build)

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Cadastre estes secrets (valores do [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API):

| Secret no GitHub | Valor no Supabase |
|------------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave **publishable** (`sb_publishable_...`) |
| `NEXT_PUBLIC_SUPABASE_ANON_JWT` | JWT **anon** legado (`eyJ...`, role anon) |
| `GOOGLE_ANALYTICS_ID` | (opcional) ID GA4 `G-XXXXXXXXXX` — ver abaixo |

Alternativa: use os nomes `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_ANON_JWT` no `.env` local — no GitHub o workflow espera os nomes `NEXT_PUBLIC_*` acima.

Não coloque no GitHub: `SUPABASE_PASSWORD`, `ADMIN_SECRET_PASSWORD`, `GEMINI_API_KEY` (estas ficam no Supabase Secrets ou só no seu PC).

#### Google Analytics 4 (opcional)

1. [Google Analytics](https://analytics.google.com/) → **Admin** → criar propriedade **GA4**
2. Fluxo de dados **Web** → URL `https://canetex.github.io/TaleonFeedbackTracker/`
3. Copie o **ID de medição** (`G-XXXXXXXXXX`)
4. GitHub → **Settings** → **Secrets** → `GOOGLE_ANALYTICS_ID` = esse ID
5. Rode de novo o workflow **Deploy GitHub Pages** (o ID entra no `runtime-config.js` no build)

Sem o secret, o site funciona normalmente; o script de analytics não carrega. Métricas: visitas, páginas, origem, dispositivos — em **Relatórios** no GA4 (pode levar até 24–48 h para dados estáveis).

### Passo 3 — URL do site (caminho base)

URL padrão de **project site**:

`https://canetex.github.io/TaleonFeedbackTracker/`

O workflow define automaticamente `SITE_BASE_PATH=/TaleonFeedbackTracker`.

**Domínio customizado na raiz** (ex.: `https://feedback.taleon.com/`):

1. **Settings** → **Pages** → **Custom domain** → informe o domínio e configure DNS (CNAME)
2. **Settings** → **Secrets and variables** → **Actions** → aba **Variables**
3. Crie a variável de repositório: `SITE_BASE_PATH` = `/`
4. Rode o workflow novamente

### Passo 4 — Conferir o deploy

1. **Actions** → workflow **Deploy GitHub Pages** → job verde
2. Abra a URL em **Settings** → **Pages**
3. Portal: `.../TaleonFeedbackTracker/` (ou seu domínio)
4. Admin: `.../TaleonFeedbackTracker/admin.html`

Se aparecer o banner *“Configuração do Supabase indisponível”*, os secrets do passo 2 não foram aplicados ou o build falhou — veja os logs do job **Build**.

### Migração desde Netlify

- O deploy não usa mais Netlify (`netlify.toml` permanece só como referência legada).
- Após o Pages estar no ar, desative ou remova o site na Netlify para evitar confusão de URLs.
- Atualize links divulgados para a URL do GitHub Pages (ou domínio customizado).

---

## Desenvolvimento local

```bash
cp .env.example .env
# Edite .env com URL e chaves Supabase

npm install
npm run build
npx serve .
```

Abra `http://localhost:3000` (ou a porta do `serve`). Sem `npm run build`, `runtime-config.js` não existe e o banner de config aparece.

Testes E2E: `npm run test:e2e` (exige `.env` com Supabase e `E2E_ADMIN_PASSWORD`).

---

## Admin e comentários

- **Portal:** clique no card → detalhes e comentários (após aprovação).
- **Admin:** [admin.html](admin.html) — senha em `config.admin_password` / `ADMIN_SECRET_PASSWORD`.

## Roadmap

| Fase | Escopo |
|------|--------|
| **1–6** | Layout, Supabase, portal, admin, IA, dashboards, deploy | ✅ |
| **7** | Prints via Supabase Storage | ✅ |

Detalhes em [`plan.md`](plan.md).

## Configurar Supabase (schema)

1. SQL Editor ou MCP Supabase: migrations em [`supabase/migrations/`](supabase/migrations/)
2. Local: `npm run db:apply` (requer `SUPABASE_PASSWORD` no `.env`)

## Fase 5 — IA (Gemini)

```bash
npm run secrets:gemini
```

Requer `GEMINI_API_KEY` e `SUPABASE_ACCESS_TOKEN` no `.env`.

## Fase 7 — Prints (Storage)

Bucket `portal-images` (migration `004`). Upload no formulário e nos comentários.

## Licença

Projeto interno Taleon — uso conforme política da equipe.
