// Dados e Estruturas do Manual Profissional do Embarcador — Transcunha Academy

export interface CourseChapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: 'fundamentos' | 'operacional' | 'veiculos' | 'risco' | 'fiscal' | 'financeiro';
  readTime: string;
  summary: string;
  sections: {
    title: string;
    content: string[];
    tips?: string[];
    warning?: string;
    table?: {
      headers: string[];
      rows: string[][];
    };
  }[];
}

export const COURSE_CHAPTERS: CourseChapter[] = [
  {
    id: 'apresentacao',
    number: '00',
    title: 'Apresentação & O Papel do Embarcador',
    subtitle: 'A importância da logística no agronegócio e a função do embarcador',
    category: 'fundamentos',
    readTime: '4 min',
    summary: 'Compreenda a relevância da logística no agronegócio brasileiro, por que produtores e indústrias terceirizam o frete e como o embarcador atua como ponte entre clientes, transportadora e motoristas.',
    sections: [
      {
        title: 'A Importância da Logística no Agronegócio',
        content: [
          'No agronegócio, a logística é indispensável para garantir que as safras, insumos e fertilizantes cheguem ao destino sem perdas e dentro dos prazos da cadeia produtiva.',
          'Muitas empresas (cerealistas, traders, produtores rurais e indústrias), mesmo tendo capacidade financeira, optam por NÃO manter frota própria, pois o custo de manutenção, ociosidade e gestão de risco é inviável.',
          'Ao terceirizar com a transportadora, o produtor foca no cultivo e comercialização, enquanto a transportadora assume o gerenciamento de risco, alocação de motoristas, emissão fiscal e seguro.'
        ],
        tips: [
          'O agronegócio não para: janelas de colheita exigem agilidade extrema na colocação de caminhões.',
          'A reputação da transportadora é construída pela pontualidade e segurança que o embarcador entrega.'
        ]
      },
      {
        title: 'O que faz o Embarcador na Prática?',
        content: [
          'O embarcador é o profissional responsável por "vender o frete" e garantir a execução da viagem.',
          'Quando o cliente solicita o transporte, a transportadora distribui essas demandas para a equipe de embarcadores.',
          'O embarcador atua captando motoristas qualificados através de redes de contatos, grupos especializados de WhatsApp e plataformas como Fretebras.',
          'Relação Tripartite: o embarcador é o elo de comunicação contínuo entre Transportadora ⇄ Motoristas ⇄ Clientes.'
        ]
      },
      {
        title: 'Exemplo Prático de Demanda & Margem Comercial',
        content: [
          'Exemplo Real: O embarcador recebe uma demanda para transportar 220 toneladas de soja de um armazém em Uberlândia (MG) até o Porto de Santos (SP).',
          'Veículo escolhido: Rodotrem com capacidade líquida de ≈ 48 a 50 toneladas por viagem.',
          'Cálculo de Viagens: 220t ÷ 48t = 4,58 → São necessários 5 carregamentos de Rodotrem.',
          'Spread Comercial (Margem): O cliente paga R$ 200,00 por tonelada. O embarcador negocia com o motorista a R$ 180,00 por tonelada.',
          'Resultado: Margem bruta da transportadora = R$ 20,00/tonelada (10% de margem operacional).'
        ],
        tips: [
          'A margem padrão de mercado no agronegócio varia geralmente entre 7% e 12%, dependendo da rota, retorno e prazo de pagamento.'
        ]
      }
    ]
  },
  {
    id: 'programacao',
    number: '01',
    title: 'Programação de Cargas & Janelas',
    subtitle: 'Cadência de carregamento, diagramas e agendas de descarga',
    category: 'operacional',
    readTime: '5 min',
    summary: 'Aprenda a organizar a cadência de carregamento diário, respeitar prazos contratuais de embarque e monitorar a agenda de descarga para prevenir estadias custosas.',
    sections: [
      {
        title: 'Diagrama da Transportadora e Alocação',
        content: [
          'A programação de cargas envolve organizar detalhadamente todas as cargas contratadas, garantindo que tudo ocorra dentro dos prazos contratuais.',
          'É essencial consultar o diagrama operacional do sistema (Transcunha Logística) para checar o saldo restante da carga, peso já carregado e quantos veículos faltam para fechar o lote.',
          'Cadência de Carregamento: Se um armazém tem cota de carregar apenas 4 caminhões por dia, enviar 10 caminhões de uma só vez gera fila, insatisfação e congestionamento.'
        ]
      },
      {
        title: 'Monitoramento de Descarga & Prevenção de Estadias',
        content: [
          'O cliente estabelece um período máximo para a entrega da carga no destino.',
          'É dever do embarcador checar a situação do ponto de descarga (especialmente em portos como Santos, Paranaguá ou grandes esmagadoras).',
          'Se o agendamento de descarga estiver fechado ou houver filas quilométricas, o veículo fica parado além do prazo legal (estadia), gerando custos indenizatórios adicionais ao contratante.'
        ],
        warning: 'Nunca envie veículos sem confirmar se a agenda de recebimento no cliente destinatário está ativa e confirmada.'
      }
    ]
  },
  {
    id: 'veiculos',
    number: '02',
    title: 'Captação, Tipos de Veículos e Pesos',
    subtitle: 'Tabela de PBT, tara, capacidade líquida e regras de balança',
    category: 'veiculos',
    readTime: '8 min',
    summary: 'Guia completo com todas as combinações de veículos de carga (LS, Bitrem, Rodotrem), capacidades líquidas, tolerância de 5% da ANTT e veículos indicados por tipo de produto.',
    sections: [
      {
        title: 'Critérios Essenciais para Seleção do Veículo',
        content: [
          '1. Compatibilidade com o Produto: Grãos requerem graneleiro ou caçamba; fertilizante a granel exige caçamba para descarga basculante; fertilizante ensacado ou big bag exige carroceria graneleira para amarração.',
          '2. Restrições Físicas no Destino: Muitos armazéns e balanças possuem limite de comprimento de plataforma (ex: balanças de 18 a 21 metros). Um Rodotrem alongado (25 a 30 metros) não cabe na balança e precisará desengatar para pesar 2 vezes, atrasando a operação.',
          '3. Raio de Manobra: Rotas com pontes baixas ou acessos de terra estreitos podem impedir veículos articulados longos.'
        ]
      },
      {
        title: 'Tabela Oficial de Pesos Médios e Capacidades (Agronegócio)',
        content: [
          'Confira abaixo os parâmetros operacionais de peso bruto total (PBT), tara média e carga líquida útil utilizados nas operações rodoviárias:'
        ],
        table: {
          headers: ['Tipo de Conjunto', 'Tara Estimada', 'Carga Líquida Útil', 'PBT Permitido', 'Observação'],
          rows: [
            ['Carreta Simples 3 eixos (Toco 4x2)', '≈ 15,5 t', '≈ 26,0 t', '41,5 t', 'Pouco usada hoje; atende demandas regionais menores'],
            ['Carreta Simples 3 eixos (Trucado 6x2)', '≈ 16,5 t', '≈ 32,0 t', '48,5 t', 'Se for Caçamba/Basculante, a carga útil cai para 28–30 t'],
            ['Carreta 4 Eixos (LS 4 eixos)', '≈ 18,5 a 19,0 t', '≈ 40,0 t', '58,5 t', 'Grande adesão recente no agro; Caçamba cai para 37–38 t'],
            ['Bitrem 7 Eixos (2 carretas 2 eixos)', '≈ 20,0 a 21,0 t', '≈ 37,0 a 38,0 t', '57,0 t', 'Bicaçamba tem tara maior (22t), útil cai para 35–36 t'],
            ['Rodotrem 9 Eixos Graneleiro (com Dolly)', '≈ 22,0 a 24,0 t', '≈ 48,5 a 50,0 t', '74,0 t', 'Comprimento 19m (curto) ou 25-30m (alongado)'],
            ['Rodocaçamba 9 Eixos (Basculante)', '≈ 23,0 a 27,0 t', '≈ 47,0 a 49,0 t', '74,0 t', 'Indispensável para minérios, calcário e fertilizante granel'],
            ['Cavalo 4 eixos (8x2) + Carreta 3 eixos', '≈ 22,0 a 24,0 t', '≈ 35,0 a 37,0 t', '57,0 t', 'Distribui mais carga no cavalo mecânico']
          ]
        },
        tips: [
          'Regra de Tolerância de Balança: A legislação da ANTT/CONTRAN prevê tolerância de até 5% sobre o Peso Bruto Total (PBT). Exemplo: 58,5 t + 5% (2,925 t) = até 61,425 t sem multa.'
        ]
      },
      {
        title: 'Matriz de Veículo Recomendado por Produto',
        content: [
          'Grãos (Soja, Milho, Trigo, Sorgo): Graneleiro ou Caçamba (ambos aceitos; graneleiro é mais seguro contra tombamento).',
          'Fertilizante a Granel: Caçamba (Basculante) obrigatória pela facilidade de descarga em moegas industriais.',
          'Fertilizante Ensacado: Graneleiro obrigatório para garantir acomodação do palete e amarração correta.',
          'Fertilizante em Big Bag: Graneleiro, pela necessidade de assoalho plano e pontos de amarração das cintas.',
          'Minérios (Calcário, Gesso, Brita, Ferro): Caçamba (Basculante) obrigatória por ser carga densa que requer basculamento.',
          'Algodão em Fardos: Graneleiro (alguns clientes aceitam caçamba alta, verificar sempre com o cliente).'
        ]
      }
    ]
  },
  {
    id: 'risco',
    number: '03',
    title: 'Cadastro & Gerenciamento de Risco',
    subtitle: 'Checklist documental, checagens de GR e aprovação de apólice',
    category: 'risco',
    readTime: '7 min',
    summary: 'Aprenda o passo a passo da checagem cadastral do motorista e veículo, consultas em gerenciadoras de risco (Buonny, Opentech, Pamcary) e a regra de ouro do seguro de transporte.',
    sections: [
      {
        title: 'Checklist do Cadastro do Motorista e Veículo',
        content: [
          'Dados do Motorista: Nome completo, CPF, RG/Órgão expedidor, endereço com CEP, telefone para contato, número da CNH, categoria da CNH (C, D ou E) e validade.',
          'Dados do Cavalo Mecânico: Placa, Renavam, Chassi, Ano, Marca/Modelo, Cor, Tipo de tração (4x2, 6x2, 6x4), Proprietário e RNTRC do proprietário.',
          'Dados das Carretas: Placa de todas as carretas (no bitrem são 2, no rodotrem 2 + dolly), Renavam, ano, tipo de implemento e capacidade em toneladas.',
          'RNTRC (Registro Nacional de Transportadores Rodoviários de Carga): Obrigatório estar ativo e válido (TAC - Autônomo, ETC - Empresa ou CTC - Cooperativa).'
        ]
      },
      {
        title: 'Como Funciona a Análise de Risco (GR)',
        content: [
          '1. Validação de Identidade: Reconhecimento facial (selfie cruzada com CNH), videochamada com o motorista ou biometria para evitar clonagem de identidade.',
          '2. Validação Documental: Conferência de CNH válida e compatível, CRLV do veículo regular e sem bloqueio, RNTRC em dia.',
          '3. Checagem de Antecedentes e Histórico: Pesquisa de ocorrências criminais, roubo de carga, apropriação indébita e referências comerciais em transportadoras anteriores.',
          '4. Retorno da Gerenciadora: A gerenciadora emite laudo oficial: APROVADO, PENDENTE ou REPROVADO.'
        ],
        warning: 'REGRA INVIOLÁVEL: Nenhum motorista pode carregar sem análise de risco APROVADA. Caso o veículo carregue sem aprovação do GR, a seguradora NÃO indenizará nenhum sinistro (roubo, tombamento ou avaria)!'
      },
      {
        title: 'Gerenciadora Própria vs Terceirizada',
        content: [
          'Gerenciadora Própria: A transportadora mantém equipe interna de analistas com ferramentas e bancos de dados próprios.',
          'Gerenciadora Terceirizada: Contratação de empresas especializadas (Buonny, Skymark, Opentech, Pamcary). Mais ágil e com respaldo técnico homologado pelas grandes seguradoras do país.'
        ]
      }
    ]
  },
  {
    id: 'ordem',
    number: '04',
    title: 'Ordem de Carregamento: Interna x Externa',
    subtitle: 'Hierarquia operacional obrigatória e envio ao ponto de carga',
    category: 'operacional',
    readTime: '5 min',
    summary: 'Entenda a diferença crucial entre a ordem interna no sistema da transportadora e a ordem externa nos portais dos clientes, evitando falhas contratuais graves.',
    sections: [
      {
        title: 'Ordem Interna: O Ponto de Partida',
        content: [
          'A Ordem Interna é o documento formal gerado dentro do sistema da Transcunha Logística após a aprovação de risco do motorista.',
          'Contém os dados do embarque: ID da ordem, motorista, placas, produto, armazém de origem, fazenda/usina, destino e quantidade contratada.',
          'Serve como comprovação interna auditável e autorização oficial para que a operação prossiga.'
        ]
      },
      {
        title: 'Ordem Externa: Portais de Clientes e WhatsApp',
        content: [
          'A Ordem Externa é gerada fora da transportadora, diretamente no portal do cliente (ex: portais de trades, Bunge, Cargill, Amaggi, LDC, ADM) ou sistemas integrados.',
          'Regra de Ouro da Transcunha: NUNCA emita a ordem externa antes da ordem interna e da aprovação do risco.',
          'Motivo: Se você cadastrar o motorista no portal do cliente e ele for reprovado no risco da seguradora, o cancelamento no portal do cliente é burocrático e abala a credibilidade da transportadora.'
        ],
        tips: [
          'Sequência Correta: 1. Cadastro → 2. Aprovação de Risco → 3. Ordem Interna no Sistema → 4. Ordem Externa no Portal do Cliente.'
        ]
      }
    ]
  },
  {
    id: 'fiscal',
    number: '05',
    title: 'Documentação Fiscal & Viagem',
    subtitle: 'CT-e, MDF-e, CIOT, Vale-Pedágio e Nota Fiscal Trocada',
    category: 'fiscal',
    readTime: '7 min',
    summary: 'Domine todos os documentos obrigatórios para circulação nas rodovias: CT-e, MDF-e, regras de CIOT, Vale-Pedágio eletrônico e a diferença entre NF primária e trocada.',
    sections: [
      {
        title: 'Ticket de Carregamento & Classificação de Grãos',
        content: [
          'Ticket de Carregamento: Primeiro comprovante emitido pela balança de origem contendo Peso Bruto, Tara e Peso Líquido transportado. É a base para emitir a NF e o CT-e.',
          'Classificação de Grãos: Laudo técnico emitido na origem avaliando umidade (padrão até 14%), impurezas (padrão até 1%), grãos ardidos e quebrados. Evita contestações de avaria no destino.'
        ]
      },
      {
        title: 'Nota Fiscal Primária x Nota Fiscal Trocada',
        content: [
          'Nota Fiscal Primária: Emitida pelo vendedor original (produtor rural ou cooperativa). O cliente contratante é o próprio destinatário da carga.',
          'Nota Fiscal Trocada: Prática comum em revenda de grãos. Uma trade compra do produtor e revende para uma indústria. A trade emite uma nova NF de venda para o comprador final.',
          'Regra para CT-e: Quando houver revenda, o CT-e DEVE ser emitido tendo como base a Nota Fiscal trocada!'
        ]
      },
      {
        title: 'Documentos Obrigatórios de Viagem',
        content: [
          '1. CT-e (Conhecimento de Transporte Eletrônico): Formaliza a prestação do frete entre transportadora e tomador. É autorizado pela SEFAZ antes da saída do caminhão.',
          '2. MDF-e (Manifesto Eletrônico): Agrupa os CT-es e notas fiscais da viagem. O motorista deve portar o DAMDFE impresso ou digital para apresentar nas barreiras fiscais.',
          '3. CIOT (Código Identificador da Operação de Transporte): Registro obrigatório na ANTT para pagamento de motoristas terceiros/autônomos (TAC).',
          '4. Vale-Pedágio Obrigatório (Lei 10.209/2001): É proibido descontar pedágio do motorista. O valor deve ser antecipado via cartão de pedágio eletrônico homologado pela ANTT.',
          '5. Seguro de Carga (RCTR-C / RC-DC): Apólice averbada eletronicamente antes do início da viagem.'
        ]
      }
    ]
  },
  {
    id: 'financeiro',
    number: '06',
    title: 'Pagamento de Frete, Regras ANTT & Quebras',
    subtitle: 'Normas ANTT, cartão frete, adiantamento x saldo e descontos por quebra',
    category: 'financeiro',
    readTime: '6 min',
    summary: 'Conheça a legislação da ANTT sobre pagamento eletrônico de frete, modelos de adiantamento (70/30, 80/20) e as regras para apuração de quebra e descontos na descarga.',
    sections: [
      {
        title: 'Regras da ANTT para Pagamento de Frete',
        content: [
          'É terminantemente proibido o pagamento de frete em dinheiro vivo (espécie) a motoristas autônomos.',
          'O pagamento deve ser feito por meio de meios eletrônicos homologados pela ANTT (Cartão de Frete Eletrônico, conta corrente vinculada com comprovante em nome do titular do RNTRC).',
          'O descumprimento gera multas pesadas tanto para a transportadora quanto para o contratante.'
        ]
      },
      {
        title: 'Políticas Comuns de Pagamento (Adiantamento x Saldo)',
        content: [
          'Modelo 70% / 30% (Mais Comum): 70% pago no momento da saída (comprovante de abastecimento/viagem) e 30% quitado após a descarga mediante envio do canhoto e ticket assinado.',
          'Modelo 80% / 20%: Frequente em rotas de fertilizantes e grãos de média distância.',
          'Modelo 90% / 10%: Aplicado a motoristas fidelizados e cadastrados na frota cativa.'
        ]
      },
      {
        title: 'Responsabilidade por Diferença na Entrega (Quebra de Carga)',
        content: [
          'O motorista é responsável pela integridade e volume da carga transportada.',
          'Tolerância de Quebra: Algumas operações preveem quebra técnica natural de rota (ex: 0,25% a 0,5% por desidratação).',
          'Diferença Acima da Tolerância: Se faltar mercadoria no destino além da tolerância, o valor da tonelada faltante é descontado diretamente do saldo de frete do motorista.',
          'Exemplo: Se faltou 1.000 kg de soja avaliada a R$ 1.200,00/tonelada, R$ 1.200,00 serão abatidos do saldo final do motorista.'
        ]
      }
    ]
  }
];

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Qual é a regra mandatória de segurança antes de permitir que um motorista carregue a mercadoria?',
    options: [
      'Basta o motorista apresentar a CNH na portaria da fazenda',
      'O motorista deve ter aprovação formal na análise de gerenciamento de risco (GR)',
      'O pagamento de 100% do saldo deve ser feito antes da saída',
      'A ordem externa no portal do cliente deve ser emitida primeiro'
    ],
    correctIndex: 1,
    explanation: 'Correto! A seguradora exige liberação expressa da gerenciadora de risco antes do carregamento. Carregar sem aprovação de GR anula a cobertura do seguro.'
  },
  {
    id: 2,
    question: 'Qual a capacidade de peso bruto total (PBT) de um Rodotrem de 9 eixos e sua carga líquida média?',
    options: [
      'PBT 48,5 t e carga líquida de 32 t',
      'PBT 58,5 t e carga líquida de 40 t',
      'PBT 74,0 t e carga líquida de ≈ 48,5 a 50,0 t',
      'PBT 57,0 t e carga líquida de 35 t'
    ],
    correctIndex: 2,
    explanation: 'Exato! O Rodotrem de 9 eixos possui PBT de 74 toneladas e carrega em torno de 48,5 a 50 toneladas úteis.'
  },
  {
    id: 3,
    question: 'Para o transporte de fertilizante a granel em usinas e armazéns, qual o veículo recomendado?',
    options: [
      'Carreta Graneleira com assoalho de madeira',
      'Caçamba (Basculante), pela facilidade de descarga rápida e peso elevado',
      'Sider com cortina lateral de lona',
      'Prancha rebaixada'
    ],
    correctIndex: 1,
    explanation: 'Correto! O fertilizante a granel requer caçamba basculante devido à alta densidade e necessidade de descarregamento rápido em moegas.'
  },
  {
    id: 4,
    question: 'Segundo as normas da ANTT, é permitido pagar o frete ao motorista em dinheiro vivo?',
    options: [
      'Sim, desde que com recibo de próprio punho',
      'Não, é expressamente proibido pagamento em espécie; deve ser via meio eletrônico regulamentado',
      'Sim, até o limite de R$ 5.000,00',
      'Apenas se for para abastecimento no posto'
    ],
    correctIndex: 1,
    explanation: 'Perfeito! A ANTT proíbe pagamento em dinheiro vivo para garantir rastreabilidade, comprovação e recolhimento previdenciário do motorista autônomo.'
  },
  {
    id: 5,
    question: 'Em que momento a Ordem Externa (portal do cliente) deve ser emitida?',
    options: [
      'Antes de cadastrar o motorista no sistema',
      'Assim que o cliente solicitar o frete',
      'Somente após o cadastro do motorista, aprovação de risco e criação da ordem interna',
      'Apenas após a descarga do produto no destino'
    ],
    correctIndex: 2,
    explanation: 'Exato! A sequência correta é: 1. Cadastro → 2. Risco → 3. Ordem Interna → 4. Ordem Externa. Isso evita cadastros rejeitados no portal do cliente.'
  }
];

export interface VehicleCapacity {
  name: string;
  capacity: number;
  pbt: number;
  tara: number;
}

export const VEHICLE_CAPACITIES: Record<string, VehicleCapacity> = {
  carreta_simples: { name: 'Carreta Simples 3 eixos (Trucado)', capacity: 32.0, pbt: 48.5, tara: 16.5 },
  ls_4_eixos: { name: 'Carreta LS 4 eixos', capacity: 40.0, pbt: 58.5, tara: 18.5 },
  bitrem: { name: 'Bitrem 7 eixos', capacity: 37.5, pbt: 57.0, tara: 19.5 },
  rodotrem: { name: 'Rodotrem 9 eixos', capacity: 49.5, pbt: 74.0, tara: 24.5 },
  rodocacamba: { name: 'Rodocaçamba 9 eixos', capacity: 47.5, pbt: 74.0, tara: 26.5 },
};

