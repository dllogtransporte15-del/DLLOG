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
    id: 'rel_2026_10_20_v2_70_94',
    version: 'v2.70.94',
    date: '20/10/2026',
    title: 'Equalização do Frete Motorista CEL-742 e Blindagem Contratual Contra Descompasso de Pedágio',
    summary: 'Correção do Frete Motorista Bruto do embarque CEL-742 para R$ 3.336,90 (47,67 ton × R$ 70,00) e implementação de blindagem sistemática no cálculo do DRE, painel de automação CT-e e modal de anexos para que o frete bruto sempre respeite a taxa contratual por tonelada, evitando descompassos quando o pedágio for reajustado.',
    items: [
      {
        category: 'fix',
        title: 'Equalização do Frete Motorista no Embarque CEL-742',
        description: 'O valor do frete bruto do embarque CEL-742 foi corrigido de R$ 3.139,30 para R$ 3.336,90, harmonizando o DRE e a automação do CT-e com a Carta Frete líquida (R$ 3.126,30) e o pedágio (R$ 210,60).'
      },
      {
        category: 'improvement',
        title: 'Blindagem de Frete Contratual por Tonelada no DRE e Relatórios',
        description: 'Implementada regra preventiva no painel de automação de custos (CT-e) e na calculadora de despesas operacionais para garantir que cargas com taxa por tonelada sempre priorizem a taxa contratual em caso de divergência com valor bruto legado.'
      },
      {
        category: 'fix',
        title: 'Prevenção de Race Condition de Pedágio na Carta Frete',
        description: 'O salvamento de divergência da Carta Frete no modal de anexos agora utiliza dinamicamente o pedágio final atualizado do documento e sincroniza diretamente com o frete bruto contratual.'
      }
    ]
  },
  {
    id: 'rel_2026_10_20_v2_70_93',
    version: 'v2.70.93',
    date: '20/10/2026',
    title: 'Validação de Adiantamento PG Restrita ao Status "Ag. Adiantamento"',
    summary: 'O bloqueio de avanço e aviso de divergência entre o "Adiantamento PG" do sistema e o "Adiantamento de viagem" da Carta Frete agora atuam exclusivamente na etapa de "Ag. Adiantamento", liberando normalmente o avanço nas demais etapas fiscais e operacionais.',
    items: [
      {
        category: 'fix',
        title: 'Restrição da Divergência de Adiantamento ao Status "Ag. Adiantamento"',
        description: 'A validação obrigatória que exige equivalência entre o Adiantamento PG e o adiantamento de viagem da Carta Frete passa a atuar única e exclusivamente quando o embarque estiver no status "Ag. Adiantamento".'
      },
      {
        category: 'improvement',
        title: 'Liberação do Salvar e Avançar nas Demais Etapas (Aguardando Fiscal)',
        description: 'Eliminado o travamento e avisos de divergência de adiantamento durante a validação fiscal e demais fases que antecedem o adiantamento de viagem.'
      }
    ]
  },
  {
    id: 'rel_2026_10_20_v2_70_92',
    version: 'v2.70.92',
    date: '20/10/2026',
    title: 'Acesso Irrestrito a Todos os Embarques para o Perfil Gerenciadora de Risco',
    summary: 'Equalização definitiva de visibilidade e permissões operacionais: usuários com perfil Gerenciadora de Risco e a operadora Samanta passam a ter acesso irrestrito e integral a todos os embarques e cargas do sistema, sem qualquer retenção por permissões de filial ou listas de usuários em cargas.',
    items: [
      {
        category: 'fix',
        title: 'Atualização e Ajuste Cadastral do Usuário Samanta',
        description: 'O perfil de acesso da operadora Samanta foi devidamente atualizado para "Gerenciadora de Risco" no banco de dados e sincronizado em tempo real no estado de autenticação da aplicação.'
      },
      {
        category: 'improvement',
        title: 'Visibilidade Global Plena de Embarques e Cargas',
        description: 'Garantido retorno de 100% dos embarques cadastrados nas telas operacionais e de histórico para o perfil Gerenciadora de Risco, eliminando qualquer filtragem residual por restrições de cargas ou filiais.'
      },
      {
        category: 'security',
        title: 'Sincronização em Tempo Real de Sessão de Usuário',
        description: 'Implementado ouvinte automático de atualização de cadastro de usuários para sincronizar instantaneamente perfis e permissões na sessão ativa sem necessidade de logout.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_91',
    version: 'v2.70.91',
    date: '19/10/2026',
    title: 'Acesso Direto aos Detalhes da Carga e do Embarque Vinculados nos Chamados',
    summary: 'Ao clicar em "Acessar Carga Vinculada" ou "Acessar Embarque Vinculado" em qualquer chamado, o sistema agora redireciona diretamente para a tela operacional e abre automaticamente o modal de detalhes completos correspondente para identificação imediata.',
    items: [
      {
        category: 'feature',
        title: 'Abertura Direta do Modal de Detalhes da Carga',
        description: 'Ao clicar no botão "Acessar Carga Vinculada", o sistema navega até a tela de Cargas e abre imediatamente a janela com todos os dados da carga vinculada (origem, destino, pernas de frete, cliente, produto e histórico).'
      },
      {
        category: 'feature',
        title: 'Abertura Direta do Modal de Detalhes do Embarque',
        description: 'Ao clicar no botão "Acessar Embarque Vinculado", o sistema navega para a tela de Embarques e abre instantaneamente o modal detalhado do embarque (valores, adiantamento, motorista, placas, CTE e documentação anexada).'
      },
      {
        category: 'improvement',
        title: 'Integração e Fechamento Automático do Modal de Chamados',
        description: 'Transição ágil e limpa: o modal de chamados é fechado automaticamente ao navegar, direcionando o foco do operador para os detalhes do registro vinculado sem fricção.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_90',
    version: 'v2.70.90',
    date: '19/10/2026',
    title: 'Cabeçalho e Endereço da Filial São Paulo nas Ordens de Carregamento para Cargas com Origem em SP',
    summary: 'Configuração oficial dos dados cadastrais e endereço da Filial de São Paulo (TRANSCUNHA TRANSPORTES E LOGISTICA FILIAL SP - Ipaussu/SP) em todas as Ordens de Carregamento para cargas com origem em SP (UF SP), completando a cobertura operacional dos estados de GO, MG e SP.',
    items: [
      {
        category: 'feature',
        title: 'Emissão com Dados Oficiais da Filial São Paulo (Ipaussu/SP)',
        description: 'Quando a carga tiver origem no estado de São Paulo (UF SP), a Ordem de Carregamento passa a emitir: "TRANSCUNHA TRANSPORTES E LOGISTICA FILIAL SP", "CNPJ: 36.203.306/0002-73 - IE: 357033425116" e "RUA JOAO OLIMPIO DA SILVA, 20, JARDIM COCAJA II - IPAUSSU/SP - 18950-546 - (35)99103-0469".'
      },
      {
        category: 'improvement',
        title: 'Detecção Inteligente de Origem SP e Chaveamento Automático',
        description: 'Implementado o analisador `isSpOrigin` com detecção precisa de siglas UF (/SP, - SP, , SP), identificação do estado de São Paulo e principais polos paulistas (Ipaussu, Santos, Ourinhos, Campinas, Ribeirão Preto, Assis, etc.).'
      },
      {
        category: 'improvement',
        title: 'Identificador Visual "SP" no Modal de Detalhes do Embarque',
        description: 'O botão de emissão da Ordem de Carga e Mod. Consube exibe uma badge roxa "SP" com tooltip confirmando a emissão pela Filial Ipaussu/SP quando a carga tem origem em São Paulo.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_89',
    version: 'v2.70.89',
    date: '19/10/2026',
    title: 'Cabeçalho e Endereço da Matriz Minas Gerais nas Ordens de Carregamento para Cargas com Origem em MG',
    summary: 'Configuração oficial dos dados cadastrais e endereço da Matriz de Minas Gerais (TRANSCUNHA TRANSPORTES E LOGISTICA LTDA - Pratápolis/MG) em todas as Ordens de Carregamento para cargas com origem em MG (e padrão corporativo), com fidelidade total ao layout impresso.',
    items: [
      {
        category: 'feature',
        title: 'Emissão com Dados Oficiais da Matriz Minas Gerais (Pratápolis/MG)',
        description: 'Quando a carga tiver origem no estado de Minas Gerais (UF MG) ou padrão corporativo, a Ordem de Carregamento passa a emitir: "TRANSCUNHA TRANSPORTES E LOGISTICA LTDA", "CNPJ: 36.203.306/0001-92 - IE: 36577990000" e "R PADRE LICINIO, 105, CENTRO - PRATAPOLIS/MG - 37970-000 - (35)99103-0469".'
      },
      {
        category: 'improvement',
        title: 'Detecção Inteligente de Origem MG e Roteamento Multiestadual',
        description: 'Implementado o analisador `isMinasOrigin` com detecção de siglas UF (/MG, - MG, , MG), identificação do estado de Minas Gerais e polos mineiros, permitindo chaveamento dinâmico e preciso entre a Filial Goiás (Catalão/GO) e a Matriz Minas Gerais (Pratápolis/MG).'
      },
      {
        category: 'improvement',
        title: 'Identificador Visual "MG" no Modal de Detalhes do Embarque',
        description: 'O botão de emissão da Ordem de Carga e Mod. Consube exibe uma badge azul-celeste "MG" quando o embarque possui origem em Minas Gerais, orientando os operadores com máxima clareza.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_88',
    version: 'v2.70.88',
    date: '19/10/2026',
    title: 'Cabeçalho e Endereço da Filial Goiás nas Ordens de Carregamento para Cargas com Origem em GO',
    summary: 'Configuração automática em todas as ordens de carregamento (layout Consube e layout padrão) para emissão dos dados cadastrais e endereço oficial da Filial de Goiás (TRANSCUNHA TRANSPORTES E LOGISTICA GOIAS - Catalão/GO) sempre que a carga tiver origem no estado de Goiás (UF GO).',
    items: [
      {
        category: 'feature',
        title: 'Emissão com Dados Oficiais da Filial Goiás (Catalão/GO)',
        description: 'Quando a carga tiver origem no estado de Goiás (UF GO), o cabeçalho e as assinaturas da Ordem de Carregamento passam a emitir: "TRANSCUNHA TRANSPORTES E LOGISTICA GOIAS", "CNPJ: 36.203.306/0004-35 - IE: 204719070" e "RUA 26, 365, VILA MARGON - CATALAO/GO - 75711-040 - (35)99103-0469".'
      },
      {
        category: 'improvement',
        title: 'Detecção Inteligente de Origem GO em Múltiplos Formatos',
        description: 'Criado mecanismo robusto `isGoiasOrigin` capaz de detectar origem no estado de Goiás a partir da sigla UF (/GO, - GO, , GO, GO), nome do estado e principais polos (Catalão, Rio Verde, Jataí, Anápolis, Goiânia, Cristalina, etc.), diferenciando com segurança de municípios de outros estados.'
      },
      {
        category: 'improvement',
        title: 'Identificador Visual "GO" no Modal de Detalhes do Embarque',
        description: 'O botão de emissão da Ordem de Carga / Ordem Consube no modal do embarque exibe um distintivo verde "GO" e tooltip informativo confirmando a emissão pela Filial Catalão/GO.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_87',
    version: 'v2.70.87',
    date: '19/10/2026',
    title: 'Refinamento dos Chamados: Auditoria de Prazos (SLA), Preservação do Histórico e Prevenção de Perdas',
    summary: 'Aprimoramento completo no sistema de chamados (tickets). Implementado gerador de identificadores com sequência única e verificação direta no banco com retry automático para impedir sobreposição entre operadores, cópia de segurança em cache de emergência local para garantir que nenhum dado seja perdido, bloqueio de auditoria contra exclusão de chamados em aberto, novos filtros com contadores em tempo real e rastreamento minucioso de carimbos de data/hora (horário solicitado, 1º atendimento, conclusão e tempo total de SLA).',
    items: [
      {
        category: 'fix',
        title: 'Prevenção Absoluta Contra Perda de Chamados e Colisão de IDs',
        description: 'Desenvolvido o mecanismo `insertUniqueTicket` que valida em tempo real o maior ID no Supabase e no cache local antes da gravação com retentativas automáticas, impedindo que chamados criados concorrentemente por operadores (como o usuário Dione) se sobreponham ou sumam.'
      },
      {
        category: 'feature',
        title: 'Painel de Auditoria e Prazos de Atendimento (SLA)',
        description: 'Adicionado painel de auditoria estruturado exibindo com exatidão o horário em que o chamado foi solicitado, o horário do primeiro atendimento com SLA de resposta, o horário de conclusão com tempo total até resolução, e os responsáveis por cada transição.'
      },
      {
        category: 'security',
        title: 'Bloqueio de Auditoria Contra Exclusão de Chamados Abertos',
        description: 'Impedida a exclusão acidental de chamados que estejam "Abertos" ou "Em Atendimento", garantindo que todo histórico corporativo seja preservado integralmente para conformidade e auditoria.'
      },
      {
        category: 'improvement',
        title: 'Filtros com Contadores e Preservação da Aba "Meus Chamados"',
        description: 'Adicionados botões de filtro com badges numéricos ("Todos", "Abertos", "Em Atendimento", "Resolvidos", "Fechados" e "Meus Chamados"). A aba "Meus Chamados" agora mantém todos os chamados criados ou atribuídos ao usuário sem ocultar itens concluídos.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_86',
    version: 'v2.70.86',
    date: '19/10/2026',
    title: 'Ampliação e Otimização Visual da Janela de Cadastro/Edição de Carga',
    summary: 'A janela modal de cadastro e edição de carga (Editar Carga / Nova Carga) foi ampliada em aproximadamente 30%, aumentando a largura máxima para 1.152px (max-w-6xl) e expandindo a altura útil (md:h-[88vh] max-h-[94vh]), com maior visibilidade para a timeline de programação e lista de permissões.',
    items: [
      {
        category: 'improvement',
        title: 'Ampliação Dimensional de 30%',
        description: 'Ajustada a largura máxima de max-w-4xl (896px) para max-w-6xl (1.152px) e altura útil para md:h-[88vh], proporcionando uma área de visualização muito mais ampla e confortável.'
      },
      {
        category: 'improvement',
        title: 'Maior Área Útil para a Timeline de Programação',
        description: 'Expandida a altura máxima das listas internas de timeline diária e visibilidade de usuários (max-h-72), permitindo visualizar mais dias e operadores sem necessidade de rolagem excessiva.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_85',
    version: 'v2.70.85',
    date: '19/10/2026',
    title: 'Condicionamento do Status "Ag. Agend. ou Troca/nfe" à Exigência de Agendamento',
    summary: 'O fluxo de status dos embarques foi parametrizado para que a etapa "Ag. Agend. ou Troca/nfe" seja executada apenas quando a carga possuir a opção "Exige Agendamento" ligada. Cargas sem exigência de agendamento avançam diretamente para "Ag. Descarga", reduzindo etapas desnecessárias.',
    items: [
      {
        category: 'feature',
        title: 'Avanço Direto para "Ag. Descarga"',
        description: 'Quando a carga não exigir agendamento (campo "Exige Agendamento" desligado), o avanço operacional a partir de "Ag. Adiantamento" (ou "Ag. Fiscal" com 0% de adiantamento) pula a etapa de agendamento e transiciona direto para "Ag. Descarga".'
      },
      {
        category: 'improvement',
        title: 'Linha do Tempo e Stepper Adaptativos',
        description: 'A timeline de fases do embarque (ShipmentStagesTimeline) agora oculta a etapa "Ag. Agend. ou Troca/nfe" para cargas que não exigem agendamento, exibindo apenas as etapas pertinentes ao ciclo real.'
      },
      {
        category: 'improvement',
        title: 'Reversão Precisa de Status',
        description: 'A ação de reversão de status reconhece o salto de etapa e retorna o embarque diretamente para "Ag. Adiantamento" (ou "Ag. Fiscal"), garantindo integridade no fluxo reverso.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_84',
    version: 'v2.70.84',
    date: '19/10/2026',
    title: 'Correção Ágil e Ajuste Manual de Divergência de Vale-Pedágio',
    summary: 'Implementada funcionalidade para resolução de divergências de vale-pedágio diretamente no painel de automação de custos do CT-e. O operador agora pode aplicar o valor extraído dos documentos com 1 clique ou definir um valor personalizado com recálculo automático de deduções, bases tributáveis e lucro real.',
    items: [
      {
        category: 'feature',
        title: 'Correção de Divergência em 1 Clique',
        description: 'Ao detectar divergência entre o valor de pedágio do embarque e o documento fiscal extraído (CT-e / MDF-e / Vale-Pedágio), é exibido o botão "Corrigir p/ R$ [valor]" para equiparação instantânea.'
      },
      {
        category: 'feature',
        title: 'Edição Manual e Personalizada do Pedágio',
        description: 'Disponibilizado botão para ajuste manual inline com campo monetário, botão de atalho para valor do documento, confirmação (Enter / Salvar) e cancelamento.'
      },
      {
        category: 'improvement',
        title: 'Persistência no Supabase e Recálculo Automático',
        description: 'Ajuste do pedágio atualiza automaticamente tollValue, realProfitData, histórico de auditoria do embarque e recalcula instantaneamente as deduções (impostos, CIOT, frete motorista líquido e lucro líquido real).'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_83',
    version: 'v2.70.83',
    date: '19/10/2026',
    title: 'Configuração de Permissões e Acessos do Perfil Gerenciadora de Risco',
    summary: 'O perfil Gerenciadora de Risco foi equalizado com as funções e privilégios administrativos de nível Admin, incluindo visualização global de cargas e embarques, edição de preços de frete, avanço e reversão de status operacionais, gestão de filiais e controle do painel de monitoramento do sistema. Foram mantidas estritamente bloqueadas as janelas de Financeiro e Relatórios, assim como todos os comandos de exclusão do sistema.',
    items: [
      {
        category: 'security',
        title: 'Privilégios Administrativos com Restrição Segura de Acesso',
        description: 'O perfil Gerenciadora de Risco passa a ter permissões plenas de criação, leitura e edição em todos os módulos operacionais e de cadastro, mantendo bloqueados os módulos de Financeiro e Relatórios.'
      },
      {
        category: 'security',
        title: 'Bloqueio Estrito dos Comandos de Excluir',
        description: 'Comandos de exclusão de registros (embarques, cargas, clientes, filiais, usuários, produtos, rotas, anexos, ofertas e chamados) foram integralmente bloqueados no frontend e nos handlers operacionais para o perfil Gerenciadora de Risco.'
      },
      {
        category: 'feature',
        title: 'Avanço e Reversão de Status e Edição de Preços',
        description: 'Liberadas as ações de avanço em qualquer etapa operacional, reversão estrita de status e alteração de preços e tarifas de frete para usuários da Gerenciadora de Risco.'
      },
      {
        category: 'improvement',
        title: 'Visibilidade Global e Seletor de Visão do Dashboard',
        description: 'Concedido acesso à visão global de cargas e embarques de todas as filiais e ao seletor de modos de visualização (geral, fiscal, financeiro, supervisor) no Dashboard.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_82',
    version: 'v2.70.82',
    date: '19/10/2026',
    title: 'Ocultação de Central de Alertas, Chamados e Atualizações para Perfil Cliente',
    summary: 'Ajustada a interface de navegação e permissões visuais para usuários logados com perfil Cliente. As funções "Central de Alertas", "Atualização do Sistema" e "Chamados" foram completamente ocultadas dos menus superior, dropdown de usuário, menu mobile, tabelas operacionais e popups automáticos.',
    items: [
      {
        category: 'security',
        title: 'Ocultação da Central de Alertas para o Perfil Cliente',
        description: 'O ícone do sino, sintetizador de som de notificações e o dropdown da Central de Alertas foram ocultados e desativados para o perfil Cliente.'
      },
      {
        category: 'security',
        title: 'Ocultação de Chamados e Painel de Suporte para o Perfil Cliente',
        description: 'Ocultados o botão direto "Chamados" na barra superior, os atalhos de "Painel de Chamados" e "+ Abrir Novo Chamado" no menu do usuário e no menu mobile, além dos badges de chamados em tabelas.'
      },
      {
        category: 'improvement',
        title: 'Ocultação de Atualizações do Sistema para o Perfil Cliente',
        description: 'Ocultados o botão de Novidades na barra de navegação, a opção de histórico de versões no menu do usuário e a abertura automática do modal de atualizações do sistema para usuários com perfil Cliente.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_81',
    version: 'v2.70.81',
    date: '19/10/2026',
    title: 'Anexo de Arquivos em Chamados com Pré-visualização e Download',
    summary: 'Implementado campo para anexar arquivos e fotos (PDF, Imagens, Documentos até 25MB) diretamente no formulário de abertura de chamados. Os destinatários e responsáveis contam agora com opções imediatas para Visualizar o documento em tela cheia (DocumentPreviewModal) ou Baixar o arquivo diretamente para o computador.',
    items: [
      {
        category: 'feature',
        title: 'Campo de Upload de Arquivos ao Abrir Chamado',
        description: 'Adicionado seletor de arquivos no formulário de criação de chamados com suporte a fotos, documentos e PDFs de até 25MB, upload automático no storage de nuvem com fallback resiliente e visualização do nome/tamanho selecionado.'
      },
      {
        category: 'feature',
        title: 'Botões de Visualização e Download para o Usuário Destinatário',
        description: 'Ao expandir o chamado, o usuário destinatário tem acesso ao card do anexo com os botões "Visualizar" (abre pré-visualização completa com zoom, impressão e tela cheia) e "Baixar" (download direto com nome original).'
      },
      {
        category: 'improvement',
        title: 'Indicador Visual "Com Anexo" na Listagem de Chamados',
        description: 'Os chamados com arquivos anexados recebem um badge destacado na lista do Painel de Chamados, facilitando a identificação imediata de ocorrências com documentação anexada.'
      }
    ]
  },
  {
    id: 'rel_2026_10_19_v2_70_80',
    version: 'v2.70.80',
    date: '19/10/2026',
    title: 'Disponibilização Direta do Painel de Chamados e Abertura de Suporte na Barra Superior',
    summary: 'Adicionados atalhos visíveis e de acesso rápido para o Painel de Chamados e o formulário de abertura de chamados ("+ Abrir Novo Chamado") diretamente na barra de navegação superior (TopNavBar), no menu do perfil do usuário e no menu mobile, permitindo registrar incidentes, ocorrências e dúvidas a qualquer momento com vinculação opcional a Cargas ou Embarques.',
    items: [
      {
        category: 'feature',
        title: 'Botão de Chamados com Indicador de Pendências na TopNavBar',
        description: 'Inserido botão direto "Chamados" ao lado de Novidades e Notificações com ícone de atendimento e indicador visual (badge) de chamados pendentes atribuídos ao usuário logado.'
      },
      {
        category: 'improvement',
        title: 'Opção "Painel de Chamados" e "+ Abrir Novo Chamado" no Menu do Usuário',
        description: 'Disponibilizado no dropdown de perfil e no menu mobile o acesso ao Painel de Chamados completo (filtros, atendimento, histórico) e atalho rápido para abrir um novo chamado imediatamente.'
      },
      {
        category: 'improvement',
        title: 'Abertura Direta no Modo Criação de Chamado',
        description: 'O modal de chamados agora aceita inicialização direta no modo de formulário, exibindo os campos de título, descrição, nível de urgência, direcionamento e vínculo opcional a cargas e embarques.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_79',
    version: 'v2.70.79',
    date: '17/10/2026',
    title: 'Harmonização de Faturamento e Indicadores no 1º Resultado (Agência GO e Operadores)',
    summary: 'Ajustada a classificação e os critérios de faturamento no 1º Resultado Financeiro (FirstResultTab.tsx). Agora a Agência Goiás (Maurício) reconhece integralmente os embarques operados pelo seu operador de embarque (Murilo Rodrigues, prefixo MUR-) mesmo em cargas originárias da Matriz, além de unificar o critério de Faturamento Bruto e contagem de veículos carregados com base na emissão efetiva do CT-e (conforme os Relatórios Comercial e de Filiais), garantindo 100% de precisão e conciliação entre as telas.',
    items: [
      {
        category: 'fix',
        title: 'Resolução de Liderança de Agência e Prefixo MUR- (Murilo Rodrigues)',
        description: 'Atualizada a classificação de filiais para identificar o prefixo "MUR-" e resolver a liderança de operadores de agência (agencyLeaderId) vinculados ao Maurício (USR-294), assegurando que fretes operados pela agência para cargas de clientes corporativos sejam devidamente creditados à agência.'
      },
      {
        category: 'improvement',
        title: 'Precedência da Filial do Operador sobre Carga Matriz',
        description: 'Definida precedência clara para que a filial do operador do embarque não seja sobrescrita pela filial cadastral da carga, alinhando o comportamento ao Relatório de Filiais (BranchReport.tsx).'
      },
      {
        category: 'fix',
        title: 'Alinhamento do Faturamento ao Frete Efetivamente Faturado (CT-e)',
        description: 'O card de Faturamento e a contagem de veículos carregados passam a considerar embarques com CT-e emitido, eliminando divergências com o modal de Detalhamento de Embarques da Agência e Relatórios Gerenciais.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_78',
    version: 'v2.70.78',
    date: '17/10/2026',
    title: 'Sincronização de Faturamento das Filiais no 1º Resultado (Ag GO / TRANSCUNHA-GOAIS)',
    summary: 'Ajustada a classificação de faturamento no 1º Resultado (FirstResultTab.tsx) para considerar a Filial cadastrada do embarque, carga e operador (ex: TRANSCUNHA-GOAIS / Catalão - GO). Anteriormente, o card Ag GO só contabilizava embarques explicitamente atribuídos ao usuário Maurício, fazendo com que os embarques da filial de Goiás caíssem indevidamente na Matriz.',
    items: [
      {
        category: 'fix',
        title: 'Contabilização da Filial TRANSCUNHA-GOAIS no Card Ag GO',
        description: 'Atualizada a função classifyBranch para reconhecer a filial efetiva do embarque (s.branchId, cargo.branchId ou filial do operador) para Goiás, São Paulo e Paraná, garantindo alinhamento imediato entre o 1º Resultado e o Relatório de Filiais.'
      },
      {
        category: 'improvement',
        title: 'Precisão nos Indicadores de Agências e Matriz',
        description: 'Eliminada a distorção que atribuía operações de unidades filiais à Matriz quando o embarque era registrado por operadores corporativos ou administradores.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_77',
    version: 'v2.70.77',
    date: '17/10/2026',
    title: 'Vínculo Estruturado entre Usuários Internos e Filiais',
    summary: 'Implementada a arquitetura completa de vinculação entre Usuários Internos e Filiais (Branch). Permite associar colaboradores a filiais específicas com persistência direta no Supabase, seleção dinâmica no formulário com espelhamento de acessos e exibição destacada na listagem de usuários com badges e filtro dedicado por unidade.',
    items: [
      {
        category: 'feature',
        title: 'Vínculo de Filial na Gestão de Usuários Internos',
        description: 'Adicionado o campo de seleção "Filial" no modal de cadastro e edição de Usuários Internos (UserFormModal.tsx), listando dinamicamente as filiais cadastradas no sistema com indicação de acesso geral para usuários sem filial vinculada.'
      },
      {
        category: 'improvement',
        title: 'Coluna e Badge de Filial na Tabela de Usuários',
        description: 'A tabela de usuários (UserTable.tsx) agora conta com uma coluna dedicada para "Filial", exibindo badges elegantes com o nome da unidade para usuários vinculados, "Todas" para usuários com acesso corporativo global e "-" para perfis externos.'
      },
      {
        category: 'feature',
        title: 'Filtro Dinâmico por Filial na Listagem de Usuários',
        description: 'Integrado filtro por unidade no UserFilter.tsx e UsersPage.tsx, permitindo segmentar e auditar usuários por filial específica ou listar apenas colaboradores com acesso geral.'
      },
      {
        category: 'security',
        title: 'Persistência e Mapeamento Consistente no Banco de Dados',
        description: 'Garantida a compatibilidade de tipos (branchId e filialId), normalização no salvamento (App.tsx) e hidratação bidirecional robusta nos adaptadores toUser e fromUser (lib/db.ts).'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_76',
    version: 'v2.70.76',
    date: '17/10/2026',
    title: 'Auditoria e Correção de Distorções Críticas no Módulo Financeiro & Controladoria (1º Resultado)',
    summary: 'Identificação e resolução definitiva da anomalia de pedágio (R$ 52.2 bilhões) e distorção extrema da Margem Bruta (-13.241.670,1%). O parser de documentos fiscais capturava o CNPJ de concessionárias como pedágio. Implementadas travas de segurança em múltiplas camadas (ingestão, banco de dados, cálculos e interface), além da remoção de multiplicadores fictícios de notas fiscais e estilização adaptativa da margem.',
    items: [
      {
        category: 'fix',
        title: 'Sanitização do Parser Fiscal e Travas Anti-CNPJ no Pedágio',
        description: 'Corrigido o regex no fiscalDocParser.ts para rejeitar números precedidos de termos cadastrais (CNPJ, CPF, Inscrição, etc.) e valores com mais de 10 dígitos contínuos. Estabelecido teto de sanidade operacional de R$ 25.000,00 por pedágio de viagem única.'
      },
      {
        category: 'security',
        title: 'Blindagem de Dados no Adaptador de Banco de Dados (Supabase)',
        description: 'Adicionada camada de neutralização em lib/db.ts: qualquer registro existente com valor de pedágio aberrante (> R$ 25.000,00) é automaticamente neutralizado para R$ 0,00 na leitura e gravação, impedindo contaminação dos relatórios.'
      },
      {
        category: 'improvement',
        title: 'Refatoração dos Cálculos e Visualização da Margem Bruta no 1º Resultado',
        description: 'Eliminado multiplicador sintético de faturamento de NF (frete * 7.5). A Margem Bruta percentual foi blindada contra divisão por zero e limitada a um intervalo coerente [-100%, +100%]. O card da Margem Bruta agora conta com visualização dinâmica (verde para margens saudáveis e vermelho/alerta para margens negativas).'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_75',
    version: 'v2.70.75',
    date: '17/10/2026',
    title: 'Remoção de Saldos Fictícios no Módulo Financeiro e Reformulação dos Filtros de Período dos Resultados 1, 2 e 3',
    summary: 'Eliminação completa dos valores e contas bancárias hardcoded/mockadas do Saldo Bancário, passando a exibir estritamente valores reais integrados ou R$ 0,00 quando sem contas ativas. Reformulação dos filtros de período dos relatórios financeiros (1º, 2º e 3º Resultados) substituindo opções genéricas por "Hoje", "Semana Atual" (Dom a Sáb), "Mês Atual" e "Ano Atual", com cálculo dinâmico de datas e neutralização de quedas indevidas em dados globais.',
    items: [
      {
        category: 'fix',
        title: 'Remoção de Valores Fictícios no Saldo Bancário',
        description: 'Removidos todos os dados mockados de contas bancárias (INITIAL_BANK_ACCOUNTS) do Saldo Bancário e da Controladoria Bancária. Se não houver contas ativas ou integração, o sistema exibe "R$ 0,00" e estado vazio instrutivo para novos cadastros, sanitizando também o armazenamento local (localStorage).'
      },
      {
        category: 'feature',
        title: 'Filtros de Período Estruturados nos Resultados Financeiros (1º, 2º e 3º)',
        description: 'Substituição das opções genéricas pelos filtros "Hoje" (dia atual), "Semana Atual" (intervalo dinâmico de Domingo a Sábado), "Mês Atual" (primeiro ao último dia do mês corrente) e "Ano Atual" (primeiro ao último dia do ano). Adicionada a função auxiliar getFinancialPeriodRange e vinculação dinâmica nos 1º, 2º e 3º Resultados.'
      },
      {
        category: 'improvement',
        title: 'Precisão e Sanidade nos Relatórios de Margem e Deduções',
        description: 'Eliminada a regra de fallback que restaurava todos os embarques históricos quando nenhum registro era encontrado no período filtrado. Adicionada camada de validação e tolerância a distorções de pedágio e impostos nos cálculos do 1º Resultado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_74',
    version: 'v2.70.74',
    date: '17/10/2026',
    title: 'Correção no Fluxo de Edição de Ofertas de Frete e Padronização dos Campos de Localidade Exata',
    summary: 'Corrigido o fluxo de persistência ao editar ofertas de frete existentes, garantindo o envio correto do handler de salvamento e preservação de identificadores (#OFR). Ajustado o rótulo do botão de ação para "Salvar Oferta" em modo de edição. Padronizados os campos de Local de Origem e Destino exatos com o botão "+ Cadastrar Local", abertura do QuickLocationModal, busca via datalist de expedidores/recebedores e cartões de visualização e edição imediata.',
    items: [
      {
        category: 'fix',
        title: 'Persistência e Rótulo no Fluxo de Edição de Oferta',
        description: 'Corrigida a ausência do handler onSaveFreightOffer nas visualizações do Dashboard, garantindo que ofertas existentes salvem alterações no Supabase e estado local sem regerar ID ou displayId. O botão de ação agora exibe "Salvar Oferta" ao invés de "Criar Oferta de Frete" quando em edição.'
      },
      {
        category: 'feature',
        title: 'Padronização dos Campos de Localidade (Exato) com "+ Cadastrar Local"',
        description: 'Os campos de Local da Origem (Exato) e Local do Destino (Exato) (além de vias adicionais) agora possuem o botão "+ Cadastrar Local", integração com o QuickLocationModal, sugestão inteligente por datalist (expedidores-recebedores-datalist e cities-list) e cartões com detalhes fiscais/contato e atalho "Editar".'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_73',
    version: 'v2.70.73',
    date: '17/10/2026',
    title: 'Exibição de Frete "A Combinar" e Filtro Restrito de Cargas em Operação para Motoristas',
    summary: 'Implementada a regra de formatação para fretes iguais a R$ 0,00 exibindo "A combinar" nas oportunidades de carga, cards, mapa e compartilhamentos. Aplicado filtro obrigatório para o perfil de Motorista (Usuários Externos), restringindo estritamente a exibição para "Cargas em Operação" (descartando rascunhos, canceladas, suspensas e concluídas).',
    items: [
      {
        category: 'improvement',
        title: 'Exibição de Frete "A Combinar"',
        description: 'Nas telas de Oportunidades de Carga, listagens, cards do portal do motorista, mapa operacional e textos de divulgação, valores de frete zerados (R$ 0,00) agora são expressos como "A combinar" de forma elegante.'
      },
      {
        category: 'improvement',
        title: 'Filtro Estrito de Cargas em Operação para Motoristas',
        description: 'Para usuários do perfil Motorista (Usuários Externos), as telas de Oportunidades ("Solicitar Embarque") e "Mapa Operacional de Cargas" passam a exibir exclusivamente cargas cujo status seja "Em andamento" / Cargas em Operação, descartando rascunhos, suspensas e fechadas.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_72',
    version: 'v2.70.72',
    date: '17/10/2026',
    title: 'Otimização do Cadastro de Usuários Externos e Login sem Exigência de "@"',
    summary: 'Removidas as opções corporativas (E-mail Corporativo institucional e Espelhar Acesso) da janela de cadastro de Usuários Externos (Motoristas) e eliminada a obrigatoriedade de "@" no identificador de acesso dos usuários, permitindo registro e login simplificados por CPF ou nome de usuário.',
    items: [
      {
        category: 'improvement',
        title: 'Janela de Cadastro Limpa para Usuários Externos (Motoristas)',
        description: 'Os blocos de configuração de E-mail Corporativo (@transcunhaoficial.com.br) e Espelhar Acesso de Outro Usuário agora são automaticamente ocultados ao cadastrar ou editar motoristas e usuários externos.'
      },
      {
        category: 'improvement',
        title: 'Remoção da Exigência de "@" no Login de Usuários',
        description: 'Substituído o campo restrito com validação HTML5 nativa por campo de texto livre com formatação automática de CPF, eliminando a mensagem de bloqueio do navegador ("Inclua um @ no endereço de e-mail").'
      },
      {
        category: 'improvement',
        title: 'Autenticação Flexível por CPF, Usuário ou E-mail',
        description: 'A tela de login do sistema foi atualizada para consultar os usuários de forma transparente tanto por CPF (com ou sem pontuação), como por nome de usuário ou e-mail corporativo.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_71',
    version: 'v2.70.71',
    date: '17/10/2026',
    title: 'Configuração do Modelo de Ordem de Carregamento Consube com Layout Oficial 1:1',
    summary: 'Configurado o novo modelo de Ordem de Carregamento "Consube" com fidelidade visual absoluta ao documento operacional impresso. Inclui autorização de terceiro/motorista, composição do veículo (Cavalo, Reboques 1 e 2, Dolly), dados de retirada e pesagem em KG, espécie, remetente, cliente com CNPJ, liberação da gestora de risco (Load Num/DT, ULA, ANTT) e a observação obrigatória em destaque.',
    items: [
      {
        category: 'feature',
        title: 'Modelo Oficial "Consube" no Catálogo de Modelos',
        description: 'Disponibilização do modelo "Consube" para seleção individual por cliente (Matriz e filiais), com campos obrigatórios predefinidos e observação padrão obrigatória configurada.'
      },
      {
        category: 'feature',
        title: 'Emissão de PDF com Layout Tabular Idêntico ao Modelo Consube',
        description: 'Desenvolvido gerador de PDF sob medida (generateConsubeLoadingOrderPDF) com caixas delimitadas, cabeçalho da transportadora, autorização de terceiro, grade de veículos completa (Cavalo, Reboque 1 e 2, Dolly), dados de carga com Sacos e Peso:KG, remetente, cliente e liberação com ANTT, ULA e Load Num/DT.'
      },
      {
        category: 'improvement',
        title: 'Atalho Rápido e Detecção Automática em Detalhes do Embarque',
        description: 'O modal de detalhes do embarque detecta automaticamente se o cliente contratante utiliza o Modelo Consube, exibindo botão personalizado "Ordem Consube" e permitindo emissão sob demanda.'
      },
      {
        category: 'improvement',
        title: 'Suporte a Campos Especiais (ULA, Load Num, CNH, RG)',
        description: 'Estruturados os campos de ULA, Load Num/DT e documentação completa de motorista para garantir preenchimento total e sem divergências.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_70',
    version: 'v2.70.70',
    date: '17/10/2026',
    title: 'Estruturação da Seleção de Modelo de Ordem de Carregamento por Cliente',
    summary: 'Implementada a arquitetura completa e escalável (banco de dados, contratos de API, tipagem e interfaces de usuário) para permitir vincular modelos de Ordem de Carregamento específicos a cada cliente e filial. Prepara o ecossistema Transcunha para a emissão dinâmica e personalizada de ordens de carregamento conforme as regras de negócio de cada contratante.',
    items: [
      {
        category: 'feature',
        title: 'Modelo de Ordem de Carregamento no Cadastro do Cliente (Matriz e Filiais)',
        description: 'Adicionado seletor com dropdown estilizado no formulário de cliente (ClientFormModal), permitindo definir o modelo para a Matriz e selecionar modelos específicos ou herança para filiais cadastradas.'
      },
      {
        category: 'feature',
        title: 'Estrutura e Catálogo Inicial de Modelos de Ordem de Carregamento',
        description: 'Criada a tipagem LoadingOrderModel com catálogo de 5 modelos de mercado (Padrão Transcunha, Grãos/Granel, Fertilizantes & Ensacados, Trading/Exportação Porto e Simplificado Ticket) com suporte a persistência dinâmica.'
      },
      {
        category: 'improvement',
        title: 'Visualização Clara e Badges Informativas na Tabela de Clientes',
        description: 'A tabela de clientes e a visualização expandida de unidades/filiais agora exibem distintivos e etiquetas claras identificando o Modelo de Ordem de Carregamento vinculado a cada empresa.'
      },
      {
        category: 'improvement',
        title: 'Persistência Híbrida Segura com Fallback Automático',
        description: 'Garantida a compatibilidade total com o Supabase Postgres através de persistência em profile_permissions e localStorage com fallback resiliente, impedindo falhas caso colunas ainda não estejam migradas no schema remoto.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_69',
    version: 'v2.70.69',
    date: '17/10/2026',
    title: 'Sincronização Realtime Instantânea de Status de Embarques Multi-Usuários',
    summary: 'Diagnóstico e resolução definitiva da falta de atualização automática de status de embarques entre diferentes usuários conectados. Implementado canal central de Broadcast Realtime (WebSockets com latência <50ms) entre todas as instâncias do sistema, sincronização cruzada de abas (BroadcastChannel) e corrigido o heartbeat de segurança em segundo plano para monitoramento contínuo de status sem depender de colunas inexistentes no banco.',
    items: [
      {
        category: 'fix',
        title: 'Transmissão Instantânea de Mudança de Status entre Usuários',
        description: 'Implementado o hub de broadcast Supabase Realtime dedicado (transcunha_operations_hub). Quando qualquer usuário avança, reverte ou edita o status de um embarque, a atualização é transmitida instantaneamente em milissegundos para todas as outras telas abertas sem necessidade de recarregar a página.'
      },
      {
        category: 'fix',
        title: 'Correção Crítica no Heartbeat de Sincronização em Background',
        description: 'Substituída a verificação anterior que falhava silenciosamente buscando uma coluna inexistente no banco por um algoritmo leve de fingerprint de status e contagem de embarques ativos (~24 registros), que sincroniza com 100% de confiabilidade a cada 4 segundos e ao reativar o foco na janela do navegador.'
      },
      {
        category: 'improvement',
        title: 'Sincronização Multi-Abas e Resiliência de Conexão',
        description: 'Adicionado suporte nativo a BroadcastChannel para sincronização instantânea com zero tráfego de rede entre múltiplas abas do mesmo navegador e reconexão automática resiliente com restauração do estado em caso de instabilidades de rede.'
      }
    ]
  },
  {
    id: 'rel_2026_10_17_v2_70_68',
    version: 'v2.70.68',
    date: '17/10/2026',
    title: 'Refinamento da Leitura de Carta Frete e Correção de Falso Positivo na Nota Fiscal',
    summary: 'Aprimoramento completo no algoritmo de detecção e extração de documentos fiscais. Eliminado o alerta falso de documento incorreto ao anexar Notas Fiscais que contêm a menção a contratos comerciais de grãos no nome ou conteúdo (ex: "NOTA FISCAL ... - CONTRATO ..."). Adicionado suporte integral ao padrão oficial de Carta Frete / Contrato de Transporte (MaisFrete / e-Frete / NSTECH / Transcunha), extraindo com máxima precisão o número do contrato, CIOT, frete líquido e bruto, tarifa por tonelada, vale-pedágio em tag, adiantamento, cálculo do saldo, dados do motorista, composição veicular (placas e reboques), tonelagem e chave PIX.',
    items: [
      {
        category: 'fix',
        title: 'Fim do Alerta Falso Positivo de Carta Frete ao Anexar Nota Fiscal',
        description: 'Reestruturada a precedência do classificador de arquivos. Agora, qualquer arquivo contendo indicadores de Nota Fiscal/DANFE (mesmo vinculado a contratos agrícolas como Bunge, Cargil ou Solida) é reconhecido com prioridade como Nota Fiscal, impedindo bloqueios ou advertências indevidas no modal de anexos.'
      },
      {
        category: 'improvement',
        title: 'Leitura Real e Completa do Contrato de Frete / Carta Frete',
        description: 'O extrator OCR e de texto foi refinado para ler com precisão o leiaute padrão MaisFrete / e-Frete: Cláusulas 1.1 (frete total e valor/ton), 1.2/1.3 (origem e destino), 1.6 (peso), 2.2 (pedágio e pedido Sem Parar), 2.4/2.5 (adiantamento 70%), 3.5 (cálculo de saldo, taxas de quebra e frete faltante), além de motorista, CNH, CPF, e composição veicular completa.'
      },
      {
        category: 'feature',
        title: 'Preenchimento Automático do Formulário com Dados do Contrato',
        description: 'Ao anexar a Carta Frete, o sistema agora autopreenche no lançamento a tonelagem da carga, o valor do frete e saldo a receber, a chave PIX do contratado e as placas do conjunto transportador sem necessidade de digitação manual.'
      }
    ]
  },
  {
    id: 'rel_2026_10_16_v2_70_67',
    version: 'v2.70.67',
    date: '16/10/2026',
    title: 'Correção Definitiva do Carregamento de Notas Fiscais e Otimização de Storage',
    summary: 'Diagnóstico e resolução definitiva do sumiço das Notas Fiscais no painel financeiro. O problema ocorria devido ao acúmulo de arquivos PDF/imagens em formato Base64 diretamente no banco e no localStorage, excedendo o limite de 5MB dos navegadores (QuotaExceededError) e bloqueando a renderização. Todos os 68 arquivos existentes foram migrados com sucesso para o Supabase Storage via CDN de alta velocidade, reduzindo o payload de 7.7MB para 62KB (99.2% menor), com upload direto de anexos e proteção total contra perda de dados.',
    items: [
      {
        category: 'fix',
        title: 'Fim do Erro de Cota (QuotaExceededError) no Navegador',
        description: 'Implementado o método seguro safeSetInvoicesLocalStorage que remove dados binários pesados do cache local, garantindo que o localStorage nunca trave e as notas fiscais nunca mais sumam da tela.'
      },
      {
        category: 'improvement',
        title: 'Migração Completa dos Anexos para Nuvem Supabase Storage',
        description: 'Todos os 53 PDFs de notas fiscais e 6 boletos anexados foram convertidos de base64 e armazenados no Supabase Storage com links públicos rápidos, reduzindo o tamanho do banco de 7.7MB para 62KB.'
      },
      {
        category: 'feature',
        title: 'Upload Automático e Direto de Novos Anexos',
        description: 'Novas Notas Fiscais e boletos agora são enviados diretamente para o bucket de nuvem em segundo plano com indicador de progresso "Salvando e Anexando...", garantindo abertura instantânea e carregamento sem gargalos.'
      },
      {
        category: 'security',
        title: 'Proteção Resiliente de Sincronização Remota',
        description: 'Ajustado o fluxo de sincronização para nunca sobrescrever dados remotos em caso de instabilidades pontuais de rede, mantendo histórico seguro e integridade de todos os lançamentos compartilhados.'
      }
    ]
  },
  {
    id: 'rel_2026_10_16_v2_70_66',
    version: 'v2.70.66',
    date: '16/10/2026',
    title: 'Cálculo e Exibição do KM do Percurso Exato das Ofertas de Frete',
    summary: 'Configuração completa para calcular e exibir a quilometragem (KM) rodoviária exata entre os pontos de coleta (Origem) e entrega (Destino) nas Ofertas de Frete, extraindo com precisão as coordenadas a partir dos links de localização informados (Google Maps, URLs encurtadas maps.app.goo.gl, coordenadas decimais e graus DMS).',
    items: [
      {
        category: 'feature',
        title: 'Coluna de Percurso na Tabela de Ofertas Pendentes',
        description: 'Nova coluna "Percurso" adicionada à tabela de ofertas pendentes exibindo a distância rodoviária calculada (ex: 260 km, 366 km) com indicador visual de "Pontos exatos" quando originada dos links de localização fornecidos.'
      },
      {
        category: 'feature',
        title: 'Extração Precisa de Coordenadas de Links de Localização',
        description: 'Desenvolvimento do serviço routeDistanceService e endpoint de resolução para descompactar links encurtados do Google Maps e extrair as coordenadas reais de fazendas, indústrias e silos para traçado rodoviário via OSRM.'
      },
      {
        category: 'improvement',
        title: 'Roteiro e Detalhes da Oferta Integrados',
        description: 'O mapa do roteiro e a visualização detalhada da oferta agora utilizam as coordenadas exatas dos links, com badge de confirmação e persistência automática dos dados no banco.'
      }
    ]
  },
  {
    id: 'rel_2026_10_16_v2_70_65',
    version: 'v2.70.65',
    date: '16/10/2026',
    title: 'Compactação e Otimização Visual dos Cards do Kanban do Dashboard',
    summary: 'Redução vertical da altura dos cards de embarque no dashboard operacional e financeiro. Unificação de linhas com posicionamento inteligente do Solicitante (e WhatsApp) ao lado do CT-e e integração do botão de ação primária (Anexar) e ferramentas de detalhes no cabeçalho e na linha de dados fiscais.',
    items: [
      {
        category: 'improvement',
        title: 'Redução da Altura Vertical dos Cards',
        description: 'Os cards foram reduzidos de 6 para 4 linhas enxutas, eliminando o excesso de espaçamento em branco e permitindo que significativamente mais embarques caibam na tela sem rolagem.'
      },
      {
        category: 'improvement',
        title: 'Solicitante Integrado na Linha Fiscal',
        description: 'Os dados do Solicitante e o ícone direto do WhatsApp foram reposicionados no espaço disponível entre o número do CT-e e o selo de Forma de Pagamento do motorista.'
      },
      {
        category: 'improvement',
        title: 'Botão de Ação e Ferramentas Otimizados',
        description: 'O botão de avanço/anexo de documento foi integrado no lado direito da linha fiscal, enquanto os atalhos de Ver Detalhes e Copiar Ficha foram movidos para o cabeçalho ao lado do SLA.'
      }
    ]
  },
  {
    id: 'rel_2026_10_16_v2_70_64',
    version: 'v2.70.64',
    date: '16/10/2026',
    title: 'Exibição da Forma de Pagamento do Motorista e Número do CT-e nos Cards do Dashboard',
    summary: 'Aprimoramento nas janelas do dashboard de gestão operacional e financeira dos embarques (Kanban). Agora cada card exibe de forma destacada o número do CT-e (com acesso rápido para visualização em nova aba e cópia de número) e a forma de pagamento informada para o motorista (PIX - E-FRETE, SMS CARTA FRETE, DEPÓSITO EM CONTA), além de suporte à cópia da chave Pix e busca integrada por esses campos.',
    items: [
      {
        category: 'feature',
        title: 'Número do CT-e Visível nos Cards do Kanban',
        description: 'Exibição do número do CT-e emitido diretamente no cabeçalho do card e em linha dedicada. Caso o arquivo PDF do CT-e esteja anexado, um clique abre o documento em tela cheia instantaneamente; botão de cópia rápida permite copiar o número com um clique.'
      },
      {
        category: 'feature',
        title: 'Forma de Pagamento do Motorista Identificada',
        description: 'Badge colorido com ícone representativo para cada modalidade cadastrada: PIX - E-FRETE (verde), SMS CARTA FRETE (roxo) e DEPÓSITO EM CONTA (azul). Quando houver chave Pix informada, o card oferece botão de cópia direta da chave sem precisar abrir o modal de detalhes.'
      },
      {
        category: 'improvement',
        title: 'Busca Inteligente & Ficha de WhatsApp Atualizada',
        description: 'A barra de pesquisa dos embarques agora permite localizar cards digitando o número do CT-e, modalidade de pagamento ou chave Pix. O botão de cópia da ficha resumida para WhatsApp passa a conter os dados do CT-e e da forma de pagamento do motorista.'
      }
    ]
  },
  {
    id: 'rel_2026_10_15_v2_70_63',
    version: 'v2.70.63',
    date: '15/10/2026',
    title: 'Restauração da Dedução de CIOT (0,20%) sobre Frete Líquido do Motorista para Todos os Embarques',
    summary: 'Correção e padronização integral da dedução de taxa do CIOT (0,20%) sobre o valor líquido do frete do motorista em todos os embarques da transportadora, independentemente da modalidade (PF/TAC ou PJ/ETC). O desconto é aplicado no painel de automatização do CT-e, no demonstrativo DRE de Lucro Líquido Real, na planilha de controle financeiro e nos relatórios gerenciais.',
    items: [
      {
        category: 'fix',
        title: 'Cálculo de CIOT (0,20%) Aplicado em Todos os Embarques',
        description: 'Eliminada a isenção indevida para transportadores PJ no painel de CT-e e na calculadora de despesas operacionais. Todos os embarques passam a deduzir 0,20% sobre o frete líquido do motorista (abatido o pedágio obrigatório e, para motoristas autônomos PF, as retenções de INSS e SEST/SENAT).'
      },
      {
        category: 'improvement',
        title: 'Identificação Clara no Card de Dedução do CIOT',
        description: 'O card de CIOT no Painel de Automatização do CT-e agora destaca a taxa de 0,20% Líq. (PJ ou PF) com detalhamento da base líquida utilizada no cálculo e débito em vermelho na composição do Lucro Real.'
      },
      {
        category: 'fix',
        title: 'Saneamento de Registros com Taxa CIOT Zerada',
        description: 'Varredura e saneamento de registros no banco de dados para restabelecer a taxa calculada do CIOT nos embarques onde havia sido gravado valor nulo ou zerado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_14_v2_70_62',
    version: 'v2.70.62',
    date: '14/10/2026',
    title: 'Visualização Inicial das Notas do Dia e Filtro Avançado por Período',
    summary: 'Configuração da tela de Notas Fiscais para abrir inicialmente exibindo as notas do dia (Hoje), evitando sobrecarga com todo o histórico e permitindo foco nas operações do dia a dia. Implementação de barra de filtros por período completa (Hoje, Ontem, Esta Semana, Mês Atual, Mês Anterior, Ano Atual, Personalizado De/Até e Todo o Histórico), com contadores dinâmicos e seletor da base de data (Emissão, Vencimento ou Lançamento).',
    items: [
      {
        category: 'feature',
        title: 'Exibição Inicial Automática das Notas do Dia',
        description: 'Ao carregar a tela de Notas Fiscais, o sistema inicializa filtrado por "Hoje (Notas do Dia)", apresentando os lançamentos fiscais da data corrente com contadores e totalizadores focados.'
      },
      {
        category: 'feature',
        title: 'Filtro Completo por Período e Intervalo Personalizado',
        description: 'Barra de períodos com botões rápidos para Hoje, Ontem, Esta Semana, Mês Atual, Mês Anterior, Ano Atual, Todo o Histórico e Período Personalizado com campos De/Até.'
      },
      {
        category: 'improvement',
        title: 'Seletor de Base de Data e Contadores Rápidos',
        description: 'Possibilidade de escolher qual data da nota utilizar no filtro (Data de Emissão, Data de Vencimento ou Data de Lançamento) e exibição da quantidade de notas em cada período nos botões.'
      }
    ]
  },
  {
    id: 'rel_2026_10_14_v2_70_61',
    version: 'v2.70.61',
    date: '14/10/2026',
    title: 'Bloqueio Inteligente Anti-Duplicidade de Notas Fiscais e Detecção em Tempo Real',
    summary: 'Implementação de validação rigorosa anti-duplicidade em duas camadas (Interface e Serviço/Banco de Dados). O sistema agora identifica e impede o lançamento de notas fiscais já cadastradas (por Chave de Acesso NFe de 44 dígitos ou por Número da NF + Fornecedor + Série), bloqueia o botão de salvar com alerta visual e sinaliza notas repetidas na listagem com filtro dedicado.',
    items: [
      {
        category: 'security',
        title: 'Bloqueio de Lançamento de Notas Repetidas',
        description: 'Prevenção ativa no serviço de persistência e no formulário: caso uma nota com o mesmo número/fornecedor ou a mesma chave de acesso já exista no sistema, o botão de salvar é bloqueado imediatamente e o usuário é notificado com detalhes da nota conflitante.'
      },
      {
        category: 'feature',
        title: 'Identificação e Alerta Visual em Tempo Real',
        description: 'Card de alerta proativo no modal de lançamento exibindo o ID, valor e responsável da nota já cadastrada, com botão direto "Abrir Nota Existente" para conferência ou edição rápida.'
      },
      {
        category: 'improvement',
        title: 'Destaque Visual e Filtro de Repetidas na Listagem',
        description: 'Notas repetidas recebem uma tag destacada ⚠️ Repetida [ID] na tabela e uma opção de filtro rápido "Ver Repetidas" na barra de ferramentas para auditoria e controle do setor fiscal.'
      }
    ]
  },
  {
    id: 'rel_2026_10_14_v2_70_60',
    version: 'v2.70.60',
    date: '14/10/2026',
    title: 'Restauração Consolidada de Notas Fiscais e Proteção contra Sobrescrita Multiusuário',
    summary: 'Correção crítica na camada de persistência e normalização de Notas Fiscais. Restauração integral dos lançamentos fiscais consolidados no Supabase, eliminação do filtro restritivo de prefixos e implementação de mesclagem bidirecional inteligente (Cloud-First Merge), garantindo que cadastros ou alterações feitas por diferentes usuários nunca excluam notas existentes.',
    items: [
      {
        category: 'fix',
        title: 'Restauração das Notas Fiscais no Banco de Dados',
        description: 'Recuperação completa dos lançamentos fiscais consolidados com identificadores sequenciais [nf-1...] e preservação dos anexos, restabelecendo o volume e os indicadores operacionais do financeiro.'
      },
      {
        category: 'security',
        title: 'Proteção contra Sobrescrita Concorrente (Cloud-First Merge)',
        description: 'O serviço de notas fiscais agora consulta a nuvem Supabase antes de gravar qualquer novo lançamento, alteração de status ou exclusão, prevenindo que a sincronização local de uma sessão substitua os dados de outra.'
      },
      {
        category: 'improvement',
        title: 'Normalização Segura sem Descarte de Prefixos',
        description: 'Refatoração da rotina de normalização para migrar com segurança qualquer formato legado de identificador para o padrão sequencial nf- sem perda de registros.'
      }
    ]
  },
  {
    id: 'rel_2026_10_14_v2_70_59',
    version: 'v2.70.59',
    date: '14/10/2026',
    title: 'Sincronização Realtime de Notas Fiscais, IDs Sequenciais [nf-1...] e Totais Compartilhados',
    summary: 'Refinamento completo da sincronização em tempo real das Notas Fiscais e Boletos anexados. Todos os lançamentos agora geram IDs sequenciais padronizados a partir de nf-1 e sincronizam instantaneamente via WebSockets na nuvem Supabase, garantindo que o volume total e os cards de indicadores apareçam de forma idêntica e simultânea para todos os usuários com acesso ao módulo financeiro.',
    items: [
      {
        category: 'feature',
        title: 'Sincronização Realtime em Nuvem Compartilhada',
        description: 'Implementação de canal WebSocket broadcast e sincronização centralizada no Supabase. Qualquer nota fiscal inserida, alterada ou anexada por qualquer usuário é refletida imediatamente na tela de todos os demais usuários sem necessidade de atualizar a página.'
      },
      {
        category: 'feature',
        title: 'Padronização de IDs Sequenciais (nf-1, nf-2, nf-3...)',
        description: 'Cada nota fiscal ou anexo gerado recebe automaticamente um identificador sequencial único iniciando em nf-1, com pré-visualização no modal de cadastro e destaque visual em badges tanto na aba de Notas Fiscais quanto no Contas a Pagar.'
      },
      {
        category: 'improvement',
        title: 'Totalização Global Compartilhada para Todos os Usuários',
        description: 'Barra informativa de status de sincronização em tempo real exibindo a contagem e a soma global de todas as notas fiscais do sistema para usuários autorizados, eliminando divergências locais.'
      },
      {
        category: 'improvement',
        title: 'Integração em Tempo Real com Contas a Pagar',
        description: 'A listagem e as baixas de notas fiscais vinculadas ao Contas a Pagar e aos Boletos são sincronizadas instantaneamente com identificadores visuais consolidados.'
      }
    ]
  },
  {
    id: 'rel_2026_10_14_v2_70_58',
    version: 'v2.70.58',
    date: '14/10/2026',
    title: 'Website Institucional Oficial (transcunhaoficial.com.br) e Acesso Direto Multicanal',
    summary: 'Lançamento do Website Institucional oficial com layout tecnológico de alto padrão, animações modernas, cobertura geográfica interativa, carrossel de marcas parceiras, simulador de cotação via WhatsApp e pontos de acesso direto integrados no menu do usuário e apresentação comercial.',
    items: [
      {
        category: 'feature',
        title: 'Novo Website Institucional Moderno (transcunhaoficial.com.br)',
        description: 'Página institucional pública de alta conversão, responsiva, com visual tech dark-mode, hero com elementos dinâmicos, contadores de métricas em tempo real, apresentação da frota, serviços agrícolas/industriais e link para o Portal do Cliente.'
      },
      {
        category: 'feature',
        title: 'Acesso Direto no Menu do Usuário (TopNavBar)',
        description: 'Inclusão do item "Website Institucional" diretamente no menu suspenso do usuário e no menu mobile para navegação ágil entre a plataforma operacional e o site público.'
      },
      {
        category: 'feature',
        title: 'Acesso Direto Integrado na Apresentação Comercial',
        description: 'Card interativo do portal oficial no slide de contato com botão "Acessar" e atalho dedicado no cabeçalho superior para acesso instantâneo ao website oficial.'
      },
      {
        category: 'improvement',
        title: 'Alinhamento Superior dos Quadros de Indicadores',
        description: 'Ajuste fino de distribuição nos cartões de métricas do Slide 3 (Fundadores, Rede Ativa, Sinistros e Cargas Asseguradas), com alinhamento uniforme ao topo e visual perfeitamente balanceado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_14_v2_70_57',
    version: 'v2.70.57',
    date: '14/10/2026',
    title: 'Refinamento de Enquadramento e Alinhamento Visual dos Campos no PDF Comercial',
    summary: 'Ajuste milimétrico de alinhamento vertical, baselines tipográficas e enquadramento de badges, selos e números nos slides da Apresentação Comercial para exportação em PDF de altíssima fidelidade.',
    items: [
      {
        category: 'fix',
        title: 'Enquadramento e Alinhamento dos Badges da Capa e Cabeçalho',
        description: 'Correção de baseline e espaçamentos internos nas cápsulas "Apresentação Institucional & Comercial", "Edição Oficial 2026", "Transportes & Logística Pesada" e "transcunhaoficial.com.br", eliminando proximidade com a borda inferior.'
      },
      {
        category: 'fix',
        title: 'Centralização Perfeita dos Blocos Numéricos (01, 02, 03)',
        description: 'Padronização dos containers numéricos de pilares operacionais e siglas estaduais com altura de linha dedicada, garantindo números perfeitamente centrados sem afundamento.'
      },
      {
        category: 'fix',
        title: 'Simetria e Ícones nos Cards de Números de Impacto',
        description: 'Padronização visual e inclusão do ícone de fundadores no Card 1, harmonizando todos os 4 cards (Fundadores, Rede Ativa, 2022-2026, Garantia) com selos de altura uniforme e alinhamento simétrico.'
      },
      {
        category: 'fix',
        title: 'Ajuste dos Selos do Portal do Embarcador e Rodapés',
        description: 'Refinamento do espaçamento dos selos "100% Online", "Em Viagem", "Concluído", da caixa de destaque contra planilhas manuais e do selo de paginação "Página 0X de 07".'
      }
    ]
  },
  {
    id: 'rel_2026_10_13_v2_70_56',
    version: 'v2.70.56',
    date: '13/10/2026',
    title: 'Nova Apresentação Comercial Institucional com Acesso Público e Exportação em PDF Horizontal',
    summary: 'Lançamento oficial do módulo e página pública de Apresentação Comercial da Transcunha Transportes e Logística. Apresentação completa em formato horizontal (landscape), com gerador de PDF de alta fidelidade, portfólio de marcas parceiras, diferencial da tecnologia própria do Portal do Cliente e acesso público direto por link.',
    items: [
      {
        category: 'feature',
        title: 'Apresentação Comercial em Formato Horizontal',
        description: 'Painel estilizado em 7 slides horizontais de alto impacto visual (Tons de Azul Tecnológico #0052CC e Grafite Dark #1E293B) destacando a empresa, estados de atuação, solidez com +15 anos, +5.000 motoristas e apenas 1 sinistro recente.'
      },
      {
        category: 'feature',
        title: 'Acesso Público e Acesso no Menu de Perfil',
        description: 'Acesso rápido dentro da janela do perfil de usuário ("Apresentação Comercial") e link público direto (/apresentacao e /apresentacao-comercial) acessível para qualquer pessoa sem exigir login.'
      },
      {
        category: 'feature',
        title: 'Exportador de PDF Horizontal Profissional',
        description: 'Botão dedicado para compilar e baixar a apresentação comercial completa em PDF com páginas no formato horizontal (paisagem) e botão para cópia rápida do link público.'
      },
      {
        category: 'improvement',
        title: 'Destaque para Clientes e Portal Tecnológico',
        description: 'Inclusão do painel de marcas clientes (Morroverde, Consube, Agrobom, Grão de Ouro, Mantiqueira, USJ, Adecoagro, Black Bio, Grupo Organics, DF Grãos) e detalhamento dos recursos do Portal do Cliente.'
      },
      {
        category: 'fix',
        title: 'Correção de Exportação do PDF e Padronização A4 Horizontal',
        description: 'Eliminação da falha de corrupção na compilação do PDF através de renderização off-screen dedicada em proporção A4 (1122x793), garantindo arquivo leve, nítido e com o mesmo design moderno do portal.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_55',
    version: 'v2.70.55',
    date: '12/10/2026',
    title: 'Padronização do Domínio Oficial Corporativo (transcunhaoficial.com.br)',
    summary: 'Ajuste definitivo do domínio institucional oficial da empresa para "transcunhaoficial.com.br", com migração automática das contas (@transcunhaoficial.com.br), atualização de servidores IMAP/SMTP, webmail, assinaturas digitais e telas do sistema.',
    items: [
      {
        category: 'fix',
        title: 'Domínio Oficial Corrigido',
        description: 'Definição do domínio "transcunhaoficial.com.br" como endereço oficial da organização em todas as configurações de e-mail e infraestrutura.'
      },
      {
        category: 'improvement',
        title: 'Migração Automática de Caixas Postais e Aliases',
        description: 'Sincronização inteligente com migração automática das contas e configurações locais para a terminação @transcunhaoficial.com.br, mantendo senhas e permissões intactas.'
      },
      {
        category: 'improvement',
        title: 'Assinaturas Institucionais e Links Atualizados',
        description: 'Atualização dos geradores de assinatura oficial e links de suporte e webmail para apontar diretamente para transcunhaoficial.com.br.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_54',
    version: 'v2.70.54',
    date: '12/10/2026',
    title: 'Módulo Completo de Administração de E-mail Corporativo (@transcunhaoficial.com.br)',
    summary: 'Criação do novo módulo dedicado para gerenciar e administrar contas de e-mail corporativo diretamente pelo sistema, integrado com o cadastro de colaboradores, controle de senhas e cotas, configuração de servidores SMTP/IMAP, acesso direto ao Webmail e gerador de assinaturas padronizadas.',
    items: [
      {
        category: 'feature',
        title: 'Painel Central de E-mail Corporativo',
        description: 'Módulo completo acessível pelo menu lateral em "Configurações > E-mail Corporativo", com métricas de caixas postais ativas, monitoramento de armazenamento utilizado/alocado e gestão de caixas departamentais e individuais.'
      },
      {
        category: 'feature',
        title: 'Integração Direta com Cadastro de Usuários',
        description: 'Campos dedicados no formulário de colaboradores em "Gerenciar Usuários" para criar ou vincular contas @transcunhaoficial.com.br, definir senhas fortes automáticas, cotas em GB e sincronização bidirecional.'
      },
      {
        category: 'feature',
        title: 'Parâmetros de Servidor & DNS (SMTP / IMAP / Webmail)',
        description: 'Configuração flexível com suporte a presets (cPanel Transcunha, Google Workspace, Microsoft 365, Zoho, Titan) e guias para configuração rápida no Outlook e celular.'
      },
      {
        category: 'improvement',
        title: 'Gerador de Assinaturas e Teste de Disparo',
        description: 'Ferramenta para gerar assinaturas profissionais oficiais com logo da empresa prontas para copiar (em texto e HTML), além de área para testar envio institucional direto pelo sistema.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_53',
    version: 'v2.70.53',
    date: '12/10/2026',
    title: 'Integração Direta de Boletos Anexados ao Contas a Pagar',
    summary: 'Configuração completa para que, ao anexar um boleto bancário no lançamento da Nota Fiscal, o registro seja vinculado e direcionado automaticamente para o painel de Contas a Pagar com a nota fiscal correspondente, dados de vencimento e linha digitável pronta para pagamento.',
    items: [
      {
        category: 'feature',
        title: 'Direcionamento Automático ao Contas a Pagar',
        description: 'Ao confirmar o lançamento de uma Nota Fiscal com boleto anexado, o sistema salva e redireciona automaticamente o usuário para a aba de "Contas a Pagar", destacando a NF com o boleto vinculado.'
      },
      {
        category: 'improvement',
        title: 'Vínculo Unificado de Documentos (NF + Boleto)',
        description: 'No painel de Contas a Pagar, o registro exibe botões dedicados de acesso rápido tanto para a Nota Fiscal quanto para o Boleto de Cobrança, além de linha digitável com botão de cópia instantânea.'
      },
      {
        category: 'improvement',
        title: 'Navegação Ágil e Botão de Acesso Rápido',
        description: 'Adicionado botão de navegação direta entre "Gestão de Notas Fiscais" e "Contas a Pagar", tanto no cabeçalho quanto na lista de ações de cada lançamento.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_52',
    version: 'v2.70.52',
    date: '12/10/2026',
    title: 'Anexo de Boleto Bancário e Preenchimento Automático de Valor e Vencimento',
    summary: 'Adicionada funcionalidade de anexo de boleto bancário para pagamento no lançamento de Notas Fiscais e Contas a Pagar, com leitura inteligente da linha digitável, código de barras e OCR multimodal, preenchendo automaticamente o Valor a Pagar (R$) e a Data de Vencimento.',
    items: [
      {
        category: 'feature',
        title: 'Anexo de Boleto para Pagamento',
        description: 'Campo dedicado para upload de boletos bancários (PDF, JPG, PNG e WebP) no modal "Lançar Nova Nota Fiscal", permitindo armazenar tanto o documento fiscal quanto o boleto de cobrança.'
      },
      {
        category: 'feature',
        title: 'Preenchimento Automático de Valor a Pagar e Vencimento',
        description: 'Ao anexar o boleto, o sistema decodifica instantaneamente a linha digitável e o código de barras Febraban (além de reconhecimento textual e IA), preenchendo de forma automática o campo "Valor a Pagar (R$)" e a "Data de Vencimento".'
      },
      {
        category: 'improvement',
        title: 'Preenchimento de Linha Digitável e Forma de Pagamento',
        description: 'A forma de pagamento é automaticamente definida como "Boleto" e a linha digitável/código de barras é inserida no campo "Dados para Pagamento", agilizando a conciliação bancária.'
      },
      {
        category: 'improvement',
        title: 'Visualização Rápida de Boletos nas Tabelas Financeiras',
        description: 'Botão "Boleto" em destaque tanto na tabela de Gestão de Notas Fiscais quanto na tabela unificada de Contas a Pagar, permitindo ao setor financeiro visualizar ou baixar o boleto com um único clique.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_51',
    version: 'v2.70.51',
    date: '12/10/2026',
    title: 'Novo Cadastro de Expedidor/Recebedor e Integração na Ordem de Carregamento',
    summary: 'Configuração e criação do novo módulo de Cadastro chamado "Expedidor/Recebedor" para registro completo de locais (origem/destino de cargas: Fazenda, Galpão, Porto, etc.) com CNPJ ou CPF, Telefone com identificador de WhatsApp, classificação fixa "Ambos" (Expedidor/Recebedor), sugestão automática de link do Maps e exibição prioritária na Ordem de Carregamento em PDF com preservação de sigilo telefônico.',
    items: [
      {
        category: 'feature',
        title: 'Módulo de Cadastro "Expedidor/Recebedor"',
        description: 'Disponibilizado no menu "Cadastro" (Sidebar e TopNavBar) e na matriz de permissões com gestão completa: inclusão, edição, busca inteligente, exclusão e importação/sincronização de locais cadastrados.'
      },
      {
        category: 'feature',
        title: 'Dados Fiscais e de Contato com Validação',
        description: 'Opção de informar CNPJ ou CPF com máscara e validação automática, Telefone formatado com indicador se possui WhatsApp para disparo de mensagens, Cidade, UF e Link do Google Maps.'
      },
      {
        category: 'feature',
        title: 'Classificação Fixa "Ambos" (Expedidor/Recebedor)',
        description: 'Conforme especificado, a classificação do local é travada permanentemente como "Ambos", garantindo que qualquer local cadastrado possa ser utilizado tanto na origem quanto no destino das cargas.'
      },
      {
        category: 'feature',
        title: 'Cadastro Direto de Expedidor/Recebedor Dentro da Carga',
        description: 'Adicionados botões "+ Cadastrar Local" e atalhos de "Editar" diretamente nos cards de Origem e Destino do formulário de carga. Abre modal rápido permitindo preencher Nome, CNPJ/CPF, Telefone, WhatsApp e Maps sem sair do cadastro da carga, com preenchimento e seleção imediata.'
      },
      {
        category: 'improvement',
        title: 'Autocompletar Inteligente no Cadastro de Cargas',
        description: 'Os campos "Local / Fazenda / Galpão" (origem) e "Local / Porto / Galpão" (destino) nas cargas agora possuem autocompletar integrado à lista de locais cadastrados, preenchendo automaticamente o link do Google Maps quando disponível e registrando novos locais salvos.'
      },
      {
        category: 'improvement',
        title: 'Otimização de Contraste e Paleta de Cores nos Modais',
        description: 'Aprimoramento completo dos tons de fundo, textos, labels e botões nos modais de Expedidor/Recebedor, eliminando informações apagadas e garantindo nitidez e contraste absoluto tanto no modo claro quanto no tema escuro.'
      },
      {
        category: 'security',
        title: 'Nome do Local na Ordem de Carregamento sem Exposição Telefônica',
        description: 'O PDF da Ordem de Carregamento agora destaca o Nome do Local e CNPJ/CPF em "ORIGEM DO CARREGAMENTO" e "DESTINO DA CARGA", garantindo estrita privacidade ao NÃO exibir o número de telefone do local no documento impresso.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_50',
    version: 'v2.70.50',
    date: '12/10/2026',
    title: 'Leitura de CT-e Complementar em Estadias e Integração no Relatório de Lucro Real',
    summary: 'Configurada a leitura automatizada de CT-e complementar no Histórico de Estadias com identificação e persistência do número do documento, e integração completa dos números de CT-e complementar no Relatório em PDF de "Lucro Real da Operação" e na interface do sistema.',
    items: [
      {
        category: 'feature',
        title: 'Leitura e Exibição de CT-e Complementar nas Estadias',
        description: 'Ao anexar um arquivo PDF ou XML no Histórico de Estadias, o sistema realiza a leitura instantânea do CT-e, extrai automaticamente o número do documento (e sugere o valor aprovado), exibe campo dedicado para conferência do número e disponibiliza botão de leitura direta para documentos já armazenados.'
      },
      {
        category: 'feature',
        title: 'CT-es de Complemento no PDF de Lucro Real da Operação',
        description: 'A exportação em PDF do Relatório de Lucro Real agora consolida e exibe na coluna de CT-e todos os CT-es complementares associados às estadias daquele embarque (ex: "2211 / Comp: 2450"), proporcionando rastreabilidade contábil e operacional completa.'
      },
      {
        category: 'improvement',
        title: 'Badges em Destaque nos Cards e na Tabela',
        description: 'No Histórico de Estadias e na tabela de Lucro Real da Operação, adicionadas badges visuais de alto contraste com o número do CT-e complementar e link direto para visualização do documento anexado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_49',
    version: 'v2.70.49',
    date: '12/10/2026',
    title: 'Bloqueio Automático e Trava Contra Anexo de Documentos Duplicados',
    summary: 'Implementado sistema de validação inteligente de duplicidade nos anexos do embarque. Qualquer tentativa de anexar o mesmo documento duplicado (seja no mesmo campo, em categorias diferentes, ou em relação a documentos já gravados no embarque e no fluxo de substituição de CT-e) é imediatamente travada e rejeitada, com alerta explicativo para o usuário.',
    items: [
      {
        category: 'security',
        title: 'Trava Imediata na Seleção de Arquivos',
        description: 'Ao arrastar, colar ou selecionar arquivos nos campos de upload, o sistema verifica em tempo real o nome e a integridade do arquivo. Documentos duplicados são descartados e bloqueados imediatamente com mensagem de erro.'
      },
      {
        category: 'fix',
        title: 'Prevenção de Duplicidades Globais no Embarque',
        description: 'A verificação compara os novos arquivos contra todos os documentos já persistidos no banco para o embarque, contra arquivos selecionados em outros campos da mesma sessão e contra o documento original no modal de cancelamento/substituição de CT-e.'
      },
      {
        category: 'improvement',
        title: 'Barreira Dupla de Segurança no Salvamento',
        description: 'Adicionada validação definitiva no momento do envio e avanço de etapa, garantindo que nenhum documento redundante ou repetido seja gravado no storage ou nos registros do embarque.'
      }
    ]
  },
  {
    id: 'rel_2026_10_12_v2_70_48',
    version: 'v2.70.48',
    date: '12/10/2026',
    title: 'Cancelamento e Substituição Rastreável de CT-e com Preservação de Histórico',
    summary: 'Implementação de fluxo seguro e integrado para cancelamento de CT-e com exigência obrigatória de anexo e cadastro de CT-e substituto. O CT-e cancelado é mantido no histórico com identificação visual (badge CANCELADO e proteção contra exclusão), e todos os módulos e planilhas do sistema exibem a cadeia completa de CT-es participantes (ex: 2211/2233).',
    items: [
      {
        category: 'feature',
        title: 'Botão e Modal "Cancelar & Substituir CT-e"',
        description: 'No gerenciador de anexos do embarque, os CT-es ativos contam com a opção "Substituir". Ao acionar, abre-se um assistente que exige o upload do novo CT-e (PDF/XML), extrai ou recebe o novo número, registra a justificativa fiscal e vincula o substituto imediatamente.'
      },
      {
        category: 'feature',
        title: 'Preservação de Histórico de CT-es Cancelados',
        description: 'Os documentos cancelados permanecem arquivados e visualizáveis com marcação "CANCELADO" e detalhes da auditoria (motivo, data/hora e autor), bloqueando exclusões acidentais.'
      },
      {
        category: 'improvement',
        title: 'Exibição da Cadeia Completa em Todos os Fronts (ex: 2211/2233)',
        description: 'Todos os módulos do sistema (Planilha de Controle, Detalhes do Embarque, Kanban, Contas a Receber e Relatórios) passam a apresentar a cadeia completa dos CT-es participantes separados por barra, com ordenação numérica inteligente baseada no CT-e substituto ativo e acesso direto ao PDF do CT-e vigente.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_47',
    version: 'v2.70.47',
    date: '11/10/2026',
    title: 'Exibição da Filial Informada na Carga na Coluna Cliente Tomador Pagador',
    summary: 'Ajuste na Planilha de Controle para identificar e exibir a filial exata informada na carga (ex: Organics - Gurupi, Organics Aruanã, Organics Formosa, Organics Nazário, Organics Campo Verde, etc.), em vez de fixar o tomador padrão da Matriz (Organics - Mineiros).',
    items: [
      {
        category: 'fix',
        title: 'Resolução da Filial na Coluna Tomador Pagador',
        description: 'A coluna CLIENTE TOMADOR PAGADOR agora verifica a filial selecionada na carga (clientBranchId e clientCnpj), os metadados da carga e os documentos do embarque, exibindo o nome específico da filial pagadora informada.'
      },
      {
        category: 'improvement',
        title: 'Filtros por Filial Específica',
        description: 'Com a diferenciação correta das filiais por viagem, o filtro da coluna CLIENTE TOMADOR PAGADOR passa a listar cada filial individualmente, permitindo consultas e análises segmentadas por unidade.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_46',
    version: 'v2.70.46',
    date: '11/10/2026',
    title: 'Ordenação Dinâmica das Linhas por Número de CT-e (Crescente ou Decrescente)',
    summary: 'Ajuste e ativação da alternância bidirecional da ordenação das linhas da Planilha de Controle pelo número de CT-e, permitindo alternar de forma instantânea entre ordem Decrescente (maior para o menor) e Crescente (menor para o maior), com suporte a clique direto no cabeçalho e botão dedicado na barra de ferramentas.',
    items: [
      {
        category: 'feature',
        title: 'Alternância Crescente / Decrescente por CT-e',
        description: 'Ao clicar no cabeçalho "CTE" (tanto na Linha 1 de setores quanto na Linha 2 de colunas), a ordenação agora alterna perfeitamente entre Decrescente (▼) e Crescente (▲), reordenando numericamente todas as linhas.'
      },
      {
        category: 'improvement',
        title: 'Botão de Controle Rápido na Barra de Ferramentas',
        description: 'Adicionado botão dedicado "CT-e: Crescente (▲) / Decrescente (▼)" na barra de filtros superior e no cabeçalho da visualização em tela cheia para alternância rápida e visibilidade do estado atual de classificação.'
      },
      {
        category: 'fix',
        title: 'Preservação de Linhas com CT-e Válido no Topo',
        description: 'Ao ordenar em ordem Crescente, o algoritmo agora mantém os embarques com CT-e emitido organizados do menor para o maior no topo, sem empurrar registros vazios/sem CT-e para o início da lista.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_45',
    version: 'v2.70.45',
    date: '11/10/2026',
    title: 'Exibição Completa do CIOT com Barra e Sufixo Operacional na Planilha',
    summary: 'Correção da exibição do CIOT na Planilha de Controle e nos módulos do sistema, garantindo que a barra "/" e os dígitos informados após a barra (ex: 520.038.012.363/9057) sejam integralmente preservados e exibidos, sem qualquer corte ou truncamento para 12 dígitos.',
    items: [
      {
        category: 'fix',
        title: 'Preservação dos Dígitos Após a Barra no CIOT',
        description: 'Eliminado o truncamento para 12 dígitos. Números de CIOT informados manualmente ou extraídos de Declarações de Operação de Transporte/Carta Frete (ex: 520.038.012.363/9057) agora mantêm a barra e todo o código complementar visível na planilha e nas exportações.'
      },
      {
        category: 'improvement',
        title: 'Ajuste de Largura e Layout da Coluna CIOT',
        description: 'A coluna CIOT na planilha de controle foi expandida e configurada com não quebra de linha (whitespace-nowrap), acomodando com total legibilidade e nitidez os números completos com máscara e barra.'
      },
      {
        category: 'fix',
        title: 'Sincronização Retroativa em Massa de Todos os Embarques',
        description: 'Processamento de varredura nos 414 embarques com Carta Frete/Declaração de Operação de Transporte anexadas: 398 embarques foram atualizados no banco de dados com a numeração completa com barra (ex: 520.038.043.809/4484), preenchendo todas as linhas da planilha.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_44',
    version: 'v2.70.44',
    date: '11/10/2026',
    title: 'Sincronização Automática do Número do CIOT (Declaração de Operação de Transporte)',
    summary: 'Aprimoramento do analisador fiscal e do sincronizador de documentos para leitura direta do campo "NÚMERO DO CIOT" presente na "DECLARAÇÃO DE OPERAÇÃO DE TRANSPORTE" / Carta Frete (ex: 520.038.012.363/9057), com preenchimento automático na planilha de controle e recuperação retrospectiva de embarques sem CIOT.',
    items: [
      {
        category: 'feature',
        title: 'Reconhecimento Estrito do CIOT em Declaração de Operação de Transporte',
        description: 'Implementado algoritmo de detecção que captura com exatidão o formato oficial ANTT (ex: 520.038.012.363/9057) mesmo havendo quebras de linha ou dados da instituição de pagamento no cabeçalho, normalizando para os 12 dígitos oficiais da planilha.'
      },
      {
        category: 'fix',
        title: 'Sincronização e Correção Retrospectiva dos Embarques na Planilha',
        description: 'Todos os embarques anteriores com Carta Frete anexada que apresentavam "-" na coluna de CIOT tiveram seus números de CIOT sincronizados e gravados no banco de dados, eliminando campos vazios na planilha.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_43',
    version: 'v2.70.43',
    date: '11/10/2026',
    title: 'Menu de Ações do Embarque Mais Compacto (-30%)',
    summary: 'Redução de aproximadamente 30% nas dimensões do menu de contexto de ações rápidas dos embarques (ícone de 3 pontos), tornando os itens, espaçamentos e largura mais elegantes e ocupando menos espaço em tela.',
    items: [
      {
        category: 'improvement',
        title: 'Redução Proporcional da Janela / Dropdown',
        description: 'Largura reduzida de 224px (w-56) para 172px, fontes reduzidas para text-xs, ícones para 14px e paddings otimizados (px-2.5 py-1), mantendo o alinhamento perfeito com o botão de acionamento.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_42',
    version: 'v2.70.42',
    date: '11/10/2026',
    title: 'Remoção de Metadados e Propriedades do Painel "Gerenciar Anexos"',
    summary: 'Limpeza e filtro estrito na listagem de documentos da linha do tempo e do modal "Gerenciar Anexos". Campos de dados textuais e números (como codg_atua, nfe_number, owner_name, ciot_number, mdfe_number, antt_modality, etc.) não são mais exibidos como se fossem anexos, mantendo apenas arquivos reais (PDF, imagens, XML).',
    items: [
      {
        category: 'fix',
        title: 'Filtro Estrito de Arquivos Reais nos Anexos',
        description: 'Chaves de metadados internos gravadas no objeto de documentos (como codg_atua, nfe_number, ciot_number, owner_name, driver_freight_type) foram bloqueadas de aparecer como cards de documentos. Agora apenas links e arquivos reais navegáveis são listados.'
      },
      {
        category: 'improvement',
        title: 'Organização Visual do Painel de Documentos da Linha do Tempo',
        description: 'A lista "Documentos e Comprovantes Vinculados a esta Etapa" agora exibe com clareza somente os anexos legítimos vinculados pelo operador ou emitidos pelo sistema, eliminando poluição visual.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_41',
    version: 'v2.70.41',
    date: '11/10/2026',
    title: 'Bloqueio de Edição do "Adiantamento PG" e Validação Obrigatória com Carta Frete',
    summary: 'O campo "Adiantamento PG" agora é estritamente bloqueado para edição manual (read-only) e deve ser idêntico ao "referente Adiantamento de viagem" extraído da Carta Frete. Se houver divergência com o cálculo do sistema, o botão "Salvar e Avançar" é travado até a correção.',
    items: [
      {
        category: 'security',
        title: 'Bloqueio de Edição Manual do Campo "Adiantamento PG"',
        description: 'O campo "Adiantamento PG" foi configurado como somente leitura (com ícone de cadeado e status Bloqueado), impedindo alterações manuais arbitrárias e garantindo que o adiantamento reflita com precisão o contrato fiscal.'
      },
      {
        category: 'feature',
        title: 'Alinhamento com "referente Adiantamento de viagem" da Carta Frete',
        description: 'O parser fiscal extrai com prioridade os itens contratuais de adiantamento (ex: "2.4 R$ 4.068,61 referente Adiantamento de viagem") e preenche automaticamente o valor a ser pago ao motorista.'
      },
      {
        category: 'security',
        title: 'Trava nos Campos "Valor pago no Tag" e "% Adiantamento" em Ag. Adiantamento',
        description: 'No status "Ag. Adiantamento", os campos "Valor pago no Tag" e "% Adiantamento" passam a ser estritamente bloqueados para edição manual (read-only e status Fixo com ícone de cadeado), preservando os valores já validados na emissão contratual.'
      },
      {
        category: 'security',
        title: 'Trava no Botão "Salvar e Avançar" em Caso de Divergência',
        description: 'Caso o cálculo do sistema ou o valor gravado divirja do Adiantamento de viagem da Carta Frete, é exibido um alerta em destaque e o avanço da etapa é completamente bloqueado. Foi adicionado um botão de 1 clique para alinhar e corrigir o valor instantaneamente, liberando o avanço.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_40',
    version: 'v2.70.40',
    date: '11/10/2026',
    title: 'Separação Estrita de Validação Fiscal: CT-e (Frete Empresa) vs Carta Frete (Motorista)',
    summary: 'Ajuste no classificador de documentos para que o arquivo de CT-e anexado nunca seja confundido com Carta Frete em razão do CIOT. O "VALOR TOTAL DO SERVIÇO" do CT-e (R$ 8.339,40) é estritamente validado contra o "Total Frete Emp", eliminando divergências indevidas no frete do motorista.',
    items: [
      {
        category: 'fix',
        title: 'Isolamento do CT-e para Validação Exclusiva de Frete Empresa',
        description: 'Documentos anexados no campo CT-e agora alimentam exclusivamente o campo VALOR TOTAL DO SERVIÇO para validação do Total Frete Emp da empresa, impedindo que o valor do serviço do CT-e sobrescreva ou compare com a Carta Frete do motorista.'
      },
      {
        category: 'fix',
        title: 'Eliminação da Falsa Divergência de Frete Motorista',
        description: 'Corrigida a identificação para que o CT-e com CIOT não seja interpretado como Carta Frete. A Carta Frete anexada (R$ 5.812,30) agora confere perfeitamente com o frete do motorista do sistema (R$ 5.812,30), sem acusar divergência.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_39',
    version: 'v2.70.39',
    date: '11/10/2026',
    title: 'Correção e Blindagem do Total Frete Motorista (Taxa vs Frete Empresa)',
    summary: 'Correção do valor de Frete Motorista gravado indevidamente com o Frete Empresa no embarque SUP-705 e implementação de blindagem para garantir que o Total Frete MTR sempre respeite a taxa real do motorista por tonelada (R$ 130,00/ton), descontando o pedágio.',
    items: [
      {
        category: 'fix',
        title: 'Correção do Frete Motorista do Embarque SUP-705',
        description: 'Ajustado o frete do motorista de R$ 8.550,00 (que correspondia ao frete empresa de R$ 180,00/ton) para R$ 6.022,90 bruto (R$ 130,00/ton para 46,33 ton), resultando em R$ 5.812,30 líquido com o abatimento do pedágio (-R$ 210,60), compatível com a Carta Frete / Contrato Nº 2078/1.'
      },
      {
        category: 'security',
        title: 'Blindagem Contra Contaminação de Frete Empresa no Frete Motorista',
        description: 'Implementada trava no cálculo dos cards e no comparador de divergências: se houver discrepância entre o frete armazenado e a taxa contratada do motorista por tonelada (driverRate * toneladas), o sistema prioriza automaticamente a taxa cadastrada do motorista, impedindo que o valor do serviço do CT-e sobrescreva o pagamento do motorista.'
      }
    ]
  },
  {
    id: 'rel_2026_10_11_v2_70_38',
    version: 'v2.70.38',
    date: '11/10/2026',
    title: 'Aprimoramento na Identificação de Carta Frete / Contrato de Transporte',
    summary: 'Correção da classificação de documentos de Carta Frete e Contratos de Transporte Rodoviário (ex: Contrato nº 2078/1, CIOT 5200380123639057), eliminando falsos positivos de erro causados por citações contratuais a "Dacte (CT-e)".',
    items: [
      {
        category: 'fix',
        title: 'Eliminação de Falso Positivo de CT-e em Carta Frete',
        description: 'Corrigida a lógica de classificação para identificar o documento como Carta Frete / Contrato de Transporte logo pelo cabeçalho oficial ("Contrato de Prestação de Serviço de Transporte/Frete", "CIOT", "Composição do Adiantamento de Frete"), impedindo que menções contratuais à entrega do Dacte (CT-e) assinado na cláusula de quitação de saldo o classifiquem incorretamente como CT-e.'
      },
      {
        category: 'improvement',
        title: 'Prioridade Total a Nomes de Arquivo de Carta Frete',
        description: 'Arquivos cujo nome inicie ou contenha termos indicativos de Carta Frete (como "Carta Frete - ...", "_cf_", "contrato") são imediatamente validados como Carta Frete no campo correspondente, evitando avisos indevidos de documento incorreto.'
      },
      {
        category: 'improvement',
        title: 'Extração Aprimorada do Valor Total do Frete Contratual',
        description: 'Reforçada a captura da cláusula "1.1 Valor total do frete R$ ..." para garantir a leitura correta do frete motorista sem pedágio diretamente do contrato anexado.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_37',
    version: 'v2.70.37',
    date: '10/10/2026',
    title: 'Detecção de Documento Incorreto e Correção em 1 Clique (MDF-e em Carta Frete)',
    summary: 'Configuração do sistema para alertar como erro visual sempre que um documento for anexado no campo errado (por exemplo, MDF-e anexado no campo Carta Frete, ou CT-e/NF-e em campos trocados), oferecendo botão de ação imediata para "Mover para [Campo Correto]" ou "Remover".',
    items: [
      {
        category: 'feature',
        title: 'Alerta de Erro para Documento Fiscal no Campo Incorreto',
        description: 'Ao anexar um arquivo cujo conteúdo ou nome indique outro documento fiscal (como MDF-e / DAMDFE no campo de Carta Frete), o item é destacado em vermelho com indicador pulsante e mensagem explicativa de erro.'
      },
      {
        category: 'feature',
        title: 'Opção de Correção em 1 Clique ("Mover para MDF-e")',
        description: 'Adicionado botão de ação rápida diretamente no item incorreto que transfere o arquivo para o campo correto com um único clique (ex: transfere de Carta Frete para MDF-e), além de botão para remoção do anexo se desejado.'
      },
      {
        category: 'improvement',
        title: 'Bloqueio de Segurança e Notificação Instantânea',
        description: 'Ao anexar ou soltar um arquivo trocado, o sistema notifica o operador via Toast e exibe alerta informativo no modal, bloqueando o avanço indevido até que os documentos estejam em suas categorias corretas.'
      },
      {
        category: 'fix',
        title: 'Isolamento de Extração de Valores entre MDF-e e Carta Frete',
        description: 'Aprimorado o analisador fiscal para que um MDF-e anexado por engano no campo Carta Frete não corrompa a leitura automática do frete motorista.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_36',
    version: 'v2.70.36',
    date: '10/10/2026',
    title: 'Identificação e Validação de Divergências em ICMS e Vale-Pedágio',
    summary: 'Implementada a mesma lógica de identificação, conciliação e alerta de divergências para o "ICMS" e "Vale-Pedágio", comparando os dados informados/cadastrados no sistema com os valores destacados nos documentos fiscais anexados (CT-e e Carta Frete).',
    items: [
      {
        category: 'feature',
        title: 'Validação e Notificação de Divergência de ICMS (Sistema vs CT-e)',
        description: 'Aprimorada a conferência fiscal para alertar sempre que o ICMS no sistema divergir do valor destacado no CT-e (inclusive quando o sistema estiver como Isento R$ 0,00 e o CT-e possuir destaque de ICMS). O operador pode escolher com um clique: "Atualizar para ICMS do CT-e" ou "Manter ICMS do Sistema".'
      },
      {
        category: 'feature',
        title: 'Validação e Notificação de Divergência de Vale-Pedágio (Sistema vs Documento)',
        description: 'Implementado card de divergência para o Vale-Pedágio: caso o valor de pedágio cadastrado no sistema difira do valor lido no CT-e ou na Carta Frete, o sistema notifica o operador e permite optar entre "Atualizar para Pedágio do Documento" ou "Manter Pedágio do Sistema".'
      },
      {
        category: 'improvement',
        title: 'Indicadores Visuais no Painel de Custos / DRE',
        description: 'Os cards "ICMS Destacado" e "Vale-Pedágio" no painel de custos automatizado agora exibem badges destacados de aviso ("Divergência CT-e" / "Divergência Doc") assim que é detectada diferença em relação aos documentos.'
      },
      {
        category: 'improvement',
        title: 'Extração Robusta de ICMS e Pedágio em Tabelas do DACTE',
        description: 'O leitor fiscal foi atualizado para capturar com máxima precisão os valores de ICMS e Pedágio listados na tabela de componentes da prestação de serviço do DACTE (ex: ICMS 583,76 e PEDAGIO 210,60).'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_35',
    version: 'v2.70.35',
    date: '10/10/2026',
    title: 'Padronização de Frete Motorista no Sistema e Carta Frete Anexada (Sem Pedágio)',
    summary: 'Configuração e harmonização do Frete Motorista para que ambos os lados da conferência — "Frete Motorista no Sistema" e "Carta Frete Anexada" — considerem o frete total motorista sem o valor do pedágio, conforme especificado na legislação (Lei nº 10.209/2001) e nos contratos de transporte.',
    items: [
      {
        category: 'fix',
        title: 'Frete Motorista no Sistema (Sem Pedágio)',
        description: 'No card de conferência/divergência do modal de anexos, o "Frete Motorista no Sistema" agora considera o frete total do motorista líquido sem o valor do pedágio (ex: R$ 5.812,30 ao invés do bruto com pedágio R$ 6.022,90), alinhado ao card "TOTAL FRETE MTR" do cabeçalho e DRE.'
      },
      {
        category: 'fix',
        title: 'Carta Frete Anexada sem Dedução Dupla de Pedágio',
        description: 'A leitura da Carta Frete / Contrato de Transporte foi ajustada para reconhecer que o "1.1 Valor total do frete" declarado no documento já é contratualmente o frete sem pedágio (o vale-pedágio é discriminado e pago em TAG separadamente no item 2.2). Com isso, o pedágio não é mais subtraído erroneamente pela segunda vez, eliminando falsas divergências.'
      },
      {
        category: 'improvement',
        title: 'Atualização e Conciliação Transparente',
        description: 'Caso exista divergência real entre o frete da carta frete e o frete cadastrado no sistema, os botões de ação e a confirmação exibem os valores exatos sem pedágio e efetuam a atualização com perfeita recomposição dos valores financeiros.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_34',
    version: 'v2.70.34',
    date: '10/10/2026',
    title: 'Frete Motorista sem Pedágio e Validação de Frete Empresa (CT-e vs Sistema)',
    summary: 'Ajuste na leitura e conciliação da Carta Frete para desconsiderar o valor do pedágio do frete do motorista, além de implementação de notificação e validação de divergência para Frete Empresa: "VALOR TOTAL DO SERVIÇO - CTE precisa ser igual ao Total Frete Emp do sistema".',
    items: [
      {
        category: 'feature',
        title: 'Frete Motorista sem Pedágio',
        description: 'A leitura da Carta Frete (PAMCARD, Repom, CTRC) e a validação de divergência agora consideram estritamente o valor do frete líquido sem pedágio (abatendo o vale-pedágio quando o valor do documento for bruto). Isso elimina alertas falsos e garante que o frete motorista do sistema corresponda ao frete real.'
      },
      {
        category: 'feature',
        title: 'Validação e Notificação de Frete Empresa (CT-e vs Sistema)',
        description: 'Implementado alerta de divergência na conferência fiscal e na DRE: o VALOR TOTAL DO SERVIÇO do CT-e precisa ser igual ao Total Frete Emp do sistema. Caso haja diferença superior a R$ 1,00, o sistema alerta o operador e permite escolher com um clique qual valor deve prevalecer antes de avançar o status.'
      },
      {
        category: 'improvement',
        title: 'Leitura Precisa do Campo "VALOR TOTAL DO SERVIÇO" no DACTE',
        description: 'Aprimorado o algoritmo de leitura OCR/PDF do DACTE para capturar com 100% de precisão o campo oficial "VALOR TOTAL DO SERVIÇO", mesmo quando há quebras de linha ou tabela de componentes (tarifa, frete valor, pedágio, icms) intermediárias antes do total.'
      },
      {
        category: 'improvement',
        title: 'Indicador Visual no Painel de Custos / DRE',
        description: 'O card "CT-e Frete Bruto" agora exibe um badge de divergência caso o valor total do serviço lido no CT-e divirja do total de frete empresa calculado no sistema.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_33',
    version: 'v2.70.33',
    date: '10/10/2026',
    title: 'Restrição Estrita da Leitura do "Valor NF" Apenas à Categoria "Nota Fiscal"',
    summary: 'Arquivos anexados no campo "Ticket de Carregamento" (mesmo que contenham cópias de DANFE/NF) agora são estritamente desconsiderados para a soma do "Valor NF", evitando duplicidade quando o usuário anexa as notas em ambos os campos. O cálculo do "Valor NF" considera única e exclusivamente os documentos anexados na pasta/campo "Nota Fiscal".',
    items: [
      {
        category: 'fix',
        title: 'Exclusão do Ticket de Carregamento da Soma de NF-e',
        description: 'Criada a validação isStrictNotaFiscalCategory garantindo que apenas arquivos vinculados diretamente ao campo "Nota Fiscal" tenham seus valores e números computados no "Valor NF". Anexos de Ticket de Carregamento, pesagem ou balança são ignorados para a apuração do valor da mercadoria.'
      },
      {
        category: 'improvement',
        title: 'Deduplicação de Arquivos e Chaves de Acesso',
        description: 'Implementado rastreamento e deduplicação de chaves de acesso e números de NF anexados, prevenindo que um mesmo documento anexado mais de uma vez duplique o somatório.'
      },
      {
        category: 'fix',
        title: 'Ajuste do Embarque SUP-705 para R$ 12.045,77',
        description: 'Corrigido o embarque SUP-705 no banco de dados, removendo a duplicação indevida (R$ 24.091,54) e restaurando o valor consolidado correto de R$ 12.045,77 referente às notas anexadas.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_32',
    version: 'v2.70.32',
    date: '10/10/2026',
    title: 'Soma Automática de Múltiplas Notas Fiscais no Campo "Valor NF"',
    summary: 'Configuração do cálculo e sincronização automática de documentos para somar o valor de todas as notas fiscais anexadas na categoria "Nota Fiscal" (ex: 2 ou mais notas anexadas) no card Valor NF da DRE e persistir no banco de dados, além de concatenar os números das notas fiscais.',
    items: [
      {
        category: 'feature',
        title: 'Soma Acumulada de Múltiplas NF-es no "Valor NF"',
        description: 'Quando o usuário anexa 2 ou mais arquivos na categoria "Nota Fiscal", o sistema agora extrai e soma o valor de cada uma das notas anexadas, preenchendo automaticamente o valor consolidado no campo "Valor NF" da DRE e na base do seguro.'
      },
      {
        category: 'fix',
        title: 'Concatenação de Números de Notas Fiscais Anexadas',
        description: 'Os números de todas as notas fiscais anexadas agora são concatenados em ordem (ex: 109726, 109731) em vez de registrar apenas a última nota lida.'
      },
      {
        category: 'improvement',
        title: 'Atualização do Embarque SUP-705',
        description: 'O embarque SUP-705 foi consolidado no banco de dados com a soma de R$ 12.045,77 referente às duas notas fiscais anexadas (NF 109726 de R$ 7.399,58 + NF 109731 de R$ 4.646,19).'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_31',
    version: 'v2.70.31',
    date: '10/10/2026',
    title: 'Restrição de Permissão de Veículos na Solicitação de Embarque para Embarcador e Agenciador',
    summary: 'Ocultação do botão "Permitir Este Veículo" e bloqueio da alteração de regras de tipos de veículos da carga para os perfis de Embarcador e Agenciador de Embarque, mantendo a função exclusiva para a equipe interna.',
    items: [
      {
        category: 'security',
        title: 'Bloqueio do Botão "Permitir Este Veículo"',
        description: 'Usuários com perfil de Embarcador, Agenciador de Embarque, Motorista ou Cliente não visualizam mais o botão de liberar novos tipos de veículos na carga na Solicitação de Embarque, garantindo que as regras comerciais/operacionais não sejam alteradas indevidamente.'
      },
      {
        category: 'improvement',
        title: 'Mensagens de Validação Contextuais',
        description: 'Caso um Embarcador ou Agenciador tente submeter um veículo não homologado para a carga, o sistema agora orienta a solicitar a autorização à equipe interna responsável.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_30',
    version: 'v2.70.30',
    date: '10/10/2026',
    title: 'Persistência do Botão "Aplicar Dados no Embarque", Isolamento de Documentos Não Fiscais e Correção da NF de RAF-695',
    summary: 'Correção no botão "Aplicar Dados no Embarque" para persistir imediatamente no banco de dados e no embarque o valor e número da NF-e lida, proteção contra sobrescrita indevida por arquivos em pastas de cadastro/comprovantes, validação de número de CT-e e ajuste definitivo do valor da NF-e no embarque RAF-695 para R$ 6.906,51.',
    items: [
      {
        category: 'fix',
        title: 'Persistência Efetiva do Botão "Aplicar Dados no Embarque"',
        description: 'Ao inspecionar uma Nota Fiscal ou documento e clicar em "Aplicar Dados no Embarque", o sistema agora grava diretamente no banco de dados o valor total da NF, número da NF e trava o valor com prioridade manual (isInvoiceValueManual), impedindo que retorne a valores incorretos.'
      },
      {
        category: 'security',
        title: 'Isolamento de Categorias Não Fiscais no Leitor Automático',
        description: 'Pastas de anexos administrativos (Comprovante de Cadastro, CNH, Comprovante de Adiantamento/Agendamento/Saldo) não são mais lidas para extração de tributos ou valor de mercadoria, evitando contaminação cruzada por documentos de terceiros anexados como cadastro.'
      },
      {
        category: 'fix',
        title: 'Validação de Numeração de CT-e e MDF-e',
        description: 'O sincronizador de documentos agora valida se o número do CT-e ou MDF-e lido corresponde estritamente ao número registrado no embarque antes de considerar seus dados fiscais.'
      },
      {
        category: 'improvement',
        title: 'Valor da NF Corrigido no Embarque RAF-695',
        description: 'O embarque RAF-695 foi corrigido no banco de dados para o valor correto de R$ 6.906,51 (NF-e 93232 / CT-e 2076) e travado contra regressões.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_29',
    version: 'v2.70.29',
    date: '10/10/2026',
    title: 'Consolidação de Múltiplas NF-es, CIOT Completo de 16 Dígitos e Isenção de CIOT para Transportador PJ',
    summary: 'Ajuste no parser e no DRE para somar automaticamente o valor de todas as NF-es vinculadas ao CT-e/MDF-e (ex: R$ 12.045,77 no CT-e 2078), preservação dos 16 dígitos do CIOT e aplicação da isenção da taxa de CIOT para transportadoras PJ (ETC).',
    items: [
      {
        category: 'fix',
        title: 'Soma Automática de Múltiplas NF-es no CT-e',
        description: 'Quando o CT-e possui múltiplas notas fiscais anexadas, o sistema agora consolida os valores somando o valor total de todas as NFs (e concatenando os números das notas) em vez de capturar apenas a primeira nota individualmente.'
      },
      {
        category: 'fix',
        title: 'Preservação do Número Completo do CIOT (16 dígitos)',
        description: 'Removido o corte indevido de 12 dígitos que truncava códigos CIOT de 16 dígitos emitidos por operadoras de frete (ex: e-Frete), preservando o número integral em documentos e no painel fiscal.'
      },
      {
        category: 'improvement',
        title: 'Isenção de Taxa CIOT para Transportadoras PJ / ETC',
        description: 'A dedução de CIOT na DRE agora aplica taxa 0% e status Isento (PJ) para empresas PJ/ETC, aplicando dedução apenas para motoristas autônomos (TAC/PF) conforme regulamentação da ANTT.'
      },
      {
        category: 'feature',
        title: 'Edição Manual e Persistência do Valor da NF',
        description: 'Adicionada possibilidade de edição inline com persistência no banco de dados para o card de Valor NF na DRE do CT-e, evitando que sincronizações automáticas sobrescrevam conferências manuais.'
      }
    ]
  },
  {
    id: 'rel_2026_10_10_v2_70_28',
    version: 'v2.70.28',
    date: '10/10/2026',
    title: 'Sincronização de Frete Motorista / Tonelada e Correção de Reajuste de Tarifas no Embarque',
    summary: 'Correção na exibição da taxa por tonelada (MTR) na tabela de embarques e cálculo de margem para priorizar a tarifa reajustada (driverFreightRateSnapshot) em vez de dividir incorretamente o frete líquido pela tonelagem. Sincronização automática entre o valor total do frete e a tarifa unitária no modal de alteração de preço e atualização imediata do embarque RAF-695 no banco de dados para R$ 125,00/ton.',
    items: [
      {
        category: 'fix',
        title: 'Exibição Correta do Frete Motorista (MTR) e Margem',
        description: 'A tabela de embarques agora prioriza o valor do frete por tonelada snapshot/reajustado do motorista (driverFreightRateSnapshot), evitando que o valor exibido fique divergente da tarifa acordada.'
      },
      {
        category: 'fix',
        title: 'Sincronização de Total e Taxa no Modal de Alterar Preço',
        description: 'Ao reajustar o preço por tonelada ou salvar alterações, o total do frete agora é recalculado automaticamente multiplicando a tarifa pela tonelagem carregada, mantendo o total bruto, adiantamento e saldo rigorosamente consistentes.'
      },
      {
        category: 'improvement',
        title: 'Correção do Embarque RAF-695',
        description: 'Embarque RAF-695 atualizado no banco de dados com tarifa de R$ 125,00/ton (Total de R$ 5.745,00 para 45,96 ton), com adiantamento e saldo ajustados proporcionalmente.'
      }
    ]
  },
  {
    id: 'rel_2026_10_09_v2_70_27',
    version: 'v2.70.27',
    date: '09/10/2026',
    title: 'Preenchimento Manual de Regime na ANTT e Ajuste de Precisão nas Casas Decimais de Peso (CT-e)',
    summary: 'Inclusão da opção de informar o Regime Tributário manualmente na modalidade ETC da ANTT caso a consulta do CNPJ na Receita Federal falhe ou fique indisponível, além da padronização de exibição em 3 casas decimais para pesagens em toneladas (45,960 ton) e correção no leitor de CT-e XML priorizando o peso bruto real da carga sobre o peso base de cálculo e MDF-e.',
    items: [
      {
        category: 'feature',
        title: 'Informar Regime Tributário da ANTT Manualmente',
        description: 'Na Solicitação de Embarque (modalidade ETC), caso o botão "Consultar" não localize o CNPJ ou a Receita Federal esteja fora do ar, agora é possível selecionar manualmente o Regime Tributário (Simples Nacional, Lucro Presumido, Lucro Real ou MEI) sem travar o cadastro.'
      },
      {
        category: 'improvement',
        title: 'Casas Decimais de Toneladas Padronizadas (3 Decimais)',
        description: 'Padronizada a visualização de pesagens em toneladas para 3 casas decimais (ex: 45,960 ton), alinhando a visão do sistema com a pesagem de balança e o CT-e sem cortes indevidos de zeros à direita.'
      },
      {
        category: 'fix',
        title: 'Blindagem da Leitura de Peso do CT-e vs MDF-e',
        description: 'Aprimorado o parser fiscal do CT-e XML para priorizar o Peso Bruto/Aferido da carga sobre o peso de base de cálculo tarifária e impedindo que o peso do MDF-e anexado substitua o peso do CT-e.'
      },
      {
        category: 'improvement',
        title: 'Ajuste Inline de Peso no Card de Divergência',
        description: 'Adicionado botão rápido "Corrigir Peso do CT-e" no alerta de divergência de peso para permitir ao operador informar ou ajustar o valor correto imediatamente em caso de leituras divergentes de documentos.'
      }
    ]
  },
  {
    id: 'rel_2026_10_09_v2_70_26',
    version: 'v2.70.26',
    date: '09/10/2026',
    title: 'Correção de Tipagem no Formulário de Notas Fiscais',
    summary: 'Ajuste de tipagem TypeScript nos setters de formatação de valores monetários das notas fiscais.',
    items: [
      {
        category: 'fix',
        title: 'Tipagem de Atualizadores de Estado (onBlur)',
        description: 'Corrigida a assinatura dos setters na função utilitária handleFormatAmountBlur para aceitar callbacks de estado funcional (SetStateAction), resolvendo o erro de compilação TypeScript.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_25',
    version: 'v2.70.25',
    date: '08/10/2026',
    title: 'Refinamento do Lançamento de NFs, Campo "Valor a Pagar" e Integração com Contas a Pagar',
    summary: 'Correção e blindagem completa da digitação de valores monetários no padrão brasileiro (impedindo truncamento de milhares como 6.000 para 6), adição do campo "Valor a Pagar" independente do valor total da nota, e integração nativa das Notas Fiscais e CT-es por Cliente na tela de Contas a Pagar com filtros completos por período, cliente e número de CT-e.',
    items: [
      {
        category: 'fix',
        title: 'Correção de Parsing Monetário Brasileiro',
        description: 'Implementado parser monetário robusto com máscara automática no blur, garantindo que valores como "6.000", "6.000,00" ou "6000" sejam salvos e exibidos com precisão decimal sem truncamento indevido.'
      },
      {
        category: 'feature',
        title: 'Campo "Valor a Pagar" na Nota Fiscal',
        description: 'Adicionado campo específico de Valor a Pagar no cadastro e edição de NFs, permitindo informar o valor líquido efetivo da quitação quando houver retenções tributárias, descontos ou pagamentos acordados.'
      },
      {
        category: 'feature',
        title: 'Integração de Notas Fiscais no Contas a Pagar',
        description: 'Todas as notas fiscais cadastradas agora alimentam automaticamente o Contas a Pagar, com exibição de fornecedor, centro de custo, vencimento, valor total, valor a pagar, visualizador do anexo (PDF/imagem) e dar baixa instantânea.'
      },
      {
        category: 'feature',
        title: 'CT-e como Contas a Pagar por Cliente',
        description: 'Todos os CT-es emitidos/anexados no sistema agora geram contas a pagar organizadas por cliente/tomador, incluindo filtros avançados por período, cliente específico, número de CT-e, status e acesso direto ao PDF do CT-e.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_24',
    version: 'v2.70.24',
    date: '08/10/2026',
    title: 'Disponibilização da Ação "Trocar Carga" em Ag. Carregamento',
    summary: 'A opção "Trocar Carga" no menu de ações rápidas da listagem de embarques foi habilitada também para embarques com status "Ag. Carregamento".',
    items: [
      {
        category: 'improvement',
        title: 'Troca de Carga em "Ag. Carregamento"',
        description: 'Permite alterar a carga vinculada a um embarque que esteja aguardando carregamento, facilitando realocações operacionais e ajustes de saldo.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_23',
    version: 'v2.70.23',
    date: '08/10/2026',
    title: 'Ajustes na Planilha de Controladoria e Validação de Tomador no CT-e',
    summary: 'Configuração aprimorada das colunas da planilha de controladoria (NºPEDIDO, Remetente do CT-e, Tipo de Embalagem, Código de Liberação da Seguradora, Atalhos diretos para Comprovante de Adiantamento e Comprovante de Saldo) e nova validação inteligente de divergência de Tomador (Pagador) entre Carga e CT-e com opções de ajuste automático ou vinculação de filial.',
    items: [
      {
        category: 'feature',
        title: 'Coluna "NºPEDIDO"',
        description: 'Apresenta com precisão o "Nº do Pedido" cadastrado na carga do embarque, mantendo o campo estritamente em branco quando não informado.'
      },
      {
        category: 'feature',
        title: 'Coluna "Remetente" do CT-e',
        description: 'Prioriza e exibe sempre a razão social/nome do remetente extraído diretamente do Conhecimento de Transporte (CT-e) anexado ao embarque.'
      },
      {
        category: 'improvement',
        title: 'Coluna "TIPO" de Embalagem Padronizada',
        description: 'Padroniza a exibição da embalagem estritamente entre as opções homologadas: Granel, Bigbag, Sacos ou Pallet.'
      },
      {
        category: 'improvement',
        title: 'Coluna "LIBERAÇÃO" com Código da Seguradora',
        description: 'Exibe o código de liberação fornecido pela seguradora durante o avanço do status "Ag. Seguradora", com formatação visual destacada.'
      },
      {
        category: 'feature',
        title: 'Atalhos de Acesso Rápido aos Comprovantes',
        description: 'As células das colunas "HORA/DATA LIBER. ADIANTA" e "SALDO RESTANTE" tornaram-se botões interativos de clique rápido que abrem instantaneamente o Comprovante de Adiantamento e o Comprovante de Pagamento de Saldo anexados.'
      },
      {
        category: 'security',
        title: 'Validação de CPF/CNPJ do Tomador (Pagador) vs CT-e',
        description: 'Ao anexar ou processar o CT-e, o sistema confere se o Tomador (Pagador) é o mesmo cadastrado na carga. Havendo divergência, oferece ao operador as opções imediatas de ajustar a carga para o tomador do CT-e ou vincular o novo CNPJ como filial da empresa cadastrada.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_22',
    version: 'v2.70.22',
    date: '08/10/2026',
    title: 'Fidelidade do Número de CIOT na Coluna CIOT da Planilha de Controle',
    summary: 'A coluna CIOT da planilha de Controle de Embarques agora exibe com prioridade absoluta o número do CIOT lido do MDF-e (conforme exibido em "Detalhes da Leitura do Documento MDF-e", padrão SEFAZ DAMDFE de 12 dígitos), normalizando códigos de 16 dígitos gerados por contratos/e-Frete.',
    items: [
      {
        category: 'improvement',
        title: 'Fidelidade ao Número do CIOT do MDF-e',
        description: 'A coluna CIOT exibe exatamente o número de 12 dígitos registrado e lido do MDF-e, idêntico ao card de Detalhes da Leitura do Documento MDF-e.'
      },
      {
        category: 'fix',
        title: 'Normalização de Códigos e-Frete de 16 Dígitos',
        description: 'Códigos com sufixo de 4 dígitos de suboperação gerados por administradoras de frete são automaticamente ajustados para os 12 dígitos oficiais da SEFAZ.'
      },
      {
        category: 'improvement',
        title: 'Prioridade no Processamento de Documentos Fiscais',
        description: 'Ao anexar múltiplos documentos ao embarque, a leitura do CIOT oriunda do MDF-e possui prioridade máxima para alimentar o sistema e o banco de dados.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_21',
    version: 'v2.70.21',
    date: '08/10/2026',
    title: 'Exibição do Número da Ordem de Carregamento na Coluna "ORDEM DE CARREG"',
    summary: 'A coluna ORDEM DE CARREG da planilha de Controle de Embarques agora informa o número sequencial oficial da Ordem de Carregamento (ex: 1593, 1592, etc.) extraído diretamente do PDF anexado, substituindo os códigos internos (OC-ord_RAF-xxx).',
    items: [
      {
        category: 'feature',
        title: 'Número Real da Ordem de Carregamento (OC TMS)',
        description: 'A coluna exibe com fidelidade o número impresso no documento no campo "Nº" da Autorização/Ordem de Carregamento anexada, mantendo o link direto para visualização do PDF.'
      },
      {
        category: 'improvement',
        title: 'Extração Automática e Persistência no Banco',
        description: 'Os números de ordens de carregamento foram extraídos e persistidos diretamente nos documentos de cada embarque, com suporte a extração automática em novos uploads de ordens.'
      },
      {
        category: 'improvement',
        title: 'Filtros e Busca por Nº de Ordem',
        description: 'A busca global e os filtros da coluna ORDEM DE CARREG agora encontram os registros diretamente pelo número da ordem.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_20',
    version: 'v2.70.20',
    date: '08/10/2026',
    title: 'Exibição do Nome do Proprietário na Coluna ANTT / PIX da Planilha de Controle',
    summary: 'A coluna ANTT / PIX da planilha de Controle de Embarques agora informa diretamente o Nome do Proprietário do veículo (resolvido por dados do embarque, documentos, cadastro de proprietários e veículos), mantendo os dados de documento (CNPJ/CPF/PIX) acessíveis via tooltip.',
    items: [
      {
        category: 'improvement',
        title: 'Nome do Proprietário na Coluna ANTT / PIX',
        description: 'Em vez de apresentar apenas o número do documento/chave Pix, a coluna passa a exibir a Razão Social ou Nome do Proprietário correspondente, facilitando a identificação imediata na planilha.'
      },
      {
        category: 'improvement',
        title: 'Filtro e Busca por Nome de Proprietário',
        description: 'Os filtros por coluna e a pesquisa rápida da planilha de controle agora listam e encontram os embarques pelos nomes dos proprietários dos veículos.'
      },
      {
        category: 'improvement',
        title: 'Tooltip com CNPJ/CPF e Chave PIX Original',
        description: 'Ao passar o cursor sobre o nome do proprietário na célula, um tooltip informa os detalhes cadastrais (CNPJ/CPF da ANTT e chave Pix) para consulta e auditoria rápidas.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_19',
    version: 'v2.70.19',
    date: '08/10/2026',
    title: 'Conferência e Validação Fiscal Automática de CT-e e Carta Frete em Aguardando Fiscal',
    summary: 'Na etapa "5 - Aguardando Fiscal", o sistema agora realiza a leitura e validação automática de dados ao anexar o CT-e e a Carta Frete. Se houver qualquer divergência no peso efetivado (toneladas), no frete do motorista ou no valor do ICMS, o sistema emite alerta imediato e exige validação com opções interativas, bloqueando o botão "Salvar e Avançar" até a resolução.',
    items: [
      {
        category: 'feature',
        title: 'Validação e Correção Automática de Toneladas Efetivadas (CT-e)',
        description: 'Ao anexar o CT-e na etapa Aguardando Fiscal, o sistema lê o peso em kg/toneladas e compara com as toneladas registradas no sistema. Se houver divergência, avisa imediatamente e oferece opção de corrigir automaticamente as toneladas efetivadas para o valor do CT-e com um clique.'
      },
      {
        category: 'feature',
        title: 'Conferência de Frete Motorista com a Carta Frete',
        description: 'Ao anexar a Carta Frete, o sistema compara o frete bruto do motorista contra o valor contratual do sistema. Havendo discrepância, apresenta painel comparativo para confirmação antes de avançar.'
      },
      {
        category: 'feature',
        title: 'Conferência e Validação de ICMS Destacado do CT-e',
        description: 'Verificação do valor de ICMS destacado no CT-e em relação ao informado no sistema, possibilitando conciliar e sincronizar os dados fiscais e relatórios com exatidão.'
      },
      {
        category: 'security',
        title: 'Bloqueio Inteligente de "Salvar e Avançar" para Divergências Fiscais',
        description: 'O botão "Salvar e Avançar" na etapa Aguardando Fiscal fica protegido e desabilitado com aviso em tooltip enquanto houver divergências de peso, frete ou ICMS não confirmadas pelo operador.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_18',
    version: 'v2.70.18',
    date: '08/10/2026',
    title: 'Exibição do Frete Motorista com Abatimento do Pedágio no Cabeçalho de Anexos',
    summary: 'O card "TOTAL FRETE MTR" no cabeçalho do modal Gerenciar Anexos agora exibe o valor do frete motorista líquido com o abatimento do pedágio, acompanhado de tag indicativa e detalhamento do valor bruto original.',
    items: [
      {
        category: 'improvement',
        title: 'Abatimento do Pedágio no Total Frete Motorista',
        description: 'No cabeçalho do modal Gerenciar Anexos, o campo TOTAL FRETE MTR passou a refletir o valor efetivo abatendo o pedágio (Frete Bruto - Tag Pedágio), espelhando com precisão a base real de pagamento do motorista.'
      }
    ]
  },
  {
    id: 'rel_2026_10_08_v2_70_17',
    version: 'v2.70.17',
    date: '08/10/2026',
    title: 'Obrigatoriedade do CODG. ATUA em "Ag. Cadastro" e Retenção Automática de Motoristas Sem Código',
    summary: 'O campo CODG. ATUA agora é obrigatório para liberar o avanço da etapa "1 - Ag. Cadastro". Além disso, todos os motoristas cadastrados que ainda não possuem o código do ATUA registrado passam a parar compulsoriamente em "Ag. Cadastro" na solicitação de seus embarques até que o código seja informado, liberando a passagem direta nos embarques subsequentes.',
    items: [
      {
        category: 'feature',
        title: 'Campo CODG. ATUA Obrigatório no Modal de Ag. Cadastro',
        description: 'O botão "Salvar e Avançar" na etapa "1 - Ag. Cadastro" agora permanece bloqueado com aviso explicativo até que o CODG. ATUA (Código de Atualização Cadastral) seja preenchido. O formulário conta com destaque visual e validação estrita.'
      },
      {
        category: 'feature',
        title: 'Parada Obrigatória em "Ag. Cadastro" para Motoristas sem Código do ATUA',
        description: 'Motoristas cadastrados que ainda não tiveram o código do ATUA informado agora param obrigatoriamente em "1 - Ag. Cadastro" ao terem um novo embarque solicitado (mesmo que já possuam viagens concluídas no histórico). Uma vez inserido e salvo o código no cadastro, o registro do motorista é enriquecido e as próximas viagens do motorista voltam a pular automaticamente a etapa de cadastro.'
      },
      {
        category: 'improvement',
        title: 'Sincronização e Persistência do Código do ATUA no Cadastro do Motorista',
        description: 'Ao informar e avançar o CODG. ATUA em um embarque, o código é gravado nos documentos do embarque, atualizado imediatamente no registro permanente do motorista e replicado para o cache local, garantindo reconhecimento instantâneo em todas as telas operacionais.'
      }
    ]
  },
  {
    id: 'rel_2026_10_07_v2_70_16',
    version: 'v2.70.16',
    date: '07/10/2026',
    title: 'Correção Crítica no Filtro de CT-e e Nova Paleta de Cores de Alto Contraste no Popover',
    summary: 'Corrigido problema em que a filtragem por CT-e não retornava as viagens correspondentes devido a bloqueio do filtro de período e formatações divergentes de numeração. Atualizada a paleta de cores do popover de filtros para garantir contraste nítido e legibilidade perfeita dos números e opções em tema claro e escuro.',
    items: [
      {
        category: 'fix',
        title: 'Mecanismo de Filtragem de CT-e e ID Estritamente Exatos',
        description: 'Implementada correspondência 100% exata nos filtros de coluna: ao selecionar o CT-e "1", exibe única e exclusivamente o CT-e de número 1 (eliminando falsos positivos de números que continham o dígito 1, como 2019 ou 13). Suporta também equivalência numérica estrita (ex: "0001" com "1") e ignora restrições temporais de período quando CT-es específicos são selecionados.'
      },
      {
        category: 'improvement',
        title: 'Contraste e Legibilidade no Popover de Filtros',
        description: 'Eliminadas classes conflitantes de tema que deixavam os números e textos ofuscados e esbranquiçados sobre o fundo branco. As opções agora são exibidas em cor preta/escura destacada e nítida no tema claro e branca no tema escuro.'
      },
      {
        category: 'feature',
        title: 'Discriminação do Imposto Federal no Card de Despesas Operacionais',
        description: 'O card de "Despesas Operac." do Relatório de Lucro Real agora exibe o valor total das despesas operacionais e, separadamente, a soma do Imposto Federal dos embarques filtrados (junto com o saldo das demais taxas/risco), com exibição idêntica no totalizador do rodapé.'
      },
      {
        category: 'feature',
        title: 'Exportação PDF/CSV com Peso Efetivado, Pedágio, ICMS, Imposto Federal e Totais no Cabeçalho',
        description: 'O relatório em PDF e CSV de Lucro Real agora conta com colunas dedicadas para Peso Efetivado, Pedágio, ICMS e Imposto Federal. No PDF, o cabeçalho superior exibe uma linha consolidada com a somatória total exata de cada coluna com destaque dourado de alto contraste, espelhada também no rodapé.'
      },
      {
        category: 'fix',
        title: 'Normalização Automática de Tonelagem e Correção de Peso Descarregado (t)',
        description: 'Implementada a função normalizeWeightTonnage para tratar e converter automaticamente pesos preenchidos acidentalmente em gramas ou quilogramas de balança (ex: 46.150.000 ou 46.150 kg para 46,15 t), corrigindo o peso do embarque FEL-560 e protegendo os relatórios em PDF/CSV e planilha de controladoria contra distorções.'
      },
      {
        category: 'fix',
        title: 'Sincronização e Correção do ICMS Destacado nos CT-es e Relatórios',
        description: 'Corrigida a apuração de ICMS nos relatórios CSV/PDF e banco de dados para os CT-es 1944, 1971, 1972, 1973, 1986, 1992, 1996, 2008, 2015 e 33 com base nos valores oficiais do relatório XLS. A prioridade de cálculo em operationalExpensesCalculator foi reestruturada para respeitar sempre o ICMS lançado/destacado do documento oficial sobre a estimativa teórica da carga.'
      },
      {
        category: 'improvement',
        title: 'Ações Dinâmicas de Busca nos Filtros',
        description: 'Ao pesquisar termos no campo de busca do popover, os botões "Marcar Filtrados" e "Desmarcar Filtrados" e a caixa de seleção passam a atuar exclusivamente sobre os itens pesquisados.'
      }
    ]
  },
  {
    id: 'rel_2026_10_06_v2_70_15',
    version: 'v2.70.15',
    date: '06/10/2026',
    title: 'Alinhamento Configurável das Linhas na Planilha de Controladoria (Esquerda, Centro e Direita)',
    summary: 'Implementado grupo de botões de alinhamento de texto (Esquerda, Centralizado e Direita) na Planilha de Controladoria de Embarques do Módulo Financeiro, com padrão inicial centralizado e persistência da preferência do usuário.',
    items: [
      {
        category: 'feature',
        title: 'Controle de Alinhamento na Planilha de Controladoria',
        description: 'Adicionado grupo de botões na barra de ferramentas e no modo tela cheia permitindo alternar instantaneamente o alinhamento das linhas entre Centralizado (padrão), Alinhar à Esquerda e Alinhar à Direita.'
      },
      {
        category: 'improvement',
        title: 'Centralização Padrão e Persistência de Preferência',
        description: 'A planilha agora abre por padrão no modo centralizado para melhor leitura visual das células, salvando a configuração selecionada no navegador para os próximos acessos.'
      }
    ]
  },
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
