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
