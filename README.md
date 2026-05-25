# Feedback Portal Taleon (SAN / AURA)

Portal de sugestões e feedback da comunidade Taleon, organizado em colunas estilo Trello por categoria, com votação, comentários, moderação administrativa e dashboards analíticos.

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | HTML5, [Tailwind CSS](https://tailwindcss.com/) (CDN), JavaScript vanilla (ES6+) |
| **Backend / Banco** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **IA (similaridade)** | OpenAI GPT-4o-mini ou Google Gemini via Supabase Edge Functions |
| **Gráficos** | [Chart.js](https://www.chartjs.org/) |
| **Ícones** | Font Awesome ou Lucide (CDN) |
| **Deploy** | [Netlify](https://www.netlify.com/) (CD a partir do GitHub) |
| **Testes E2E** | Playwright ou Cypress (planejado) |

Não há framework SPA (React, Vue, etc.): o projeto é estático e leve, ideal para deploy em Netlify.

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
| Badge mundo SAN | `#007bff` |
| Badge mundo AURA | `#6f42c1` |

Tipografia: **Inter** ou **Roboto** (sans-serif).

## Estrutura do repositório

```
TaleonMelhorias/
├── index.html          # Portal público (board Trello)
├── admin.html          # Moderação (Fase 4)
├── plan.md             # Plano de trabalho e roadmap
├── src/
│   ├── css/            # Estilos complementares (se necessário)
│   └── js/             # Lógica Supabase, votos, IA, charts
└── README.md
```

## Banco de dados (Supabase)

### Tabela `suggestions`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `created_at` | timestamptz | Data de criação |
| `char_name` | text | Nome do personagem |
| `world` | text | `SAN` ou `AURA` |
| `category` | text | Uma das 5 categorias fixas |
| `title` | text | Título da sugestão |
| `description` | text | Descrição |
| `status` | text | `pending` (default) ou `approved` |
| `similarity_group_id` | uuid | Agrupamento por IA |

### Tabela `votes`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `suggestion_id` | uuid | FK → suggestions |
| `ip_address` | text | Trava de voto único por IP |
| `vote_type` | text | `up` ou `down` |

### Tabela `comments`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `suggestion_id` | uuid | FK → suggestions |
| `char_name` | text | Autor do comentário |
| `world` | text | Mundo do char |
| `content` | text | Texto |
| `created_at` | timestamptz | Data |

### Tabela `config`

Chaves e valores globais (ex.: senha do admin).

**RLS:** leitura pública de sugestões `approved`; escrita com validação conforme políticas definidas na Fase 2.

## Categorias do board (colunas)

1. Melhorias de Qualidade de vida  
2. Novas funcionalidades customizadas  
3. Novas Funcionalidades do Global  
4. Correções  
5. Pendencias de implementação  

## Variáveis de ambiente

Copie `.env.example` para `.env` (nunca commite `.env`):

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
# Opcional — Fase 5 (IA)
OPENAI_API_KEY=
# ou GEMINI_API_KEY=
```

No Netlify, configure as mesmas variáveis em **Site settings → Environment variables**. A chave `anon` do Supabase é segura no front-end com RLS ativo.

## Roadmap de desenvolvimento

| Fase | Escopo |
|------|--------|
| **1** | Layout estático Trello + paleta Taleon (`index.html` com dados mock) |
| **2** | SQL Supabase + RLS |
| **3** | Integração Supabase, formulário, votos |
| **4** | `admin.html`, moderação, modal de comentários |
| **5** | Similarity check (IA) + Chart.js |
| **6** | Deploy Netlify |

Detalhes completos em [`plan.md`](plan.md).

## Desenvolvimento local

Abra `index.html` diretamente no navegador ou use um servidor estático:

```bash
npx serve .
```

## Deploy (Netlify)

1. Conecte o repositório GitHub à Netlify.  
2. Build command: vazio (site estático).  
3. Publish directory: raiz do projeto (ou pasta configurada).  
4. Adicione `SUPABASE_URL` e `SUPABASE_ANON_KEY` nas variáveis de ambiente.

## Licença

Projeto interno Taleon — uso conforme política da equipe.
