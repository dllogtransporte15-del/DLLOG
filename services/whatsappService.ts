import { supabase } from '../supabase';
import type { 
  WhatsAppInstance, 
  WhatsAppTemplate, 
  WhatsAppQueueItem, 
  WhatsAppTriggerEvent,
  WhatsAppMessageType
} from '../types/whatsapp';

const STORAGE_INSTANCE_KEY = 'transcunha_wa_instance_local';
const STORAGE_TEMPLATES_KEY = 'transcunha_wa_templates_local';
const STORAGE_QUEUE_KEY = 'transcunha_wa_queue_local';

/**
 * Templates padrão de inicialização (utilizados se a tabela ainda não tiver dados)
 */
export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_1_shipment_created',
    name: 'Aviso de Oferta / Nova Carga',
    trigger_event: 'shipment.created',
    description: 'Mensagem enviada a motoristas cadastrados quando uma nova oportunidade de frete na rota é aberta.',
    body_text: '🚛 *Transcunha Logística - Oportunidade de Carga*\n\nOlá, *{{motorista_nome}}*! Temos uma nova carga disponível para você:\n\n📍 *Origem:* {{origem}}\n🎯 *Destino:* {{destino}}\n📦 *Mercadoria:* {{mercadoria}}\n⚖️ *Peso:* {{peso}}\n💰 *Valor do Frete:* R$ {{valor_frete}}\n\nInteressado? Responda a esta mensagem ou acesse nosso app para confirmar!',
    available_tags: [
      { tag: '{{motorista_nome}}', label: 'Nome do Motorista', example: 'Carlos Silva', description: 'Nome completo ou primeiro nome' },
      { tag: '{{origem}}', label: 'Origem', example: 'Santos - SP', description: 'Cidade e UF de coleta' },
      { tag: '{{destino}}', label: 'Destino', example: 'Curitiba - PR', description: 'Cidade e UF de entrega' },
      { tag: '{{mercadoria}}', label: 'Mercadoria', example: 'Soja a Granel', description: 'Tipo do produto transportado' },
      { tag: '{{peso}}', label: 'Peso / Volume', example: '32.000 kg', description: 'Peso total da carga' },
      { tag: '{{valor_frete}}', label: 'Valor do Frete', example: '6.800,00', description: 'Valor líquido do frete' }
    ],
    attachment_type: 'none',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_2_loading_order',
    name: 'Ordem de Carregamento & Documentos',
    trigger_event: 'shipment.loading_order',
    description: 'Disparo automático ao emitir a Ordem de Carregamento com o PDF anexo para o motorista.',
    body_text: '📋 *Ordem de Carregamento Transcunha*\n\nOlá, *{{motorista_nome}}*! Segue em anexo a sua Ordem de Carregamento referente ao embarque *#{{numero_carga}}*.\n\n📍 *Local de Coleta:* {{local_coleta}}\n📅 *Data Programada:* {{data_coleta}}\n📞 *Contato no Local:* {{contato_coleta}}\n\nPor favor, apresente este documento na portaria ao chegar.',
    available_tags: [
      { tag: '{{motorista_nome}}', label: 'Nome do Motorista', example: 'Carlos Silva', description: 'Nome do motorista' },
      { tag: '{{numero_carga}}', label: 'Nº Carga / Embarque', example: 'TC-8492', description: 'Identificador da carga' },
      { tag: '{{local_coleta}}', label: 'Ponto de Coleta', example: 'Terminal Graneleiro Armazém 4', description: 'Endereço da coleta' },
      { tag: '{{data_coleta}}', label: 'Data da Coleta', example: '20/09/2026', description: 'Data prevista' },
      { tag: '{{contato_coleta}}', label: 'Contato Coleta', example: '(11) 98888-7777 - Sr. Marcos', description: 'Telefone ou responsável' }
    ],
    attachment_type: 'dynamic_contract',
    default_filename: 'Ordem_Carregamento.pdf',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_3_advance_paid',
    name: 'Comprovante de Adiantamento de Frete',
    trigger_event: 'shipment.advance_paid',
    description: 'Notificação com comprovante PIX/Transferência após a liberação do adiantamento.',
    body_text: '✅ *Adiantamento Pago com Sucesso!*\n\nOlá, *{{motorista_nome}}*! O adiantamento do seu frete referente ao embarque *#{{numero_carga}}* foi creditado em sua conta.\n\n💵 *Valor Pago:* R$ {{valor_adiantamento}}\n🏦 *Banco/Chave:* {{dados_bancarios}}\n📄 O comprovante bancário segue em anexo.\n\nBoa viagem e dirija com segurança!',
    available_tags: [
      { tag: '{{motorista_nome}}', label: 'Nome do Motorista', example: 'Carlos Silva', description: 'Nome do motorista' },
      { tag: '{{numero_carga}}', label: 'Nº Embarque', example: 'TC-8492', description: 'Código do embarque' },
      { tag: '{{valor_adiantamento}}', label: 'Valor Adiantamento', example: '3.500,00', description: 'Valor líquido adiantado' },
      { tag: '{{dados_bancarios}}', label: 'Dados Bancários', example: 'PIX (CPF 123.456.789-00)', description: 'Chave ou conta' }
    ],
    attachment_type: 'dynamic_voucher',
    default_filename: 'Comprovante_Adiantamento.pdf',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_4_cte_emitted',
    name: 'Emissão de CT-e e DACTE em PDF',
    trigger_event: 'shipment.cte_emitted',
    description: 'Envio do CT-e autorizado diretamente para o motorista e embarcador.',
    body_text: '📄 *CT-e Autorizado - Transcunha Logística*\n\nInformamos que o Conhecimento de Transporte Eletrônico (*CT-e nº {{numero_cte}}*) foi autorizado pela SEFAZ.\n\n🚛 *Placa:* {{placa_veiculo}}\n📦 *Carga:* {{numero_carga}}\n📄 O DACTE em formato PDF está anexado nesta mensagem para fiscalização rodoviária.',
    available_tags: [
      { tag: '{{numero_cte}}', label: 'Nº do CT-e', example: '10492', description: 'Número fiscal' },
      { tag: '{{placa_veiculo}}', label: 'Placa do Veículo', example: 'BRA2E19', description: 'Placa do cavalo mecânico' },
      { tag: '{{numero_carga}}', label: 'Nº Embarque', example: 'TC-8492', description: 'Código da carga' }
    ],
    attachment_type: 'dynamic_cte',
    default_filename: 'DACTE_Eletronico.pdf',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_5_balance_paid',
    name: 'Comprovante de Quitação do Saldo',
    trigger_event: 'shipment.balance_paid',
    description: 'Notificação de finalização do frete com envio do comprovante de quitação do saldo.',
    body_text: '🎉 *Frete Concluído - Saldo Quitado*\n\nOlá, *{{motorista_nome}}*! O saldo final do seu frete (*Embarque #{{numero_carga}}*) foi creditado com sucesso.\n\n💰 *Valor do Saldo:* R$ {{valor_saldo}}\n📄 O comprovante de transferência segue em anexo.\n\nA equipe Transcunha agradece pela parceria em mais uma viagem!',
    available_tags: [
      { tag: '{{motorista_nome}}', label: 'Nome do Motorista', example: 'Carlos Silva', description: 'Nome do motorista' },
      { tag: '{{numero_carga}}', label: 'Nº Embarque', example: 'TC-8492', description: 'Código da carga' },
      { tag: '{{valor_saldo}}', label: 'Valor do Saldo', example: '1.850,00', description: 'Valor líquido do saldo final' }
    ],
    attachment_type: 'dynamic_voucher',
    default_filename: 'Comprovante_Saldo.pdf',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Interpola tags no formato {{variavel}} em um texto com base em um dicionário de dados
 */
