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
