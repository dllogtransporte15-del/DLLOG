import { supabase } from '../supabase';
import type { FinancialInvoice, CostCenter, CostType, InvoiceCostNature, InvoicePaymentStatus, User } from '../types';

const STORAGE_INVOICES_KEY = 'transcunha_financial_invoices';
const STORAGE_COST_CENTERS_KEY = 'transcunha_financial_cost_centers';
const STORAGE_COST_TYPES_KEY = 'transcunha_financial_cost_types';

export const INITIAL_COST_CENTERS: CostCenter[] = [
  { id: 'cc-001', code: 'CC-001', name: 'Operacional', description: 'Custos diretos de transporte, pátio e logística', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cc-002', code: 'CC-002', name: 'Administrativo', description: 'Despesas administrativas e gerais da matriz', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cc-003', code: 'CC-003', name: 'Frota & Equipamentos', description: 'Manutenção preventiva/corretiva e suprimentos da frota', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cc-004', code: 'CC-004', name: 'Comercial & Vendas', description: 'Custos de agenciamento, prospecção e vendas', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cc-005', code: 'CC-005', name: 'TI & Sistemas', description: 'Sistemas TMS, licenças, servidores e infraestrutura', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'cc-006', code: 'CC-006', name: 'Diretoria & Gestão', description: 'Custos estratégicos e gestão executiva', isDefault: true, createdAt: new Date().toISOString() },
];