export function interpolateTemplate(template: string, data: Record<string, string | number | undefined | null>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const val = data[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return match;
  });
}

/**
 * Higieniza o número de telefone removendo formatação e adicionando DDI 55 se necessário
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

/**
 * Formata número para exibição legível +55 (11) 99999-9999
 */
export function formatDisplayPhone(phone: string): string {
  const cleaned = sanitizePhoneNumber(phone);
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const num = cleaned.substring(4);
    if (num.length === 9) {
      return `+55 (${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`;
    }
    return `+55 (${ddd}) ${num.substring(0, 4)}-${num.substring(4)}`;
  }
  return phone;
}

// =========================================================================
// MÉTODOS DE INSTÂNCIA & CONEXÃO WHATSAPP
// =========================================================================

export async function getWhatsAppInstance(): Promise<WhatsAppInstance> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as WhatsAppInstance;
    }
  } catch (err) {
    console.warn('Tabela whatsapp_instances não acessível no Supabase, usando armazenamento local:', err);
  }

  // Fallback LocalStorage
  const local = localStorage.getItem(STORAGE_INSTANCE_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch { /* ignore */ }
  }

  const defaultInstance: WhatsAppInstance = {
    id: 'wa_inst_matriz',
    name: 'Transcunha Logística - Matriz',
    instance_key: 'transcunha_matriz_prod',
    phone_number: '5511984219900',
    status: 'connected',
    battery_level: 94,
    is_plugged: true,
    api_token: 'tk_transcunha_secure_token',
    last_connected_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_INSTANCE_KEY, JSON.stringify(defaultInstance));
  return defaultInstance;
}

