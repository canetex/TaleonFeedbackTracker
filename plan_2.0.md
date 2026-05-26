📋 PLANO DE IMPLEMENTAÇÃO: NOVAS FUNCIONALIDADES DO PORTAL
Funcionalidade 1: Indicador de Comentários (Vistos vs. Novos)
Objetivo
Exibir em cada card um contador visual que diferencie os comentários já lidos daqueles criados desde a última interação do usuário.

Abordagem Técnica
Armazenamento Local: Utilizar o localStorage para salvar um objeto contendo o timestamp do último acesso do usuário a cada card (ex: last_viewed_card_123: "2026-05-26T12:00:00Z").

Lógica de Renderização: Ao carregar as sugestões e seus respectivos comentários do Supabase:

Contar quantos comentários possuem created_at menor ou igual ao timestamp salvo (Comentários Vistos).

Contar quantos possuem created_at maior que o timestamp salvo (Comentários Novos).

Se não houver registro no localStorage para o card, todos os comentários existentes contam como novos no primeiro acesso.

Interface (UI): Adicionar no rodapé do card, próximo ao ícone de comentário (MessageSquare), os dois contadores:

Número de vistos na cor cinza (#7d8590).

Número de novos (se maior que zero) na cor dourada (#c1a056).

Funcionalidade 2: Ampliação do Modal de Detalhes
Objetivo
Aumentar as dimensões do modal de detalhes do card para melhorar a legibilidade e expandir consideravelmente a área focada na leitura e inserção de comentários.

Abordagem Técnica
Ajuste de Classes Tailwind: Localizar o container principal do modal de detalhes no código HTML/JS.

Alterar as classes de largura (ex: de max-w-2xl para max-w-3xl ou adicionar uma porcentagem customizada via estilo inline/Tailwind arbitrário como w-[55%]) para garantir o ganho de +5% na horizontal.

Alterar as classes de altura máxima ou interna (ex: usar h-[80vh] ou max-h-[85vh]) para atingir o ganho de +20% na vertical.

Redistribuição de Espaço: Fixar os detalhes da sugestão (Título, Descrição, Autor) no topo do modal e aplicar a propriedade flex-1 ou overflow-y-auto especificamente na seção inferior de comentários, permitindo que ela ocupe todo o novo espaço vertical disponível sem quebrar o layout.

Funcionalidade 3: Barra Lateral de Últimos Comentários
Objetivo
Criar uma seção fixa ou responsiva na lateral direita do portal exibindo um feed em tempo real com as interações mais recentes da comunidade.

Abordagem Técnica
Alteração do Layout Principal: Modificar o container das colunas estilo Trello. Atualmente ele deve ocupar w-full. Alterar para um layout Grid ou Flex: grid grid-cols-1 xl:grid-cols-4 gap-4, onde as colunas do Trello ocupam xl:col-span-3 e a nova lateral ocupa xl:col-span-1.

Estrutura da Barra Lateral: * Fundo usando a cor de containers do portal (#161b22) com bordas em #30363d.

Título: "Últimos Comentários" em negrito.

Busca de Dados (Supabase): Criar uma query que busque na tabela comments os últimos 5 ou 10 registros, ordenados por created_at DESC, realizando um join simples com a tabela suggestions para trazer o título do card.

Dados por Item do Feed: Cada item deve listar de forma compacta:

Quem comentou (Nome do Char) e o Mundo (SAN/AURA com suas respectivas badges coloridas).

O texto curto ou trecho do comentário.

O título do card onde foi feito (com link/função para abrir o modal daquele card direto ao clicar).

O horário relativo ou formatado do envio.

Funcionalidade 4: Padronização de Cores dos Gráficos (Chart.js)
Objetivo
Garantir a consistência visual do portal fazendo com que todos os gráficos do Chart.js utilizem estritamente a mesma paleta de cores aplicada na tabela/leaderboard de votos.

Abordagem Técnica
Mapeamento de Cores: Identificar a paleta exata usada na leaderboard (ex: tons de dourado #c1a056, variações de cinza, azul do mundo SAN e roxo do mundo AURA).

Configuração do Chart.js: No script de inicialização dos gráficos (Doughnut, Barras e Radar):

Substituir as matrizes de cores de fundo (backgroundColor) e cores de borda (borderColor) pelos valores hexadecimais da paleta identificada.

Para o gráfico de barras empilhadas de mundos, garantir que a cor da barra do SAN corresponda exatamente ao azul do mundo e o AURA ao roxo do mundo usado no restante da interface.