export const INITIAL_COST_TYPES: CostType[] = [
  { id: 'ct-001', name: 'Manutenção Mecânica e Peças', nature: 'servico', description: 'Serviços mecânicos, elétricos e borracharia', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-002', name: 'Serviços de Tecnologia / TMS', nature: 'servico', description: 'Assinaturas de software, ERP e rastreamento', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-003', name: 'Honorários Jurídicos e Contábeis', nature: 'servico', description: 'Consultoria fiscal, contábil e advocatícia', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-004', name: 'Pedágio e Tags Eletrônicas', nature: 'servico', description: 'Recargas e faturamento Sem Parar/Veloe', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-005', name: 'Seguros e Rastreamento / GR', nature: 'servico', description: 'Gerenciamento de risco e apólices de transporte', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-006', name: 'Combustíveis e Lubrificantes', nature: 'produto', description: 'Abastecimento de diesel, arla e óleos', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-007', name: 'Pneus e Câmaras de Ar', nature: 'produto', description: 'Aquisição de pneumáticos e recapagens', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-008', name: 'Materiais de Escritório e Limpeza', nature: 'produto', description: 'Insumos do dia a dia administrativo', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-009', name: 'Veículos e Implementos', nature: 'bem', description: 'Aquisição e amortização de caminhões e carretas', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-010', name: 'Equipamentos de Informática', nature: 'bem', description: 'Computadores, monitores, servidores e roteadores', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-011', name: 'Móveis e Utensílios', nature: 'bem', description: 'Mobiliário de escritório e estações de trabalho', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ct-012', name: 'Tarifas e Despesas Bancárias', nature: 'outros', description: 'Taxas de boletos, transferências e custódia', isDefault: true, createdAt: new Date().toISOString() },
];

export const getInitialInvoicesSeed = (users: User[]): FinancialInvoice[] => {
  const adminUser = users.find(u => u.profile?.includes('Administrador') || u.profile?.includes('Admin')) || users[0] || { id: 'usr_admin', name: 'Administrador Transcunha', profile: 'Administrador do Sistema' };
  const operUser = users.find(u => u.profile?.includes('Embarcador') || u.profile?.includes('Operador')) || users[1] || adminUser;
  const agencUser = users.find(u => u.profile?.includes('Agenciador') || u.profile?.includes('Comercial')) || users[2] || adminUser;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  return [
    {
      id: 'inv_001',
      invoiceNumber: '89240',
      series: '1',
      accessKey: '35261012345678000199550010000892401827364519',
      supplierName: 'Posto e Restaurante Graal Parada Real',
      supplierCnpjCpf: '12.345.678/0001-99',
      totalAmount: 14850.00,
      issueDate: new Date(y, m, 2).toISOString().split('T')[0],
      dueDate: new Date(y, m, 16).toISOString().split('T')[0],
      paymentDate: new Date(y, m, 16).toISOString().split('T')[0],
      status: 'Pago',
      paymentMethod: 'Boleto',
      costNature: 'produto',
      costTypeId: 'ct-006',
      costTypeName: 'Combustíveis e Lubrificantes',
      costCenterId: 'cc-003',
      costCenterName: 'Frota & Equipamentos',
      responsibleUserId: operUser.id,
      responsibleUserName: operUser.name,
      responsibleUserProfile: String(operUser.profile || 'Operacional'),
      description: 'Abastecimento quinzenal da frota própria de carretas granel',
      notes: 'NF vinculada aos trajetos da rota SP-PR.',
      createdAt: new Date(y, m, 2).toISOString()
    },
    {
      id: 'inv_002',
      invoiceNumber: '44102',
      series: '2',
      supplierName: 'Scania Caminhões & Peças Ltda',
      supplierCnpjCpf: '45.890.123/0002-10',
      totalAmount: 8920.50,
      issueDate: new Date(y, m, 5).toISOString().split('T')[0],
      dueDate: new Date(y, m, 25).toISOString().split('T')[0],
      status: 'Pendente',
      paymentMethod: 'Boleto',
      costNature: 'servico',
      costTypeId: 'ct-001',
      costTypeName: 'Manutenção Mecânica e Peças',
      costCenterId: 'cc-003',
      costCenterName: 'Frota & Equipamentos',
      responsibleUserId: operUser.id,
      responsibleUserName: operUser.name,
      responsibleUserProfile: String(operUser.profile || 'Operacional'),
      description: 'Revisão preventiva e substituição de discos de freio e filtros',
      notes: 'Ordem de serviço OS-7892 aprovada pela gerência.',
      createdAt: new Date(y, m, 5).toISOString()
    },
    {
      id: 'inv_003',
      invoiceNumber: '10982',
      series: '1',
      supplierName: 'TOTVS / Logística & TMS Cloud',
      supplierCnpjCpf: '53.117.047/0001-44',
      totalAmount: 4500.00,
      issueDate: new Date(y, m, 1).toISOString().split('T')[0],
      dueDate: new Date(y, m, 10).toISOString().split('T')[0],
      paymentDate: new Date(y, m, 10).toISOString().split('T')[0],
      status: 'Pago',
      paymentMethod: 'Pix',
      costNature: 'servico',
      costTypeId: 'ct-002',
      costTypeName: 'Serviços de Tecnologia / TMS',
      costCenterId: 'cc-005',
      costCenterName: 'TI & Sistemas',
      responsibleUserId: adminUser.id,
      responsibleUserName: adminUser.name,
      responsibleUserProfile: String(adminUser.profile || 'Administrador'),
      description: 'Mensalidade de licenças dos módulos TMS e integração fiscal',
      notes: 'Faturamento mensal recorrente.',
      createdAt: new Date(y, m, 1).toISOString()
    },
    {
      id: 'inv_004',
      invoiceNumber: '77319',
      series: '1',
      supplierName: 'Brasil Risk Gerenciamento de Risco',
      supplierCnpjCpf: '03.882.910/0001-88',
      totalAmount: 6400.00,
      issueDate: new Date(y, m, 8).toISOString().split('T')[0],
      dueDate: new Date(y, m, 22).toISOString().split('T')[0],
      status: 'Pendente',
      paymentMethod: 'Boleto',
      costNature: 'servico',
      costTypeId: 'ct-005',
      costTypeName: 'Seguros e Rastreamento / GR',
      costCenterId: 'cc-001',
      costCenterName: 'Operacional',
      responsibleUserId: agencUser.id,
      responsibleUserName: agencUser.name,
      responsibleUserProfile: String(agencUser.profile || 'Agenciador'),
      description: 'Consultas cadastrais de motoristas e monitoramento de viagens',
      notes: 'Período operacional do mês.',
      createdAt: new Date(y, m, 8).toISOString()
    },
    {
      id: 'inv_005',
      invoiceNumber: '55210',
      series: '1',
      supplierName: 'Dell Computadores do Brasil',
      supplierCnpjCpf: '72.381.189/0001-25',
      totalAmount: 12500.00,
      issueDate: new Date(y, m, 12).toISOString().split('T')[0],
      dueDate: new Date(y, m, 28).toISOString().split('T')[0],
      status: 'Pendente',
      paymentMethod: 'Transferência',
      costNature: 'bem',
      costTypeId: 'ct-010',
      costTypeName: 'Equipamentos de Informática',
      costCenterId: 'cc-005',
      costCenterName: 'TI & Sistemas',
      responsibleUserId: adminUser.id,
      responsibleUserName: adminUser.name,
      responsibleUserProfile: String(adminUser.profile || 'Administrador'),
      description: 'Aquisição de 3 notebooks Dell Inspiron para os novos agenciadores de carga',
      notes: 'Ativo imobilizado da filial.',
      createdAt: new Date(y, m, 12).toISOString()
    }
  ];
};

// ----------------------------------------------------
// NOTAS FISCAIS (SINCRONIZAÇÃO EM TEMPO REAL & IDs SEQUENCIAIS nf-1, nf-2...)
// ----------------------------------------------------

export const SUPABASE_INVOICES_RECORD_ID = 888;
export const INVOICES_REALTIME_CHANNEL = 'financial_invoices_realtime';

/**
 * Gera o próximo ID sequencial padronizado no formato 'nf-1', 'nf-2', etc.
 */
export function getNextInvoiceId(existingList: FinancialInvoice[]): string {
  let maxNum = 0;
  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (!item || !item.id) continue;
      const m = String(item.id).match(/^nf-(\d+)$/i);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  return `nf-${maxNum + 1}`;
}

/**
 * Normaliza e migra a lista de notas para que todos os lançamentos possuam IDs sequenciais 'nf-1', 'nf-2'...
 */
export function normalizeInvoicesList(list: FinancialInvoice[]): FinancialInvoice[] {
  if (!Array.isArray(list)) return [];

  // Mantém todas as notas válidas (nunca descarta por prefixo!)
  const valid = list.filter(inv => inv && (inv.id || inv.invoiceNumber));

  const hasNfRegex = /^nf-(\d+)$/i;

  // Descobre o maior ID nf- já existente
  let maxAssigned = 0;
  for (const inv of valid) {
    if (!inv.id) continue;
    const m = String(inv.id).match(hasNfRegex);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > maxAssigned) {
        maxAssigned = num;
      }
    }
  }

  // Atribui sequencialmente nf- aos que ainda possuem IDs legados (ex.: inv_...)
  let nextSeq = maxAssigned === 0 ? 1 : maxAssigned + 1;
  const normalized = valid.map(inv => {
    let finalId = inv.id;
    if (!finalId || !hasNfRegex.test(finalId)) {
      finalId = `nf-${nextSeq}`;
      nextSeq++;
    }
    return {
      ...inv,
      id: finalId,
      totalAmount: typeof inv.totalAmount === 'number' && !isNaN(inv.totalAmount) ? inv.totalAmount : 0,
      payableAmount: typeof inv.payableAmount === 'number' && !isNaN(inv.payableAmount) ? inv.payableAmount : (inv.totalAmount || 0)
    };
  });

  return normalized;
}

