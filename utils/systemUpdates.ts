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
