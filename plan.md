Com certeza, André! Adicionar uma ordem clara de desenvolvimento (Roadmap), o processo de testes e o guia de infraestrutura vai blindar o plano contra qualquer "desvio de rota" que a outra IA possa tentar fazer.

Aqui está o seu arquivo plan.md atualizado e completo com o Cronograma de Execução, Estrutura de Testes e Setup de Credenciais:

🚀 PLANO DE TRABALHO: FEEDBACK PORTAL TALEON (SAN/AURA)
1. Configuração de Ambiente & Repositório
GitHub: Criar um repositório para o projeto. Estruturar com um README.md detalhando como configurar as variáveis de ambiente do Supabase.

Branching: Utilizar a branch main para simplicidade no desenvolvimento inicial.

Netlify: Deploy contínuo (CD) no site **taleonfeedbacktracker** ([taleonfeedbacktracker.netlify.app](https://taleonfeedbacktracker.netlify.app)) conectado ao GitHub `canetex/TaleonFeedbackTracker`. Não usar o site legado `taleon-feedback-tracker` (CLI).

2. Identidade Visual & UI (Inspirado em Taleon SAN)
O portal deve herdar a sobriedade e a paleta de cores do site oficial, focando em legibilidade e imersão em modo escuro (Dark Mode).

Paleta de Cores (Hex):

Fundo Principal (Background): #0a0e14 (Preto azulado profundo)

Cards e Containers: #161b22 (Cinza escuro para contraste)

Bordas e Divisores: #30363d (Estilo GitHub/Taleon)

Destaques (Botões/Hover): #c1a056 (Dourado envelhecido, clássico do Tibia/Taleon)

Texto Principal: #e6edf3 (Branco acinzentado)

Texto Secundário: #7d8590 (Cinza)

Tipografia: Fontes Sans-serif limpas (Inter ou Roboto) para os textos gerais. Títulos em negrito pesado.

Ícones (via CDN FontAwesome ou Lucide):

ThumbsUp / ThumbsDown para votos.

MessageSquare para comentários.

MapPin para identificar o Mundo (SAN/AURA).

User para o nome do Char.

AlertCircle para melhorias pendentes.

3. Estrutura de Interface (Estilo Trello)
Em vez de uma lista simples, o portal deve organizar as melhorias em colunas verticais, uma para cada categoria.

Layout de Colunas: 6 colunas horizontais com rolagem lateral (Scroll) se necessário. As categorias fixas são:

Melhorias de Qualidade de vida

Novas funcionalidades customizadas

Novas Funcionalidades do Global

Correções

Pendencias de implementação

Ações de Marketing

Cards de Sugestão:

Cada card deve mostrar o Saldo de Votos (Upvotes - Downvotes) em destaque lateral ou superior.

Título da sugestão em negrito.

Badge colorida para o Mundo (#007bff para SAN e #6f42c1 para AURA).

Rodapé do card contendo o nome do Char e a data de criação.

Efeito Hover: Ao passar o mouse, o card deve destacar sua borda com o dourado #c1a056.

4. Stack Técnica & Backend (Supabase)
Frontend: HTML5 puro, Tailwind CSS (via CDN) e Vanilla JavaScript (ES6+). Sem frameworks SPA.

Banco de Dados: Supabase (PostgreSQL).

Tabela suggestions: id, created_at, char_name, world, category, title, description, status (default: 'pending'), similarity_group_id.

Tabela votes: id, suggestion_id, ip_address, vote_type (up/down). Registro de IP para trava de voto único.

Tabela comments: id, suggestion_id, char_name, world, content, created_at.

Tabela config: Para chaves e configurações globais, incluindo a senha do Admin.

Segurança (RLS): Row Level Security configurado no Supabase para permitir leitura pública de dados aprovados, mas escrita protegida por validação.

5. Lógica de Integração com IA (Similarity Check)
Para evitar duplicidade, utilizaremos a OpenAI API (GPT-4o-mini) ou Gemini API via Supabase Edge Functions.

Trigger de Cadastro: Quando o usuário terminar de digitar o título e a descrição (evento onBlur), dispara uma consulta de similaridade.

Prompt de Comparação: > "Compare a seguinte sugestão: [Título/Descrição] com esta lista de títulos de sugestões existentes: [Lista de IDs e Títulos]. Se houver uma similaridade superior a 70%, retorne o ID da sugestão existente. Caso contrário, retorne 'null'."

Ação no Frontend: Se a IA retornar um ID similar, exibe um modal amigável: "Hey, parece que alguém já sugeriu algo parecido! Que tal dar um Upvote na sugestão existente e adicionar seu comentário lá?".

Comportamento: O botão "Criar de qualquer forma" deve continuar disponível (não bloquear o usuário). Se ele prosseguir, a IA preenche o similarity_group_id para organização interna.

6. Área do Administrador (/admin)
Acesso: Página ou rota /admin protegida por uma verificação de senha simples consultada na tabela config do Supabase.

Ações: Visualizar as sugestões com status pending, com botões diretos para Aprovar (mudar status para approved, movendo o card para a coluna pública do Trello) ou Deletar.

7. Dashboards & Indicadores (Chart.js)
Inserir no rodapé ou em uma seção dedicada os seguintes gráficos gerados via Chart.js:

Gráfico de Rosca (Doughnut): Distribuição do volume de sugestões por categoria.

Gráfico de Barras Empilhadas: Comparativo de quantidade de sugestões entre os mundos SAN e AURA.

Gráfico de Radar: Mostrando quais categorias recebem maior volume total de engajamento (soma de votos e comentários).

🛠️ 8. Passos de Execução e Sequência de Desenvolvimento

| Fase | Escopo | Status |
|------|--------|--------|
| **1** | Repo GitHub, layout Trello, paleta Taleon (`index.html`) | ✅ |
| **2** | SQL `001` + RLS; migration `002` (pendentes na Home) | ✅ |
| **3** | Supabase no front, board, formulário `pending`, votos (localStorage + IP) | ✅ |
| **4** | `admin.html`, aprovar/deletar, modal de comentários | ✅ |
| **5** | `check-similarity` (Gemini) + Chart.js (doughnut SAN/AURA, radar) | ✅ |
| **6** | Deploy GitHub Pages (Actions) + `runtime-config.js` no build | ✅ |
| **7** | Prints: Supabase Storage `portal-images`, sugestões + comentários | ✅ |

**Fase 7 — Supabase Storage (detalhe):**

- Bucket público `portal-images` (migration `004`) — pastas `suggestions/` e `comments/`.
- Front: `src/js/storage-upload.js` — botão **Enviar print** / **Anexar print**, até 3 imagens × 10 MB.
- Persistência: `suggestions.image_urls` e `comments.image_urls` (URLs públicas do Storage).
- Exibição: miniatura no card, galeria na sugestão, imagens renderizadas nos comentários e na fila admin.

**Pendente operacional (não é código):**

- [ ] Aplicar migration `004_storage_portal_images.sql` no Supabase (se ainda não aplicada).
- [ ] Trocar senha admin padrão em `config.admin_password`.
- [ ] CI GitHub Actions para `npm run test:e2e` (opcional).

**Produção:** GitHub Pages — `https://canetex.github.io/TaleonFeedbackTracker/` (secrets `NEXT_PUBLIC_SUPABASE_*` no repositório).

🧪 9. Processo de Testes Automatizados

Playwright em `tests/e2e/portal.spec.js` — `npm run test:e2e`.

| Cenário (plan §9) | Status |
|-------------------|--------|
| Envio de sugestão → card `PENDENTE APROVACAO` | ✅ |
| Voto duplicado → aviso | ✅ |
| Título similar → modal | ⚠️ instável (timeout / dados) |
| Admin senha + aprovar | ⚠️ verificar última execução |

🧪 10. Backlog pós-MVP (futuro)

- GitHub Actions (build + E2E).
- Teste E2E de upload Storage (opcional).
- Domínio customizado Netlify (opcional).