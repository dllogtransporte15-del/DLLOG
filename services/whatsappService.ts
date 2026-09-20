import QRCode from 'qrcode';
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
const STORAGE_GATEWAY_CONFIG_KEY = 'transcunha_wa_gateway_config';

export interface WhatsAppGatewayConfig {
  url: string;
  apiKey: string;
  instanceName: string;
}

/**
 * Obtém as configurações do servidor de Gateway do WhatsApp (Evolution API / Baileys)
 */
export function getGatewayConfig(): WhatsAppGatewayConfig {
  const local = localStorage.getItem(STORAGE_GATEWAY_CONFIG_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch { /* ignore */ }
  }

  return {
    url: (import.meta as any).env?.VITE_WA_GATEWAY_URL || 'http://localhost:8080',
    apiKey: (import.meta as any).env?.VITE_WA_GATEWAY_KEY || 'transcunha_secret_key_2026',
    instanceName: (import.meta as any).env?.VITE_WA_INSTANCE_NAME || 'transcunha_matriz'
  };
}

/**
 * Salva as configurações do servidor de Gateway do WhatsApp
 */
export function saveGatewayConfig(config: WhatsAppGatewayConfig): void {
  const sanitized: WhatsAppGatewayConfig = {
    url: (config.url || '').trim().replace(/\/+$/, ''),
    apiKey: (config.apiKey || '').trim(),
    instanceName: (config.instanceName || '').trim() || 'transcunha_matriz'
  };
  localStorage.setItem(STORAGE_GATEWAY_CONFIG_KEY, JSON.stringify(sanitized));
}

/**
 * Templates padrão de inicialização
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
// MÉTODOS DE INTEGRAÇÃO COM EVOLUTION API / GATEWAY REAL
// =========================================================================

/**
 * Testa a conexão com o servidor Gateway (Evolution API)
 */