export async function saveWhatsAppInstance(instance: WhatsAppInstance): Promise<WhatsAppInstance> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .upsert(instance)
      .select()
      .maybeSingle();

    if (!error && data) {
      localStorage.setItem(STORAGE_INSTANCE_KEY, JSON.stringify(data));
      return data as WhatsAppInstance;
    }
  } catch (err) {
    console.warn('Erro ao salvar no Supabase, mantendo local:', err);
  }

  localStorage.setItem(STORAGE_INSTANCE_KEY, JSON.stringify(instance));
  return instance;
}

export async function generateNewQRCode(): Promise<{ qrCode: string; instance: WhatsAppInstance }> {
  // Mock gerador de QR Code interativo SVG/Base64 para pareamento imediato
  const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="#ffffff" rx="12"/>
    <path d="M20,20 h60 v60 h-60 z M30,30 v40 h40 v-40 z" fill="#0f172a"/>
    <rect x="42" y="42" width="16" height="16" fill="#0f172a"/>
    <path d="M120,20 h60 v60 h-60 z M130,30 v40 h40 v-40 z" fill="#0f172a"/>
    <rect x="142" y="42" width="16" height="16" fill="#0f172a"/>
    <path d="M20,120 h60 v60 h-60 z M30,130 v40 h40 v-40 z" fill="#0f172a"/>
    <rect x="42" y="142" width="16" height="16" fill="#0f172a"/>
    <rect x="95" y="25" width="10" height="30" fill="#0f172a"/>
    <rect x="100" y="70" width="20" height="20" fill="#0f172a"/>
    <rect x="135" y="95" width="45" height="10" fill="#0f172a"/>
    <rect x="95" y="125" width="30" height="30" fill="#0f172a"/>
    <rect x="140" y="140" width="35" height="40" fill="#0f172a"/>
  </svg>`;
  
  const base64QR = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;
  
  const current = await getWhatsAppInstance();
  const updated: WhatsAppInstance = {
    ...current,
    status: 'qrcode',
    qr_code_base64: base64QR,
    updated_at: new Date().toISOString()
  };

  await saveWhatsAppInstance(updated);
  return { qrCode: base64QR, instance: updated };
}

export async function simulatePairingSuccess(phoneNumber: string): Promise<WhatsAppInstance> {
  const current = await getWhatsAppInstance();
  const updated: WhatsAppInstance = {
    ...current,
    status: 'connected',
    phone_number: sanitizePhoneNumber(phoneNumber),
    qr_code_base64: undefined,
    battery_level: 100,
    is_plugged: true,
    last_connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  return saveWhatsAppInstance(updated);
}

export async function disconnectWhatsApp(): Promise<WhatsAppInstance> {
  const current = await getWhatsAppInstance();
  const updated: WhatsAppInstance = {
    ...current,
    status: 'disconnected',
    qr_code_base64: undefined,
    last_disconnected_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  return saveWhatsAppInstance(updated);
}

// =========================================================================
// MÉTODOS DE TEMPLATES & RÉGUAS
// =========================================================================

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as WhatsAppTemplate[];
    }
  } catch (err) {
    console.warn('Usando templates locais:', err);
  }

  const local = localStorage.getItem(STORAGE_TEMPLATES_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch { /* ignore */ }
  }

  localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES));
  return DEFAULT_WHATSAPP_TEMPLATES;
}

export async function saveWhatsAppTemplate(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .upsert(template)
      .select()
      .maybeSingle();

    if (!error && data) {
      const templates = await getWhatsAppTemplates();
      const updated = templates.map(t => t.id === data.id ? (data as WhatsAppTemplate) : t);
      if (!templates.some(t => t.id === data.id)) updated.push(data as WhatsAppTemplate);
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(updated));
      return data as WhatsAppTemplate;
    }
  } catch (err) {
    console.warn('Erro ao salvar template no Supabase, salvando localmente:', err);
  }

  const current = await getWhatsAppTemplates();
  const idx = current.findIndex(t => t.id === template.id);
  let updatedList: WhatsAppTemplate[];
  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = { ...template, updated_at: new Date().toISOString() };
  } else {
    updatedList = [...current, { ...template, id: template.id || `tpl_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
  }

  localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(updatedList));
  return template;
}