/**
 * Busca a lista remota compartilhada de notas fiscais no Supabase (row 888 de profile_permissions).
 */
export async function fetchRemoteInvoices(): Promise<FinancialInvoice[]> {
  try {
    const { data, error } = await supabase
      .from('profile_permissions')
      .select('permissions')
      .eq('id', SUPABASE_INVOICES_RECORD_ID)
      .maybeSingle();

    if (!error && data?.permissions?.invoices && Array.isArray(data.permissions.invoices)) {
      return data.permissions.invoices;
    }
  } catch (err) {
    console.warn('[DB] Erro ao consultar NFs remotas:', err);
  }
  return [];
}

/**
 * Mescla de forma inteligente notas remotas e locais sem perda de dados e sem duplicações.
 */
export function mergeInvoicesList(remoteList: FinancialInvoice[], localList: FinancialInvoice[]): FinancialInvoice[] {
  const result: FinancialInvoice[] = Array.isArray(remoteList) ? [...remoteList] : [];
  const remoteKeys = new Set(
    result.map(r => `${r.invoiceNumber || ''}_${(r.supplierName || '').trim().toLowerCase()}`)
  );
  const existingIds = new Set(result.map(r => r.id));

  if (Array.isArray(localList)) {
    for (const loc of localList) {
      if (!loc) continue;
      const key = `${loc.invoiceNumber || ''}_${(loc.supplierName || '').trim().toLowerCase()}`;
      if (!remoteKeys.has(key)) {
        remoteKeys.add(key);
        let id = loc.id;
        if (!id || existingIds.has(id) || !/^nf-\d+$/i.test(id)) {
          id = getNextInvoiceId(result);
        }
        existingIds.add(id);
        result.push({ ...loc, id });
      }
    }
  }

  return normalizeInvoicesList(result);
}