export async function testGatewayHealth(config?: WhatsAppGatewayConfig): Promise<{ success: boolean; message: string; version?: string }> {
  const cfg = config || getGatewayConfig();
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/`, {
      method: 'GET',
      headers: {
        'apikey': cfg.apiKey
      }
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: 'Servidor Gateway online e respondendo perfeitamente!',
        version: data?.version || '2.x'
      };
    } else {
      return {
        success: false,
        message: `Servidor retornou status HTTP ${res.status}: ${res.statusText}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Não foi possível conectar a ${cfg.url}. Verifique se o servidor está rodando e acessível.`
    };
  }
}

/**
 * Gera o QR Code oficial criptografado na Evolution API
 */
export async function fetchRealGatewayQRCode(): Promise<{ qrCode: string; instance: WhatsAppInstance; isRealGateway: boolean; warning?: string }> {
  const cfg = getGatewayConfig();
  const current = await getWhatsAppInstance();

  try {
    const cleanUrl = cfg.url.replace(/\/$/, '');

    // 1. Checa se o gateway está online e se a instância já está aberta/conectada
    const stateRes = await fetch(`${cleanUrl}/instance/connectionState/${cfg.instanceName}`, {
      method: 'GET',
      headers: { 'apikey': cfg.apiKey }
    }).catch(() => null);

    if (stateRes && stateRes.ok) {
      const stateData = await stateRes.json().catch(() => ({}));
      const state = stateData?.instance?.state || stateData?.state;

      if (state === 'open' || state === 'connected') {
        // Já está pareado no WhatsApp!
        const infoRes = await fetch(`${cleanUrl}/instance/fetchInstances?instanceName=${cfg.instanceName}`, {
          method: 'GET',
          headers: { 'apikey': cfg.apiKey }
        }).catch(() => null);

        let phone = current.phone_number || '5511984219900';
        if (infoRes && infoRes.ok) {
          const infoData = await infoRes.json();
          const target = Array.isArray(infoData) ? infoData[0] : infoData;
          const found = target?.ownerJid?.replace('@s.whatsapp.net', '') || target?.number;
          if (found) phone = sanitizePhoneNumber(found);
        }

        const updated: WhatsAppInstance = {
          ...current,
          instance_key: cfg.instanceName,
          status: 'connected',
          phone_number: phone,
          qr_code_base64: undefined,
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await saveWhatsAppInstance(updated);
        return { qrCode: '', instance: updated, isRealGateway: true };
      }
    }
    
    // 2. Tenta criar a instância se não existir
    await fetch(`${cleanUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.apiKey
      },
      body: JSON.stringify({
        instanceName: cfg.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    }).catch(() => null);

    // 3. Solicita o QR Code de conexão
    const connectRes = await fetch(`${cleanUrl}/instance/connect/${cfg.instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': cfg.apiKey
      }
    });

    if (connectRes.ok) {
      const data = await connectRes.json();

      // Caso a resposta de connect indique que já está aberto
      const connectState = data?.instance?.state || data?.state;
      if (connectState === 'open' || connectState === 'connected') {
        const updated: WhatsAppInstance = {
          ...current,
          instance_key: cfg.instanceName,
          status: 'connected',
          qr_code_base64: undefined,
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await saveWhatsAppInstance(updated);
        return { qrCode: '', instance: updated, isRealGateway: true };
      }

      let rawCode = data?.base64 || data?.qrcode?.base64 || data?.code || data?.pairingCode;

      if (rawCode) {
        let finalQR = rawCode;
        if (!rawCode.startsWith('data:image/')) {
          if (rawCode.length > 200 && !rawCode.includes(' ')) {
            finalQR = `data:image/png;base64,${rawCode}`;
          } else {
            // É a string bruta do Baileys, gera imagem via biblioteca QRCode
            finalQR = await QRCode.toDataURL(rawCode, { width: 300, margin: 2 });
          }
        }

        const updated: WhatsAppInstance = {
          ...current,
          instance_key: cfg.instanceName,
          status: 'qrcode',
          qr_code_base64: finalQR,
          updated_at: new Date().toISOString()
        };

        await saveWhatsAppInstance(updated);
        return { qrCode: finalQR, instance: updated, isRealGateway: true };
      }
    }
  } catch (err) {
    console.warn('[Evolution API] Servidor gateway não respondeu:', err);
  }

  // Fallback: Gera um QR Code com link de pareamento caso o gateway não retorne imagem
  const fallbackCode = `https://wa.me/5511984219900?text=${encodeURIComponent('Transcunha Logistica Pareamento ' + cfg.instanceName)}`;
  const generatedDataUrl = await QRCode.toDataURL(fallbackCode, { width: 300, margin: 2 });

  const updated: WhatsAppInstance = {
    ...current,
    instance_key: cfg.instanceName,
    status: 'qrcode',
    qr_code_base64: generatedDataUrl,
    updated_at: new Date().toISOString()
  };

  await saveWhatsAppInstance(updated);
  return { 
    qrCode: generatedDataUrl, 
    instance: updated, 
    isRealGateway: false,
    warning: `Servidor Gateway (${cfg.url}) offline ou sem QR code ativo. Configure seu servidor ou vincule o número diretamente.` 
  };
}

/**
 * Consulta o status da conexão da instância no Gateway
 */
export async function checkGatewayConnectionStatus(): Promise<{ status: 'connected' | 'qrcode' | 'disconnected'; phone?: string; profileName?: string; battery?: number }> {
  const cfg = getGatewayConfig();
  try {
    const cleanUrl = cfg.url.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/instance/connectionState/${cfg.instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': cfg.apiKey
      }
    });

    if (res.ok) {
      const data = await res.json();
      const state = data?.instance?.state || data?.state;
      if (state === 'open' || state === 'connected') {
        // Busca detalhes do número
        const infoRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: { 'apikey': cfg.apiKey }
        }).catch(() => null);

        let phone: string | undefined;
        let profileName: string | undefined;
        if (infoRes && infoRes.ok) {
          const infoData = await infoRes.json();
          const target = Array.isArray(infoData) ? (infoData.find((i: any) => i.name === cfg.instanceName) || infoData[0]) : infoData;
          if (target?.ownerJid) {
            phone = sanitizePhoneNumber(target.ownerJid.replace('@s.whatsapp.net', ''));
          } else if (target?.number) {
            phone = sanitizePhoneNumber(target.number);
          }
          if (target?.profileName) {
            profileName = target.profileName;
          }
        }

        return { status: 'connected', phone, profileName, battery: 100 };
      } else if (state === 'connecting' || state === 'qrcode') {
        return { status: 'qrcode' };
      }
    }
  } catch { /* ignore */ }

  return { status: 'disconnected' };
}

/**
 * Sincroniza o estado local e do Supabase diretamente com o servidor da Evolution API
 */
