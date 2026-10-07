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
    id: 'rel_2026_10_06_v2_70_14',
    version: 'v2.70.14',
    date: '06/10/2026',
    title: 'Visualizador de Notas Fiscais, Leitura Automática de Anexos e Dados para Pagamento',
    summary: 'Aprimoramento abrangente no módulo de Notas Fiscais: resolução definitiva da visualização de anexos em tela e em nova aba com Blob URLs; criação de campo para dados de pagamento (Pix, código de barras/linha digitável e conta bancária) ao lado da forma de pagamento; e extração automática instantânea dos dados fiscais do documento anexado (número, série, valor total, fornecedor, CNPJ/CPF e data de emissão).',
    items: [
      {
        category: 'fix',
        title: 'Correção no Visualizador de Documentos e PDFs Anexados',
        description: 'Implementada conversão automática de Data URLs para Blob URLs protegidos contra bloqueios de segurança do navegador, além de botões integrados para abrir em Nova Aba em tela cheia, imprimir e baixar o documento.'
      },
      {
        category: 'feature',
        title: 'Leitura e Extração Automática de Dados da NF',
        description: 'Ao anexar uma Nota Fiscal (PDF, XML ou imagem), o sistema extrai e preenche automaticamente: Número da NF, Série, Valor Total (R$), Razão Social / Nome Fantasia do Fornecedor, CNPJ/CPF, Data de Emissão, Vencimento e dados de pagamento.'
      },
      {
        category: 'feature',
        title: 'Campo "Dados para Pagamento" no Lançamento de NF',
        description: 'Novo campo inserido estrategicamente ao lado de "Forma de Pagamento" para registrar a Chave Pix, Linha digitável/Código de barras do boleto ou dados bancários, com exibição resumida na listagem financeira.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_13',
    version: 'v2.70.13',
    date: '06/10/2026',
    title: 'Correção na Exclusão e Persistência de Notas Fiscais no Módulo Financeiro',
    summary: 'Corrigido comportamento onde notas fiscais excluídas ou a semente de dados de exemplo reapareciam ao recarregar a página. A lista agora preserva estritamente as exclusões do usuário e inicia limpa sem criar lançamentos fictícios indesejados.',
    items: [
      {
        category: 'fix',
        title: 'Persistência Definitiva de Exclusão de Notas Fiscais',
        description: 'Ao excluir notas fiscais lançadas, o estado vazio ou filtrado é salvo com sucesso e mantido sem que notas antigas ou de exemplo voltem após o recarregamento (F5).'
      },
      {
        category: 'improvement',
        title: 'Remoção de Dados Mock e Início Limpo',
        description: 'Remoção definitiva das notas fiscais mock/exemplos em lote da semente de testes (inv_001 a inv_005), garantindo que apenas as notas efetivamente cadastradas pela operação sejam exibidas.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_12',
    version: 'v2.70.12',
    date: '06/10/2026',
    title: 'Ajuste do Frete Motorista: Exclusão do Pedágio e Foco em Conta Bancária',
    summary: 'A coluna e o totalizador do campo "VALOR FRETE MOTORISTA" na Planilha de Controle de Embarques foram reconfigurados para desconsiderar os valores pagos no pedágio (tag/vale-pedágio eletrônico), considerando estritamente os valores creditados e pagos na conta bancária do motorista (adiantamento + saldo em conta).',
    items: [
      {
        category: 'improvement',
        title: 'Exclusão do Pedágio na Coluna Valor Frete Motorista',
        description: 'O valor do frete do motorista em cada linha passa a deduzir o valor do pedágio (s.tollValue), refletindo exclusivamente o frete líquido creditado na conta bancária do transportador.'
      },
      {
        category: 'improvement',
        title: 'Totalizador da Coluna Fiel aos Pagamentos em Conta Bancária',
        description: 'O totalizador fixo no topo da coluna VALOR FRETE MOTORISTA agora soma exatamente o montante desembolsado em conta bancária (PIX/TED), sem duplicar os custos já computados na coluna individual de PEDÁGIO.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_11',
    version: 'v2.70.11',
    date: '06/10/2026',
    title: 'Módulo de Lançamento e Gestão de Notas Fiscais no Financeiro',
    summary: 'Novo painel completo e integrado dentro da janela Financeiro dedicado ao controle, lançamento e auditoria de Notas Fiscais (serviços, produtos, compras de bens e despesas em geral). O módulo traz anexo direto de arquivos com visualizador integrado, classificação por natureza e centro de custos com cadastro rápido inline, vinculação a usuários/responsáveis internos e relatórios analíticos gerenciais com exportação CSV e impressão.',
    items: [
      {
        category: 'feature',
        title: 'Lançamento e Anexo Direto de Arquivos de NF',
        description: 'Upload e visualização instantânea de documentos de Notas Fiscais (PDF ou imagem), com captura de número da NF, série, fornecedor, CNPJ/CPF, valor total, datas de emissão/vencimento/pagamento, chave de acesso e forma de pagamento.'
      },
      {
        category: 'feature',
        title: 'Classificação por Natureza e Centros de Custo com Cadastro Rápido',
        description: 'Categorização entre Prestação de Serviço, Aquisição de Produto, Compra de Bem e Outras Despesas. Permite cadastrar novos centros de custo e tipos de despesa em tempo real via modais inline sem interromper o fluxo de preenchimento.'
      },
      {
        category: 'feature',
        title: 'Vinculação Obrigatória de Responsável / Usuário Interno',
        description: 'Cada lançamento é obrigatoriamente associado ao colaborador interno (Embarcador, Agenciador, Operador, etc.) que solicitou ou gerou o custo, garantindo rastreabilidade e governança financeira total.'
      },
      {
        category: 'feature',
        title: 'Relatórios Analíticos Gerenciais e Exportação',
        description: 'Painel analítico consolidado com distribuição de custos por responsável interno, centros de custo, natureza e fornecedores, acompanhado de KPIs em tempo real, exportação para CSV e impressão formatada de relatórios.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_10',
    version: 'v2.70.10',
    date: '06/10/2026',
    title: 'Filtros com Múltipla Seleção Estilo Excel na Planilha de Controle',
    summary: 'Os filtros das 61 colunas da planilha de controladoria agora suportam seleção múltipla simultânea com painel interativo no estilo Excel e Google Sheets. É possível filtrar por múltiplos valores, buscar termos no popup, marcar ou desmarcar todos com um clique e identificar rapidamente filtros aplicados pelo contador numérico.',
    items: [
      {
        category: 'feature',
        title: 'Seleção Múltipla de Valores por Coluna',
        description: 'Permite selecionar vários valores simultaneamente em cada coluna, com checkboxes individuais, opção "(Selecionar Tudo)", detecção de células vazias/zeradas como "(Vazios)" e filtragem combinada com as demais colunas.'
      },
      {
        category: 'feature',
        title: 'Painel Popover Interativo com Busca e Ações Rápidas',
        description: 'Cada coluna conta com um botão disparador que abre um painel com campo de pesquisa para encontrar itens rapidamente em listas extensas, botões "Marcar Todos", "Desmarcar Todos" e "Limpar Filtro".'
      },
      {
        category: 'improvement',
        title: 'Indicadores Visuais e Usabilidade de Planilha Avançada',
        description: 'O botão de filtro indica visualmente quando está ativo com badge de contagem de itens selecionados, fechamento automático ao clicar fora ou pressionar ESC, e posicionamento responsivo inteligente para colunas à direita da planilha.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_9',
    version: 'v2.70.9',
    date: '06/10/2026',
    title: 'Filtros Dinâmicos na Planilha de Controle e Código ATUA Obrigatório no Embarque',
    summary: 'Os filtros das 61 colunas da planilha de controladoria agora oferecem seleção dinâmica com lista suspensa contendo exatamente os valores presentes nas linhas. Na tela de Embarques e no modal de detalhes, o Código ATUA do motorista é exibido em destaque à frente do seu nome. Além disso, ao solicitar novo embarque para motoristas sem código prévio, o preenchimento do Código ATUA torna-se obrigatório, persistindo a informação no embarque e no perfil do motorista.',
    items: [
      {
        category: 'feature',
        title: 'Filtros de Colunas Dinâmicos por Opções Selecionáveis',
        description: 'Cada coluna da planilha de controladoria conta com seletor (dropdown) que lista dinamicamente todos os valores únicos existentes nas linhas da tabela (formatados adequadamente em moedas, percentuais, números e textos), com indicação de contagem de opções e destaque visual quando ativo.'
      },
      {
        category: 'feature',
        title: 'Código ATUA em Destaque na Frente do Nome do Motorista',
        description: 'Tanto na tabela desktop de Embarques quanto nos cards mobile e no modal de detalhes do embarque, o Código ATUA cadastrado em Ag. Cadastro é exibido em uma tag destacada [CÓDIGO ATUA] na frente do nome do motorista, permitindo busca rápida pelo código na barra de pesquisa.'
      },
      {
        category: 'improvement',
        title: 'Código ATUA Obrigatório ao Solicitar Novo Embarque',
        description: 'Ao cadastrar ou selecionar um motorista na solicitação de novo embarque que ainda não possua o Código ATUA (cadastrado antes da regra), o campo Código ATUA é exigido e destacado. Caso o motorista já possua código no sistema ou histórico de embarques, o campo é preenchido automaticamente com indicador de vínculo.'
      },
      {
        category: 'fix',
        title: 'Correção de Inicialização do Formatador Monetário nos Filtros',
        description: 'Corrigida a ordem de inicialização da função formatCurrency na Planilha de Controle, eliminando o ReferenceError durante o cálculo em tempo de execução das opções dos seletores de filtro.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_8',
    version: 'v2.70.8',
    date: '06/10/2026',
    title: 'Planilha de Controladoria: Refinamento dos Campos de Impostos e Deduções',
    summary: 'As colunas de ICMS, Débito PIS/COFINS, Crédito PIS/COFINS, Patronal 4% e INSS / SEST SENAT na Planilha de Embarques foram refinadas para sincronização direta e fidedigna com os campos do sistema e documentos: ICMS Destacado no CT-e, Imposto Federal apurado na Composição das Deduções, Crédito Gerado (Exportação / Manual), INSS Patronal / CPRB (4% s/ Frete Motorista líq. pedágio) e Cláusula 3.5.3 (-) Desconto SEST/SENAT lida da Carta Frete.',
    items: [
      {
        category: 'improvement',
        title: 'Sincronização precisa de Imposto Federal e Crédito Gerado',
        description: 'A coluna DÉBITO PIS/COFINS passa a refletir exatamente o campo Imposto Federal (respeitando isenção de exportação, alíquota Simples de 3,40%, PF de 3,655% e PJ de 9,25%, além de edição manual). A coluna CRÉDITO PIS/COFINS reflete fielmente o card Crédito Gerado (automático ou edição manual).'
      },
      {
        category: 'improvement',
        title: 'ICMS Destacado e INSS Patronal / CPRB',
        description: 'A coluna ICMS puxa o ICMS Destacado apurado no CT-e/XML e a coluna PATRONAL 4% extrai a retenção oficial de INSS Patronal / CPRB de 4% sobre o frete motorista sem pedágio para motoristas PF/TAC.'
      },
      {
        category: 'feature',
        title: 'Leitura direta da Cláusula 3.5.3 (-) Desconto SEST/SENAT',
        description: 'A coluna INSS / SEST SENAT passa a extrair prioritariamente o campo 3.5.3 (-) Desconto SEST/SENAT identificado na leitura do documento Carta Frete, com fallback automático no cálculo de retenção fiscal de 2,5% sobre a base do TAC.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_7',
    version: 'v2.70.7',
    date: '05/10/2026',
    title: 'Planilha de Controladoria: Paleta Original do Excel com Alto Contraste em Modo Claro',
    summary: 'A Planilha de Embarques (Controladoria) agora reproduz fielmente a paleta de cores original da planilha oficial do Excel (OneDrive). No Modo Claro, as linhas assumem o característico preenchimento azul (#00a8e5), com texto preto encorpado de altíssimo contraste sobre o azul, preenchimento verde floresta (#005c00) para Transcunha com texto amarelo, preenchimento amarelo (#e2d308) para agência Rafael, laranja (#ea580c) para Filial SP, status SIM em amarelo ouro vibrante, RECEBIDO em lilás, deduções/descontos em vermelho vivo, fretes destacados em amarelo e boletos/pix em verde.',
    items: [
      {
        category: 'feature',
        title: 'Fidelidade visual à Planilha Original do Excel',
        description: 'Preenchimento azul clássico de planilha (#00a8e5) nas linhas de dados com linhas de grade nítidas e textos pretos bem definidos para máxima legibilidade.'
      },
      {
        category: 'improvement',
        title: 'Cores de preenchimento e tipografia com contraste dedicado',
        description: 'Destaque automático de filiais (Transcunha em verde floresta com amarelo, Rafael em amarelo ouro com preto, Filial SP em laranja), status já faturado SIM em amarelo ouro, pagamentos em verde, impostos e deduções em vermelho vivo e totais de destaque em amarelo.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_6',
    version: 'v2.70.6',
    date: '05/10/2026',
    title: 'Planilha de Controladoria: Modo Escuro e Claro Independente',
    summary: 'Adicionada a funcionalidade de alternar a Planilha de Embarques (Controladoria) entre Modo Claro (estilo planilha clássica, fundo branco e alto contraste) e Modo Escuro independente do tema global do sistema, com persistência automática da preferência do usuário.',
    items: [
      {
        category: 'feature',
        title: 'Alternância independente de Modo Escuro / Claro',
        description: 'Botão de alternância com ícone de Sol e Lua disponível na barra de ações e no topo da visualização em Tela Cheia (Maximizar). Permite visualizar a planilha com tema claro e limpo ou tema escuro navy sem alterar o restante do sistema.'
      },
      {
        category: 'improvement',
        title: 'Persistência e adaptação completa de estilos',
        description: 'Cores de linhas alternadas, cabeçalhos, bordas, filtros de coluna, badges de status, inputs e totais foram adaptados para máxima legibilidade tanto no tema claro quanto no escuro, memorizando sua preferência via navegador.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_5',
    version: 'v2.70.5',
    date: '05/10/2026',
    title: 'Relatório por Cliente: Correção na apuração de embarques por período (Ex: Organis Nazário 40 -> 37)',
    summary: 'Corrigido o filtro de período em ReportsPage e Desempenho por Cliente (ClientReport). Embarques agendados em 30/09 cujo CT-e foi emitido em 01/10 (CEL-631, CEL-640 e FEL-644) estavam sendo contabilizados indevidamente no mês de setembro devido à verificação secundária por scheduledDate. Com a regra estrita de cteEmissionDate, a contagem de setembro foi corrigida com precisão matemática (ex: de 40 para 37 embarques em Organis Nazário).',
    items: [
      {
        category: 'fix',
        title: 'Exclusividade estrita da data de emissão do CT-e no filtro de período',
        description: 'A função isShipmentInPeriod agora valida exclusivamente a data de emissão do CT-e quando o embarque possui CT-e emitido. Embarques como CEL-631 (CT-e 2059), CEL-640 (CT-e 2054) e FEL-644 (CT-e 2055), agendados para 30/09/2026 mas com emissão fiscal em 01/10/2026, pertencem estritamente a outubro e não constam mais em setembro.'
      },
      {
        category: 'improvement',
        title: 'Sincronização de métricas e listagem por filial/CNPJ',
        description: 'Tanto os cards de resumo geral quanto as tabelas detalhadas por cliente e filiais (ex: ORGANIS NAZARIO) refletem fielmente os embarques faturados no período selecionado, sem distorção na virada de mês.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_4',
    version: 'v2.70.4',
    date: '05/10/2026',
    title: 'Faturamento e Relatórios: Contabilização estrita na data de emissão do CT-e',
    summary: 'Corrigido o critério de apuração temporal em todos os relatórios e faturamentos do sistema para que embarques com CT-e emitido sejam contabilizados estritamente no dia da emissão do CT-e (cteEmissionDate). Embarques com agendamento/embarque no final do mês anterior (ex: 29/30 de setembro) cujos CT-es foram emitidos no mês seguinte (ex: 01/10 - CTE 2056 e CTE 2053) pertencem exclusivamente ao faturamento do mês da emissão (outubro), não constando mais no mês de setembro.',
    items: [
      {
        category: 'fix',
        title: 'Faturamento contabilizado estritamente na data de emissão do CT-e',
        description: 'No ReportsPage (Relatórios de Clientes, Embarcadores, Vendedores e Comercial), o filtro de período passa a utilizar exclusivamente a data de emissão do CT-e (cteEmissionDate) quando o embarque possui CT-e emitido, eliminando a inclusão indevida por data de agendamento em meses anteriores.'
      },
      {
        category: 'fix',
        title: 'Planilha de Controladoria (Controle de Embarques) e 1º Resultado alinhados',
        description: 'Na planilha de controladoria (ControlShipmentsTab) e no DRE do 1º Resultado (FirstResultTab), a filtragem por mês, dia e período customizado prioriza estritamente a data de emissão do CT-e (cteEmissionDate) sobre a data de agendamento, garantindo que o faturamento reflita fielmente o dia da emissão fiscal.'
      },
      {
        category: 'improvement',
        title: 'Suporte robusto a formatos de datas fiscais (D/M/AAAA)',
        description: 'Os utilitários parseDateToYmd, formatFiscalDateTime e extractCteEmissionDateFromText foram aprimorados para reconhecer e normalizar perfeitamente datas com um ou dois dígitos (ex: 1/10/2026 e 01/10/2026), evitando falhas de conversão para o padrão ISO (AAAA-MM-DD).'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_3',
    version: 'v2.70.3',
    date: '05/10/2026',
    title: 'Fix definitivo: pedágio indevido em embarques sem pedágio (CEL-631)',
    summary: 'O pedágio do CEL-631 voltava a aparecer mesmo após ser zerado, porque o painel de custos do CT-e relia os documentos a cada abertura e regravava o valor capturado incorretamente. A leitura, a sincronização e os cálculos agora respeitam o pedágio zerado do embarque.',
    items: [
      {
        category: 'fix',
        title: 'Leitura de pedágio nos documentos mais precisa',
        description: 'O leitor de documentos agora entende textos como "SEM PEDÁGIO", "PEDÁGIO: ISENTO/NÃO HÁ" e "R$ 0,00" como pedágio zero. Ele também não pega mais valores de outros campos (frete total, adiantamento, saldo, NF) que aparecem na mesma linha, e descarta pedágios iguais ao frete total ou ao adiantamento.'
      },
      {
        category: 'fix',
        title: 'Pedágio zerado não é mais sobrescrito',
        description: 'O painel de automatização de custos do CT-e, o modal de anexos e a sincronização em lote não substituem mais um pedágio zerado do embarque por um valor lido automaticamente.'
      },
      {
        category: 'fix',
        title: 'Cálculos usam o pedágio oficial do embarque',
        description: 'O cálculo de despesas operacionais (INSS Patronal, CIOT), o relatório de Lucro Real e o painel do CT-e passam a usar o pedágio cadastrado no embarque, inclusive quando ele é R$ 0,00. Valores antigos guardados nos documentos não são mais usados no lugar dele.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_2',
    version: 'v2.70.2',
    date: '05/10/2026',
    title: 'Relatórios PDF: Adicionada coluna com número do CT-e',
    summary: 'Os relatórios exportados em formato PDF agora incluem expressamente uma coluna com o número do CT-e emitido para cada embarque listado, facilitando a conciliação fiscal e auditoria dos fretes.',
    items: [
      {
        category: 'improvement',
        title: 'Coluna "CT-e" adicionada aos relatórios PDF',
        description: 'Adicionada a coluna "CT-e" em destaque logo após o ID do embarque nos PDFs do Relatório de Clientes (Consolidado e por Filial/CNPJ) e do Relatório de Embarcadores (Geral e Listagem Modal). Os relatórios de Lucro Real, Outros e Agência/Comercial já contavam com a coluna.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_1',
    version: 'v2.70.1',
    date: '05/10/2026',
    title: 'Relatório de Desempenho por Cliente: Apenas embarques com CT-e emitido',
    summary: 'O relatório de Desempenho por Cliente (cards de Total de Embarques, Volume Total, Faturamento Bruto, Lucro Operacional e a tabela de detalhamento por CNPJ/Filial) agora considera exclusivamente embarques que possuem CT-e emitido/anexado, alinhando os números em tela com os relatórios gerenciais e PDF.',
    items: [
      {
        category: 'improvement',
        title: 'Filtragem por CT-e nas métricas e tabelas de Clientes e Embarcadores',
        description: 'No ClientReport, as métricas consolidadas (Total de Embarques, Volume, Faturamento e Lucro) e o detalhamento por CNPJ/Filial passam a validar estritamente hasCteAttached(shipment) e status não cancelado. O mesmo critério foi estendido para a listagem modal de embarques e para os relatórios de Embarcadores, Vendedores e Filiais.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_70_0',
    version: 'v2.70.0',
    date: '05/10/2026',
    title: 'Relatórios PDF: Exibição exclusiva de embarques com CT-e emitido',
    summary: 'Todos os relatórios do sistema com exportação para PDF (Relatório de Clientes e Filiais, Relatório de Embarcadores, Relatório Detalhado por Agência, Lucro Real, Outros e Previsão de Demandas) foram configurados para considerar estritamente registros de embarques que possuem CT-e anexado/emitido.',
    items: [
      {
        category: 'improvement',
        title: 'Filtro de CT-e obrigatório para Relatórios PDF',
        description: 'As rotinas de geração de PDF em ClientReport (Geral e Modal), ShipperReport (Geral e Modal), SupervisorReport (Listagem de Agência), RealProfitReport, OthersReport e DemandForecastReport agora validam a existência do CT-e emitido através de hasCteAttached / getShipmentCte, garantindo que embarques sem CT-e não entrem nos relatórios e totais dos documentos PDF gerados.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_69_1',
    version: 'v2.69.1',
    date: '05/10/2026',
    title: 'Fix: Pedágio indevido removido do embarque CEL-631',
    summary: 'O embarque CEL-631 estava exibindo R$ 652,75 de pedágio indevidamente. O valor estava armazenado no campo documents.valor_pedagio, puxado pela cascata de fallback do operationalExpensesCalculator. O campo foi zerado diretamente no banco de dados.',
    items: [
      {
        category: 'fix',
        title: 'Pedágio do CEL-631 corrigido para R$ 0,00',
        description: 'O campo documents.valor_pedagio do embarque CEL-631 foi zerado. O tollValue principal já era 0, mas a cascata de fallback (shipment.tollValue || realProfitData.toll || documents.toll_value || documents.valor_pedagio) estava capturando o valor R$ 652,75 de documents.valor_pedagio, exibindo pedágio indevido nos cálculos operacionais e financeiros.'
      }
    ]
  },
  {
    id: 'rel_2026_10_05_v2_69_0',
    version: 'v2.69.0',
    date: '05/10/2026',
    title: 'Revert: Paleta de Cores da Tabela de Embarques Restaurada ao Padrão Anterior',
    summary: 'A paleta de cores aplicada na versão v2.68.0 (estilo planilha Excel) foi revertida. A tabela de embarques voltou ao visual padrão dark/light do sistema: cabeçalho cinza (bg-gray-50/bg-gray-700), linhas brancas/dark (bg-white/bg-gray-800) com hover sutil, e as variáveis CSS --primary, --accent restauradas aos valores originais (#0B66E4, #0284C7). As classes CSS de planilha (sheet-thead, sheet-tbody, sheet-row, etc.) foram removidas do CSS global.',
    items: [
      {
        category: 'fix',
        title: 'Paleta da tabela de embarques revertida ao design padrão',
        description: 'O thead voltou a usar bg-gray-50/dark:bg-gray-700 com texto text-gray-500/dark:text-gray-300. O tbody voltou a usar bg-white/dark:bg-gray-800 com divisores divide-gray-200/dark:divide-gray-700 e hover hover:bg-gray-50/dark:hover:bg-gray-700.'
      },
      {
        category: 'fix',
        title: 'Variáveis CSS --primary e --accent restauradas',
        description: 'As variáveis globais foram restauradas: --primary: #0B66E4, --primary-dark: #0047AB, --accent: #0284C7, --accent-dark: #0369A1. As variáveis --sheet-* foram removidas.'
      },
      {
        category: 'fix',
        title: 'Classes CSS de paleta planilha removidas do index.css',
        description: 'Todo o bloco de estilos .sheet-thead, .sheet-tbody, .sheet-row, .sheet-table, .badge-sheet-*, .sheet-value-* foi removido do index.css, limpando o CSS global.'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_68_0',
    version: 'v2.68.0',
    date: '04/10/2026',
    title: 'Paleta de Cores da Tabela de Embarques Atualizada — Padrão Planilha Excel',
    summary: 'A tabela de embarques (desktop) agora utiliza a mesma paleta de cores da planilha oficial de Carregamento Transcunha. Cabeçalho em azul escuro (#0070C0), linhas em azul claro (#d0ecfa/#b8e3f8) com hover em azul médio (#8dd0f5), bordas em azul céu (#00B0F0). O CSS global foi atualizado com as variáveis e classes da nova paleta.',
    items: [
      {
        category: 'improvement',
        title: 'Cabeçalho da tabela em azul escuro (#0070C0)',
        description: 'O thead da tabela desktop de embarques passou a usar fundo azul escuro com texto branco em bold e uppercase, idêntico ao cabeçalho da planilha Excel de referência.'
      },
      {
        category: 'improvement',
        title: 'Linhas alternadas em tons de azul claro',
        description: 'As linhas ímpares recebem #d0ecfa e as pares #b8e3f8, replicando o padrão visual azul da planilha. Hover destaca a linha em #8dd0f5.'
      },
      {
        category: 'improvement',
        title: 'Bordas e divisores em azul céu (#00B0F0)',
        description: 'Os separadores de células e linhas agora usam o azul céu (#00B0F0), igual às bordas da grade da planilha Excel.'
      },
      {
        category: 'improvement',
        title: 'Variáveis CSS globais atualizadas',
        description: 'As variáveis --primary, --accent e as novas variáveis --sheet-* foram adicionadas ao :root do index.css para permitir consistência da paleta em todo o sistema.'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_67_8',
    version: 'v2.67.8',
    date: '04/10/2026',
    title: 'Sincronização dos Campos de Impostos & Deduções da Planilha com a Automatização do CT-e',
    summary: 'Os 7 campos da seção "Impostos & Deduções" da Planilha de Controladoria agora usam exatamente a mesma hierarquia de fontes e lógica de cálculo do painel "Automatização do CT-e" de cada embarque. Elimina divergências entre os valores exibidos na planilha e os calculados no painel fiscal.',
    items: [
      {
        category: 'fix',
        title: 'FRETE BRUTO EMPRESA prioriza realProfitData.companyFreight',
        description: 'Antes calculava sempre peso × tarifa local. Agora prioriza o valor salvo em realProfitData.companyFreight (mesma fonte principal do painel CT-e), com fallback ao cálculo local apenas se não houver valor salvo.'
      },
      {
        category: 'fix',
        title: 'ICMS lê também documents.icms_value e icmsValue',
        description: 'Antes lia apenas realProfitData.icmsDifference. Agora usa a mesma hierarquia do painel: icmsDifference > documents.icms_value > icmsValue, garantindo que o ICMS destacado no CT-e seja sempre refletido.'
      },
      {
        category: 'fix',
        title: 'DÉBITO PIS/COFINS respeita flag isFederalTaxManual',
        description: 'Quando o fiscal edita manualmente o Imposto Federal no painel CT-e (isFederalTaxManual = true), a planilha agora exibe o valor manual, lendo da mesma cadeia: realProfitData.federalTax > federalTax > documents.federal_tax > documents.imposto_federal.'
      },
      {
        category: 'fix',
        title: 'CRÉDITO PIS/COFINS respeita flag isGeneratedCreditManual',
        description: 'Quando o crédito gerado é editado manualmente (isGeneratedCreditManual = true), a planilha exibe o valor manual via realProfitData.generatedCredit > generatedCredit > documents.generated_credit > documents.credito_gerado.'
      },
      {
        category: 'improvement',
        title: 'PATRONAL 4% recalculado igual ao painel CT-e',
        description: 'Agora calcula 4% × (Frete Motorista − Pedágio) para motoristas PF/TAC e retorna R$ 0,00 para PJ/ETC, espelhando exatamente a lógica do CteCostAutomationPanel.'
      },
      {
        category: 'improvement',
        title: 'INSS/SEST SENAT e VL. CIOT com base de cálculo unificada',
        description: 'Ambos os campos usam calculateTacTaxDeductions para PF/TAC com a mesma base líquida de pedágio + deduções do panel, garantindo que os valores da planilha batam com o painel fiscal do embarque.'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_67_7',
    version: 'v2.67.7',
    date: '04/10/2026',
    title: 'Alinhamento do Filtro de Período no Relatório com a Planilha (CT-e Virada de Mês)',
    summary: 'Corrigido o filtro de período em filteredShipments na página de Relatórios para usar o mesmo critério inteligente da Planilha de Controladoria: inclui embarques cujo CT-e foi emitido OU cuja data agendada está no período. Resolve o caso do CEL-662 (CTE 2051 emitido em 30/09 para um embarque de 01/10), fazendo relatório e planilha apresentarem 18 embarques com CT-e.',
    items: [
      {
        category: 'fix',
        title: 'Relatório contava 17 CT-e, Planilha contava 18 (CEL-662)',
        description: 'O embarque CEL-662 (CTE 2051) tinha data de emissão fiscal em 30/09/2026 16:08 mas estava agendado para 01/10/2026. O filtro anterior do Relatório usava apenas a data de emissão do CT-e, excluindo o CEL-662 de outubro. Agora usa critério smart: CT-e emitido OU agendado no período, alinhando com a Planilha de Controladoria.'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_67_6',
    version: 'v2.67.6',
    date: '04/10/2026',
    title: 'Esclarecimento e Transparência nos Contadores de Embarques (Relatório vs Planilha)',
    summary: 'Investigação confirmou que a diferença de contagem entre o Relatório (28) e a Planilha de Controladoria (18 com CT-e) era esperada e correta: o Relatório conta TODOS os embarques do período (incluindo os sem CT-e, programados e cancelados), enquanto a Planilha filtra apenas embarques com CT-e fiscal emitido. O card de Embarques no Relatório foi aprimorado para exibir o breakdown transparente: total, com CT-e (efetivados), programados (aguardando) e cancelados.',
    items: [
      {
        category: 'improvement',
        title: 'Breakdown do Card "Embarques" no Relatório',
        description: 'O card de KPI de Embarques agora exibe: total no período + quantos possuem CT-e emitido (efetivados, contados na planilha) + quantos estão programados (sem CT-e ainda) + quantos foram cancelados. Elimina ambiguidade entre os 28 do relatório e os 18 com CT-e da planilha.'
      },
      {
        category: 'fix',
        title: 'Análise da Diferença 28 (Relatório) vs 18 (Planilha com CT-e)',
        description: 'Confirmado por inspeção no banco: os 28 do relatório incluem 4 cancelados, 7 programados/ag. carregamento e 17 com CT-e. A planilha corretamente exibe 18 com CT-e (o CEL-662 com CTE 2051 emitido em 30/09 entra pelo filtro inteligente, pois o embarque está agendado em outubro).'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_67_5',
    version: 'v2.67.5',
    date: '04/10/2026',
    title: 'Congelamento da Coluna CT-e, Navegação com Setas e Filtro Inteligente de Período',
    summary: 'Trava horizontal (sticky) das colunas de identificação e CT-e na rolagem da planilha de embarques, suporte total à navegação de células via teclado com as setas e resolução do filtro de período para contemplar os 28 embarques com CT-e emitidos no ciclo de fechamento.',
    items: [
      {
        category: 'feature',
        title: 'Coluna "CTE" Fixa e Congelada na Rolagem Lateral',
        description: 'As colunas de índice (#), ID do Sistema e número do CT-e agora ficam fixas no lado esquerdo da planilha durante a rolagem horizontal, com background sólido e sombra divisória de alto contraste, garantindo leitura contínua e sem sobreposição.'
      },
      {
        category: 'feature',
        title: 'Seleção de Células e Navegação por Teclado',
        description: 'Possibilidade de clicar em qualquer célula da planilha para selecioná-la e navegar livremente utilizando as setas do teclado (Cima, Baixo, Esquerda, Direita), Tab, Shift+Tab, Home, End, PageUp e PageDown, com auto-scroll e destaque visual.'
      },
      {
        category: 'improvement',
        title: 'Critério de Data Inteligente para CT-e (28 vs 13 Embarques)',
        description: 'Adicionado filtro por data de emissão do CT-e e opção inteligente (CT-e ou Embarque no período), garantindo que viagens com CT-e emitido no mês corrente ou no ciclo recente (28 embarques ativos) sejam visualizadas com total clareza, com contador exibindo viagens no período vs total geral.'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_67_4',
    version: 'v2.67.4',
    date: '04/10/2026',
    title: 'Destaque Retroativo de ICMS (12%) e Recálculo de Lucro Real na Carga #253',
    summary: 'Destaque e apuração de ICMS de 12% nos 6 embarques vinculados à carga #253 (CRG-253), com dedução no frete líquido da empresa, apuração do spread comercial real, atualização dos impostos federais (9,25% s/ spread PJ), despesas operacionais e recálculo da comissão de agência sobre o resultado líquido real.',
    items: [
      {
        category: 'fix',
        title: 'Destaque de ICMS (12% CT-e) nos Embarques da Carga #253',
        description: 'Lançado o valor de ICMS de 12% (conferido diretamente nos DACTEs oficiais) em todos os embarques da carga #253 (MUR-647, MUR-648, MUR-649, MUR-650, MUR-651 e MUR-652), abatendo o imposto destacado no frete líquido e integrando-o às despesas operacionais.'
      },
      {
        category: 'improvement',
        title: 'Recálculo Automatizado do Lucro Real e Comissões',
        description: 'Spread comercial, Imposto Federal e comissão de agência (30%) recalculados automaticamente com base no frete líquido pós-ICMS, com persistência no banco Supabase e histórico auditado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_04_v2_67_3',
    version: 'v2.67.3',
    date: '04/10/2026',
    title: 'Ajuste de Vinculação Precisa do Comprovante de Descarga na Planilha',
    summary: 'Aperfeiçoamento da busca e extração de documentos na coluna "TICKET DESCARGA" da planilha de embarques, garantindo que o atalho puxe exatamente o "Comprovante de Descarga" anexado ao embarque com prioridade máxima e filtre com rigor documentos de etapas anteriores (carregamento, adiantamentos e pagamentos).',
    items: [
      {
        category: 'fix',
        title: 'Atalho da Planilha para o Comprovante de Descarga',
        description: 'Configurada a resolução precisa na coluna "TICKET DESCARGA" para priorizar especificamente a chave "Comprovante de Descarga" e fotos com identificador de descarga (JPEG, PNG, WEBP, PDF), ignorando tickets de carregamento ou comprovantes de adiantamento/saldo.'
      },
      {
        category: 'improvement',
        title: 'Normalização Segura de URLs e Nomes de Arquivo',
        description: 'Aprimorado o visualizador e normalizador de URLs para rejeitar strings de status ("SIM", "NÃO", etc.), recuperar o caminho público correto no Supabase Storage e abrir o arquivo preservando o nome original e ferramentas de zoom, rotação e download.'
      }
    ]
  },
  {
    id: 'rel_2026_10_03_v2_67_2',
    version: 'v2.67.2',
    date: '03/10/2026',
    title: 'Atalhos de Documentos (Ticket de Descarga, CTE e OC TMS) e Nova Coluna VL. CIOT',
    summary: 'Configuração de links e atalhos dinâmicos com abertura imediata de documentos anexados (Ticket de Descarga, CT-e e Ordem de Carregamento TMS no canto superior esquerdo dos cards e colunas da planilha) com tratamento de documentos ausentes, além da inclusão da nova coluna "VL. CIOT" na seção de Impostos & Deduções.',
    items: [
      {
        category: 'feature',
        title: 'Atalho Dinâmico para Ticket de Descarga',
        description: 'Na coluna "TICKET DESCARGA", os registros tornaram-se botões clicáveis que abrem diretamente o comprovante/documento de descarga anexado ao embarque em nova aba com ferramentas de visualização, impressão e download, com aviso amigável caso não esteja anexado.'
      },
      {
        category: 'feature',
        title: 'Atalho Direto para o PDF do CT-e',
        description: 'Na coluna "CTE", cada registro com CT-e passa a abrir o documento/PDF oficial do CT-e anexado em nova aba ao ser clicado, agilizando conferências fiscais.'
      },
      {
        category: 'feature',
        title: 'Gatilho de Ordem de Carregamento (OC TMS) no Canto Superior Esquerdo',
        description: 'Conforme especificado, o número identificador do embarque (#ID/Ordem) no canto superior esquerdo de cada card no Kanban/Board e na planilha aciona instantaneamente a abertura do PDF da Ordem de Carregamento (OC TMS).'
      },
      {
        category: 'fix',
        title: 'Suporte Completo para Fotos de Tickets de Descarga (Girar 90°, Zoom e Impressão)',
        description: 'Ajustada a abertura de tickets de descarga para suportar fotos tiradas por motoristas (JPEG, PNG, WEBP, HEIC) sem forçar extensão .pdf. O visualizador agora renderiza imagens instantaneamente (sem travar em CORS), incluindo botões interativos para Girar 90°, Zoom +, Zoom -, Redefinir Zoom, Imprimir e Baixar.'
      },
      {
        category: 'feature',
        title: 'Nova Coluna VL. CIOT em Impostos e Deduções',
        description: 'Adicionada a coluna "VL. CIOT" na seção de Impostos & Deduções da planilha de controladoria, calculando a taxa de 0,20% sobre a base líquida de frete do motorista (abatendo pedágio e retenções previdenciárias quando TAC/PF) e integrando o totalizador na barra fixa superior.'
      }
    ]
  },
  {
    id: 'rel_2026_10_03_v2_67_1',
    version: 'v2.67.1',
    date: '03/10/2026',
    title: 'Planilha de Controladoria: Saldo do Pedido com Volume Total Lançado na Carga',
    summary: 'Ajuste na coluna "SALDO PEDIDO" da planilha de controladoria de embarques para exibir com fidelidade o saldo total em toneladas que foi lançado/contratado na carga (totalVolume), eliminando distorções de arredondamento e subtrações flutuantes. Inclui formatação numérica refinada e tooltip com detalhamento completo.',
    items: [
      {
        category: 'improvement',
        title: 'Exibição do Saldo Total Lançado na Carga',
        description: 'A coluna SALDO PEDIDO passa a refletir fielmente o saldo total em toneladas cadastrado/lançado na carga (totalVolume), permitindo conferência imediata do volume total da ordem.'
      },
      {
        category: 'fix',
        title: 'Eliminação de Flutuações Decimais',
        description: 'Eliminadas casas decimais excessivas geradas por subtrações de ponto flutuante, formatando os valores de forma padronizada e legível em toneladas.'
      },
      {
        category: 'improvement',
        title: 'Tooltip com Balanço Operacional Completo',
        description: 'Ao posicionar o mouse sobre a célula, é exibido o detalhamento com Volume Total Lançado, Volume Carregado e Saldo Restante a carregar.'
      }
    ]
  },
  {
    id: 'rel_2026_10_03_v2_67_0',
    version: 'v2.67.0',
    date: '03/10/2026',
    title: 'Dashboard: Relatórios Padrão para Efetivados do Mês e Filtro Temporal com Calendário',
    summary: 'Configuração padrão inicial do Dashboard para consolidar relatórios, tonelagens, comissões e ranking exclusivamente de embarques efetivados do mês corrente. Adicionado novo componente interativo com ícone de calendário no topo do Dashboard para filtragem por períodos predefinidos (Mês Atual, Esta Semana, Hoje, Este Ano, Todos) e intervalos personalizados com seleção de datas específicas.',
    items: [
      {
        category: 'feature',
        title: 'Padrão Inicial: Apenas Embarques Efetivados do Mês Atual',
        description: 'Os relatórios de Toneladas Efetivadas, Comissões, Volume Carregado por Cliente e Ranking de Solicitantes agora iniciam padronizados filtrando exclusivamente embarques efetivados (com CT-e emitido ou status carregado/finalizado) dentro do mês corrente.'
      },
      {
        category: 'feature',
        title: 'Filtro por Calendário e Períodos Específicos no Cabeçalho',
        description: 'Adicionado botão elegante com ícone de calendário no cabeçalho do Dashboard permitindo filtrar instantaneamente por Este Mês (Padrão), Esta Semana, Hoje, Este Ano, Todos os Períodos ou Intervalo Personalizado com campos de Data Inicial e Data Final.'
      },
      {
        category: 'improvement',
        title: 'Atualização Dinâmica dos Títulos e Ranking de Solicitantes',
        description: 'Os títulos dos cards e gráficos refletem dinamicamente o período ativo selecionado no calendário, e o ShipperRankingCard agora recalcula volume, quantidade e ticket médio respeitando o filtro de datas aplicado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_66_1',
    version: 'v2.66.1',
    date: '02/10/2026',
    title: 'Linha Fixa de Totais no Topo da Planilha de Controladoria',
    summary: 'Transferência da linha de totais acumulados para a parte superior da planilha (fixada diretamente no thead abaixo dos cabeçalhos das colunas), permitindo conferência imediata e permanente de Pedágio, Peso (ton), Frete Bruto Empresa, ICMS, PIS/COFINS, Patronal, INSS/SEST SENAT, Frete Motorista, Valor da NF, Adiantamentos e Saldo Restante.',
    items: [
      {
        category: 'improvement',
        title: 'Posicionamento dos Totais no Topo (Header Sticky)',
        description: 'A linha ∑ TOTAIS agora reside no topo da tabela, logo abaixo dos títulos de colunas e antes dos filtros. Fica permanentemente visível durante toda a rolagem vertical sem poluir o rodapé.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_66_0',
    version: 'v2.66.0',
    date: '02/10/2026',
    title: 'Planilha da Controladoria: Rolagem Contínua e Filtro Padrão da Semana Atual',
    summary: 'Remoção definitiva da quebra de páginas (paginação em blocos de 50) na planilha de controladoria de embarques, passando a exibir todas as linhas continuamente com rolagem fluida. Configurado como padrão inicial o filtro por data da semana atual, garantindo visualização imediata de todas as viagens e faturamentos da semana em andamento.',
    items: [
      {
        category: 'improvement',
        title: 'Remoção da Quebra de Páginas (Rolagem Contínua)',
        description: 'Eliminada a paginação estática (1/9, anterior/próxima e seletor por página). Agora todas as linhas correspondentes ao filtro temporal selecionado são renderizadas continuamente de ponta a ponta na tabela com indexação sequencial perfeita (1, 2, 3...).'
      },
      {
        category: 'feature',
        title: 'Filtro Inicial Padrão: Semana Atual',
        description: 'A planilha de controladoria agora inicia automaticamente trazendo os embarques da semana corrente (segunda a domingo), permitindo alternar instantaneamente para Hoje, Mês, Ano, Período Customizado ou Todos os Embarques.'
      },
      {
        category: 'improvement',
        title: 'Novo Rodapé Informativo de Período e Rolagem',
        description: 'Adicionada barra informativa no rodapé indicando a quantidade de embarques exibidos, o total existente na base e badge visual do período ativo com status de rolagem contínua.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_65_0',
    version: 'v2.65.0',
    date: '02/10/2026',
    title: 'Sincronização em Tempo Real dos Dashboards e Modo TV 24/7 com Recarga de Segurança',
    summary: 'Aprimoramento completo da infraestrutura em tempo real via Supabase Realtime (WebSockets) com propagação instantânea de status, anexos e movimentação de colunas nos Dashboards Fiscal e Financeiro. Implementado mecanismo de recarga de segurança periódica a cada 15 minutos para monitores dedicados operando 24/7 com prevenção de memory leak e restauração automática do Modo TV.',
    items: [
      {
        category: 'feature',
        title: 'Mecanismo de Recarga de Segurança a Cada 15 Minutos (Modo TV)',
        description: 'Implementado ciclo de 15 minutos (900s) que realiza Hard Refresh automático para descarregar o heap de memória e conexões WebSockets do navegador em painéis de TV 24/7, prevenindo travamentos. O Modo TV conta com persistência automática (sessionStorage) que reabre a tela em Fullscreen e rolagem automática sem qualquer intervenção humana.'
      },
      {
        category: 'improvement',
        title: 'Sincronização Instantânea via WebSockets (Realtime Refinado)',
        description: 'Garantida a atualização em milissegundos dos cartões nos painéis Kanban ao ocorrer qualquer alteração de status, avanço de etapa, upload de anexos ou edição de dados em embarques e cargas, aplicando merge resiliente de estado sem necessidade de F5 manual.'
      },
      {
        category: 'feature',
        title: 'Indicador Visual Dinâmico de Conexão e Botão de Sincronização Rápida',
        description: 'O badge "TEMPO REAL" agora reflete o estado real da rede (Verde: Conectado e Ativo; Âmbar: Reconectando; Vermelho: Offline com reconexão em 1 clique), exibindo a hora da última sincronização, contagem regressiva para a próxima limpeza de segurança e botão de revalidação manual instantânea.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_64_0',
    version: 'v2.64.0',
    date: '02/10/2026',
    title: 'Conformidade de CIOT, SEST/SENAT e Saldo Líquido com a Carta Frete',
    summary: 'Ajuste da extração, sincronização e exibição do SEST/SENAT (base previdenciária TAC de 20% s/ frete s/ pedágio), número do CIOT ANTT e saldo líquido contratual para refletir com exatidão os valores oficiais impressos na Carta Frete (CT-e 2041).',
    items: [
      {
        category: 'fix',
        title: 'Cálculo e Preenchimento Exato do SEST/SENAT (R$ 23,82 no CT-e 2041)',
        description: 'Corrigido o cálculo do SEST/SENAT para motoristas TAC/PF aplicando a alíquota legal de 2,5% sobre a base fiscal previdenciária (20% do frete contratual abatido o pedágio), eliminando divergências e sincronizando perfeitamente os R$ 23,82 da Carta Frete.'
      },
      {
        category: 'feature',
        title: 'Exibição do Código Oficial ANTT do CIOT na Planilha',
        description: 'A coluna CIOT da planilha de controle agora exibe com clareza o número do CIOT homologado pela ANTT (ex: 5200352430756629) extraído da Carta Frete/Declaração de Operação de Transporte, mantendo no detalhamento a taxa bancária calculada.'
      },
      {
        category: 'fix',
        title: 'Conformidade do Saldo Contratual e Retenções Fiscais',
        description: 'Garantida a integridade do saldo contratual líquido a receber (R$ 369,72 no CT-e 2041) abatendo corretamente o INSS (R$ 82,80) e SEST/SENAT (R$ 23,82) do saldo original de R$ 476,34 conforme Cláusula 3.5 da Carta Frete.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_63_0',
    version: 'v2.63.0',
    date: '02/10/2026',
    title: 'Cadastro do Nº do Pedido, Tipo de Embalagem e Ajuste de Produto na Planilha',
    summary: 'Inclusão do campo Número do Pedido no cadastro de carga com sincronização na Ordem de Carregamento e coluna Nº PEDIDO, exibição do produto real na coluna PRODUTO e preenchimento da embalagem da carga (Granel, Bigbag, Sacos) na coluna TIPO da planilha de controladoria.',
    items: [
      {
        category: 'feature',
        title: 'Nº do Pedido no Cadastro de Carga e Ordem de Carregamento',
        description: 'Adicionada a opção de informar o "Nº do Pedido (Cliente / Embarcador)" durante o cadastro de novas cargas, sendo impresso na Ordem de Carregamento (PDF) e preenchido na coluna "Nº PEDIDO" da planilha.'
      },
      {
        category: 'feature',
        title: 'Tipo de Embalagem (Granel, Bigbag, Sacos)',
        description: 'Adicionado seletor/campo de embalagem (Granel, Bigbag, Sacos, Granel / Caçamba, etc.) no cadastro da carga, refletindo diretamente na coluna "TIPO" ao lado de Produto e na Ordem de Carregamento.'
      },
      {
        category: 'improvement',
        title: 'Nome Real do Produto na Coluna PRODUTO',
        description: 'A coluna PRODUTO da planilha de controle agora realiza o cruzamento com a base de produtos para exibir a denominação comercial real da mercadoria cadastrada na carga em vez de identificadores internos.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_62_0',
    version: 'v2.62.0',
    date: '02/10/2026',
    title: 'Ajustes das Colunas de Liberação, Remetente, Código ATUA e Enquadramento ANTT',
    summary: 'Configuração aprimorada das colunas da planilha de controle de embarques da controladoria: registro de data e hora reais de avanço com comprovante para saldo e adiantamento, renomeação de CARREGAR EMPRESA para REMETENTE, campo CODG. ATUA em Ag. Cadastro e ENQUADRAMENTO ANTT com base no Regime Tributário.',
    items: [
      {
        category: 'feature',
        title: 'Horários Reais de Liberação de Adiantamento e Saldo',
        description: 'As colunas HORA/DATA LIBER. ADIANT e HORA/DATA LIBER. SALDO agora capturam e exibem a data e hora exatas em que o comprovante foi anexado e o embarque avançou de etapa no sistema.'
      },
      {
        category: 'feature',
        title: 'Campo CODG. ATUA na Etapa de Cadastro',
        description: 'Ao anexar o Comprovante de Cadastro em "Ag. Cadastro", foi adicionado um campo para informar o "CODG. ATUA", que é persistido no banco de dados e exibido na coluna correspondente da planilha.'
      },
      {
        category: 'improvement',
        title: 'Coluna REMETENTE',
        description: 'A coluna CARREGAR EMPRESA foi renomeada para REMETENTE, mantendo a identificação do carregador da carga.'
      },
      {
        category: 'improvement',
        title: 'Coluna ENQUADRAMENTO ANTT pelo Regime Tributário',
        description: 'A coluna PF/PJ OBS CAVALO ANTT foi renomeada para ENQUADRAMENTO ANTT e agora reflete fielmente o Regime Tributário informado no embarque (Simples Nacional, Lucro Real, Lucro Presumido, MEI, PF/TAC).'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_61_0',
    version: 'v2.61.0',
    date: '02/10/2026',
    title: 'Integração do Valor da NF-e (Mercadoria) na Planilha de Controle de Embarques',
    summary: 'A coluna "VALOR DA NF" na planilha de controle de embarques da controladoria agora puxa e exibe automaticamente o valor da Nota Fiscal / mercadoria (ex: R$ 5.592,12), sincronizado diretamente com o painel de custos automatizados do CT-e e com os documentos fiscais importados.',
    items: [
      {
        category: 'feature',
        title: 'Valor da NF-e Exibido na Planilha',
        description: 'A coluna VALOR DA NF puxa o valor monetário real da mercadoria / NF-e do embarque e do cálculo de Lucro Real, formatado em moeda brasileira e com destaque visual.'
      },
      {
        category: 'improvement',
        title: 'Mapeamento e Fallback Inteligente de Documentos',
        description: 'Sincronização abrangente entre nfeValue, realProfitData.invoiceValue, nfe_value e valor_mercadoria extraídos automaticamente do XML dos documentos fiscais.'
      },
      {
        category: 'improvement',
        title: 'Rastreamento e Persistência do Valor da NF',
        description: 'Adicionado suporte ao nfeValue no histórico de alterações do embarque, banco de dados Supabase e atualizações em lote.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_60_0',
    version: 'v2.60.0',
    date: '02/10/2026',
    title: 'Remoção das Colunas Redundantes CTE e Controle em Frete & Acerto Motorista',
    summary: 'Exclusão das colunas duplicadas CTE e Controle do setor "Frete & Acerto Motorista", liberando espaço horizontal na planilha de controle de embarques da controladoria.',
    items: [
      {
        category: 'improvement',
        title: 'Remoção de Colunas Duplicadas',
        description: 'Excluídas as colunas CTE e CONTROLE do setor de Frete & Acerto Motorista, uma vez que o número do CT-e e data/hora de emissão já são apresentados nas colunas dedicadas de abertura.'
      },
      {
        category: 'improvement',
        title: 'Reajuste do Cabeçalho de Frete & Acerto Motorista',
        description: 'O banner do setor "Frete & Acerto Motorista" foi ajustado para ocupar 5 colunas, mantendo a simetria perfeita da grade.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_59_0',
    version: 'v2.59.0',
    date: '02/10/2026',
    title: 'Integração do Valor Financeiro do CIOT (0,20% s/ Frete Motorista) na Planilha de Controle',
    summary: 'A coluna CIOT na planilha de controle de embarques da controladoria agora puxa e exibe automaticamente o valor financeiro real do CIOT (0,20% sobre o frete do motorista abatido pedágio e deduções TAC/PF), exatamente como calculado no card de custos da automatização do CT-e, com suporte ao código cadastrado.',
    items: [
      {
        category: 'feature',
        title: 'Coluna CIOT com Valor Financeiro Calculado',
        description: 'A coluna CIOT agora puxa o valor monetário real do CIOT do embarque (0,20% sobre o frete motorista abatido o pedágio e encargos PF), formatado em moeda (ex: R$ 14,34) e com destaque visual.'
      },
      {
        category: 'improvement',
        title: 'Detecção de Código e Valor nos Detalhes',
        description: 'Ao passar o mouse sobre a célula de CIOT, exibe-se tanto o valor monetário quanto o número do CIOT cadastrado no embarque ou extraído dos documentos.'
      },
      {
        category: 'fix',
        title: 'Eliminação de Códigos Internos no Campo CIOT',
        description: 'Removida a atribuição incorreta que exibia o ID interno do embarque (ex: CEL-665) na coluna CIOT.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_58_0',
    version: 'v2.58.0',
    date: '02/10/2026',
    title: 'Otimização de Espaço Horizontal e Quebra dos Títulos das Colunas em 2 Linhas',
    summary: 'Redução e padronização da largura das colunas que continham espaço vazio excessivo, com quebra inteligente dos títulos dos cabeçalhos em duas linhas para economizar espaço horizontal e permitir a visualização de mais colunas simultaneamente.',
    items: [
      {
        category: 'improvement',
        title: 'Quebra de Títulos em 2 Linhas nos Cabeçalhos',
        description: 'Os títulos das colunas agora quebram naturalmente em até duas linhas sem forçar a expansão horizontal desnecessária da tabela.'
      },
      {
        category: 'improvement',
        title: 'Redução e Padronização da Largura das Colunas',
        description: 'Colunas como ID do Embarque, CT-e, Já Faturado, Datas, Formas de Pagamento e Status foram compactadas para eliminar espaços ociosos e maximizar a densidade de dados.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_57_0',
    version: 'v2.57.0',
    date: '02/10/2026',
    title: 'Aumento de Destaque Visual e Contraste nos Cabeçalhos da Controladoria',
    summary: 'Novo layout premium de alto contraste para o cabeçalho da planilha de embarques da controladoria, com gradientes harmoniosos para os setores operacionais, tipografia mais imponente e cabeçalhos de colunas nítidos.',
    items: [
      {
        category: 'improvement',
        title: 'Banners dos Setores com Gradientes e Alto Destaque',
        description: 'Os títulos de setores operacionais receberam gradientes refinados, maior altura, tipografia em caixa alta destacada e divisórias nítidas.'
      },
      {
        category: 'improvement',
        title: 'Cabeçalhos de Colunas com Alto Contraste e Tipografia Black',
        description: 'A linha de colunas agora possui contraste aprimorado tanto no tema escuro quanto no tema claro, com fontes 11px em negrito pesado (font-black), indicadores de ordenação vibrantes e linhas de filtro modernizadas.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_56_0',
    version: 'v2.56.0',
    date: '02/10/2026',
    title: 'Exclusão Automática de Embarques Cancelados na Planilha da Controladoria',
    summary: 'A planilha da controladoria financeira agora filtra e descarta automaticamente os embarques cancelados, garantindo que apenas fretes e documentos ativos façam parte do faturamento, cobrança e acertos.',
    items: [
      {
        category: 'fix',
        title: 'Ocultação de Embarques Cancelados por Padrão',
        description: 'Embarques cancelados (como WEB-400, WEB-279, etc.) que possuíam registros de CT-e gerados antes do cancelamento foram removidos da visualização operacional padrão.'
      },
      {
        category: 'improvement',
        title: 'Filtro de Status com Opção Específica para Cancelados',
        description: 'A opção "Status: Todos (Ativos)" exibe estritamente cargas em trânsito ou finalizadas, disponibilizando a opção "Cancelado" apenas para consultas pontuais de auditoria.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_55_0',
    version: 'v2.55.0',
    date: '02/10/2026',
    title: 'Separação das Colunas CTE e Data/Hora de Emissão e Ordenação Decrescente por CTE',
    summary: 'Organização automática das linhas da planilha pelo número de CT-e em ordem decrescente, criação da nova coluna "DATA/HORA DE EMISSÃO" e exibição limpa do número do documento na coluna "CTE".',
    items: [
      {
        category: 'improvement',
        title: 'Coluna "CTE" com Apenas o Número do Documento',
        description: 'O cabeçalho foi alterado para "CTE" e o valor agora exibe puramente o número do CT-e de forma limpa, elegante e destacada.'
      },
      {
        category: 'feature',
        title: 'Nova Coluna "DATA/HORA DE EMISSÃO"',
        description: 'Coluna dedicada adicionada logo ao lado do CT-e exibindo separadamente a data e hora oficial de emissão vinculada ao documento.'
      },
      {
        category: 'improvement',
        title: 'Ordenação Padrão por CT-e Decrescente',
        description: 'As linhas da planilha da controladoria passam a ser organizadas por padrão pelo número de CT-e em ordem decrescente com comparação numérica precisa.'
      }
    ]
  },
  {
    id: 'rel_2026_10_02_v2_54_0',
    version: 'v2.54.0',
    date: '02/10/2026',
    title: 'Padronização da Quantidade de Eixos por Conjunto Veicular na Controladoria',
    summary: 'A coluna "EIXO" do setor Tomador, Rota & Pesagem agora traduz e exibe com exatidão a quantidade de eixos do veículo vinculado ao embarque, seguindo a matriz operacional de conjuntos veiculares e basculantes.',
    items: [
      {
        category: 'feature',
        title: 'Matriz Oficial de Eixos por Conjunto Veicular',
        description: 'Mapeamento automático: Rodotrem/Rodotrem 3x3 (9 eixos), Bitrem 8e (8 eixos), Bitrem 7e/Cavalo 4e/Carreta 4e (7 eixos), LS Trucada/Vanderleia (6 eixos), LS Simples (5 eixos), Bitruck (4 eixos) e Caminhão Truck (3 eixos).'
      },
      {
        category: 'improvement',
        title: 'Visualização Clara e Subtítulo de Modelo',
        description: 'Exibição da quantidade de eixos em destaque com indicação compacta do modelo do conjunto veicular, integrando à exportação Excel e aos filtros.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_53_0',
    version: 'v2.53.0',
    date: '01/10/2026',
    title: 'Recuperação e Amarração de Origem e Destino para Embarques Órfãos',
    summary: 'Identificação e resolução de embarques sem cidade de origem e destino na planilha de controladoria. A carga vinculada (CRG-253) foi restaurada no banco de dados com base nas Ordens de Carregamento oficiais do TMS, associando Pratápolis/MG a Salto de Pirapora/SP e eliminando pontos soltos na rota.',
    items: [
      {
        category: 'fix',
        title: 'Restauração da Carga CRG-253 no Banco de Dados',
        description: 'Recriação da carga de Gesso da Mineração Morro Verde / Massari (Pratápolis, MG → Salto de Pirapora, SP), vinculando-a aos embarques MUR-647 até MUR-652.'
      },
      {
        category: 'improvement',
        title: 'Tratamento Resiliente de Rotas e Destinos',
        description: 'Eliminação de caracteres pontuais provisórios (.) no campo de rota com fallback inteligente para trajetos diretos e cálculo de quilometragem rodoviária (416 km).'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_52_0',
    version: 'v2.52.0',
    date: '01/10/2026',
    title: 'Cálculo de KM de Distância entre Cidade de Origem e Cidade de Destino',
    summary: 'A coluna "KM DISTÂNCIA" do setor Tomador, Rota & Pesagem agora calcula e apresenta com exatidão a quilometragem rodoviária entre a cidade de origem e a cidade de destino de cada embarque, acompanhada da indicação clara do trajeto direto.',
    items: [
      {
        category: 'fix',
        title: 'Remoção de Pontos e Cadeias Excessivas de Cidades',
        description: 'Eliminação de pontos soltos (.) e de sequências com múltiplos waypoints intermediários na coluna de distância, focando exclusivamente na relação Origem x Destino.'
      },
      {
        category: 'feature',
        title: 'Cálculo Rodoviário Automático de KM',
        description: 'Integração de matriz de coordenadas logísticas com cálculo de sinuosidade rodoviária (ex: Lagamar, MG → Nazário, GO: 464 km; Monte Belo, MG → Cubatão, SP: 358 km; Catalão, GO → Sacramento, MG: 245 km).'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_51_0',
    version: 'v2.51.0',
    date: '01/10/2026',
    title: 'Adequação da Forma de Pagamento ao Padrão do Cliente (Pix, Boleto, Transferência Bancária)',
    summary: 'A coluna "FORMA DE PAGAMENTO" do setor de Faturamento & Recebimento Empresa foi reestruturada para refletir exclusivamente a modalidade de liquidação do cliente (Boleto, Pix ou Transferência Bancária), com seleção rápida e interativa na própria planilha.',
    items: [
      {
        category: 'fix',
        title: 'Mapeamento Fiel da Modalidade do Cliente',
        description: 'Substituição das modalidades de pagamento do motorista (ex: PIX - E-FRETE) pelas formas oficiais de recebimento do cliente/tomador: Boleto, Pix e Transferência Bancária.'
      },
      {
        category: 'feature',
        title: 'Seletor Interativo e Persistência de Modalidade',
        description: 'Inclusão de dropdown seletor estilizado diretamente na célula da planilha com persistência automática de escolha por embarque.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_50_0',
    version: 'v2.50.0',
    date: '01/10/2026',
    title: 'Exibição Exclusiva de Embarques com CT-e na Planilha de Controladoria',
    summary: 'A planilha de controladoria agora filtra e exibe nativamente apenas os embarques que possuem CT-e emitido, formatando a numeração oficial na coluna "CTE E HORAS" e disponibilizando um botão de alternância rápida na barra de ferramentas.',
    items: [
      {
        category: 'feature',
        title: 'Filtro Automático de Embarques com CT-e',
        description: 'A planilha carrega por padrão apenas os registros com CT-e emitido e válido, eliminando linhas provisórias que exibiam o ID do embarque.'
      },
      {
        category: 'improvement',
        title: 'Botão de Controle "Apenas com CT-e"',
        description: 'Novo botão na barra de ferramentas indicando a quantidade total de embarques com CT-e emitido e permitindo alternar a visualização a qualquer momento.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_49_0',
    version: 'v2.49.0',
    date: '01/10/2026',
    title: 'Exibição Correta do Embarcador Solicitante na Planilha de Controladoria',
    summary: 'A coluna SOLICITANTE da planilha de controladoria agora resolve dinamicamente o nome completo do Embarcador ou Agenciador Solicitante vinculado a cada embarque (via embarcadorId, createdById, cadastro de usuários e clientes), eliminando o fallback genérico.',
    items: [
      {
        category: 'fix',
        title: 'Resolução Dinâmica do Embarcador Solicitante',
        description: 'A coluna SOLICITANTE busca e exibe o nome real do usuário solicitante (ex: Felipe Miguel de Paula Eduardo, Rafael Tarantelli, Webert Diniz, Celso Pucci Godoy) com base no cadastro de usuários e clientes do sistema.'
      },
      {
        category: 'fix',
        title: 'Alinhamento Rigoroso de Tipagem TypeScript (Cargo & Shipment)',
        description: 'Correção de acessos a propriedades no mapeamento da planilha: substituição de referências como companyFreightValuePerTon, driverFreightType, riskReleaseCode e cálculo de saldo do pedido.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_48_0',
    version: 'v2.48.0',
    date: '01/10/2026',
    title: 'Integração Nativa da Planilha da Controladoria com Data Binding em Tempo Real',
    summary: 'Implementação da arquitetura oficial de 61 colunas da planilha do OneDrive vinculadas diretamente às tabelas operacionais e financeiras do sistema (shipments, cargos, clients, drivers). Os dados operacionais agora preenchem automaticamente todas as colunas com recálculo instantâneo de KPIs, filtros rápidos de período (Dia, Semana, Mês, Ano e Calendário) e exportação Excel.',
    items: [
      {
        category: 'feature',
        title: 'Mapeamento Completo de 61 Colunas Oficiais',
        description: 'Estruturação dos 10 setores de negócio com data binding automático a partir das tabelas nativas de embarques, fretes e cadastros.'
      },
      {
        category: 'improvement',
        title: 'Preenchimento Automático em Tempo de Execução',
        description: 'Sincronização imediata: qualquer alteração de frete, peso, status ou adiantamento no sistema reflete instantaneamente na planilha.'
      },
      {
        category: 'feature',
        title: 'Filtro Avançado com Calendário Personalizado',
        description: 'Suporte a filtros rápidos por Dia, Semana, Mês, Ano e seletor com calendário de data inicial e final.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_47_0',
    version: 'v2.47.0',
    date: '01/10/2026',
    title: 'Reset Completo da Planilha da Controladoria para Novo Recomeço',
    summary: 'Limpeza de todos os dados legados e reset do código do módulo de planilha para início de uma nova implementação do zero.',
    items: [
      {
        category: 'improvement',
        title: 'Reset de Código e Storage',
        description: 'Componente da Planilha limpo e estruturado para receber a nova modelagem de dados, colunas e funcionalidades.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_46_0',
    version: 'v2.46.0',
    date: '01/10/2026',
    title: 'Filtro Avançado de Períodos: Hoje (Dia), Semana, Mês, Anual e Calendário Personalizado (Início e Fim)',
    summary: 'Implementação de novo sistema completo de filtragem temporal por períodos na Planilha da Controladoria, com suporte a filtros rápidos (Hoje, Esta Semana, Este Mês, Este Ano) e seletor com calendário interativo para escolha de faixas de datas personalizadas (Início e Fim).',
    items: [
      {
        category: 'feature',
        title: 'Filtros Rápidos por Período',
        description: 'Adicionados botões e seletor para filtragem instantânea por Dia (Hoje), Semana Atual, Mês Atual e Ano Atual, recalculando automaticamente os KPIs de frete bruto, custo motorista e margem.'
      },
      {
        category: 'feature',
        title: 'Calendário Personalizado com Início e Fim',
        description: 'Interface interativa com seleção de Data Inicial (Início) e Data Final (Fim), com badge de status, botão de limpeza rápida e integração total com os dados da planilha.'
      },
      {
        category: 'improvement',
        title: 'Análise Resiliente de Datas Brasileiras e Horários',
        description: 'Motor de interpretação de datas aprimorado para aceitar formatos DD/MM/AAAA, DD/MM/AA, strings compostas "CTE - DD/MM/AA - HH:mm", números de série do Excel e timestamps ISO com máxima precisão.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_45_0',
    version: 'v2.45.0',
    date: '01/10/2026',
    title: 'Eliminação Definitiva do Cache Residual (540 Registros), Tombstone de Exclusão e Suporte à Importação com Overlay',
    summary: 'Diagnóstico aprofundado e resolução definitiva das duas falhas reportadas: remoção do cache legado no localStorage que forçava a restauração de 540 linhas fantasmas após recarregar a página excluída, inclusão de tombstone de exclusão explícita, correção do reset do input de arquivo permitindo re-seleção contínua e inclusão de modal de carregamento para importação de 16.819 registros.',
    items: [
      {
        category: 'fix',
        title: 'Eliminação do Cache Fantasma no localStorage',
        description: 'Identificado que chaves legadas no localStorage mantinham 540 linhas residuais na inicialização síncrona. O sistema agora elimina totalmente o armazenamento de linhas no localStorage, operando 100% via IndexedDB sem risco de ressuscitar dados antigos.'
      },
      {
        category: 'security',
        title: 'Tombstone de Exclusão Permanente',
        description: 'Ao confirmar a exclusão da planilha, o sistema grava um marcador persistente de exclusão. Ao atualizar a página (F5), a tabela permanece 100% vazia (0 registros), garantindo que nada reapareça até que uma nova planilha seja importada pelo usuário.'
      },
      {
        category: 'feature',
        title: 'Reset do Seletor & Overlay Visual de Importação',
        description: 'Corrigido o manipulador do input de arquivo para permitir selecionar o mesmo arquivo repetidas vezes. Implementado overlay com indicador de progresso e spinner enquanto os mais de 16.800 registros são processados e gravados no banco local.'
      },
      {
        category: 'improvement',
        title: 'Normalização Completa de Abas com Espaços',
        description: 'O analisador de planilhas agora trata espaços em branco nos nomes das abas (ex: "Planilha Carregamento Geral ") e extrai diretamente os 16.819 registros válidos sem perdas.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_44_0',
    version: 'v2.44.0',
    date: '01/10/2026',
    title: 'Proteção Absoluta do Master Dataset (16.819 Registros), Priorização Inteligente de Abas e Armazenamento do Buffer Original',
    summary: 'Correção definitiva da queda do volume de dados para 543 registros após recarregamento. O sistema agora prioriza automaticamente a aba TESTE DAVI e a aba com maior volume de dados, protege os 16.819 registros em cofre blindado Master no IndexedDB (impedindo que abas secundárias menores sobrescrevam os dados principais) e armazena o buffer binário bruto para troca fluida de abas sem perda de dados.',
    items: [
      {
        category: 'fix',
        title: 'Priorização Inteligente da Aba Principal (TESTE DAVI)',
        description: 'Eliminado o comportamento em que a aba secundária "Planilha Carregamento Geral" (543 linhas) era selecionada no lugar da aba principal (16.819 linhas). O analisador agora inspeciona todas as abas e seleciona automaticamente a aba de maior volume de dados operacionais.'
      },
      {
        category: 'security',
        title: 'Cofre Blindado Master Dataset no IndexedDB',
        description: 'Os 16.819 registros agora residem em um armazenamento mestre protegido. Mesmo que o usuário navegue ou altere para uma aba secundária com menos linhas (ex: 543), os 16.819 registros permanecem inviolados e nunca são rebaixados ou perdidos ao recarregar a página.'
      },
      {
        category: 'feature',
        title: 'Persistência do Buffer Binário XLSX',
        description: 'O arquivo original da planilha é salvo no IndexedDB, viabilizando navegação entre diferentes abas e recarregamentos da aplicação sem necessidade de reimportar o arquivo do computador.'
      },
      {
        category: 'improvement',
        title: 'Permanência Garantida sem Exclusão Acidental',
        description: 'Conforme solicitado, os registros permanecem salvos de maneira perpétua no sistema operacional e nuvem, sendo removidos exclusivamente se o usuário clicar no botão "Excluir Planilha" com confirmação.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_43_0',
    version: 'v2.43.0',
    date: '01/10/2026',
    title: 'Persistência Permanente via IndexedDB, Ordem por Emissão Recente e Exportação Segura',
    summary: 'Resolução definitiva da falha de página não encontrada (404) no recarregamento da planilha, implementação de armazenamento resiliente em IndexedDB capaz de manter mais de 16.000 registros sem perda de dados, ordenação padrão por emissão de embarque (o mais recente sempre no topo) e otimização da exportação Excel/CSV com proteção contra congelamentos.',
    items: [
      {
        category: 'fix',
        title: 'Correção de Rota e Erro 404 no Vercel',
        description: 'Eliminado o conflito de normalização cleanUrls no servidor de borda do Vercel, permitindo que a rota direta /financial?tab=control-shipments seja recarregada ou acessada sem cair em tela de erro 404.'
      },
      {
        category: 'improvement',
        title: 'Armazenamento Ilimitado via IndexedDB',
        description: 'Substituído o limite restritivo de 5MB do LocalStorage por banco de dados IndexedDB no navegador. Agora planilhas com mais de 16.800 linhas e 58 colunas são gravadas permanentemente, sobrevivendo a recarregamentos, fechamentos e exportações sem nenhuma perda de campos.'
      },
      {
        category: 'feature',
        title: 'Ordem por Emissão: Último Embarque Sempre o Primeiro',
        description: 'A planilha agora organiza automaticamente todas as linhas pela data de emissão de embarque (decrescente). O último embarque cadastrado ou emitido aparece sempre na primeira linha do topo, seguido pelas emissões subsequentes em ordem decrescente, inclusive ao importar novas planilhas.'
      },
      {
        category: 'improvement',
        title: 'Exportação Otimizada e Não-Bloqueante',
        description: 'Processamento de exportação em Array of Arrays (AOA) com feedback visual de carregamento (spinner), evitando que o navegador congele ou caia durante a geração de arquivos pesados com dezenas de milhares de células.'
      },
      {
        category: 'feature',
        title: 'Formatação Padronizada da Coluna CTE E HORAS',
        description: 'Ajustada a exibição e geração do campo CTE E HORAS para o modelo unificado: [NÚMERO CT-e] - [DATA EMISSÃO DD/MM/AA] - [HORÁRIO HH:mm] (ex: 1999 - 29/09/26 - 08:00), unindo o identificador fiscal e a estampa de data/hora em uma única informação clara e legível.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_42_0',
    version: 'v2.42.0',
    date: '01/10/2026',
    title: 'Coluna Exclusiva "ID EMBARQUE SISTEMA" e Sincronização em Tempo Real',
    summary: 'Criação da primeira coluna no canto esquerdo da planilha dedicada exclusivamente aos embarques gerados no sistema. Todo novo embarque cadastrado gera automaticamente uma nova linha na planilha, com sincronização contínua de status, pesagens, CTE, faturamento, adiantamentos e saldos.',
    items: [
      {
        category: 'feature',
        title: 'Primeira Coluna: ID EMBARQUE SISTEMA',
        description: 'Nova coluna posicionada como a 1ª coluna da planilha (canto esquerdo), com identificador visual destacado em verde esmeralda para identificar embarques originados do sistema operacional.'
      },
      {
        category: 'feature',
        title: 'Geração Automática de Novas Linhas',
        description: 'Qualquer novo embarque criado no sistema gera automaticamente uma linha correspondente na planilha com seu respectivo ID pré-preenchido.'
      },
      {
        category: 'improvement',
        title: 'Sincronização Contínua de Status e Finanças',
        description: 'Conforme o embarque avança em seu ciclo de vida (carregamento, trânsito, descarga, conferência de peso, emissão de CT-e/NF, liberação de adiantamento e saldo), as colunas da planilha são atualizadas dinamicamente em tempo real.'
      }
    ]
  },
  {
    id: 'rel_2026_10_01_v2_41_0',
    version: 'v2.41.0',
    date: '01/10/2026',
    title: 'Correção e Aperfeiçoamento dos Filtros e Popover da Planilha',
    summary: 'Correção crítica no mecanismo de filtros individuais por coluna e no popover de seleção de valores frequentes (como "Forma de Pagamento"). Eliminado o cancelamento involuntário de filtros, adicionado suporte a buscas sem acentuação e inclusão de botão para limpar filtros ativos diretamente pelo popover.',
    items: [
      {
        category: 'fix',
        title: 'Sincronização Estável de Filtros de Coluna',
        description: 'Eliminada a condição de corrida no campo de filtro que apagava automaticamente a seleção feita no popover de valores frequentes (ex: BOLETO).'
      },
      {
        category: 'improvement',
        title: 'Busca Insensível a Acentos e Formatações',
        description: 'Os filtros agora realizam comparações normalizadas, encontrando resultados com ou sem acentos (ex: "faturado", "nao", "boleto", "liberacao") e formatos numéricos em reais.'
      },
      {
        category: 'feature',
        title: 'Destaque e Botão de Limpeza no Popover',
        description: 'Valores frequentes ativos agora recebem destaque visual com checkmark (✓), permitindo alternar seleção ou limpar o filtro diretamente pelo menu.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_40_0',
    version: 'v2.40.0',
    date: '30/09/2026',
    title: 'Opção de Excluir Planilha Restrita ao Usuário Suporte',
    summary: 'Implementação de recurso de segurança para exclusão e limpeza completa da planilha de controle e controladoria de embarques, com acesso estritamente restrito e validado para o usuário "Suporte". A ação conta com confirmação em modal de segurança e limpeza total do armazenamento local persistido.',
    items: [
      {
        category: 'security',
        title: 'Controle de Acesso Estrito ao Usuário Suporte',
        description: 'O botão e o comando de exclusão só ficam visíveis e executáveis se o operador logado for o usuário "Suporte" (validado via autenticação, perfil e dados de sessão).'
      },
      {
        category: 'feature',
        title: 'Modal de Confirmação e Segurança',
        description: 'Janela de diálogo com aviso claro sobre a ação irreversível antes da efetivação da limpeza da planilha.'
      },
      {
        category: 'improvement',
        title: 'Limpeza Completa e Estado Vazio Organizado',
        description: 'Apagamento seguro de linhas, abas, filtros e cache local, com opções imediatas para adicionar linhas, importar novo arquivo XLSX ou restaurar base de dados.'
      }
    ]
  },
  {
    id: 'rel_2026_09_30_v2_39_0',
    version: 'v2.39.0',
    date: '30/09/2026',
    title: 'Painel de Controle Unificado e Ultra-Otimizado da Controladoria',
    summary: 'Unificação e consolidação dos blocos superiores (banner, seletor de origem, cards de KPIs e barra de filtros) em um único centro de comando executivo de alta densidade visual. Economiza mais de 300px de altura na tela, maximizando o espaço útil para a visualização da planilha sem perder qualquer recurso ou métrica.',
    items: [
      {
        category: 'improvement',
        title: 'Consolidação e Economia de Espaço Vertical',
        description: 'Integração de 4 seções antes dispersas em um painel unificado e compacto, liberando espaço visual imediato para a planilha de embarques.'
      },
      {
        category: 'feature',
        title: 'Faixa Executiva de KPIs em Formato Ribbon',
        description: 'Métricas financeiras essenciais organizadas horizontalmente em uma barra compacta com receitas brutas, custos de motorista, margens e acertos.'
      },
      {
        category: 'improvement',
        title: 'Toolbar e Filtros Integrados',
        description: 'Ações de maximizar, janela flutuante, sincronização, pesquisa global e filtros rápidos unificados em um único cabeçalho coeso.'
      }
    ]
  },
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