/**
 * Envia notificação via broadcast Realtime do Supabase para todos os clientes conectados.
 */
function broadcastInvoicesChange(action: 'create' | 'update' | 'delete', invoiceId?: string) {
  try {
    const channel = supabase.channel(INVOICES_REALTIME_CHANNEL);
    channel.send({
      type: 'broadcast',
      event: 'invoices_changed',
      payload: { action, invoiceId, timestamp: Date.now() }
    });
  } catch (err) {
    console.warn('[Realtime] Falha ao enviar broadcast de notas fiscais:', err);
  }
}

/**
 * Subscreve a atualizações em tempo real das Notas Fiscais (WebSockets Supabase + Postgres + Local).
 */
export function subscribeToFinancialInvoices(onUpdate: () => void) {
  let isMounted = true;
  const channelName = `fin_inv_rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase.channel(channelName);

  // 1. Broadcast Realtime WebSocket entre diferentes navegadores e usuários
  channel.on('broadcast', { event: 'invoices_changed' }, () => {
    if (isMounted) onUpdate();
  });

  // 2. Postgres Changes no registro compartilhado no Supabase (row 888 em profile_permissions)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profile_permissions' },
    (payload: any) => {
      if (isMounted) {
        const rowId = payload?.new?.id ?? payload?.old?.id;
        if (rowId === SUPABASE_INVOICES_RECORD_ID || rowId === 888 || !rowId) {
          onUpdate();
        }
      }
    }
  );

  // 3. Postgres Changes na tabela dedicada financial_invoices (se criada)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'financial_invoices' },
    () => {
      if (isMounted) onUpdate();
    }
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] ✅ Canal de Notas Fiscais conectado com sucesso');
    }
  });

  // 4. Ouvintes de eventos no mesmo navegador (CustomEvent e storage entre abas)
  const handleLocal = () => {
    if (isMounted) onUpdate();
  };
  window.addEventListener('financial_invoices_updated', handleLocal);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_INVOICES_KEY && isMounted) {
      onUpdate();
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    isMounted = false;
    try { supabase.removeChannel(channel); } catch {}
    window.removeEventListener('financial_invoices_updated', handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
}

export const financialInvoiceService = {
  // ----------------------------------------------------
  // CENTROS DE CUSTO
  // ----------------------------------------------------
  getCostCenters: async (): Promise<CostCenter[]> => {
    try {
      const { data, error } = await supabase
        .from('financial_cost_centers')
        .select('*')
        .order('name');
      
      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          code: d.code,
          name: d.name,
          description: d.description,
          isDefault: d.is_default,
          createdAt: d.created_at
        }));
      }
    } catch {
      // Ignora erro e usa fallback
    }

    try {
      const local = localStorage.getItem(STORAGE_COST_CENTERS_KEY);
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Erro ao ler centros de custo locais:', e);
    }

    localStorage.setItem(STORAGE_COST_CENTERS_KEY, JSON.stringify(INITIAL_COST_CENTERS));
    return INITIAL_COST_CENTERS;
  },

  addCostCenter: async (item: Omit<CostCenter, 'id' | 'createdAt'>): Promise<CostCenter> => {
    const newId = `cc_${Date.now()}`;
    const newCenter: CostCenter = {
      ...item,
      id: newId,
      createdAt: new Date().toISOString()
    };

    try {
      await supabase.from('financial_cost_centers').insert({
        name: item.name,
        code: item.code,
        description: item.description,
        is_default: false
      });
    } catch {
      // Suprime erro caso tabela não esteja criada no Supabase ainda
    }

    try {
      const local = localStorage.getItem(STORAGE_COST_CENTERS_KEY);
      const list: CostCenter[] = local ? JSON.parse(local) : INITIAL_COST_CENTERS;
      list.push(newCenter);
      localStorage.setItem(STORAGE_COST_CENTERS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }

    return newCenter;
  },

  // ----------------------------------------------------
  // MODALIDADES / TIPOS DE CUSTO
  // ----------------------------------------------------
  getCostTypes: async (): Promise<CostType[]> => {
    try {
      const { data, error } = await supabase
        .from('financial_cost_types')
        .select('*')
        .order('name');
      
      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          name: d.name,
          nature: d.nature as InvoiceCostNature,
          description: d.description,
          isDefault: d.is_default,
          createdAt: d.created_at
        }));
      }
    } catch {
      // Fallback
    }

    try {
      const local = localStorage.getItem(STORAGE_COST_TYPES_KEY);
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Erro ao ler tipos de custo locais:', e);
    }

    localStorage.setItem(STORAGE_COST_TYPES_KEY, JSON.stringify(INITIAL_COST_TYPES));
    return INITIAL_COST_TYPES;
  },

  addCostType: async (item: Omit<CostType, 'id' | 'createdAt'>): Promise<CostType> => {
    const newId = `ct_${Date.now()}`;
    const newType: CostType = {
      ...item,
      id: newId,
      createdAt: new Date().toISOString()
    };

    try {
      await supabase.from('financial_cost_types').insert({
        name: item.name,
        nature: item.nature,
        description: item.description,
        is_default: false
      });
    } catch {
      // Suprime erro caso tabela não esteja criada no Supabase ainda
    }

    try {
      const local = localStorage.getItem(STORAGE_COST_TYPES_KEY);
      const list: CostType[] = local ? JSON.parse(local) : INITIAL_COST_TYPES;
      list.push(newType);
      localStorage.setItem(STORAGE_COST_TYPES_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }

    return newType;
  },

  // ----------------------------------------------------
  // NOTAS FISCAIS
  // ----------------------------------------------------
  getInvoices: async (_users: User[] = []): Promise<FinancialInvoice[]> => {
    // 1. Tentar ler do Supabase (registro compartilhado 888 acessível a todos os usuários)
    const remoteInvoices = await fetchRemoteInvoices();

    // 2. Se não encontrou na row 888, tentar na tabela dedicada 'financial_invoices'
    let fallbackRemote: FinancialInvoice[] | null = null;
    if (!remoteInvoices || remoteInvoices.length === 0) {
      try {
        const { data, error } = await supabase
          .from('financial_invoices')
          .select('*')
          .order('issue_date', { ascending: false });

        if (!error && data && data.length > 0) {
          fallbackRemote = data.map(d => ({
            id: d.id,
            invoiceNumber: d.invoice_number,
            series: d.series,
            accessKey: d.access_key,
            supplierName: d.supplier_name,
            supplierCnpjCpf: d.supplier_cnpj_cpf,
            totalAmount: Number(d.total_amount) || 0,
            payableAmount: d.payable_amount !== undefined && d.payable_amount !== null ? Number(d.payable_amount) : (Number(d.total_amount) || 0),
            issueDate: d.issue_date,
            dueDate: d.due_date,
            paymentDate: d.payment_date,
            status: d.status as InvoicePaymentStatus,
            paymentMethod: d.payment_method,
            paymentDetails: d.payment_details || d.paymentDetails,
            costNature: d.cost_nature as InvoiceCostNature,
            costTypeId: d.cost_type_id,
            costTypeName: d.cost_type_name,
            costCenterId: d.cost_center_id,
            costCenterName: d.cost_center_name,
            responsibleUserId: d.responsible_user_id,
            responsibleUserName: d.responsible_user_name,
            responsibleUserProfile: d.responsible_user_profile,
            description: d.description,
            notes: d.notes,
            fileUrl: d.file_url,
            fileName: d.file_name,
            fileType: d.file_type,
            fileSize: d.file_size ? Number(d.file_size) : undefined,
            boletoFileUrl: d.boleto_file_url,
            boletoFileName: d.boleto_file_name,
            boletoFileType: d.boleto_file_type,
            boletoFileSize: d.boleto_file_size ? Number(d.boleto_file_size) : undefined,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
        }
      } catch {
        // Tabela ainda não criada
      }
    }

    const effectiveRemote = (remoteInvoices && remoteInvoices.length > 0) ? remoteInvoices : (fallbackRemote || []);

    // 3. Ler cópia local do localStorage
    let localInvoices: FinancialInvoice[] = [];
    try {
      const local = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          localInvoices = parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler notas locais:', e);
    }

    // 4. Se a nuvem tiver dados, mescla com os locais preservando todos os lançamentos
    if (effectiveRemote.length > 0) {
      const merged = mergeInvoicesList(effectiveRemote, localInvoices);
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(merged));
      return merged;
    }

    // 5. Se a nuvem estiver vazia mas o usuário local já possuir notas (ex.: 11 notas existentes),
    // faz o upload automático imediato para o Supabase para que TODOS os outros usuários tenham acesso!
    if (localInvoices.length > 0) {
      const normalizedLocal = normalizeInvoicesList(localInvoices);
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(normalizedLocal));
      
      (async () => {
        try {
          await supabase.from('profile_permissions').upsert({
            id: SUPABASE_INVOICES_RECORD_ID,
            permissions: {
              invoices: normalizedLocal,
              updatedAt: new Date().toISOString()
            }
          });
          broadcastInvoicesChange('update');
        } catch (err) {
          console.warn('[Sync] Falha no upload inicial para Supabase:', err);
        }
      })();

      return normalizedLocal;
    }

    localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify([]));
    return [];
  },

  saveInvoice: async (
    item: Omit<FinancialInvoice, 'id' | 'createdAt'>,
    existingId?: string
  ): Promise<FinancialInvoice> => {
    const isEdit = !!existingId;
    const nowIso = new Date().toISOString();

    // 1. Sempre busca dados atualizados da nuvem Supabase antes de mesclar e salvar
    const remoteList = await fetchRemoteInvoices();
    let localList: FinancialInvoice[] = [];
    try {
      const local = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (local) localList = JSON.parse(local);
    } catch {}

    const currentList = mergeInvoicesList(remoteList, localList);

    // REGRA DE OURO: Para novos lançamentos, gera ID sequencial no formato 'nf-1', 'nf-2', etc.
    const invoiceId = existingId || getNextInvoiceId(currentList);

    const completeInvoice: FinancialInvoice = {
      ...item,
      id: invoiceId,
      totalAmount: Number(item.totalAmount) || 0,
      payableAmount: item.payableAmount !== undefined && !isNaN(item.payableAmount) ? Number(item.payableAmount) : (Number(item.totalAmount) || 0),
      createdAt: isEdit ? (item as any).createdAt || nowIso : nowIso,
      updatedAt: nowIso
    };

    let updatedList: FinancialInvoice[];
    if (isEdit) {
      updatedList = currentList.map(inv => inv.id === existingId ? completeInvoice : inv);
    } else {
      updatedList = [completeInvoice, ...currentList.filter(inv => inv.id !== invoiceId)];
    }
    updatedList = normalizeInvoicesList(updatedList);

    // 2. Persistência na nuvem Supabase (Registro compartilhado para sincronização entre todos os usuários)
    try {
      await supabase.from('profile_permissions').upsert({
        id: SUPABASE_INVOICES_RECORD_ID,
        permissions: {
          invoices: updatedList,
          updatedAt: nowIso
        }
      });
    } catch (err) {
      console.warn('[Supabase] Erro ao sincronizar NFs na nuvem:', err);
    }

    // 3. Tentar persistir também na tabela dedicada 'financial_invoices' se existir
    try {
      const dbPayload = {
        invoice_number: item.invoiceNumber,
        series: item.series,
        access_key: item.accessKey,
        supplier_name: item.supplierName,
        supplier_cnpj_cpf: item.supplierCnpjCpf,
        total_amount: completeInvoice.totalAmount,
        payable_amount: completeInvoice.payableAmount,
        issue_date: item.issueDate,
        due_date: item.dueDate,
        payment_date: item.paymentDate || null,
        status: item.status,
        payment_method: item.paymentMethod,
        payment_details: item.paymentDetails || null,
        cost_nature: item.costNature,
        cost_type_id: item.costTypeId || null,
        cost_type_name: item.costTypeName,
        cost_center_id: item.costCenterId || null,
        cost_center_name: item.costCenterName,
        responsible_user_id: item.responsibleUserId,
        responsible_user_name: item.responsibleUserName,
        responsible_user_profile: item.responsibleUserProfile,
        description: item.description,
        notes: item.notes,
        file_url: item.fileUrl,
        file_name: item.fileName,
        file_type: item.fileType,
        file_size: item.fileSize,
        boleto_file_url: item.boletoFileUrl,
        boleto_file_name: item.boletoFileName,
        boleto_file_type: item.boletoFileType,
        boleto_file_size: item.boletoFileSize,
        updated_at: nowIso
      };

      if (isEdit) {
        await supabase.from('financial_invoices').update(dbPayload).eq('id', existingId);
      } else {
        await supabase.from('financial_invoices').insert(dbPayload);
      }
    } catch {
      // Tabela não criada
    }

    // 4. Persistência local garantida
    try {
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(updatedList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('financial_invoices_updated', { detail: completeInvoice }));
      }
    } catch (e) {
      console.error(e);
    }

    // 5. Notificar todos os outros usuários conectados via WebSocket Realtime
    broadcastInvoicesChange(isEdit ? 'update' : 'create', invoiceId);

    return completeInvoice;
  },

  updateInvoiceStatus: async (
    id: string,
    status: InvoicePaymentStatus,
    paymentDate?: string
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    
    // Sempre busca da nuvem para mesclar antes de atualizar status
    const remoteList = await fetchRemoteInvoices();
    let localList: FinancialInvoice[] = [];
    try {
      const local = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (local) localList = JSON.parse(local);
    } catch {}

    const currentList = mergeInvoicesList(remoteList, localList);
    const updatedList = currentList.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          status,
          paymentDate: paymentDate || (status === 'Pago' ? (inv.paymentDate || new Date().toISOString().split('T')[0]) : undefined),
          updatedAt: nowIso
        };
      }
      return inv;
    });

    // Atualiza no Supabase row 888
    try {
      if (updatedList.length > 0) {
        await supabase.from('profile_permissions').upsert({
          id: SUPABASE_INVOICES_RECORD_ID,
          permissions: {
            invoices: updatedList,
            updatedAt: nowIso
          }
        });
      }
    } catch (err) {
      console.warn('[Supabase] Erro ao atualizar status de NF na nuvem:', err);
    }

    // Tenta atualizar na tabela dedicada
    try {
      await supabase
        .from('financial_invoices')
        .update({
          status,
          payment_date: paymentDate || (status === 'Pago' ? new Date().toISOString().split('T')[0] : null),
          updated_at: nowIso
        })
        .eq('id', id);
    } catch {}

    // Atualiza local
    try {
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    }

    // Notifica abas e outros usuários
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('financial_invoices_updated', { detail: { id, status } }));
    }
    broadcastInvoicesChange('update', id);
  },

  deleteInvoice: async (id: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    
    const remoteList = await fetchRemoteInvoices();
    let localList: FinancialInvoice[] = [];
    try {
      const local = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (local) localList = JSON.parse(local);
    } catch {}

    const currentList = mergeInvoicesList(remoteList, localList);
    const updatedList = currentList.filter(inv => inv.id !== id);

    // Atualiza no Supabase row 888
    try {
      await supabase.from('profile_permissions').upsert({
        id: SUPABASE_INVOICES_RECORD_ID,
        permissions: {
          invoices: updatedList,
          updatedAt: nowIso
        }
      });
    } catch (err) {
      console.warn('[Supabase] Erro ao deletar NF na nuvem:', err);
    }

    // Tenta deletar na tabela dedicada
    try {
      await supabase.from('financial_invoices').delete().eq('id', id);
    } catch {}

    // Atualiza local
    try {
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    }

    // Notifica abas e outros usuários
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('financial_invoices_updated', { detail: { id, deleted: true } }));
    }
    broadcastInvoicesChange('delete', id);
  }
};