export async function deleteWhatsAppTemplate(templateId: string): Promise<void> {
  try {
    await supabase.from('whatsapp_templates').delete().eq('id', templateId);
  } catch (err) {
    console.warn('Erro ao deletar no Supabase:', err);
  }

  const current = await getWhatsAppTemplates();
  const updated = current.filter(t => t.id !== templateId);
  localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(updated));
}

// =========================================================================
// MÉTODOS DE FILA, DISPAROS & LOGS
// =========================================================================

export async function getWhatsAppQueue(): Promise<WhatsAppQueueItem[]> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      return data as WhatsAppQueueItem[];
    }
  } catch (err) {
    console.warn('Usando fila local de WhatsApp:', err);
  }

  const local = localStorage.getItem(STORAGE_QUEUE_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch { /* ignore */ }
  }

  // Exemplos iniciais realistas para exibição no painel
  const sampleQueue: WhatsAppQueueItem[] = [
    {
      id: 'q_101',
      recipient_phone: '5511994821040',
      recipient_name: 'Marcos Antônio Ribeiro',
      message_type: 'document',
      rendered_body: '📋 *Ordem de Carregamento Transcunha*\n\nOlá, *Marcos Antônio Ribeiro*! Segue em anexo a sua Ordem de Carregamento referente ao embarque *#TC-8492*.\n\n📍 *Local de Coleta:* Terminal Graneleiro Armazém 4\n📅 *Data Programada:* 20/09/2026\n📞 *Contato no Local:* (11) 98888-7777 - Sr. Marcos\n\nPor favor, apresente este documento na portaria ao chegar.',
      media_url: 'https://transcunha.log/docs/ordem_8492.pdf',
      media_filename: 'Ordem_Carregamento_TC8492.pdf',
      status: 'delivered',
      attempts: 1,
      max_attempts: 3,
      scheduled_for: new Date(Date.now() - 3600000).toISOString(),
      sent_at: new Date(Date.now() - 3550000).toISOString(),
      external_message_id: 'wamid.HBgLNTUxMTk5NDgyMTA0MBUCABEYEkIwMEZCMjE4MjkzRUE3Q0U2NwA=',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3550000).toISOString()
    },
    {
      id: 'q_102',
      recipient_phone: '5541987552211',
      recipient_name: 'José Carlos de Souza',
      message_type: 'document',
      rendered_body: '✅ *Adiantamento Pago com Sucesso!*\n\nOlá, *José Carlos de Souza*! O adiantamento do seu frete referente ao embarque *#TC-8480* foi creditado em sua conta.\n\n💵 *Valor Pago:* R$ 3.850,00\n🏦 *Banco/Chave:* PIX (CPF ***.456.789-**)\n📄 O comprovante bancário segue em anexo.\n\nBoa viagem e dirija com segurança!',
      media_url: 'https://transcunha.log/vouchers/pix_8480.pdf',
      media_filename: 'Comprovante_PIX_TC8480.pdf',
      status: 'read',
      attempts: 1,
      max_attempts: 3,
      scheduled_for: new Date(Date.now() - 7200000).toISOString(),
      sent_at: new Date(Date.now() - 7180000).toISOString(),
      external_message_id: 'wamid.HBgLNTU0MTk4NzU1MjIxMBUCABEYEkRFMjhCQjA0QUQwQ0Y1NUE4MwA=',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7100000).toISOString()
    },
    {
      id: 'q_103',
      recipient_phone: '5519971239988',
      recipient_name: 'Everton Luiz Pacheco',
      message_type: 'text',
      rendered_body: '🚛 *Transcunha Logística - Oportunidade de Carga*\n\nOlá, *Everton Luiz Pacheco*! Temos uma nova carga disponível para você:\n\n📍 *Origem:* Paulínia - SP\n🎯 *Destino:* Rondonópolis - MT\n📦 *Mercadoria:* Fertilizantes em Bags\n⚖️ *Peso:* 38.000 kg\n💰 *Valor do Frete:* R$ 9.400,00\n\nInteressado? Responda a esta mensagem para confirmar!',
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      scheduled_for: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(sampleQueue));
  return sampleQueue;
}

