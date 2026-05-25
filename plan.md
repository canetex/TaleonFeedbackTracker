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

Layout de Colunas: 5 colunas horizontais com rolagem lateral (Scroll) se necessário. As categorias fixas são:

Melhorias de Qualidade de vida

Novas funcionalidades customizadas

Novas Funcionalidades do Global

Correções

Pendencias de implementação

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
A outra IA deve seguir estritamente a ordem abaixo para evitar quebras de dependência de código:

Fase 1: Infraestrutura Básica e Design Estático

Criar o repositório no GitHub com a estrutura de arquivos simples (index.html, admin.html, /src/css/, /src/js/).

Desenvolver o layout visual completo de colunas estilo Trello em index.html usando dados mockados (estáticos) para garantir que o visual Taleon e comportamento responsivo estejam perfeitos.

Fase 2: Estrutura do Banco de Dados (Supabase)

Gerar e executar os scripts SQL para a criação das tabelas (suggestions, votes, comments, config).

Configurar os gatilhos e as políticas de segurança RLS (ex: leitura pública de sugestões approved, mas inserção livre com validação simples).

Fase 3: Integração Front-End & Core Funcional

Implementar o script de conexão do Supabase no front-end.

Criar a função de renderização dinâmica dos cards puxando as sugestões separadas por colunas de categoria.

Criar o formulário de envio de novas sugestões (salvando como pending).

Desenvolver a lógica de Upvote/Downvote com validação dupla (bloqueio local via localStorage + verificação de IP na tabela votes).

Fase 4: Moderação & Comentários

Desenvolver a tela admin.html com layout Trello modificado (exibindo apenas a coluna de pending), contendo os botões de Aprovar e Deletar.

Criar a janela modal de detalhes da sugestão pública para permitir que usuários leiam e insiram comentários (vinculados a Char/Mundo).

Fase 5: Inteligência Artificial & Dashboards ✅

Criar o fluxo de chamada de API da IA para o Similarity Check (onBlur da descrição + Edge Function `check-similarity` / Gemini).

Integrar a biblioteca Chart.js na base do portal puxando dados agregados do Supabase (rosca, barras SAN/AURA, radar de engajamento).

Fase 6: Deploy Contínuo ✅

Produção: **https://taleonfeedbacktracker.netlify.app** (Netlify `taleonfeedbacktracker`, CD GitHub). CLI local: `npm run netlify:link` + `npm run deploy:netlify`.

📋 10. Backlog de Melhorias (pós-MVP)

Itens fora do escopo das fases 1–6; implementar após estabilização do portal em produção.

### 10.1 Integração Imgur — imagens nas sugestões

**Documentação:** [Imgur API](https://apidocs.imgur.com/)

**Objetivo:** Permitir que o jogador anexe uma ou mais imagens (screenshot, mockup, evidência de bug) ao criar ou visualizar uma sugestão.

**Escopo técnico sugerido:**

| Item | Detalhe |
|------|---------|
| Autenticação | Registro de app em [api.imgur.com/oauth2/addclient](https://api.imgur.com/oauth2/addclient). Upload anônimo via header `Authorization: Client-ID {client_id}` (sem expor `client_secret` no front-end). |
| Upload | `POST https://api.imgur.com/3/image` (multipart ou base64). Validar tamanho (ex.: máx. 10 MB) e tipos (`image/jpeg`, `image/png`, `image/gif`, `image/webp`). |
| Onde no UI | Campo opcional no modal **Nova sugestão**; preview antes do envio; miniatura no card e galeria no modal de detalhes. |
| Persistência | Migration Supabase: coluna `image_urls TEXT[]` em `suggestions` ou tabela `suggestion_images` (`suggestion_id`, `imgur_id`, `url`, `deletehash` opcional). |
| Segurança | Preferir **Supabase Edge Function** como proxy de upload se for necessário `client_secret` ou sanitização extra; manter Client-ID apenas em variável de ambiente Netlify (`IMGUR_CLIENT_ID`). |
| Moderação | Exibir imagens em `admin.html` na fila de pendentes; ocultar URLs quebradas após remoção no Imgur. |
| Limites | Respeitar rate limit da API Imgur; feedback de erro amigável (“falha no upload, tente outra imagem”). |

**Critérios de aceite:**

1. Sugestão com imagem salva como `pending` inclui URL(s) acessível(s) após aprovação.
2. Sugestão sem imagem continua funcionando como hoje.
3. Falha de upload não impede enviar título/descrição (imagem opcional).
4. Imagens só aparecem em sugestões `approved` (mesma regra RLS do texto).

**Dependências:** Fase 4 concluída; variável `IMGUR_CLIENT_ID` no `.env` / Netlify.

**Estimativa de fase:** Fase 7 (Enhancement) — após Fase 5 (IA + Chart.js). ✅ Implementado (migration `003`, Edge Function `upload-imgur`, UI opcional no formulário).

**Categoria extra:** `Ações de Marketing` (migration `003`, `constants.js`).

🧪 9. Processo de Testes Automatizados
Como estamos utilizando uma stack simplificada sem frameworks robustos (Node.js/React), os testes serão conduzidos via Playwright ou Cypress (executados localmente ou via GitHub Actions) focando em testes de ponta a ponta (E2E):

Testes de Interface e Fluxo (E2E):

Envio bem-sucedido: Validar se ao preencher o formulário corretamente, o card é criado na tabela com status pending e não aparece imediatamente na listagem pública.

Duplicidade de Votos: Simular dois cliques de voto no mesmo card pelo mesmo navegador e garantir que o sistema bloqueia e exibe a mensagem de aviso.

Simulação de IA: Testar se ao digitar um título muito parecido com um card existente, o modal de similaridade é disparado em tela.

Acesso Admin: Garantir que digitar uma senha incorreta barra o acesso às ações de moderação e que a senha correta aprova e move o card para o painel público.