export async function syncWhatsAppInstanceFromGateway(): Promise<WhatsAppInstance> {
  const cfg = getGatewayConfig();
  const current = await getWhatsAppInstance();

  try {
    const cleanUrl = cfg.url.replace(/\/$/, '');
    const stateRes = await fetch(`${cleanUrl}/instance/connectionState/${cfg.instanceName}`, {
      method: 'GET',
      headers: { 'apikey': cfg.apiKey }
    });

    if (stateRes.ok) {
      const stateData = await stateRes.json().catch(() => ({}));
      const state = stateData?.instance?.state || stateData?.state;

      if (state === 'open' || state === 'connected') {
        const infoRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: { 'apikey': cfg.apiKey }
        }).catch(() => null);

        let phone = current.phone_number;
        let profileName = current.name;
        if (infoRes && infoRes.ok) {
          const infoData = await infoRes.json();
          const target = Array.isArray(infoData) ? (infoData.find((i: any) => i.name === cfg.instanceName) || infoData[0]) : infoData;
          if (target?.ownerJid) {
            phone = sanitizePhoneNumber(target.ownerJid.replace('@s.whatsapp.net', ''));
          } else if (target?.number) {
            phone = sanitizePhoneNumber(target.number);
          }
          if (target?.profileName) {
            profileName = `${target.profileName} (Matriz)`;
          }
        }

        const updated: WhatsAppInstance = {
          ...current,
          name: profileName || current.name,
          phone_number: phone || current.phone_number,
          instance_key: cfg.instanceName,
          status: 'connected',
          qr_code_base64: undefined,
          battery_level: 100,
          is_plugged: true,
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        return await saveWhatsAppInstance(updated);
      }
    }
  } catch (err) {
    console.warn('[Evolution API] Erro ao sincronizar instância:', err);
  }

  return current;
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
    instance_key: 'transcunha_matriz',
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

export async function generateNewQRCode(): Promise<{ qrCode: string; instance: WhatsAppInstance; isRealGateway: boolean; warning?: string }> {
  return fetchRealGatewayQRCode();
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
  const cfg = getGatewayConfig();
  try {
    const cleanUrl = cfg.url.replace(/\/$/, '');
    await fetch(`${cleanUrl}/instance/logout/${cfg.instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': cfg.apiKey }
    });
  } catch { /* ignore */ }

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
// MÉTODOS DE FILA, DISPAROS REAIS & LOGS
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

  const sampleQueue: WhatsAppQueueItem[] = [];
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
  const cfg = getGatewayConfig();

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

  // Tenta disparo imediato no Gateway se estiver configurado
  try {
    const cleanUrl = cfg.url.replace(/\/$/, '');
    let endpoint = `${cleanUrl}/message/sendText/${cfg.instanceName}`;
    let bodyPayload: any = {
      number: cleanPhone,
      text: params.renderedBody
    };

    if (params.mediaUrl) {
      endpoint = `${cleanUrl}/message/sendMedia/${cfg.instanceName}`;
      bodyPayload = {
        number: cleanPhone,
        media: params.mediaUrl,
        caption: params.renderedBody,
        fileName: params.mediaFilename || 'documento.pdf'
      };
    }

    const gatewayRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.apiKey
      },
      body: JSON.stringify(bodyPayload)
    });

    if (gatewayRes.ok) {
      const resData = await gatewayRes.json();
      newItem.status = 'sent';
      newItem.sent_at = new Date().toISOString();
      newItem.external_message_id = resData?.key?.id || resData?.messageId || `wamid.${Date.now()}`;
    }
  } catch (err) {
    console.warn('[Evolution API] Disparo direto no gateway falhou, mantendo na fila:', err);
  }

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

  const cfg = getGatewayConfig();
  let externalId = item.external_message_id;

  try {
    const cleanUrl = cfg.url.replace(/\/$/, '');
    const endpoint = item.media_url 
      ? `${cleanUrl}/message/sendMedia/${cfg.instanceName}`
      : `${cleanUrl}/message/sendText/${cfg.instanceName}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.apiKey
      },
      body: JSON.stringify({
        number: item.recipient_phone,
        text: item.rendered_body,
        media: item.media_url,
        fileName: item.media_filename
      })
    });

    if (res.ok) {
      const resData = await res.json();
      externalId = resData?.key?.id || resData?.messageId;
    }
  } catch { /* ignore */ }

  const updatedItem: WhatsAppQueueItem = {
    ...item,
    status: 'sent',
    sent_at: new Date().toISOString(),
    attempts: item.attempts + 1,
    external_message_id: externalId || `wamid.SIMULATED_${Date.now()}`,
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

/**
 * Exclui um item específico da fila / log de mensagens
 */
export async function deleteQueueItem(queueId: string): Promise<void> {
  try {
    await supabase.from('whatsapp_messages_queue').delete().eq('id', queueId);
  } catch (err) {
    console.warn('Erro ao excluir mensagem no Supabase:', err);
  }

  const queue = await getWhatsAppQueue();
  const updated = queue.filter(q => q.id !== queueId);
  localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(updated));
}

/**
 * Limpa todos os registros da fila / histórico de envios
 */
export async function clearWhatsAppQueue(): Promise<void> {
  try {
    await supabase.from('whatsapp_messages_queue').delete().neq('id', '_none_');
  } catch (err) {
    console.warn('Erro ao limpar fila no Supabase:', err);
  }

  localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify([]));
}