export async function enqueueWhatsAppMessage(params: {
  recipientPhone: string;
  recipientName?: string;
  templateId?: string;
  shipmentId?: string;
  messageType?: WhatsAppMessageType;
  renderedBody: string;
  mediaUrl?: string;
  mediaFilename?: string;
  mediaCaption?: string;
}): Promise<WhatsAppQueueItem> {
  const cleanPhone = sanitizePhoneNumber(params.recipientPhone);

  const newItem: WhatsAppQueueItem = {
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    recipient_phone: cleanPhone,
    recipient_name: params.recipientName,
    template_id: params.templateId,
    shipment_id: params.shipmentId,
    message_type: params.messageType || (params.mediaUrl ? 'document' : 'text'),
    rendered_body: params.renderedBody,
    media_url: params.mediaUrl,
    media_filename: params.mediaFilename,
    media_caption: params.mediaCaption,
    status: 'pending',
    attempts: 0,
    max_attempts: 3,
    scheduled_for: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('whatsapp_messages_queue')
      .insert(newItem)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as WhatsAppQueueItem;
    }
  } catch (err) {
    console.warn('Erro ao salvar na fila do Supabase, usando local:', err);
  }

  const queue = await getWhatsAppQueue();
  const updated = [newItem, ...queue];
  localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
  return newItem;
}

export async function processQueueItemImmediately(queueId: string): Promise<WhatsAppQueueItem> {
  const queue = await getWhatsAppQueue();
  const item = queue.find(q => q.id === queueId);
  if (!item) throw new Error('Mensagem não localizada na fila');

  // Simulação de processamento de envio
  const updatedItem: WhatsAppQueueItem = {
    ...item,
    status: 'sent',
    sent_at: new Date().toISOString(),
    attempts: item.attempts + 1,
    external_message_id: `wamid.SIMULATED_${Date.now()}`,
    error_message: undefined,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('whatsapp_messages_queue').upsert(updatedItem);
  } catch { /* ignore */ }

  const updatedQueue = queue.map(q => q.id === queueId ? updatedItem : q);
  localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updatedQueue));
  return updatedItem;
}

export async function retryFailedQueueItem(queueId: string): Promise<WhatsAppQueueItem> {
  const queue = await getWhatsAppQueue();
  const item = queue.find(q => q.id === queueId);
  if (!item) throw new Error('Mensagem não localizada');

  const updatedItem: WhatsAppQueueItem = {
    ...item,
    status: 'pending',
    scheduled_for: new Date().toISOString(),
    error_message: undefined,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('whatsapp_messages_queue').upsert(updatedItem);
  } catch { /* ignore */ }

  const updatedQueue = queue.map(q => q.id === queueId ? updatedItem : q);
  localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updatedQueue));
  return updatedItem;
}
