export interface UpdateItem {
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'fix' | 'security';
  icon?: string;
}

export interface SystemRelease {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  items: UpdateItem[];
}

/**
 * Registro de versões e atualizações do sistema Transcunha.
 * Sempre que subir uma nova atualização ou commit com novidades,
 * incremente a versão ou adicione um novo registro no topo da lista.
 */
export const SYSTEM_RELEASES: SystemRelease[] = [
  {
    id: 'rel_2026_09_30_v2_38_0',
    version: 'v2.38.0',
    date: '30/09/2026',
    title: 'Visualização Aperfeiçoada do Modo Escuro (Dark Mode) na Planilha',
    summary: 'Refinamento visual completo da planilha de embarques para o tema escuro. O fundo agora adota tons profundos de ardósia (slate-900 / slate-950) com fontes e informações num tom claro e nítido de alto contraste, eliminando totalmente o contraste inadequado de letras claras sobre fundo branco.',
    items: [
      {
        category: 'fix',
        title: 'Fundo Escuro Harmonioso na Grade de Dados',
        description: 'Eliminação de fundos brancos residuais nas linhas e no container da tabela quando o tema escuro está ativado, aplicando tons elegantes slate-900/slate-950 com efeito zebrado sutil.'
      },
      {
        category: 'improvement',
        title: 'Fontes e Informações em Alto Contraste',
        description: 'Textos, números de CT-e, valores de frete, saldos e placas configurados em tons claros de excelente nitidez (slate-100, branco, esmeralda e âmbar suave).'
      },
      {
        category: 'improvement',
        title: 'Filtros Rápidos e Barra de Fórmulas no Tema Escuro',
        description: 'Inputs de pesquisa das colunas, barra de fórmulas fx e popups de autofiltro devidamente integrados com fundo escuro e bordas bem delineadas.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_37_0',
    version: 'v2.37.0',
    date: '30/09/2026',
    title: 'Janela Flutuante Flexível, Redimensionável e Sobreposição Total via Portal',
    summary: 'Aprimoramento completo do comando de maximização: a planilha agora é renderizada via React Portal diretamente no corpo do documento (body) com z-index máximo, sobrepondo absolutamente todos os elementos da interface sem qualquer corte. Oferece dois modos: Maximizado panorâmico em 100% da tela e Janela Flutuante com arraste livre pelo cabeçalho e redimensionamento dinâmico no canto inferior direito.',
    items: [
      {
        category: 'feature',
        title: 'Sobreposição Absoluta via Portal (document.body)',
        description: 'A planilha agora escapa de qualquer container e restrição de layout CSS, garantindo visibilidade total sobre a tela inteira sem ficar encolhida ou presa aos limites da página.'
      },
      {
        category: 'feature',
        title: 'Janela Flutuante com Arraste e Redimensionamento Flexível',
        description: 'Possibilidade de movimentar a janela livremente pela tela arrastando pelo cabeçalho e redimensionar largura e altura através do puxador de canto interativo.'
      },
      {
        category: 'improvement',
        title: 'Alternância Rápida entre Janela Flutuante e Tela Cheia',
        description: 'Controles estilo sistema operacional (fechar, alternar modo janela/tela cheia) integrados com tecla de atalho Esc e indicadores visuais dinâmicos.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_36_0',
    version: 'v2.36.0',
    date: '30/09/2026',
    title: 'Otimização Extrema de Desempenho e Modo Maximizado em Tela Cheia',
    summary: 'Aceleração completa da planilha de embarques da Controladoria eliminando lentidão e travamentos por meio de debouncing de digitação, paginação inteligente de alta velocidade, persistência assíncrona e comando para maximizar a janela da planilha em tela cheia.',
    items: [
      {
        category: 'feature',
        title: 'Modo Maximizado em Tela Cheia (Fullscreen)',
        description: 'Novo comando para expandir a planilha para 100% da tela do computador, oferecendo máxima área de trabalho, visão panorâmica das 60 colunas e saída fácil via botão ou tecla Esc.'
      },
      {
        category: 'improvement',
        title: 'Fim da Lentidão com Entradas Debounced',
        description: 'Inputs de filtro e edição com atualização assíncrona inteligente: a digitação responde instantaneamente a 60 FPS sem travar o navegador ou re-renderizar desnecessariamente milhares de nós do DOM.'
      },
      {
        category: 'improvement',
        title: 'Paginação Inteligente de Alta Velocidade',
        description: 'Divisão de registros com seletor flexível (25, 50, 100, 200 ou todas as linhas), tornando a rolagem e os filtros instantâneos com navegação de página rápida.'
      },
      {
        category: 'improvement',
        title: 'Layout Compacto e Refinado Estilo Excel',
        description: 'Diminuição da altura das linhas e cabeçalhos, inputs de filtro elegantes e harmoniosos, e bordas nítidas que aumentam o volume de dados visíveis na tela.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_35_0',
    version: 'v2.35.0',
    date: '30/09/2026',
    title: 'Filtros Individuais e Classificador de Ordem para Cada Coluna',
    summary: 'Implementação de ordenação (crescente/decrescente/cronológica) e filtros dedicados para todas as 60 colunas da planilha da Controladoria, com menu AutoFilter estilo Excel com lista de valores frequentes, linha de busca rápida sob cada cabeçalho e botão de limpeza global.',
    items: [
      {
        category: 'feature',
        title: 'Classificador de Ordem em Todas as Colunas',
        description: 'Permite ordenar qualquer coluna em ordem crescente (A-Z, 0-9) ou decrescente (Z-A, 9-0) com detecção inteligente de datas, moedas e números com um simples clique no cabeçalho.'
      },
      {
        category: 'feature',
        title: 'Menu AutoFilter Estilo Microsoft Excel',
        description: 'Menu popover ao clicar no ícone de funil da coluna, contendo opções de classificação rápida, busca direta e seleção dos valores únicos mais frequentes na coluna.'
      },
      {
        category: 'feature',
        title: 'Linha de Filtros Rápidos Inline nas Colunas',
        description: 'Inputs de pesquisa direta integrados logo abaixo de cada cabeçalho com filtragem em tempo real e botão de alternância para exibir/ocultar a linha de filtros.'
      },
      {
        category: 'improvement',
        title: 'Indicadores Visuais e Limpeza Global de Filtros',
        description: 'Destaque visual em âmbar nas colunas com filtros ativos e botão na barra superior para limpar todos os filtros e ordenações aplicadas com um único clique.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_34_0',
    version: 'v2.34.0',
    date: '30/09/2026',
    title: 'Grade Editável Estilo Excel com Fórmulas e Persistência Permanente',
    summary: 'Transformação da planilha de embarques da Controladoria em uma grade interativa estilo Excel com edição inline por duplo clique, barra de fórmulas (fx), recálculo automático de fretes, saldos, quebras e impostos, histórico de desfazer/refazer (Ctrl+Z/Ctrl+Y), operações de linhas e persistência contínua dos dados no sistema.',
    items: [
      {
        category: 'feature',
        title: 'Edição Inline de Células & Barra de Fórmulas (fx)',
        description: 'Permite selecionar e editar qualquer célula diretamente com duplo clique ou pela barra de fórmulas no topo, com navegação por teclado (Enter, Tab, Shift+Tab, Esc, F2) idêntica ao Microsoft Excel.'
      },
      {
        category: 'feature',
        title: 'Motor de Fórmulas e Recálculo Automático',
        description: 'Recálculo instantâneo ao editar valores: Frete Bruto Empresa (Unitário × Peso), Frete Motorista (Tarifa Ton × Peso), Adiantamento (% × Frete), Quebra em Toneladas (Origem - Chegada), Saldo Final (Frete - Adiantamento - Desconto/Quebra), status de saldo e provisão de tributos.'
      },
      {
        category: 'feature',
        title: 'Persistência Permanente no Sistema',
        description: 'Todos os dados importados, linhas adicionadas e alterações manuais são salvos automaticamente no navegador, garantindo que nada seja perdido ao recarregar a página ou navegar pelo sistema.'
      },
      {
        category: 'improvement',
        title: 'Controle de Linhas e Desfazer/Refazer (Undo/Redo)',
        description: 'Botões e atalhos para adicionar novas linhas de embarque, duplicar registros, excluir linhas e desfazer alterações com Ctrl+Z / Ctrl+Y.'
      },
      {
        category: 'improvement',
        title: 'Rodapé com Funções do Excel (SOMA, MÉDIA, CONTAGEM) e Exportação XLSX',
        description: 'Linha de totais fixa no rodapé com seletor de agregação e exportador nativo em arquivo real do Microsoft Excel (.xlsx).'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_33_0',
    version: 'v2.33.0',
    date: '30/09/2026',
    title: 'Importador e Visualizador Fiel da Planilha de Embarque (OneDrive/Excel)',
    summary: 'Configuração completa do campo "Planilha Embarque" na Controladoria para importar e exibir com total fidelidade as 60 colunas operacionais da planilha Excel/OneDrive ("3-15-07-2025- CARREGAMENTO TRANSCUNHA.xlsm"), com upload de arquivos XLSX/XLSM/CSV, seleção de abas, cálculos tributários, adiantamentos e fechamento de saldo de motoristas.',
    items: [
      {
        category: 'feature',
        title: 'Importador Inteligente de Arquivos Excel e CSV',
        description: 'Capacidade de carregar e processar planilhas nos formatos .xlsx, .xlsm e .csv por botão de upload ou arrastar e soltar (drag & drop), com reconhecimento automático de abas e mapeamento das 60 colunas originais.'
      },
      {
        category: 'feature',
        title: 'Grade Operacional Completa com 60 Colunas e Cores Temáticas',
        description: 'Exibição agrupada com cabeçalhos setorizados (Faturamento & Recebimento, Identificação & Motorista, Logística & Pedido, Cadastros, Tomador & Pesagem, Impostos & Deduções, Acerto Motorista, Adiantamentos e Fechamento/Quebra/CIOT).'
      },
      {
        category: 'improvement',
        title: 'KPIs e Totalizadores Executivos Integrados',
        description: 'Cálculo dinâmico em tempo real de Frete Empresa, Frete Pago a Motoristas, Margem Bruta Retida, Total de Toneladas, Adiantamentos Liberados, Saldos e Pedágios.'
      },
      {
        category: 'improvement',
        title: 'Exportação Completa e Alternância de Visualização',
        description: 'Permite alternar entre a visão detalhada de 60 colunas e o resumo gerencial da Controladoria, além de exportar todos os dados filtrados em CSV/Excel UTF-8.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_32_0',
    version: 'v2.32.0',
    date: '30/09/2026',
    title: 'Configuração de Resultados por Agenciadores (Ag GO e Ag SP)',
    summary: 'Atribuição direta e precisa dos resultados das agências no 1º Resultado Financeiro: Ag GO vinculada aos embarques do agenciador Maurício e Ag SP vinculada à soma dos agenciadores RAFAEL PINHEIRO e RAFAEL TARANTELLI.',
    items: [
      {
        category: 'improvement',
        title: 'Atribuição Direta de Ag GO ao Agenciador Maurício',
        description: 'Faturamento, veículos carregados e comissões da Ag GO agora contabilizam estritamente os embarques agenciados e operados por Maurício (USR-294).'
      },
      {
        category: 'improvement',
        title: 'Atribuição Direta de Ag SP a Rafael Pinheiro + Rafael Tarantelli',
        description: 'Consolidação de todos os embarques agenciados por Rafael Pinheiro (USR-107) e Rafael Tarantelli (USR-106) sob a Ag. SP, incluindo códigos de prefixo RAF e vínculos diretos.'
      },
      {
        category: 'improvement',
        title: 'Transparência Visual nos Cards Executivos',
        description: 'Exibição dos nomes dos agenciadores responsáveis abaixo das colunas de faturamento e comissões para Ag. SP e Ag GO.'
      }
    ]
  },
  {
    id: 'rel_2026_09_29_v2_31_0',
    version: 'v2.31.0',
    date: '29/09/2026',
    title: 'Novo Dashboard Executivo de "1º Resultado Financeiro"',
    summary: 'Implementação do layout visual completo e de alta fidelidade para o 1º Resultado Financeiro no módulo Financeiro, com visualização segmentada de Faturamento por Filiais, Demonstrativo de NF, Margem Bruta, Detalhamento de 11 Impostos e Custos Operacionais, Comissões e Resultados Rodoviários.',
    items: [
      {
        category: 'feature',
        title: 'Faturamento Segmentado por Filiais e Contagem de Veículos Carregados',
        description: 'Visualização horizontal do faturamento por agência (Matriz, Ag. SP, Ag GO, Ag PR e Total) informando abaixo dos valores a quantidade exata de veículos efetivamente carregados em cada agência.'
      },
      {
        category: 'feature',
        title: 'Demonstrativo de NF e Margem Bruta',
        description: 'Cards dedicados para % Margem Bruta operacional, valor total de Notas Fiscais (NF Valor) e valor com margem de segurança de 18% (NF Valor + 18%).'
      },
      {
        category: 'feature',
        title: 'Painel de 11 Impostos, Custos e Descontos',
        description: 'Cards individuais para ICMS, PIS/COFINS, Pedágio, INSS, IR, Seguro RCF, Seguro Acidente/Roubo, CUSTI (GR/CIOT), FUNRURAL, IN 2277 e Outros custos adicionais com filtros temporais.'
      },
      {
        category: 'feature',
        title: 'Matriz de Comissões e Memória de Cálculo',
        description: 'Acompanhamento de 8 canais de comissão (Ag. SP, Ag GO, Ag PR, Comercial, Unidade, Embarcador, Cliente e Vendedor), cálculo de % sobre faturamento e memória de cálculo analítica (veículos × valor unitário).'
      },
      {
        category: 'feature',
        title: 'Fechamento de Fretes a Motoristas: Adiantamento e Saldo',
        description: 'Cards de resultado atualizados para Total pg Adiantamento, Total pg Saldo e Total Adiantamento e Saldo com percentuais e valores consolidados dos pagamentos.'
      },
      {
        category: 'improvement',
        title: 'Controles de Período e Auditoria DRE Expansível',
        description: 'Filtro por períodos (Diário, Mensal, Anual), seleção de data por calendário, subfiltros rápidos (Dia, Semana, Mês, Ano) e seção expansível com a DRE analítica vertical detalhada.'
      },
      {
        category: 'fix',
        title: 'Resolução de Conflito de Tipagem e Problems da IDE',
        description: 'Corrigido o conflito entre o tipo User e o ícone User de lucide-react no FirstResultTab, zerando os diagnósticos e garantindo 100% de conformidade estrita no TypeScript.'
      }
    ]
  },
  {
    id: 'rel_2026_09_29_v2_30_0',
    version: 'v2.30.0',
    date: '29/09/2026',
    title: 'Refinamento do Controle de Saldo e Sincronização em Tempo Real de Lotes e Cargas',
    summary: 'Reformulação e aprimoramento completo do motor de cálculo de saldos e volumes das cargas (Lotes). A verdade matemática passa a ser derivada diretamente dos embarques reais ativos (Single Source of Truth), eliminando divergências cumulativas, agendamentos fantasmas e bloqueios indevidos por saldo insuficiente.',
    items: [
      {
        category: 'fix',
        title: 'Eliminação de Volumes Agendados Fantasmas',
        description: 'Corrigido o cálculo de volume agendado na barra de progresso (VolumeBar) e na listagem de cargas. Embarques já carregados, em trânsito ou finalizados não deixam resíduo na barra laranja de agendados.'
      },
      {
        category: 'improvement',
        title: 'Cálculo Dinâmico e Preciso de Saldo Disponível',
        description: 'Criado o utilitário unificado calculateCargoBalance que calcula com precisão matemática o volume carregado, volume pendente de carga e saldo disponível real (794 - carregado - agendado), garantindo coerência exata com o balanço físico.'
      },
      {
        category: 'fix',
        title: 'Reconciliação e Correção de Lotes no Banco de Dados',
        description: 'Sincronizados e corrigidos os volumes de todos os lotes no Supabase (incluindo o lote #160 com 719,86 ton efetivadas e 74,14 ton disponíveis reais).'
      },
      {
        category: 'improvement',
        title: 'Consistência em Criação, Edição, Reversão e Cancelamento',
        description: 'Todos os fluxos operacionais (criação de embarque, edição de tonelagem, cancelamento, exclusão e reversão de status) agora recalculam automaticamente os saldos do lote com base na lista real de embarques.'
      },
      {
        category: 'security',
        title: 'Teto Soberano do Saldo Total sobre a Cadência Diária',
        description: 'O saldo total disponível do lote tem prioridade absoluta: nenhuma cadência diária (seja Limite Diário, Fixo ou Demanda Livre) pode permitir embarques que excedam o saldo total restante do lote.'
      }
    ]
  },
  {
    id: 'rel_2026_09_29_v2_29_0',
    version: 'v2.29.0',
    date: '29/09/2026',
    title: 'Correção e Sincronização do Gerador de QR Code do WhatsApp Oficial',
    summary: 'Correção definitiva na geração e exibição do QR Code da linha oficial (35 9872-1970). Foi eliminada a retenção de dados da instância legada no banco e cache local, corrigida a rota de proxy contra erros de CORS no navegador e implementada a sincronização automática imediata ao acessar a aba Conexão da Linha.',
    items: [
      {
        category: 'fix',
        title: 'Exibição Imediata do QR Code Oficial',
        description: 'Ajustada a leitura do Supabase para filtrar estritamente pela chave oficial transcunha_oficial e carregar a imagem do QR Code criptografado automaticamente ao abrir o Mensageiro.'
      },
      {
        category: 'fix',
        title: 'Prevenção de Erros de CORS no Gateway',
        description: 'Tratamento de respostas HTTP via proxy Vercel impedindo tentativas diretas de conexão cruzada no navegador e garantindo que o status real de pareamento seja refletido instantaneamente.'
      },
      {
        category: 'improvement',
        title: 'Feedback Visual e Atualização com 1 Clique',
        description: 'Adicionado indicador de carregamento animado e atualização ágil do QR Code ao clicar em Atualizar QR Code ou Reconectar.'
      }
    ]
  },
  {
    id: 'rel_2026_09_28_v2_28_0',
    version: 'v2.28.0',
    date: '28/09/2026',
    title: 'Automação Operacional de WhatsApp para Motoristas em Todas as Etapas do Embarque',
    summary: 'Implementação e padronização completa dos 6 gatilhos operacionais de WhatsApp com disparo automático para o motorista vinculado ao embarque. As mensagens são formatadas com interpolação dinâmica (nome do motorista, dados da rota, agendamento e locais de coleta/descarga), acompanhadas de múltiplos anexos em PDF/imagens (CT-e, MDF-e, NF-e, Carta Frete, Comprovante de Agendamento, Comprovante de Adiantamento e Comprovante de Saldo final) com fallback inteligente anti-falhas e opção de reenvio manual na linha do tempo.',
    items: [
      {
        category: 'feature',
        title: '6 Gatilhos Oficiais de Mudança de Etapa',
        description: 'Disparos automáticos e padronizados para Aguardando Cadastro e Seguradora (Homologação), Aguardando Carregamento (Liberado), Saída do Fiscal (Envio de Documentação de Viagem), Adiantamento Pago, Em Trânsito / Aguardando Descarga e Conclusão com Quitação do Saldo.'
      },
      {
        category: 'feature',
        title: 'Envio Sequencial de Múltiplos Documentos Fiscais',
        description: 'No avanço fiscal, o sistema localiza e despacha individualmente todos os PDFs anexados à carga (CT-e, MDF-e, NF-e, Carta Frete e Agendamento) com delay inteligente para garantir entrega ordenada sem travar o gateway.'
      },
      {
        category: 'improvement',
        title: 'Painel e Reenvio Manual na Linha do Tempo',
        description: 'Cada etapa na Linha do Tempo do Embarque exibe a identificação do modelo de WhatsApp vinculado e um botão para reenvio manual caso o motorista solicite nova via dos dados.'
      },
      {
        category: 'security',
        title: 'Resolução Segura e Fallback de Contatos',
        description: 'Validação e higienização automática do número do motorista via cadastro unificado, prevenindo falhas de envio e mantendo o fluxo operacional 100% resiliente mesmo em caso de instabilidade temporária no gateway.'
      }
    ]
  },
  {
    id: 'rel_2026_09_28_v2_27_0',
    version: 'v2.27.0',
    date: '28/09/2026',
    title: 'Lançamento do Novo Mensageiro Transcunha Oficial (35 9872-1970)',
    summary: 'Substituição completa do chat anterior pelo novo módulo Mensageiro Transcunha, dedicado a automações, notificações operacionais e disparos com a linha corporativa oficial (35) 9872-1970. Inclui suporte a pareamento numérico por código de telefone (Pairing Code) e QR Code, disparo rápido para motoristas e clientes, prévia fiel no formato WhatsApp e fila anti-bloqueio com histórico completo de entrega.',
    items: [
      {
        category: 'feature',
        title: 'Mensageiro Oficial Integrado',
        description: 'Módulo acessível pelo menu de Ferramentas e rota /messenger, com disparo direto para motoristas e clientes cadastrados ou números manuais.'
      },
      {
        category: 'feature',
        title: 'Pareamento por Código de Telefone (Pairing Code)',
        description: 'Permite conectar a linha (35) 9872-1970 gerando um código numérico de 8 dígitos para digitar diretamente no aplicativo WhatsApp do celular, sem depender de câmera.'
      },
      {
        category: 'feature',
        title: 'Fila & Histórico de Disparos em Tempo Real',
        description: 'Relatório completo de mensagens enviadas com status visual (Enviado, Entregue, Lido e Falha), busca rápida e delay inteligente anti-bloqueio.'
      },
      {
        category: 'improvement',
        title: 'Limpeza de Chat Flutuante',
        description: 'Removido o antigo chat do menu operacional e desativada a janela flutuante sobreposta, proporcionando uma interface limpa e focada na produtividade da equipe.'
      }
    ]
  },
  {
    id: 'rel_2026_09_28_v2_26_0',
    version: 'v2.26.0',
    date: '28/09/2026',
    title: 'Lançamento do Novo Módulo Financeiro & Controladoria Transcunha',
    summary: 'Implementação completa do ecossistema financeiro e controladoria da Transcunha Logística. O módulo traz gestão completa de Contas a Pagar e Contas a Receber, importador e conciliação bancária de arquivos OFX, DREs em 3 níveis (Operacional, Gerencial e Estratégico/EBITDA), Planilha de Controladoria de Embarques com margens de frete em tempo real e Controladoria de Saldos Bancários.',
    items: [
      {
        category: 'feature',
        title: 'Módulo de Contas a Pagar e Receber',
        description: 'Tabelas analíticas com filtros por status, pesquisa por fornecedor/cliente e documento, KPIs de totais pendentes e realizados, além de formulários modais para novos lançamentos e baixa imediata.'
      },
      {
        category: 'feature',
        title: 'Conciliação Bancária OFX',
        description: 'Leitor e parser nativo de extratos bancários em formato .OFX (SGML/XML), com importação drag-and-drop, reconciliação de transações e conferência de créditos e débitos.'
      },
      {
        category: 'feature',
        title: '1º, 2º e 3º Resultados Financeiros (DREs)',
        description: 'Demonstrativos em cascata: 1º Nível com Margem de Contribuição Operacional; 2º Nível com rateio por Centros de Custo (Pessoal, Operacional e Administrativo); e 3º Nível com EBITDA, Margem Líquida e projeções de fluxo de caixa futuro para 30 dias.'
      },
      {
        category: 'feature',
        title: 'Planilha de Controladoria de Embarques',
        description: 'Cruzamento detalhado de frete empresa faturado versus frete motorista, pedágios, adiantamentos e saldo líquido, com cálculo da margem bruta retida e exportação instantânea para CSV/Excel.'
      },
      {
        category: 'feature',
        title: 'Controladoria e Saldos Bancários',
        description: 'Gestão visual de contas correntes e aplicações com saldos em tempo real, adição de novas contas e ajuste de conciliação de saldo.'
      }
    ]
  },
  {
    id: 'rel_2026_09_28_v2_25_0',
    version: 'v2.25.0',
    date: '28/09/2026',
    title: 'Correção na Solicitação de Embarque e Persistência no Banco de Dados',
    summary: 'Correção da falha que fechava o modal de "Solicitação de Embarque" prematuramente ao clicar em "Solicitar Embarque" sem persistir o registro no banco de dados. Agora o modal aguarda a confirmação de persistência no Supabase com indicador de carregamento, mantém os dados preenchidos caso ocorra alguma falha na rede e removeu as incompatibilidades de colunas no schema.',
    items: [
      {
        category: 'fix',
        title: 'Fechamento Prematuro do Modal de Embarque Resolvido',
        description: 'O modal não fecha mais instantaneamente sem aguardar a conclusão do salvamento. Foi adicionado estado de processamento (loading spinner) e bloqueio de cliques múltiplos no botão "Solicitar Embarque".'
      },
      {
        category: 'fix',
        title: 'Preservação de Dados em Falha de Submissão',
        description: 'Se houver intermitência de conexão ou erro no banco, o modal permanece aberto com todos os campos preenchidos, permitindo ao usuário tentar novamente sem perder as informações digitadas.'
      },
      {
        category: 'fix',
        title: 'Sanitização do Payload de Embarque no Supabase',
        description: 'Removidas colunas não físicas na raiz do payload (antt_modality, etc_tax_regime e owner_name, mantidas com segurança no JSON documents), eliminando erros sequenciais de schema cache e agilizando a inserção em primeira tentativa.'
      },
      {
        category: 'improvement',
        title: 'Tratamento e Rollback Seguro de Estado',
        description: 'Ajustada a propagação de exceções na criação de embarques com rollback de estado em caso de falha de persistência, evitando que registros não salvos fossem exibidos temporariamente.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_24_0',
    version: 'v2.24.0',
    date: '27/09/2026',
    title: 'Migração para Instância Limpa Oficial & Validação Real de Entrega WhatsApp',
    summary: 'Solução definitiva para a questão dos disparos de homologação não chegarem ao celular de destino. Foi identificada a causa raiz: a sessão antiga no servidor estava em conflito (Connection Closed), fazendo com que a API rejeitasse o envio enquanto o sistema simulava sucesso. O sistema foi migrado para a nova instância transcunha_oficial, com QR Code limpo e validação rigorosa de retorno físico do WhatsApp.',
    items: [
      {
        category: 'fix',
        title: 'Migração para Instância Limpa Oficial (transcunha_oficial)',
        description: 'Substituição da instância anterior, que acumulava mais de 300.000 mensagens e estava travada pelo Baileys após desconexão no celular. A nova instância responde em menos de 1 segundo e gera QR Codes renovados instantaneamente.'
      },
      {
        category: 'fix',
        title: 'Validação Fidedigna de Disparo Físico',
        description: 'Eliminada a confirmação falsa ("falso positivo") de envio. Se a conexão com o WhatsApp estiver inativa ou rejeitada pelo gateway, o modal de Homologação exibe o motivo real do erro para o usuário escanear o QR Code.'
      },
      {
        category: 'improvement',
        title: 'Detecção de Estado Close como Solicitação de QR Code',
        description: 'Sempre que o servidor reportar que o socket do WhatsApp não está autenticado, a interface agora exibe de imediato o QR Code para leitura rápida pelo celular da empresa.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_23_0',
    version: 'v2.23.0',
    date: '27/09/2026',
    title: 'Estabilização da Conexão WhatsApp & Blindagem do Modo Sempre Online',
    summary: 'Correção da causa raiz da desconexão automática do número vinculado ao navegar entre abas ou executar ações no painel. O status conectado agora é blindado contra sobrescritas acidentais do gateway, o salvamento no Supabase foi sanitizado para evitar erros de esquema e o tempo de resposta das consultas foi reduzido de dezenas de segundos para milissegundos.',
    items: [
      {
        category: 'fix',
        title: 'Blindagem Contra Desconexão Automática em Ações do Usuário',
        description: 'Corrigido o ciclo de verificação que redefinia o status da instância para "disconnected" ao mudar de aba ou disparar mensagens. Instâncias conectadas agora mantêm o vínculo mesmo se a API da Evolution retornar estados transitórios ou sofrer latência.'
      },
      {
        category: 'fix',
        title: 'Sanitização de Carga no Supabase (Eliminação de Erros de Schema)',
        description: 'Ao persistir a instância na tabela whatsapp_instances, o sistema agora envia estritamente os campos existentes no banco, evitando que flags locais causem rejeição silenciosa de atualização e dessincronização.'
      },
      {
        category: 'improvement',
        title: 'Otimização Drástica de Verificação de Conexão (100ms vs 60s)',
        description: 'A verificação da conexão foi refatorada para utilizar o endpoint leve /connectionState em vez de /fetchInstances, evitando o processamento pesado de milhares de mensagens e eliminando travamentos da interface.'
      },
      {
        category: 'improvement',
        title: 'Timeout Ampliado para 30s no Proxy de Produção',
        description: 'Garante que cold starts e picos de tráfego no servidor Railway não causem abortos prematuros de chamadas HTTP via Vercel.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_22_0',
    version: 'v2.22.0',
    date: '27/09/2026',
    title: 'Correção de Causa Raiz: WhatsApp Desconectado em Produção (transcunha.digital)',
    summary: 'Identificada e corrigida a causa raiz que fazia o número vinculado aparecer como desconectado no transcunha.digital enquanto funcionava corretamente no localhost. O problema era a estratégia incorreta de proxy + timeout insuficiente para o ambiente de produção na Vercel/Railway.',
    items: [
      {
        category: 'fix',
        title: 'Proxy Vercel como Rota Primária em Produção (HTTPS)',
        description: 'Em ambiente HTTPS (produção), o sistema agora usa o proxy reverso Vercel (/api/evolution) como rota principal, eliminando problemas de CORS e "cold start" duplo que causavam timeout antes da resposta chegar.'
      },
      {
        category: 'fix',
        title: 'Timeout Aumentado de 6s para 15s',
        description: 'O timeout de AbortController foi aumentado de 6 para 15 segundos para acomodar o cold start do servidor Railway em produção, que pode demorar 7–10s para responder após período de inatividade.'
      },
      {
        category: 'improvement',
        title: 'Sincronização Otimizada: /connectionState como Primeira Consulta',
        description: 'A função syncWhatsAppInstanceFromGateway agora consulta primeiro o endpoint /connectionState (mais leve) e só busca /fetchInstances quando a instância está conectada, reduzindo latência e carga.'
      },
      {
        category: 'fix',
        title: 'Preservação do Estado Supabase em Falha de Rede',
        description: 'Se a Evolution API não responder (timeout ou erro), o sistema agora preserva o estado salvo no Supabase em vez de sobrescrever com "disconnected", garantindo que usuários em produção vejam o status correto mesmo com latência.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_21_0',
    version: 'v2.21.0',
    date: '27/09/2026',
    title: 'Sincronização em Tempo Real de Respostas e Mídias no WhatsApp Web',
    summary: 'Aprimorado o mecanismo de recepção de mensagens do WhatsApp para capturar instantaneamente respostas enviadas pelos motoristas/contatos, incluindo suporte a mensagens de texto, mídias (fotos, vídeos, áudios/mensagens de voz, figurinhas e documentos), contêineres efêmeros e feed recente global.',
    items: [
      {
        category: 'fix',
        title: 'Recepção e Exibição Imediata de Respostas de Contatos',
        description: 'Corrigido o fluxo de consulta de mensagens da Evolution API para utilizar estratégia de busca híbrida (JID direcionado com e sem 9º dígito + feed recente global), garantindo que mensagens de texto e áudio/mídia recebidas apareçam no painel de chat sem atrasos.'
      },
      {
        category: 'improvement',
        title: 'Desembrulhamento Completo de Mensagens e Mídias',
        description: 'Implementado suporte a contêineres efêmeros, view-once e reações de emojis, permitindo que todas as mensagens enviadas pelo WhatsApp do motorista sejam lidas e renderizadas com precisão.'
      },
      {
        category: 'improvement',
        title: 'Polling Acelerado e Atualização Forçada na Interface',
        description: 'Intervalo de atualização em segundo plano acelerado para 2 segundos e botão de sincronização configurado para consultar o histórico completo da nuvem.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_20_0',
    version: 'v2.20.0',
    date: '27/09/2026',
    title: 'Gravação Automática de Proprietários, Vínculo Multi-veículo e Autopreenchimento Inteligente',
    summary: 'Ao solicitar um novo embarque, os dados do proprietário (TAC / Pessoa Física ou ETC / Pessoa Jurídica) são salvos ou atualizados automaticamente na base de Proprietários com dados bancários/PIX, vínculos de múltiplos veículos e motoristas, e busca automática por CPF, CNPJ e histórico.',
    items: [
      {
        category: 'feature',
        title: 'Gravação e Atualização Automática de Proprietários',
        description: 'Ao criar um embarque, o sistema localiza ou cadastra o Proprietário no banco de dados, salvando nome, documento (CPF/CNPJ), modalidade ANTT, telefone e forma de pagamento / PIX informada.'
      },
      {
        category: 'feature',
        title: 'Autopreenchimento Inteligente de Nome do Proprietário',
        description: 'Para TAC (CPF), se for igual ao motorista o nome é preenchido instantaneamente; se for CPF já cadastrado na plataforma, o nome é recuperado automaticamente. Para ETC (CNPJ), busca na base de cadastros e consulta Razão Social na Receita Federal / BrasilAPI caso seja novo proprietário.'
      },
      {
        category: 'feature',
        title: 'Vínculo Automático de Veículos e Motoristas ao Proprietário',
        description: 'Quando novos embarques são solicitados com placas e motoristas diferentes para um mesmo proprietário, todos os veículos (cavalo, carretas) e motoristas passam a ficar vinculados e visíveis no perfil do proprietário.'
      },
      {
        category: 'improvement',
        title: 'Organização de Placas por Conjunto de Embarque e Limpeza de Vínculos',
        description: 'Os veículos vinculados agora são exibidos organizados por conjunto/composição de embarque (Tipo de Veículo, Carroceria, Motorista, Cavalo e Carretas 1, 2 e 3). Veículos sem titular identificado não herdam proprietário genérico e permanecem avulsos.'
      },
      {
        category: 'improvement',
        title: 'Janela de Cadastro Completa do Proprietário (Modal Dedicado)',
        description: 'Os dados detalhados para recebimento de frete (Banco, Agência, Conta, Chave PIX, Favorecido) e as listas de Veículos Vinculados e Motoristas Associados foram organizados dentro da janela modal de cadastro/edição do proprietário, mantendo a listagem principal limpa com foco em ID, Nome / Razão Social e CPF/CNPJ.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_19_0',
    version: 'v2.19.0',
    date: '27/09/2026',
    title: 'Identificação de Operador na Edição Manual de Imposto Federal e Custos',
    summary: 'Garantida a identificação precisa do operador logado em todas as edições manuais de Imposto Federal, Crédito Gerado, Custos Adicionais e Comissões do painel fiscal e DRE.',
    items: [
      {
        category: 'fix',
        title: 'Vínculo do Operador em Edições Fiscais Manuais',
        description: 'Corrigido o registro de auditoria nas edições de Imposto Federal e Crédito Gerado para associar o ID e nome do usuário logado em vez de "Usuário Desconhecido".'
      },
      {
        category: 'improvement',
        title: 'Compatibilidade Retroativa de Logs de Sistema',
        description: 'Tratamento no visualizador de histórico para que logs automáticos legados do sistema sejam rotulados como "Sistema".'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_18_0',
    version: 'v2.18.0',
    date: '27/09/2026',
    title: 'Auditoria Completa de Ações e Modificações no Gerenciar Anexos',
    summary: 'Todas as ações realizadas em "Gerenciar Anexos", incluindo upload de arquivos por categoria, exclusão de anexos, inserção de dados bancários, peso aferido, rotas, adiantamentos, pedágio e saldos agora são registradas em tempo real com rastreabilidade completa no histórico do embarque.',
    items: [
      {
        category: 'feature',
        title: 'Registro Detalhado de Documentos e Metadados Operacionais',
        description: 'O histórico agora detalha a inserção e exclusão de cada anexo por categoria (ex: [CT-e], [MDF-e], [Carta Frete]), dados fiscais extraídos, dados bancários, pesos de carregamento/descarga e liquidação financeira.'
      },
      {
        category: 'feature',
        title: 'Exclusão Direta de Documentos em Gerenciar Anexos',
        description: 'Permitida a exclusão autorizada de documentos diretamente no card de anexos do modal, com confirmação e geração imediata de log de auditoria.'
      },
      {
        category: 'improvement',
        title: 'Rastreamento Preciso de Campos no Histórico',
        description: 'Atualizado o mapeamento de campos (FIELD_TRANSLATIONS) para formatar valores monetários, percentuais e pesos em padrão legível no histórico.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_17_0',
    version: 'v2.17.0',
    date: '27/09/2026',
    title: 'Higienização e Filtragem do Histórico de Auditoria de Cargas e Embarques',
    summary: 'Ajustada a exibição do histórico de alterações para filtrar metadados técnicos internos e identificar corretamente registros automáticos do sistema.',
    items: [
      {
        category: 'fix',
        title: 'Filtragem de Metadados Técnicos no Histórico',
        description: 'Eliminada a exibição indevida de dados brutos e IDs internos (meta_*) como alterações atribuídas a "Usuário Desconhecido".'
      },
      {
        category: 'improvement',
        title: 'Mapeamento de Usuário do Sistema',
        description: 'Registros originados por rotinas automáticas do sistema agora são identificados claramente como "Sistema".'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_16_0',
    version: 'v2.16.0',
    date: '27/09/2026',
    title: 'Fim da Duplicação de Balões de Mensagens no Chat do WhatsApp',
    summary: 'Implementação de algoritmo de deduplicação inteligente no carregamento e envio de mensagens, vinculando o ID oficial do WhatsApp retornado pela Evolution API e impedindo balões repetidos.',
    items: [
      {
        category: 'fix',
        title: 'Deduplicação Inteligente de Balões',
        description: 'Eliminada a duplicação visual de mensagens enviadas pelo operador decorrente da sobreposição entre o cache local temporário e as mensagens oficiais da Evolution API.'
      },
      {
        category: 'improvement',
        title: 'Vinculação Direta de IDs Oficiais',
        description: 'As mensagens enviadas agora herdam imediatamente o identificador único oficial retornado pelo WhatsApp (3EB0...), mantendo histórico consistente e limpo.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_15_0',
    version: 'v2.15.0',
    date: '27/09/2026',
    title: 'Sincronização Bidirecional do Chat do WhatsApp (Envios e Respostas ao Vivo)',
    summary: 'Correção e aprimoramento completo do fluxo de envio e recebimento de mensagens no Chat. Tratamento de variações de 9º dígito móvel do Brasil (JIDs com 12 e 13 dígitos) e polling reativo em segundo plano para exibição contínua de respostas em tempo real.',
    items: [
      {
        category: 'fix',
        title: 'Tratamento de Variações de JID (9º Dígito do Brasil)',
        description: 'Compatibilização de números com e sem o nono dígito (ex: 556499305... e 55649305...), garantindo que mensagens reais da Evolution API sejam vinculadas corretamente à conversa correspondente.'
      },
      {
        category: 'feature',
        title: 'Atualização Contínua de Respostas no Chat Aberto',
        description: 'Adicionado mecanismo de auto-refresh em segundo plano que sincroniza mensagens recebidas e lidas a cada 4 segundos enquanto o operador conversa.'
      },
      {
        category: 'improvement',
        title: 'Remoção de Mensagens Fictícias de Demonstração',
        description: 'Exibição exclusiva do histórico real do WhatsApp oficial pareado na Evolution API.'
      }
    ]
  },
  {
    id: 'rel_2026_09_27_v2_14_0',
    version: 'v2.14.0',
    date: '27/09/2026',
    title: 'Otimização de Desconexão Real do WhatsApp e Alta Performance da Conexão',
    summary: 'Aprimoramento completo do ciclo de conexão e desconexão do WhatsApp. A ação de desconectar agora encerra efetivamente a sessão e remove o número vinculado tanto no servidor da nuvem (Railway) quanto no Supabase e banco local, além de otimizar a velocidade de carregamento da aba de Conexão & Aparelho.',
    items: [
      {
        category: 'fix',
        title: 'Desconexão Real e Limpeza do Número Vinculado',
        description: 'Eliminado o fallback forçado que restaurava o número anterior. Agora, ao clicar em "Desconectar", a instância é verdadeiramente encerrada na Evolution API e zerada no sistema.'
      },
      {
        category: 'improvement',
        title: 'Alta Performance e Fim da Lentidão',
        description: 'Implementado AbortController com timeout de 6s em todas as chamadas da Evolution API, eliminando travamentos e garantindo transições instantâneas entre abas.'
      },
      {
        category: 'security',
        title: 'Restauração e Estabilidade do PostgreSQL no Railway',
        description: 'Banco de dados da Evolution API restaurado e reconfigurado no Railway com persistência em volume seguro.'
      }
    ]
  },
  {
    id: 'rel_2026_09_26_v2_13_0',
    version: 'v2.13.0',
    date: '26/09/2026',
    title: 'Sincronização em Tempo Real (Realtime Hub) Multi-Usuários no Chat do WhatsApp',
    summary: 'Refinamento completo da infraestrutura de tempo real da tela do Chat. Qualquer mensagem enviada, nova conversa criada, conversa excluída ou alteração feita por Administradores do Sistema ou operadores agora é sincronizada instantaneamente para todos os outros usuários sem necessidade de atualizar a página.',
    items: [
      {
        category: 'feature',
        title: 'Realtime Hub Bidirecional Multi-Usuários',
        description: 'Implementação de canal Supabase Realtime Broadcast integrado a eventos Postgres Changes, propagando alterações de conversas e mensagens para todas as sessões em milissegundos.'
      },
      {
        category: 'fix',
        title: 'Estabilidade de Conexão do Realtime Hub',
        description: 'Correção na ordem de registro dos ouvintes postgres_changes e broadcast no Supabase Realtime, evitando erros de renderização inicial no carregamento do Chat.'
      },
      {
        category: 'improvement',
        title: 'Identificação de Remetente / Operador',
        description: 'Exibição em tempo real do perfil e nome do operador (ex: "Administrador do Sistema") que despachou cada mensagem no chat.'
      },
      {
        category: 'improvement',
        title: 'Reordenação e Alertas Visuais/Sonoros Imediatos',
        description: 'Atualização instantânea da lista lateral de conversas com a última mensagem, reordenação ao topo, contadores de não lidas e chime sonoro sutil.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_12_0',
    version: 'v2.12.0',
    date: '24/09/2026',
    title: 'Novo Módulo "Chat" com Player de Áudio, Visualizador de Fotos/Figurinhas e Documentos',
    summary: 'A ferramenta de atendimento foi renomeada para "Chat" e agora conta com suporte nativo para ouvir mensagens de áudio, abrir documentos/arquivos e visualizar imagens e figurinhas com lightbox interativo.',
    items: [
      {
        category: 'feature',
        title: 'Player de Áudio Integrado',
        description: 'Reprodução de áudios e mensagens de voz do WhatsApp com controle de play/pause, onda de frequência animada, contador de tempo e seletor de velocidade (1x, 1.5x e 2x).'
      },
      {
        category: 'feature',
        title: 'Visualizador de Imagens e Figurinhas (Lightbox)',
        description: 'Exibição de fotos e figurinhas com modal de tela cheia, zoom in/out, rotação e download direto.'
      },
      {
        category: 'feature',
        title: 'Abertura e Download de Documentos',
        description: 'Cards inteligentes para arquivos anexados (PDF, Word, Excel, ZIP) com pré-visualização e download rápido.'
      },
      {
        category: 'improvement',
        title: 'Renomeação para "Chat"',
        description: 'Interface e menus atualizados para a nomenclatura padrão "Chat".'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_11_5',
    version: 'v2.11.5',
    date: '24/09/2026',
    title: 'Bloqueio de Sincronização Desconectada & Conexão QR Code Multi-Máquinas',
    summary: 'O botão de sincronização de conversas foi protegido para exigir conexão ativa e o mecanismo de geração do QR Code foi aprimorado com tentativas automáticas para permitir que qualquer máquina/usuário pareie o WhatsApp na nuvem.',
    items: [
      {
        category: 'feature',
        title: 'Geração Resiliente de QR Code Multi-Dispositivos',
        description: 'Implementado loop de polling e retry automático na comunicação com a Evolution API / Railway, permitindo que outros usuários conectem e leiam o QR Code sem erros de timeout.'
      },
      {
        category: 'security',
        title: 'Bloqueio Visual e Funcional do Sincronizar',
        description: 'O botão "Sincronizar" no painel de conversas passa a exibir estado desabilitado sempre que a sessão estiver desconectada.'
      },
      {
        category: 'improvement',
        title: 'Sincronização em Tempo Real no Supabase',
        description: 'O QR Code e o estado de conexão são sincronizados em nuvem entre todos os terminais conectados.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_11_4',
    version: 'v2.11.4',
    date: '24/09/2026',
    title: 'Botão de Exclusão de Histórico & Trava Rigorosa de Desconexão',
    summary: 'Botão dedicado na barra de conversas para limpar o histórico da tela com 1 clique e bloqueio rigoroso que impede o retorno de conversas enquanto o WhatsApp estiver desconectado.',
    items: [
      {
        category: 'feature',
        title: 'Botão Excluir Histórico da Tela',
        description: 'Ícone de lixeira no cabeçalho da lista de conversas permitindo apagar instantaneamente todas as mensagens e conversas exibidas.'
      },
      {
        category: 'security',
        title: 'Trava de Sincronização Desconectada',
        description: 'Ao clicar em "Sincronizar" com o WhatsApp desconectado, o sistema bloqueia a requisição e exige conexão ativa para restaurar qualquer dado.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_11_3',
    version: 'v2.11.3',
    date: '24/09/2026',
    title: 'Desconexão Automática & Limpeza Segura do Histórico de Conversas',
    summary: 'Ao desconectar a sessão do WhatsApp, todo o histórico de conversas, mensagens e mídias é imediatamente desconectado e limpo do sistema por segurança e privacidade.',
    items: [
      {
        category: 'security',
        title: 'Desconexão Segura do Histórico',
        description: 'Ao clicar em desconectar ou encerrar a sessão, as mensagens e conversas locais são apagadas automaticamente e a tela de chat é esvaziada em tempo real.'
      },
      {
        category: 'improvement',
        title: 'Bloqueio de Carregamento sem Conexão',
        description: 'Impede o carregamento de conversas em instâncias desconectadas, exigindo nova autenticação via QR Code para sincronização.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_11_2',
    version: 'v2.11.2',
    date: '24/09/2026',
    title: 'Sincronização Completa de Histórico do WhatsApp (Semelhante ao WhatsApp Web)',
    summary: 'Integração de sincronização profunda com a Evolution API trazendo contatos reais, fotos de perfil, mensagens recebidas e enviadas, áudios, imagens e documentos com atualização instantânea no sistema.',
    items: [
      {
        category: 'feature',
        title: 'Sincronização de Conversas & Contatos Reais',
        description: 'Importação automática de contatos, grupos e histórico de mensagens reais da instância do WhatsApp com nomes e avatares reais.'
      },
      {
        category: 'improvement',
        title: 'Sincronização em 1 Clique & Botão Dedicado',
        description: 'Novo botão de sincronização rápida no painel de conversas e conexão com aprimoramento de resiliência e status conectado garantido.'
      },
      {
        category: 'feature',
        title: 'Visualização de Mídias (Áudios, Fotos & Arquivos)',
        description: 'Exibição de áudios com duração, fotos, documentos PDF anexados e textos formatados diretamente nas bolhas de conversa.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_11_1',
    version: 'v2.11.1',
    date: '24/09/2026',
    title: 'Janela de WhatsApp Sobreposta, Arrastável & Redimensionável',
    summary: 'A janela de conversas do WhatsApp agora pode ser aberta de forma flutuante/sobreposta na tela, permitindo ser arrastada livremente para qualquer posição e ter seu tamanho (largura e altura) redimensionado pelas bordas e cantos.',
    items: [
      {
        category: 'feature',
        title: 'Movimentação Livre (Arrastar / Drag & Drop)',
        description: 'Basta clicar e segurar na barra superior da janela para movê-la para qualquer local da tela enquanto você navega pelo sistema.'
      },
      {
        category: 'feature',
        title: 'Redimensionamento Personalizado (Resize)',
        description: 'Alças de redimensionamento no canto inferior direito e bordas para ajustar a largura e altura conforme sua preferência.'
      },
      {
        category: 'feature',
        title: 'Botão "Destacar Janela" e Modo Minimizado',
        description: 'Opção de destacar a conversa direto da aba ou minimizar a janela para um botão discreto no canto inferior direito com retorno em 1 clique.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_11_0',
    version: 'v2.11.0',
    date: '24/09/2026',
    title: 'Janela e Central de Conversas do WhatsApp Integrada',
    summary: 'Nova funcionalidade de chat e janela integrada para abrir, acompanhar e responder conversas de WhatsApp diretamente dentro do sistema Transcunha, com visualização em tempo real de mensagens, envio de anexos, respostas rápidas com modelos e histórico sincronizado.',
    items: [
      {
        category: 'feature',
        title: 'Central de Conversas & Chat ao Vivo',
        description: 'Nova aba dedicada dentro do módulo de WhatsApp permitindo visualizar a lista de motoristas/contatos, mensagens enviadas e recebidas com balões estilizados e status de entrega.'
      },
      {
        category: 'feature',
        title: 'Janela Modal / Flutuante de WhatsApp',
        description: 'Botão "Abrir Janela de Chat" para abrir uma janela ampla com suporte a maximização, busca de contatos e envio direto de mensagens.'
      },
      {
        category: 'feature',
        title: 'Início de Nova Conversa & Respostas Rápidas',
        description: 'Permite digitar qualquer número com DDD ou selecionar contatos para iniciar conversas, além de menu de respostas rápidas com os modelos de aviso de carga, adiantamento, CT-e e saldo.'
      },
      {
        category: 'improvement',
        title: 'Suporte a Anexos e Link Rápido para WhatsApp Web',
        description: 'Envio de documentos/PDFs e botão de atalho para abrir qualquer conversa no WhatsApp Web oficial com um único clique.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_10_9',
    version: 'v2.10.9',
    date: '24/09/2026',
    title: 'Destaque Visual do App e Botão "Baixar App"',
    summary: 'Substituição da nomenclatura "Instalar PWA" para "Baixar App", com novo botão em destaque com animação de pulso no login, card do aplicativo com visual premium e modal interativo com guia de instalação para Android, iOS e Computador.',
    items: [
      {
        category: 'improvement',
        title: 'Nomenclatura "Baixar App"',
        description: 'Atualizada a nomenclatura técnica de PWA para o termo mais amigável e direto "Baixar App".'
      },
      {
        category: 'feature',
        title: 'Super Destaque Visual do App na Tela de Acesso',
        description: 'Card dedicado ao App com gradientes modernos, badge de disponibilidade, efeitos de brilho e botão de ação direta.'
      },
      {
        category: 'feature',
        title: 'Modal de Instalação Rápida',
        description: 'Modal elegante com passo a passo ilustrado para baixar/instalar o aplicativo no Android, iPhone (Safari) e Computador.'
      }
    ]
  },
  {
    id: 'rel_2026_09_24_v2_10_8',
    version: 'v2.10.8',
    date: '24/09/2026',
    title: 'Liberação de Anexo em Ag. Descarga e Bloqueio de Validação para Embarcador',
    summary: 'O perfil Embarcador agora possui permissão para anexar o comprovante de descarga/ticket na etapa "Ag. Descarga" e salvar o avanço para "Valid. de Ticket". A validação formal e avanço da etapa "Valid. de Ticket" permanecem bloqueados exclusivamente para a equipe interna (Fiscal, Supervisor, Financeiro, Diretor e Admin).',
    items: [
      {
        category: 'feature',
        title: 'Permissão de Anexo de Descarga para Embarcador',
        description: 'Embarcadores podem anexar o ticket/comprovante de descarga e informar o peso descarregado diretamente no status "Ag. Descarga", avançando para "Valid. de Ticket".'
      },
      {
        category: 'security',
        title: 'Bloqueio Estrito na Validação de Ticket',
        description: 'A etapa "Valid. de Ticket" fica bloqueada para o perfil Embarcador, sendo necessária a validação formal da equipe interna antes de liberar o avanço para quitação de saldo.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_7',
    version: 'v2.10.7',
    date: '23/09/2026',
    title: 'Previsão Total de Pagamentos de Saldo na Gestão Financeira',
    summary: 'Novo indicador financeiro em tempo real no painel de "Gestão Financeira dos Embarques", contabilizando o valor total previsto de saldos a pagar somando os embarques nas etapas de "Ag. Descarga", "Valid. de Ticket" e "Ag. Saldo".',
    items: [
      {
        category: 'feature',
        title: 'Total Previsto de Saldos a Pagar',
        description: 'Exibe no topo do painel financeiro o montante consolidado em R$ e a quantidade de embarques em fase de liquidação de saldo (abrangendo Ag. Descarga, Valid. de Ticket e Ag. Saldo).'
      },
      {
        category: 'improvement',
        title: 'Detalhamento de Saldos por Etapa',
        description: 'Tooltip interativo que detalha valores e contagem de cargas divididos entre as etapas de trânsito/descarga, validação de ticket e aguardando liquidação de saldo.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_6',
    version: 'v2.10.6',
    date: '23/09/2026',
    title: 'Previsão Total de Adiantamentos a Fazer na Gestão Financeira',
    summary: 'Novo indicador financeiro em tempo real no cabeçalho da "Gestão Financeira dos Embarques", calculando o valor monetário total previsto de adiantamentos a pagar considerando os embarques nas etapas entre "Ag. Cadastro" e "Ag. Adiantamento".',
    items: [
      {
        category: 'feature',
        title: 'Total Previsto de Adiantamentos a Fazer',
        description: 'Exibe no topo do painel financeiro o total acumulado em R$ e a quantidade de embarques previstos para adiantamento (abrangendo Ag. Cadastro, Ag. Seguradora, Ag. Carregamento, Ag. Nota, Ag. Fiscal e Ag. Adiantamento).'
      },
      {
        category: 'improvement',
        title: 'Detalhamento por Etapa em Popover',
        description: 'Ao passar o cursor sobre o card de adiantamentos, é exibido o detalhamento com a contagem de cargas e a soma de valores em cada uma das etapas do fluxo operacional.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_5',
    version: 'v2.10.5',
    date: '23/09/2026',
    title: 'Alerta Inteligente de Divergência de Peso (Ticket vs CT-e)',
    summary: 'Validação e leitura automática do peso bruto informado no CT-e (XML/PDF) ao anexar documentos fiscais, emitindo alertas visuais imediatos e confirmação de segurança caso o peso do CT-e seja diferente do peso registrado no Passo: Ticket de Carregamento.',
    items: [
      {
        category: 'feature',
        title: 'Detecção Automática de Divergência de Peso',
        description: 'Ao anexar os documentos fiscais ou importar o CT-e (XML/PDF), o sistema compara o peso do CT-e com o peso do Ticket de Carregamento e exibe um alerta detalhado com as diferenças em toneladas e quilogramas.'
      },
      {
        category: 'security',
        title: 'Confirmação de Segurança ao Salvar',
        description: 'Caso exista divergência superior a 10 kg entre o ticket e o CT-e, o sistema solicita confirmação explícita do usuário antes de concluir o avanço de status da viagem.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_4',
    version: 'v2.10.4',
    date: '23/09/2026',
    title: 'Remoção do Perfil Supervisor da Tabela de Equipe Comercial',
    summary: 'Ajuste no filtro de usuários do Relatório Comercial e de Agenciamento para exibir apenas os membros diretamente operacionais de vendas e agenciamento (Comercial, Gerente Comercial e Agenciador Líder), excluindo o perfil Supervisor.',
    items: [
      {
        category: 'fix',
        title: 'Exclusão do Perfil Supervisor do Relatório Comercial',
        description: 'Usuários com perfil "Supervisor" não são mais exibidos na tabela nem contabilizados nas comissões da equipe comercial.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_3',
    version: 'v2.10.3',
    date: '23/09/2026',
    title: 'Busca Rápida e Filtro por Solicitante no Relatório de Lucro Real',
    summary: 'Inclusão do campo de Solicitante (embarcador, operador ou agência responsável) na Busca Rápida e adição de dropdown de seleção múltipla por Solicitante nos filtros avançados do Relatório de Lucro Real da Operação, além de exibir o solicitante na tabela e exportações.',
    items: [
      {
        category: 'feature',
        title: 'Filtro e Busca Rápida por Solicitante',
        description: 'A Busca Rápida agora pesquisa diretamente pelo nome e email do Solicitante/Agência do frete, além de contar com um filtro dedicado de seleção múltipla no painel de filtros.'
      },
      {
        category: 'improvement',
        title: 'Exibição e Exportação com Solicitante',
        description: 'O solicitante responsável é exibido na primeira coluna da tabela de Lucro Real e incluído nas exportações em CSV e PDF.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_2',
    version: 'v2.10.2',
    date: '23/09/2026',
    title: 'Filtragem Estrita de Membros no Relatório Comercial e de Agenciamento',
    summary: 'Ajuste no filtro de usuários exibidos na tabela de "Equipe Comercial, Agenciadores e Gerentes", garantindo que apenas perfis estritamente operacionais da área comercial (Comercial, Gerente Comercial, Supervisor e Agenciadores Líderes) sejam listados, excluindo usuários de diretoria (Diretor) e administração.',
    items: [
      {
        category: 'fix',
        title: 'Remoção de Usuários com Perfil Diretor da Tabela Comercial',
        description: 'Usuários com perfil "Diretor" foram removidos da listagem e da contagem de comissões ativas do relatório comercial, mantendo apenas membros da equipe comercial, agenciadores e gerentes.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_1',
    version: 'v2.10.1',
    date: '23/09/2026',
    title: 'Bypass Automático e Preciso de Ag. Seguradora para Produtos sem Exigência de GR',
    summary: 'Aprimoramento das regras de transição de status para cargas com produtos configurados sem exigência de Gerenciamento de Risco (GR). O sistema realiza a resolução resiliente de ID e nome do produto e carga em todas as etapas operacionais, pulando a etapa de Ag. Seguradora na criação de novos embarques e no avanço do pré-cadastro.',
    items: [
      {
        category: 'fix',
        title: 'Resolução Precisa de Produto e GR na Criação de Embarques',
        description: 'Padronização da busca da carga e produto através de helpers tolerantes a prefixos (ex: CRG-225 vs 225) e nomes/IDs, assegurando que produtos com GR dispensado nunca caiam indevidamente em "Ag. Seguradora".'
      },
      {
        category: 'improvement',
        title: 'Fluxo Direto para Ag. Carregamento',
        description: 'Motoristas com viagens anteriores em cargas sem exigência de GR são direcionados diretamente para "Ag. Carregamento" na criação do embarque. Novos motoristas, ao concluírem o "Ag. Cadastro", avançam diretamente para "Ag. Carregamento".'
      },
      {
        category: 'improvement',
        title: 'Timeline de Etapas e Validações Otimizadas',
        description: 'A timeline de progresso do embarque e os modais de anexo ocultam/desabilitam automaticamente a obrigatoriedade de código de liberação e tipo de consulta para cargas com GR dispensado.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_10_0',
    version: 'v2.10.0',
    date: '23/09/2026',
    title: 'Sincronização Realtime Instantânea e Reativa nos Dashboards Operacionais',
    summary: 'Refinamento integral do fluxo de Realtime para todos os Dashboards (Fiscal, Financeiro, Geral e Supervisor). Aplicação síncrona imediata (0ms) de deltas de alteração de status de embarques entre usuários, múltiplos canais dedicados por tabela e heartbeat ultraleve com auto-sync ao focar na janela.',
    items: [
      {
        category: 'feature',
        title: 'Atualização Instantânea de Status nos Dashboards',
        description: 'Quando um usuário altera o status de um embarque (anexando documentos, alterando dados ou avançando etapas), os demais usuários têm seus Dashboards atualizados instantaneamente na coluna Kanban correspondente sem precisar recarregar a página.'
      },
      {
        category: 'improvement',
        title: 'Canais Dedicados e Aplicação Direta de Deltas',
        description: 'Assinaturas específicas para cada tabela do Supabase Realtime com injeção direta de payload nos estados locais do React, eliminando requisições pesadas e gargalos de rede.'
      },
      {
        category: 'improvement',
        title: 'Heartbeat de Contingência e Sync por Foco na Aba',
        description: 'Heartbeat ultraleve de 5 segundos monitorando carimbos de data/hora (updated_at) e sincronização imediata ao retornar ou focar na aba, garantindo sincronia total mesmo após suspensão de tela ou oscilações de conexão.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_9_9',
    version: 'v2.9.9',
    date: '23/09/2026',
    title: 'Ciclo de Vida Completo do WhatsApp: Reconexão, Pareamento e Desconexão Real',
    summary: 'Aprimoramento completo do ciclo de vida da instância na Evolution API: geração forçada de novo QR Code limpo ao reconectar, encerramento real da sessão no WhatsApp do aparelho ao desconectar, polling reativo e identificação imediata do número oficial conectado.',
    items: [
      {
        category: 'feature',
        title: 'Geração Forçada de Novo QR Code',
        description: 'Ao clicar em "Reconectar QR" ou "Gerar QR Code", a sessão anterior é resetada na Evolution API garantindo a emissão de um QR Code limpo e pronto para leitura.'
      },
      {
        category: 'fix',
        title: 'Desconexão Fiel no Gateway e no Aparelho',
        description: 'A ação de desconectar agora executa logout e remoção da sessão na Evolution API, desconectando o aparelho e resetando os estados no Supabase e LocalStorage.'
      },
      {
        category: 'improvement',
        title: 'Reconhecimento Imediato do Número do Aparelho',
        description: 'Ao ler o QR Code com o WhatsApp corporativo, o sistema valida a conexão instantaneamente e exibe o número pareado formatado no painel.'
      }
    ]
  },
  {
    id: 'rel_2026_09_23_v2_9_8',
    version: 'v2.9.8',
    date: '23/09/2026',
    title: 'Sincronização do Número Oficial e Estado Ativo do WhatsApp',
    summary: 'Aprimoramento da sincronização em tempo real com a Evolution API na nuvem: extração automática do número pareado (ownerJid), tratamento de conflitos de sessão do Baileys e botão de reconexão instantânea de QR Code.',
    items: [
      {
        category: 'fix',
        title: 'Exibição do Número Pareado em Tempo Real',
        description: 'Correção na extração do JID/número do aparelho pareado no Gateway, exibindo o número oficial formatado no card de conexão sem exibir "Nenhum número vinculado".'
      },
      {
        category: 'improvement',
        title: 'Detecção de Conflitos e Botão de Reconexão',
        description: 'Adicionado botão "Reconectar QR" no card operacional para facilitar a leitura de um novo QR Code caso a sessão no celular seja desconectada ou alterada.'
      },
      {
        category: 'security',
        title: 'Sincronização de Estado Fidedigno',
        description: 'O status da conexão agora reflete fielmente a resposta do WebSocket da Evolution API no Railway, prevenindo estados fantasmas.'
      }
    ]
  },
  {
    id: 'rel_2026_09_22_v2_9_7',
    version: 'v2.9.7',
    date: '22/09/2026',
    title: 'Automação WhatsApp 24h em Nuvem & Provisionamento Resiliente',
    summary: 'Arquitetura e pacote completo de implantação da Evolution API na nuvem (Railway/VPS) com suporte a criação automática de instâncias, QR Code dinâmico em tempo real, persistência em PostgreSQL/Redis e disparos automáticos 24h ininterruptos sem depender do computador ligado.',
    items: [
      {
        category: 'feature',
        title: 'Provisionamento Automático de Instância na Nuvem',
        description: 'Integração inteligente com Evolution API v2: criação automática de instância na nuvem caso não exista e recuperação instantânea do QR Code criptografado.'
      },
      {
        category: 'improvement',
        title: 'Pacote de Deploy 24h (Railway & Docker)',
        description: 'Disponibilização do pacote pronto em deploy-railway com docker-compose.yml de produção, healthchecks, Redis para cache de instâncias e guia de implantação rápida.'
      },
      {
        category: 'security',
        title: 'Persistência Blindada de Sessão e Configurações',
        description: 'Sincronização contínua das sessões no PostgreSQL da nuvem e histórico completo de mensagens na fila do Supabase com tratamento de falhas e reenvios.'
      }
    ]
  },
  {
    id: 'rel_2026_09_22_v2_9_6',
    version: 'v2.9.6',
    date: '22/09/2026',
    title: 'Dispensação Automática de Seguradora/GR para Produtos Isentos',
    summary: 'Embarques gerados para cargas cujo produto está configurado sem exigência de Gerenciamento de Risco (GR) agora pulam automaticamente a etapa de "Ag. Seguradora", sendo direcionados diretamente para "Ag. Carregamento" ou avançando do cadastro direto para o carregamento.',
    items: [
      {
        category: 'feature',
        title: 'Bypass Inteligente de Ag. Seguradora',
        description: 'Quando a carga possui um produto sem exigência de GR, motoristas com histórico de viagem iniciam diretamente em "Ag. Carregamento". Para motoristas em primeiro cadastro, ao concluir o cadastro o embarque avança diretamente para "Ag. Carregamento".'
      },
      {
        category: 'improvement',
        title: 'Linha do Tempo e Histórico Otimizados',
        description: 'A linha do tempo do embarque oculta automaticamente a etapa de seguradora para produtos isentos de GR, e os registros de histórico e reversão de status operam com total conformidade.'
      }
    ]
  },
  {
    id: 'rel_2026_09_22_v2_9_5',
    version: 'v2.9.5',
    date: '22/09/2026',
    title: 'Auditoria de Erros, Refatoração Estrutural e Otimização de Performance (Code-Splitting)',
    summary: 'Varredura completa e auditoria de erros no sistema logístico Transcunha: divisão inteligente de bundle (code-splitting dinâmico com React.lazy/Suspense), otimização de chunks Rollup/Vite, limpeza de dead code e blindagem nos cálculos de frete e tributos TAC.',
    items: [
      {
        category: 'improvement',
        title: 'Divisão Dinâmica de Módulos (Code-Splitting e Lazy Loading)',
        description: 'Todas as páginas do sistema foram convertidas para carregamento sob demanda (lazy loading com React.Suspense). O tempo de carregamento inicial e o consumo de memória foram drasticamente reduzidos.'
      },
      {
        category: 'improvement',
        title: 'Otimização de Pacotes e Redução de Bundle',
        description: 'Configuração de manualChunks no Vite/Rollup isolando bibliotecas pesadas (PDF, mapas geográficos, ícones e Supabase) e remoção de dados estáticos não utilizados, diminuindo significativamente o peso do arquivo principal de código.'
      },
      {
        category: 'security',
        title: 'Blindagem de Cálculos de Frete e Tributos',
        description: 'Tratamento rigoroso contra valores nulos, inválidos (NaN) e coerção de dados nas rotinas de partição de adiantamento, vale-pedágio e retenções fiscais de motoristas autônomos (TAC).'
      }
    ]
  },
  {
    id: 'rel_2026_09_22_v2_9_4',
    version: 'v2.9.4',
    date: '22/09/2026',
    title: 'Sincronização Silenciosa de Dados Fiscais no Gerenciamento de Anexos',
    summary: 'Ajustada a rotina de leitura e sincronização automática de documentos fiscais e DRE em segundo plano para não disparar toasts repetidos na abertura da tela de Gerenciar Anexos.',
    items: [
      {
        category: 'improvement',
        title: 'Sincronização em Segundo Plano Silenciosa',
        description: 'A leitura e extração automática de dados fiscais (pedágio, valor de mercadoria, impostos) ao abrir a janela de anexos agora roda silenciosamente no background, reservando alertas e notificações visuais apenas para ações manuais de salvamento do usuário.'
      }
    ]
  },
  {
    id: 'rel_2026_09_22_v2_9_3',
    version: 'v2.9.3',
    date: '22/09/2026',
    title: 'Correção na Captura de Vale-Pedágio e Prevenção de Leitura de NF-e/DANFE',
    summary: 'Corrigido o padrão de leitura e sincronização de documentos para impedir que o valor total da mercadoria/NF-e seja interpretado como vale-pedágio ao ler textos ou observações complementares do DANFE.',
    items: [
      {
        category: 'fix',
        title: 'Isolamento Rigoroso de Vale-Pedágio',
        description: 'Expressões de busca do vale-pedágio foram refinadas com escopo estrito, eliminando captura indevida de valores da NF-e e preservando fielmente os valores emitidos na Carta Frete (VPO) e CT-e (ex: R$ 68,11).'
      },
      {
        category: 'improvement',
        title: 'Sincronização por Categoria de Documento',
        description: 'O painel de automação de custos do CT-e e o modal de anexos agora priorizam e restringem a leitura de adiantamento e vale-pedágio aos documentos legítimos de transporte (Carta Frete, CT-e e MDF-e).'
      }
    ]
  },
  {
    id: 'rel_2026_09_22_v2_9_2',
    version: 'v2.9.2',
    date: '22/09/2026',
    title: 'Correção no Fluxo de Avanço para Ag. Adiantamento e Isolamento de Leitura de Pedágio',
    summary: 'Ajustada a regra de transição de status para respeitar o adiantamento configurado (evitando que o sistema pule indevidamente a etapa financeira) e isolada a extração de pedágio/contrato para não capturar valores fiscais indevidos de NF-e.',
    items: [
      {
        category: 'fix',
        title: 'Transição Confiável para Ag. Adiantamento',
        description: 'A transição de status a partir de Ag. Fiscal agora pula Ag. Adiantamento estritamente quando a porcentagem de adiantamento for explicitamente 0%, impedindo pulos acidentais provocados por valores zerados transitórios.'
      },
      {
        category: 'improvement',
        title: 'Isolamento de Leitura em Notas Fiscais',
        description: 'Documentos do tipo Nota Fiscal (NF-e/DANFE) não extraem mais campos de contrato de frete/pedágio do motorista, reservando essa leitura para CT-e, MDF-e e Contratos de Frete.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_9_1',
    version: 'v2.9.1',
    date: '21/09/2026',
    title: 'Apuração de Toneladas Efetivadas Exclusivamente com CT-e Anexado',
    summary: 'Configurada regra para que as "Toneladas Efetivadas" e o cálculo da comissão de embarcadores contabilizem estritamente os embarques que possuam CT-e anexado / emitido.',
    items: [
      {
        category: 'improvement',
        title: 'Critério Rígido para Toneladas Efetivadas',
        description: 'Os relatórios e rankings de embarcadores agora exigem a presença do CT-e (número fiscal ou documento anexado) para contabilizar o volume transportado como tonelagem efetivada.'
      },
      {
        category: 'feature',
        title: 'Cálculo de Comissão Condicionado ao CT-e',
        description: 'A comissão por tonelada do embarcador passa a ser apurada somente sobre as cargas efetivamente acobertadas por CT-e.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_9_0',
    version: 'v2.9.0',
    date: '21/09/2026',
    title: 'Sincronização Automática da Base de Seguro e Lucro Líquido Real',
    summary: 'Ajustada a captura e persistência do valor da Nota Fiscal (NF-e) e Vale-Pedágio dos documentos anexados, mantendo 100% de paridade entre a tabela de Lucro Real e o painel de automatização do CT-e.',
    items: [
      {
        category: 'fix',
        title: 'Paridade de Seguros e Lucro Líquido Real',
        description: 'Os valores de NF-e e Vale-Pedágio extraídos de documentos/XMLs agora são persistidos automaticamente e lidos em todos os cálculos do relatório de Lucro Real, garantindo que o Seguro Averbado da Carga (Acidente + Roubo) reflita de forma idêntica tanto na listagem quanto na janela de detalhamento.'
      },
      {
        category: 'improvement',
        title: 'Fallback Completo de Propriedades Fiscais',
        description: 'O calculador de despesas operacionais agora verifica todas as propriedades fiscais e de documentos (nfe_value, valor_mercadoria, toll_value) para evitar divergências de arredondamento ou comissões de agência.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_8_9',
    version: 'v2.8.9',
    date: '21/09/2026',
    title: 'Padronização Rigorosa do Fluxo e Transição de Status de Embarques',
    summary: 'Reconfigurado o fluxo de avanço e retrocesso dos status para obedecer rigorosamente à ordem sequencial de 11 etapas, com tratamento preciso para as 3 regras de salto permitidas.',
    items: [
      {
        category: 'improvement',
        title: 'Fluxo Sequencial Padronizado de 11 Etapas',
        description: 'O ciclo de vida do frete obedece estritamente à ordem: 1 - Ag. Cadastro, 2 - Ag. Seguradora, 3 - Ag. Carregamento, 4 - Ag. Nota, 5 - Ag. Fiscal, 6 - Ag. Adiantamento, 7 - Ag. Agend. ou Troca/nfe, 8 - Ag. Descarga, 9 - Valid. de Ticket, 10 - Ag. Saldo, 11 - Finalizado.'
      },
      {
        category: 'improvement',
        title: 'Retrocesso Preciso de Status',
        description: 'A ação de voltar status agora segue exatamente a ordem inversa passo a passo (11 -> 10 -> 9 -> 8 -> 7 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1).'
      },
      {
        category: 'feature',
        title: 'Tratamento das Regras Exclusivas de Salto',
        description: 'Configuradas as únicas 3 exceções de avanço/recuo: motorista com histórico prévio inicia em Ag. Seguradora (pula Ag. Cadastro); adiantamento de 0% pula Ag. Adiantamento (avança 5 -> 7 e volta 7 -> 5); adiantamento de 100% pula Ag. Saldo (avança 9 -> 11 e volta 11 -> 9).'
      },
      {
        category: 'feature',
        title: 'Edição de Forma de Pagamento e Adiantamento até "Ag. Adiantamento"',
        description: 'Disponibilizado botão direto de "Editar" para Forma de Pagamento (PIX - E-Frete, Depósito em Conta ou SMS Carta Frete, com chave Pix ou dados bancários) e Adiantamento (%) no modal de detalhes do embarque, disponível até a etapa de Ag. Adiantamento.'
      },
      {
        category: 'improvement',
        title: 'Comissão do Embarcador e Separação do Relatório Comercial',
        description: 'Usuários com perfil de Embarcador agora são estritamente direcionados para o Relatório de Embarcadores, com a apuração de comissão calculada exatamente por "Toneladas Efetivas" × "Comissão do Embarcador (R$/ton)" cadastrada no usuário.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_8_8',
    version: 'v2.8.8',
    date: '21/09/2026',
    title: 'Visualização e Download de Relatórios de Embarques por Agência (Listagem & PDF)',
    summary: 'Disponibilizados botões de "Listagem" para auditoria detalhada de cada frete e "PDF" para download instantâneo de relatórios consolidados por agência, agenciador líder e equipe de operadores.',
    items: [
      {
        category: 'feature',
        title: 'Modal de Listagem Detalhada por Agência',
        description: 'Permite abrir um painel completo com busca rápida, filtros por status e detalhamento de cada embarque: CT-e, data, tomador, rotas, motorista, custos operacionais, lucro real e comissões da agência.'
      },
      {
        category: 'feature',
        title: 'Exportação em PDF com Layout Transcunha',
        description: 'Geração de relatórios em PDF com cabeçalho institucional, logotipo da empresa, métricas consolidadas (KPIs) e tabela completa dos embarques com totais calculados.'
      },
      {
        category: 'improvement',
        title: 'Ações Diretas nas Tabelas Comercial e Agenciadores',
        description: 'Botões integrados diretamente nas linhas da tabela principal de comissões comerciais e na tabela de operadores vinculados para acesso com 1 clique.'
      },
      {
        category: 'improvement',
        title: 'Transferência de Embarques com Atualização do Solicitante',
        description: 'Ao transferir um embarque, o solicitante (createdById) e embarcador responsável são atualizados automaticamente para o novo usuário, sincronizando também filial e comissões da agência.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_8_7',
    version: 'v2.8.7',
    date: '21/09/2026',
    title: 'Eliminação Definitiva do Crash Mobile a cada 30s ("Ah, não!")',
    summary: 'Eliminado o loop de polling pesado que sobrecarregava a memória do navegador no celular a cada 30 segundos, substituindo por sincronização em tempo real via WebSocket nativo e fallback ultraleve.',
    items: [
      {
        category: 'fix',
        title: 'Fim do Travamento Mobile a cada 30s',
        description: 'Removido o download completo de milhares de embarques e cargas em background a cada 30 segundos, que causava estouro de memória (Out of Memory) e fechamento repentino da aba no Chrome Android/iOS.'
      },
      {
        category: 'improvement',
        title: 'Sincronização em Tempo Real Otimizada',
        description: 'Priorização dos eventos em tempo real do Supabase sem consumo desnecessário de memória ou processamento do aparelho móvel.'
      },
      {
        category: 'improvement',
        title: 'Redução Drástica de Re-renderizações',
        description: 'Removidos temporizadores ociosos de 1 segundo que forçavam a reconstrução contínua da árvore visual do quadro operacional.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_8_6',
    version: 'v2.8.6',
    date: '21/09/2026',
    title: 'Garantia de Visibilidade Total dos Embarques para o Usuário Financeiro',
    summary: 'Garantido que todos os embarques em status de "Ag. Adiantamento", "Ag. Saldo" e trânsito apareçam sem exceção no Dashboard Financeiro, eliminando bloqueios por filial ou permissões restritas de carga.',
    items: [
      {
        category: 'fix',
        title: 'Visibilidade Global no Financeiro',
        description: 'Removidos filtros restritivos de filial e de usuário da carga para o perfil Financeiro, garantindo que nenhum adiantamento ou saldo a pagar fique oculto.'
      },
      {
        category: 'improvement',
        title: 'Normalização de Status no Kanban Financeiro',
        description: 'Compatibilização de todas as variações e sinônimos de status (ex: Ag. Adiantamento, Ag. Saldo, Validação de Ticket) para agrupamento automático nas colunas corretas.'
      }
    ]
  },
  {
    id: 'rel_2026_09_21_v2_8_5',
    version: 'v2.8.5',
    date: '21/09/2026',
    title: 'Correção de Desempenho e Estabilidade Mobile na Solicitação de Embarque',
    summary: 'Eliminado o erro de recarregamento e crash da aba ("Ah, não! Algo deu errado") no Chrome e Safari Mobile ao preencher formulários de solicitação de embarque.',
    items: [
      {
        category: 'fix',
        title: 'Fim do Erro "Ah, não!" no Mobile',
        description: 'Substituição das datalists nativas do HTML5 por um sistema de sugestões flutuantes leve e de baixo consumo de memória, prevenindo o estouro de memória no teclado virtual do Android e iOS.'
      },
      {
        category: 'improvement',
        title: 'Autocomplete e Autofill Instantâneos',
        description: 'Otimização dos algoritmos de busca do último embarque e dados de motorista/veículo com execução imediata e sem travamentos ao digitar.'
      },
      {
        category: 'improvement',
        title: 'Digitação Fluida e Sem Perda de Dados',
        description: 'Eliminados loops de re-renderização em cascata que apagavam seleções de carroceria/veículo durante a digitação de placas.'
      }
    ]
  },
  {
    id: 'rel_2026_09_20_v2_8_4',
    version: 'v2.8.4',
    date: '20/09/2026',
    title: 'Deploy Automático no Railway: Evolution API 24h na Nuvem Ativada',
    summary: 'Projeto provisionado e conectado na nuvem do Railway com Evolution API, banco Postgres e cache Redis dedicados para disparos de WhatsApp ininterruptos sem necessidade de computador ligado.',
    items: [
      {
        category: 'feature',
        title: 'Servidor Railway Oficial Conectado',
        description: 'Instância da Evolution API em produção online no Railway com banco de dados PostgreSQL e Redis.'
      },
      {
        category: 'security',
        title: 'Chaves e CORS de Produção Configurados',
        description: 'Autenticação de API Key dedicada e liberação de CORS para comunicação segura com o Transcunha.'
      },
      {
        category: 'improvement',
        title: 'Operação 24/7 Garantida',
        description: 'Envios operacionais de fretes, ordens e CT-e agora trafegam diretamente pelo cluster em nuvem.'
      }
    ]
  },
  {
    id: 'rel_2026_09_20_v2_8_3',
    version: 'v2.8.3',
    date: '20/09/2026',
    title: 'WhatsApp 24h & Modo Always-Online: Ativação Permanente e Guia Nuvem',
    summary: 'Implementado o modo Sempre Conectado para operação 24h ininterrupta sem depender de servidor local ou Docker ligado, além de guia integrado para deploy da Evolution API na nuvem (Railway/VPS).',
    items: [
      {
        category: 'feature',
        title: 'Modo Sempre Online / Ativo 24h',
        description: 'Permite manter o canal de WhatsApp da empresa 100% ativo e pronto para emissão de ofertas, ordens, comprovantes e CT-e sem travar dependendo de localhost.'
      },
      {
        category: 'improvement',
        title: 'Guia de Deploy em Nuvem Integrado',
        description: 'Instruções passo a passo adicionadas no modal do Gateway para configurar Evolution API no Railway em poucos cliques.'
      },
      {
        category: 'improvement',
        title: 'Fila Resiliente e Fallback Instantâneo',
        description: 'Tratamento automático de contingência para enfileiramento e confirmação de disparos operacionais diretamente no Supabase.'
      }
    ]
  },
  {
    id: 'rel_2026_09_19_v2_8_2',
    version: 'v2.8.2',
    date: '19/09/2026',
    title: 'Estabilidade Mobile: Correção de Recarregamento e Gestos no Celular',
    summary: 'Correção crítica para aparelhos celulares que impedia o preenchimento de cadastros de cargas e solicitações de embarque devido a recarregamentos automáticos e gestos de rolagem nativos.',
    items: [
      {
        category: 'fix',
        title: 'Bloqueio do Gesto Pull-to-Refresh',
        description: 'Implementado isolamento de overscroll em todos os modais e na aplicação móvel, eliminando o recarregamento acidental ao rolar formulários.'
      },
      {
        category: 'fix',
        title: 'Proteção de Teclado e Submissão Mobile',
        description: 'Tratamento das teclas "Enter" e "Ir" dos teclados virtuais para impedir envios prematuros ou recarga nativa de páginas.'
      },
      {
        category: 'improvement',
        title: 'Segurança de Sessão e Antes de Descarregar',
        description: 'Adicionada proteção de persistência e confirmação de descarregamento durante o preenchimento de ordens e cadastros.'
      }
    ]
  },
  {
    id: 'rel_2026_09_19_v2_8_1',
    version: 'v2.8.1',
    date: '19/09/2026',
    title: 'Sincronização em Tempo Real, Gestão de Logs e Desconexão Flexível de WhatsApp',
    summary: 'Aprimoramento do módulo de WhatsApp com sincronização direta do perfil pareado na Evolution API, botões de exclusão de logs de disparo e opção de desconectar/cancelar disponível em todos os estados de pareamento.',
    items: [
      {
        category: 'improvement',
        title: 'Desconexão e Cancelamento Universal',
        description: 'Disponibilizada a ação de desconectar ou cancelar a sessão tanto no estado conectado quanto durante a leitura do QR Code.'
      },
      {
        category: 'feature',
        title: 'Sincronização Instantânea com Servidor Gateway',
        description: 'Auto-sincronização do status e identificação do número e nome do perfil pareado diretamente pela Evolution API local ou em nuvem.'
      },
      {
        category: 'improvement',
        title: 'Exclusão Individual e Limpeza de Logs',
        description: 'Possibilidade de excluir mensagens específicas da fila de disparos ou limpar todo o histórico de envios com um clique.'
      }
    ]
  },
  {
    id: 'rel_2026_09_19_v2_8_0',
    version: 'v2.8.0',
    date: '19/09/2026',
    title: 'Canal de Integração e Automação de WhatsApp',
    summary: 'Novo módulo completo de mensageria via WhatsApp: pareamento por QR Code, configurador de réguas com tags dinâmicas, fila de envios com rate limiting e suporte a envio de comprovantes, ordens e CT-e em PDF.',
    items: [
      {
        category: 'feature',
        title: 'Módulo Integrado de WhatsApp',
        description: 'Painel completo em Operacional > Canal WhatsApp com monitoramento de status da conexão, pareamento via QR Code, nível de bateria e chave de instância.'
      },
      {
        category: 'feature',
        title: 'Configurador de Réguas & Variáveis Dinâmicas',
        description: 'Editor visual de templates com suporte a tags clicáveis (ex: {{motorista_nome}}, {{origem}}, {{destino}}, {{valor_frete}}, {{numero_carga}}) e simulador em tempo real de balão de mensagem do WhatsApp.'
      },
      {
        category: 'improvement',
        title: 'Fila Resiliente e Envio de Documentos em PDF',
        description: 'Mecanismo de fila de envios com delay humanizado (anti-ban), controle de retentativas automáticas e envio nominal de comprovantes bancários, ordens de carregamento e CT-e.'
      },
      {
        category: 'feature',
        title: 'Ambiente de Homologação e Disparos de Teste',
        description: 'Modal de envio de teste instantâneo para qualquer número de telefone para validação imediata das mensagens e layouts.'
      }
    ]
  },
  {
    id: 'rel_2026_09_19_v2_7_0',
    version: 'v2.7.0',
    date: '19/09/2026',
    title: 'Integração com Google Maps e Auditoria Financeira de Consultas de Risco',
    summary: 'Atalhos interativos para abertura de mapas e rotas diretas no Google Maps, além do cômputo integral de custos tarifados de GR para embarques cancelados e reprovados.',
    items: [
      {
        category: 'feature',
        title: 'Atalhos de Localização e Rota no Google Maps',
        description: 'Ao clicar sobre a cidade de Origem ou Destino nas listas de Oportunidades de Carga e Tabela de Embarques, o sistema abre diretamente o local no Google Maps. A seta indicadora de trajeto (→) permite traçar a rota rodoviária completa com 1 clique.'
      },
      {
        category: 'fix',
        title: 'Custo de Consulta de Risco em Cancelados e Reprovados',
        description: 'Corrigida a apuração na Listagem Operacional de Consultas de Risco e nos demonstrativos de despesas operacionais para que qualquer embarque cancelado ou reprovado compute o custo tarifado da respectiva consulta de GR.'
      },
      {
        category: 'improvement',
        title: 'Métricas de Desperdício Financeiro e Auditoria de GR',
        description: 'Indicadores de desperdício financeiro, perda por cancelamento e rankings de motivos atualizados com a totalização precisa dos valores tarifados pela gerenciadora de risco.'
      }
    ]
  },
  {
    id: 'rel_2026_09_18_v2_6_9',
    version: 'v2.6.9',
    date: '18/09/2026',
    title: 'Atalhos Diretos de Localização e Rota no Google Maps',
    summary: 'Configurados atalhos clicáveis nos campos de Origem e Destino das cargas e embarques para abertura instantânea do local de coleta, entrega e rota no Google Maps.',
    items: [
      {
        category: 'feature',
        title: 'Atalho de Localização para Origem e Destino',
        description: 'Ao clicar sobre a cidade de Origem ou Destino na listagem de oportunidades de carga e na tabela de embarques, o sistema abre diretamente o ponto no Google Maps (respeitando links específicos de mapa, pontos de coleta/entrega ou coordenadas cadastradas).'
      },
      {
        category: 'improvement',
        title: 'Traçado Rápido de Rota',
        description: 'A seta indicadora de trajeto (→) entre as cidades agora permite traçar a rota rodoviária completa da viagem no Google Maps com apenas um clique.'
      }
    ]
  },
  {
    id: 'rel_2026_09_18_v2_6_8',
    version: 'v2.6.8',
    date: '18/09/2026',
    title: 'Contabilização de Custos de Consultas de Risco em Embarques Cancelados e Reprovados',
    summary: 'Aprimoramento no cálculo e exibição de despesas de gerenciamento de risco, garantindo que embarques com status "Reprovado" ou "Cancelado" que tenham uma modalidade de consulta vinculada contabilizem integralmente o custo da consulta tarifada.',
    items: [
      {
        category: 'fix',
        title: 'Custo de Consulta para Reprovados e Cancelados',
        description: 'Corrigida a apuração de valores na Listagem Operacional de Consultas de Risco e nos demonstrativos de despesas operacionais para que qualquer embarque cancelado ou reprovado no GR compute o custo tarifado da respectiva modalidade de consulta.'
      },
      {
        category: 'improvement',
        title: 'Auditoria e Cálculo de Desperdício Financeiro',
        description: 'Métricas de desperdício financeiro, perda por cancelamento e rankings de motivos atualizados com a totalização precisa dos valores tarifados pela gerenciadora de risco.'
      }
    ]
  },
  {
    id: 'rel_2026_09_17_v2_6_7',
    version: 'v2.6.7',
    date: '17/09/2026',
    title: 'Otimização de Espaço e Ampliação de Modais em 20%',
    summary: 'Aumento proporcional de tamanho nas janelas modais de "Automatização do CT-e & Lucro Real" e "Gerenciar Anexos", proporcionando melhor legibilidade e visualização ampliada das tabelas e composições financeiras.',
    items: [
      {
        category: 'improvement',
        title: 'Ampliação do Modal de Automatização do CT-e',
        description: 'Expandida a largura máxima da janela de detalhamento de despesas e apuração tributária (de max-w-2xl para max-w-4xl), permitindo a leitura integral de todos os blocos de crédito, margem e deduções sem truncamento.'
      },
      {
        category: 'improvement',
        title: 'Ampliação do Modal de Gerenciar Anexos',
        description: 'Ampliada a largura proporcional da janela principal de anexos e linha do tempo de etapas (de max-w-5xl para max-w-7xl), oferecendo maior conforto visual para a gestão de documentos e conferência de dados.'
      }
    ]
  },
  {
    id: 'rel_2026_09_17_v2_6_6',
    version: 'v2.6.6',
    date: '17/09/2026',
    title: 'Novo Alerta em Tempo Real para Novas Cargas Cadastradas',
    summary: 'Central de Alertas atualizada para notificar instantaneamente usuários Comercial, Administrador do Sistema, Agenciador e Embarcador sempre que uma nova carga for cadastrada.',
    items: [
      {
        category: 'feature',
        title: 'Alerta Sonoro e Visual de Nova Carga',
        description: 'Notificação instantânea no sino superior exibindo cliente, mercadoria, rota e volume da nova carga, permitindo acesso e navegação rápida direto para o cadastro de cargas.'
      },
      {
        category: 'improvement',
        title: 'Distribuição Inteligente por Perfil',
        description: 'Os alertas de novas cargas são direcionados exclusivamente aos perfis operacionais e comerciais pertinentes (Comercial, Administrador, Agenciador e Embarcador).'
      }
    ]
  },
  {
    id: 'rel_2026_09_17_v2_6_5',
    version: 'v2.6.5',
    date: '17/09/2026',
    title: 'Ajuste de Nomenclatura dos Status Operacionais',
    summary: 'Atualização dos títulos dos status para "Ag. Agend. ou Troca/nfe" e "Valid. de Ticket", trazendo maior clareza visual e adequação aos fluxos operacionais.',
    items: [
      {
        category: 'improvement',
        title: 'Status "Ag. Agend. ou Troca/nfe"',
        description: 'Renomeado o status "Ag. Agendamento" para "Ag. Agend. ou Troca/nfe", refletindo tanto o agendamento no destino quanto a troca de documentação fiscal (NF-e).'
      },
      {
        category: 'improvement',
        title: 'Status "Valid. de Ticket"',
        description: 'Ajustado o título da etapa de validação de pesagem e conferência de comprovante para "Valid. de Ticket" em todas as telas, filtros e linha do tempo.'
      }
    ]
  },
  {
    id: 'rel_2026_09_17_v2_6_4',
    version: 'v2.6.4',
    date: '17/09/2026',
    title: 'Controle de Permissão: Alteração de Preço do Frete Exclusivo para Administrador',
    summary: 'Restrição de segurança para que o reajuste de valores de Frete Motorista e Frete Empresa nos embarques seja executado estritamente por usuários com perfil "Administrador do Sistema".',
    items: [
      {
        category: 'security',
        title: 'Restrição de Acesso no Modal de Alterar Preço',
        description: 'Os campos de reajuste de Frete Motorista e Frete Empresa, bem como o botão de salvar, agora são estritamente bloqueados para qualquer perfil que não seja "Administrador do Sistema".'
      },
      {
        category: 'security',
        title: 'Validação em Camada Dupla e Ações da Tabela',
        description: 'A opção de menu "Alterar Preço" nas listagens de embarque e as rotinas de atualização no sistema passam a exigir validação direta do perfil de Administrador antes da aplicação dos novos valores.'
      }
    ]
  },
  {
    id: 'rel_2026_09_17_v2_6_3',
    version: 'v2.6.3',
    date: '17/09/2026',
    title: 'Novo Status "Validação de Ticket" no Fluxo de Embarques',
    summary: 'Implementação da etapa intermediária "Validação de Ticket" entre "Ag. Descarga" e "Ag. Saldo", com conferência de comprovante, apuração do peso descarregado e bloqueio de segurança para salvar e avançar.',
    items: [
      {
        category: 'feature',
        title: 'Etapa de Validação de Ticket e Pesagem',
        description: 'Criado novo status operacional "Validação de Ticket" após a descarga. Permite aos operadores visualizar o ticket anexado, conferir e ajustar o peso descarregado e acompanhar em tempo real o cálculo de quebra ou sobra.'
      },
      {
        category: 'security',
        title: 'Bloqueio Seguro de Avanço de Status',
        description: 'O botão "Salvar e Avançar" agora permanece bloqueado até que o operador realize a validação formal do ticket e do peso descarregado, garantindo conformidade nos dados antes da liquidação de saldo.'
      },
      {
        category: 'improvement',
        title: 'Integração Completa na Linha do Tempo e Filtros',
        description: 'A nova etapa foi integrada em toda a aplicação, incluindo tabs de filtros, painel Kanban, timeline de etapas e relatórios operacionais.'
      }
    ]
  },
  {
    id: 'rel_2026_09_16_v2_6_2',
    version: 'v2.6.2',
    date: '16/09/2026',
    title: 'Persistência de Documentos Fiscais (CT-e, MDF-e, Carta Frete) e Proteção contra Perda em Reversões',
    summary: 'Correção crítica na preservação de anexos e números fiscais durante trocas de status, avanços concorrentes e reversões de etapas, garantindo que nenhum documento seja perdido.',
    items: [
      {
        category: 'fix',
        title: 'Proteção de Anexos em Reversão de Status',
        description: 'Corrigida a lógica de reversão de etapas para limpar exclusivamente os anexos da etapa cancelada, preservando integralmente os documentos já anexados nas etapas anteriores (CT-e, MDF-e, Carta Frete, etc.).'
      },
      {
        category: 'fix',
        title: 'Sincronização Segura de Documentos Fiscais',
        description: 'Ao anexar comprovantes em etapas subsequentes (ex: adiantamento ou descarga), o sistema agora mescla com o registro mais recente do banco de dados, prevenindo perda de CT-e ou anexos inseridos simultaneamente por outro usuário.'
      },
      {
        category: 'improvement',
        title: 'Restauração Automática de Dados Fiscais',
        description: 'Implementado fallback inteligente para resolução automática do número e data de emissão do CT-e a partir dos anexos gravados, garantindo exibição instantânea no painel e nos relatórios.'
      }
    ]
  },
  {
    id: 'rel_2026_09_16_v2_6_1',
    version: 'v2.6.1',
    date: '16/09/2026',
    title: 'Correção no Cálculo de Saldo para Fretes PJ (ETC)',
    summary: 'Ajustada a regra de apuração do saldo de frete para transportadores e empresas (PJ / ETC), impedindo a dedução indevida de tributos exclusivos de motoristas autônomos (PF / TAC).',
    items: [
      {
        category: 'fix',
        title: 'Cálculo de Saldo de Frete PJ / ETC',
        description: 'Corrigida a identificação de frete PJ na rotina de cálculo de adiantamento e saldo, garantindo que o saldo contratual integral seja preservado sem deduções de INSS/SEST/SENAT de autônomo (ex: embarque FEL-458 atualizado de R$ 2.635,00 para R$ 2.895,60).'
      },
      {
        category: 'improvement',
        title: 'Adiantamento 100% em Fretes TAC (Pessoa Física)',
        description: 'Em embarques com 100% de adiantamento para autônomos (TAC), as retenções de INSS, SEST/SENAT e IRRF são aplicadas diretamente no adiantamento em conta, zerando o saldo e finalizando o embarque diretamente após a etapa de descarga, sem retenção em "Ag. Saldo".'
      }
    ]
  },
  {
    id: 'rel_2026_09_16_v2_6_0',
    version: 'v2.6.0',
    date: '16/09/2026',
    title: 'Histórico Automático de Motoristas, Gestão de Ordens e Validação de Cadastros',
    summary: 'Preenchimento automático inteligente do histórico do motorista em novos embarques, separação de ordens do app vs. fretes, permissões para Gerenciadora de Risco e correções no app.',
    items: [
      {
        category: 'feature',
        title: 'Preenchimento Automático do Histórico de Motoristas',
        description: 'Ao selecionar ou buscar o motorista em Novo Embarque, o sistema localiza o histórico recente e preenche automaticamente placas (cavalo e carretas), documentos, proprietário, ANTT e dados cadastrais.'
      },
      {
        category: 'feature',
        title: 'Separação de Ordens de Motoristas vs. Fretes de Clientes',
        description: 'Notificações e Dashboard agora possuem listas e modais específicos para solicitações do App do Motorista e Ofertas de Clientes, garantindo persistência da solicitação e histórico de recusas.'
      },
      {
        category: 'security',
        title: 'Avanço de Cadastro para Gerenciadora de Risco',
        description: 'O perfil Gerenciadora de Risco agora tem permissão para editar informações e acionar "Salvar e Avançar" diretamente na etapa de Ag. Cadastro.'
      },
      {
        category: 'fix',
        title: 'Correção no Cadastro de Motoristas no App',
        description: 'Eliminado erro de chave duplicada no cadastro do aplicativo, integrando CPFs pré-cadastrados com segurança e IDs exclusivos anti-colisão.'
      },
      {
        category: 'improvement',
        title: 'Motoristas Indicados em Cargas em Andamento',
        description: 'Ação de Motoristas Indicados por DDD e histórico de rotas agora é exclusiva das operações ativas em Operacional > Cargas.'
      }
    ]
  },
  {
    id: 'rel_2026_09_14_v2_5_0',
    version: 'v2.5.0',
    date: '14/09/2026',
    title: 'Visualizador de Acessos, Espelhamento de Usuários, Período e Filtros de CT-e',
    summary: 'Novo visualizador de acessos em subjanela flutuante para administradores, espelhamento de permissões, novos filtros de período e visualização de CT-e em relatórios.',
    items: [
      {
        category: 'feature',
        title: 'Subjanela Flutuante de Acessos em Tempo Real (Admin)',
        description: 'Administradores agora contam com o botão "Acessos" para abrir uma subjanela flutuante sobreposta que espelha exatamente a visão do usuário em tempo real em modo estrito de somente leitura.'
      },
      {
        category: 'feature',
        title: 'Espelhar Acesso de Outro Usuário',
        description: 'Opção de replicar com um clique todo o perfil de permissões e módulos de um usuário existente no cadastro e edição de colaboradores.'
      },
      {
        category: 'feature',
        title: 'Filtro de Período e Atalhos nos Relatórios',
        description: 'Adicionado filtro de período com Data de Início e Data Final no Relatório de Outros, com atalhos de 1 clique (Hoje, Este Mês, Mês Anterior, Últimos 30 dias, Ano Atual).'
      },
      {
        category: 'improvement',
        title: 'Visualização e Filtro por Nº CT-e em Custos Extras',
        description: 'Inclusão da coluna de Nº CT-e na tabela de Custos Extras e Prejuízos Operacionais, exportação em PDF e campo de filtro específico por CT-e.'
      },
      {
        category: 'security',
        title: 'Isolamento de Créditos de Exportação para Agenciadores',
        description: 'Ocultação de créditos fiscais e dados tributários de exportação nos relatórios e painéis para usuários com perfil de Agenciador.'
      }
    ]
  },
  {
    id: 'rel_2026_09_13_v2_4_0',
    version: 'v2.4.0',
    date: '13/09/2026',
    title: 'Atualização de Conformidade ANTT, Agenciamento e Ofertas',
    summary: 'Melhorias nos fluxos de validação de CNPJ da Receita Federal, isolamento do relatório comercial para agenciadores e filtros de ofertas de frete.',
    items: [
      {
        category: 'security',
        title: 'ANTT & Regime Tributário (ETC) 100% Automatizado',
        description: 'Bloqueada a seleção manual do regime tributário de Pessoa Jurídica (ETC). O regime é agora identificado exclusivamente via consulta direta na base oficial da Receita Federal pelo CNPJ.'
      },
      {
        category: 'feature',
        title: 'Relatório Comercial para Agenciadores',
        description: 'Liberada a visualização do Relatório Comercial para o perfil Agenciador, com painel exclusivo e restrito ao faturamento, lucro real e comissões da sua própria agência e equipe vinculada.'
      },
      {
        category: 'improvement',
        title: 'Separação de Ofertas de Frete vs. Solicitações de Ordem',
        description: 'O Histórico de Ofertas de Frete agora lista exclusivamente as ofertas de clientes, separando com precisão as solicitações de carregamento enviadas pelo aplicativo dos motoristas.'
      },
      {
        category: 'feature',
        title: 'Timeline de Etapas em Tempo Real',
        description: 'Embarcadores e Agenciadores agora possuem acesso completo à barra de progresso e timeline em tempo real com o detalhamento de cada etapa e saldo real da carga.'
      },
      {
        category: 'improvement',
        title: 'Otimização das Cargas em Operação',
        description: 'Cargas com status "Sem Programação" e "Suspensas" são ocultadas da listagem principal de operação para focar nos carregamentos ativos.'
      }
    ]
  },
  {
    id: 'rel_2026_09_12_v2_3_0',
    version: 'v2.3.0',
    date: '12/09/2026',
    title: 'Automação de Custos de CTE, Margem e Rastreamento',
    summary: 'Aprimoramento do cálculo de lucro real com abatimento de GR, ICMS, comissões de agenciamento e painel de automação de CTE.',
    items: [
      {
        category: 'feature',
        title: 'Painel de Automação de Custos de CTE',
        description: 'Cálculo dinâmico e automatizado de taxas operacionais, impostos e comissões por faixa de faturamento.'
      },
      {
        category: 'improvement',
        title: 'Controle de Estadias e Saldos Operacionais',
        description: 'Cálculo de margem real em tempo real considerando estadias aprovadas e descontos de quebra.'
      }
    ]
  }
];

export const LATEST_SYSTEM_RELEASE = SYSTEM_RELEASES[0];

const STORAGE_PREFIX = 'transcunha_seen_update_';

/**
 * Verifica se o modal de novidades deve ser exibido para o usuário.
 * Retorna true apenas no primeiro acesso após uma nova atualização.
 */
export const shouldShowUpdateModal = (userId?: string): boolean => {
  if (!userId) return false;
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    const lastSeenId = localStorage.getItem(key);
    return lastSeenId !== LATEST_SYSTEM_RELEASE.id;
  } catch {
    return false;
  }
};

/**
 * Marca a versão atual como visualizada pelo usuário para não reabrir automaticamente.
 */
export const markUpdateAsSeen = (userId?: string, releaseId: string = LATEST_SYSTEM_RELEASE.id): void => {
  if (!userId) return;
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    localStorage.setItem(key, releaseId);
  } catch (err) {
    console.warn('Erro ao salvar status de visualização de atualização:', err);
  }
};
