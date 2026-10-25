import type { FiscalDocument, FiscalDocumentType, FiscalAlertLevel, FiscalDocumentAttachment } from '../types';

const STORAGE_DOCUMENTS_KEY = 'transcunha_fiscal_documents_v1';
const STORAGE_TYPES_KEY = 'transcunha_fiscal_document_types_v1';
export const FISCAL_DOCUMENTS_CHANGED_EVENT = 'transcunha:fiscal_documents_changed';

export interface ExpirationStatusInfo {
  level: FiscalAlertLevel;
  daysRemaining: number;
  label: string; // 'Vencido', 'Crítico', 'Atenção', 'Em Dia'
  badgeClass: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  isUrgent: boolean;
  urgencyOrder: number; // 0: vencido, 1: critico, 2: atencao, 3: em dia
}

/**
 * Calcula o status de validade e alertas conforme regras:
 * - Faltando 10 dias ou menos: 'Crítico'
 * - Faltando 30 dias ou menos: 'Atenção'
 * - Menos de 0 dias: 'Vencido'
 * - Mais de 30 dias: 'Em Dia'
 */
export const calculateExpirationStatus = (expirationDateStr: string): ExpirationStatusInfo => {
  if (!expirationDateStr) {
    return {
      level: 'ok',
      daysRemaining: 9999,
      label: 'Sem Validade',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      textColor: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      borderColor: 'border-slate-300 dark:border-slate-700',
      isUrgent: false,
      urgencyOrder: 3
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = expirationDateStr.split('-').map(Number);
  const expDate = new Date(y, (m || 1) - 1, d || 1);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      level: 'expired',
      daysRemaining,
      label: `Vencido há ${overdueDays} dia${overdueDays > 1 ? 's' : ''}`,
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40 font-bold',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-300 dark:border-rose-800',
      isUrgent: true,
      urgencyOrder: 0
    };
  } else if (daysRemaining <= 10) {
    return {
      level: 'critical',
      daysRemaining,
      label: daysRemaining === 0 ? 'Vence Hoje!' : `Crítico (Vence em ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''})`,
      badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/50 font-black animate-pulse',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/40',
      borderColor: 'border-red-300 dark:border-red-800',
      isUrgent: true,
      urgencyOrder: 1
    };
  } else if (daysRemaining <= 30) {
    return {
      level: 'warning',
      daysRemaining,
      label: `Atenção (Vence em ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''})`,
      badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-500/40 font-bold',
      textColor: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-300 dark:border-amber-800',
      isUrgent: true,
      urgencyOrder: 2
    };
  } else {
    return {
      level: 'ok',
      daysRemaining,
      label: `Em Dia (${daysRemaining} dias)`,
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-300 dark:border-emerald-800',
      isUrgent: false,
      urgencyOrder: 3
    };
  }
};

export const INITIAL_FISCAL_DOCUMENT_TYPES: FiscalDocumentType[] = [
  { id: 'fdt_apolice_rctrc', name: 'Apólice de Seguro RCTR-C', category: 'seguro', color: 'indigo', isDefault: true, description: 'Responsabilidade Civil do Transportador Rodoviário de Carga (Obrigatório)', createdAt: new Date().toISOString() },
  { id: 'fdt_apolice_rcdc', name: 'Apólice de Seguro RC-DC', category: 'seguro', color: 'purple', isDefault: true, description: 'Responsabilidade Civil por Desaparecimento de Carga (Roubo/Desvio)', createdAt: new Date().toISOString() },
  { id: 'fdt_cnd_federal', name: 'Certidão Negativa Federal (Receita / PGFN)', category: 'certidao', color: 'blue', isDefault: true, description: 'Débitos Relativos a Tributos Federais e à Dívida Ativa da União', createdAt: new Date().toISOString() },
  { id: 'fdt_cnd_estadual', name: 'Certidão Negativa Estadual (SEFAZ)', category: 'certidao', color: 'sky', isDefault: true, description: 'Tributos Estaduais (ICMS, IPVA e Dívida Ativa Estadual)', createdAt: new Date().toISOString() },
  { id: 'fdt_cnd_municipal', name: 'Certidão Negativa Municipal (ISS / Taxas)', category: 'certidao', color: 'cyan', isDefault: true, description: 'Tributos Mobiliários e Imobiliários do Município', createdAt: new Date().toISOString() },
  { id: 'fdt_crf_fgts', name: 'Certificado de Regularidade FGTS (CRF Caixa)', category: 'certidao', color: 'emerald', isDefault: true, description: 'Situação de Regularidade do Empregador junto ao FGTS', createdAt: new Date().toISOString() },
  { id: 'fdt_cndt_trabalhista', name: 'Certidão Negativa Trabalhista (CNDT)', category: 'certidao', color: 'amber', isDefault: true, description: 'Justiça do Trabalho / Banco Nacional de Devedores Trabalhistas', createdAt: new Date().toISOString() },
  { id: 'fdt_rntrc_antt', name: 'Registro Nacional de Transportador (RNTRC / ANTT)', category: 'licenca', color: 'teal', isDefault: true, description: 'Habilitação da Empresa de Transporte de Cargas na ANTT', createdAt: new Date().toISOString() },
  { id: 'fdt_licenca_ambiental', name: 'Licença Ambiental / IBAMA', category: 'licenca', color: 'green', isDefault: true, description: 'Autorização Ambiental para Transporte Rodoviário de Cargas', createdAt: new Date().toISOString() },
  { id: 'fdt_alvara', name: 'Alvará de Funcionamento e Localização', category: 'fiscal', color: 'slate', isDefault: true, description: 'Licenciamento Municipal para Operações do Estabelecimento', createdAt: new Date().toISOString() },
  { id: 'fdt_sassmaq_iso', name: 'Certificação SASSMAQ / ISO', category: 'certidao', color: 'rose', isDefault: true, description: 'Sistema de Avaliação de Segurança, Saúde, Meio Ambiente e Qualidade', createdAt: new Date().toISOString() },
  { id: 'fdt_outros', name: 'Outros Documentos / Certificados', category: 'outros', color: 'gray', isDefault: true, description: 'Outros contratos, laudos, declarações e certidões auxiliares', createdAt: new Date().toISOString() },
];

const addDaysToDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const subDaysToDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

export const getInitialFiscalDocumentsSeed = (): FiscalDocument[] => {
  return [
    {
      id: 'fdoc_001',
      title: 'Apólice Seguro Carga RCTR-C - Porto Seguro 2026',
      typeId: 'fdt_apolice_rctrc',
      typeName: 'Apólice de Seguro RCTR-C',
      documentNumber: 'AP-RCTR-88910-2026',
      issuer: 'Porto Seguro Cia de Seguros',
      issueDate: subDaysToDate(120),
      expirationDate: addDaysToDate(145), // Em Dia
      branchId: 'Matriz',
      branchName: 'Matriz (MG)',
      notes: 'Cobertura Ampla RCTR-C para transporte nacional. Limite Máximo de Garantia (LMG) de R$ 3.000.000,00 por embarque. Corretora: Aliança Seguros.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'fdoc_002',
      title: 'Apólice Seguro Carga RC-DC - Porto Seguro 2026',
      typeId: 'fdt_apolice_rcdc',
      typeName: 'Apólice de Seguro RC-DC',
      documentNumber: 'AP-RCDC-88911-2026',
      issuer: 'Porto Seguro Cia de Seguros',
      issueDate: subDaysToDate(120),
      expirationDate: addDaysToDate(145), // Em Dia
      branchId: 'Matriz',
      branchName: 'Matriz (MG)',
      notes: 'Desaparecimento e Roubo de Carga. Regras de gerenciamento de risco e rastreamento obrigatório acima de R$ 150.000,00.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'fdoc_003',
      title: 'Certificado de Regularidade FGTS (CRF Caixa)',
      typeId: 'fdt_crf_fgts',
      typeName: 'Certificado de Regularidade FGTS (CRF Caixa)',
      documentNumber: 'CRF-2026-991283',
      issuer: 'Caixa Econômica Federal',
      issueDate: subDaysToDate(23),
      expirationDate: addDaysToDate(7), // <= 10 dias: CRÍTICO
      branchId: 'Matriz',
      branchName: 'Matriz (MG)',
      notes: 'Validade de 30 dias pela CEF. Renovação imediata requerida para emissão de fretes e concorrências públicas.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'fdoc_004',
      title: 'CND Federal Conjunta (Receita Federal & PGFN)',
      typeId: 'fdt_cnd_federal',
      typeName: 'Certidão Negativa Federal (Receita / PGFN)',
      documentNumber: 'CND-FED-7721-2026',
      issuer: 'Receita Federal do Brasil / PGFN',
      issueDate: subDaysToDate(160),
      expirationDate: addDaysToDate(20), // <= 30 dias: ATENÇÃO
      branchId: 'Matriz',
      branchName: 'Matriz (MG)',
      notes: 'Certidão conjunta de débitos previdenciários e tributos federais da matriz. Validade semestral.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'fdoc_005',
      title: 'Certificado RNTRC / ANTT - Frota Própria & Agenciados',
      typeId: 'fdt_rntrc_antt',
      typeName: 'Registro Nacional de Transportador (RNTRC / ANTT)',
      documentNumber: 'RNTRC-ETC-04891028',
      issuer: 'Agência Nacional de Transportes Terrestres (ANTT)',
      issueDate: subDaysToDate(300),
      expirationDate: addDaysToDate(280), // Em Dia
      branchId: 'Todas',
      branchName: 'Todas as Filiais',
      notes: 'Registro categoria ETC (Empresa de Transporte Rodoviário de Cargas). Revalidação ordinária qüinqüenal.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'fdoc_006',
      title: 'Licença Ambiental de Transporte de Resíduos e Químicos',
      typeId: 'fdt_licenca_ambiental',
      typeName: 'Licença Ambiental / IBAMA',
      documentNumber: 'LO-SEMAD-MG-2025/119',
      issuer: 'Secretaria Estadual de Meio Ambiente (SEMAD MG)',
      issueDate: subDaysToDate(320),
      expirationDate: addDaysToDate(45), // Em Dia (quase entrando em atenção)
      branchId: 'Matriz',
      branchName: 'Matriz (MG)',
      notes: 'Licença de Operação (LO) para transporte de cargas perigosas e produtos controlados em MG, GO e SP.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    }
  ];
};

export const getFiscalDocumentTypes = (): FiscalDocumentType[] => {
  try {
    const raw = localStorage.getItem(STORAGE_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[fiscalControlService] Erro ao carregar tipos de documentos:', err);
  }
  // Inicializa com padrões
  try {
    localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(INITIAL_FISCAL_DOCUMENT_TYPES));
  } catch {}
  return INITIAL_FISCAL_DOCUMENT_TYPES;
};

export const saveFiscalDocumentType = (type: FiscalDocumentType): void => {
  try {
    const current = getFiscalDocumentTypes();
    const existingIndex = current.findIndex(t => t.id === type.id);
    let updated: FiscalDocumentType[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...type };
    } else {
      updated = [...current, type];
    }
    localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(FISCAL_DOCUMENTS_CHANGED_EVENT));
  } catch (err) {
    console.error('[fiscalControlService] Erro ao salvar tipo de documento:', err);
  }
};

export const deleteFiscalDocumentType = (typeId: string): void => {
  try {
    const current = getFiscalDocumentTypes();
    const updated = current.filter(t => t.id !== typeId);
    localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(FISCAL_DOCUMENTS_CHANGED_EVENT));
  } catch (err) {
    console.error('[fiscalControlService] Erro ao excluir tipo de documento:', err);
  }
};

export const getFiscalDocuments = (): FiscalDocument[] => {
  try {
    const raw = localStorage.getItem(STORAGE_DOCUMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[fiscalControlService] Erro ao carregar documentos fiscais:', err);
  }

  // Inicializa seed com demonstrações
  const seed = getInitialFiscalDocumentsSeed();
  try {
    localStorage.setItem(STORAGE_DOCUMENTS_KEY, JSON.stringify(seed));
  } catch {}
  return seed;
};

export const saveFiscalDocument = (doc: FiscalDocument): void => {
  try {
    const current = getFiscalDocuments();
    const existingIdx = current.findIndex(d => d.id === doc.id);
    let updated: FiscalDocument[];
    const nowIso = new Date().toISOString();

    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = { ...doc, updatedAt: nowIso };
    } else {
      updated = [{ ...doc, createdAt: doc.createdAt || nowIso, updatedAt: nowIso }, ...current];
    }

    localStorage.setItem(STORAGE_DOCUMENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(FISCAL_DOCUMENTS_CHANGED_EVENT));
  } catch (err) {
    console.error('[fiscalControlService] Erro ao salvar documento fiscal:', err);
    throw err;
  }
};

export const deleteFiscalDocument = (docId: string): void => {
  try {
    const current = getFiscalDocuments();
    const updated = current.filter(d => d.id !== docId);
    localStorage.setItem(STORAGE_DOCUMENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(FISCAL_DOCUMENTS_CHANGED_EVENT));
  } catch (err) {
    console.error('[fiscalControlService] Erro ao excluir documento fiscal:', err);
    throw err;
  }
};

export interface FiscalKpisSummary {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  ok: number;
  urgentCount: number; // expired + critical + warning
}

export const getFiscalKpisSummary = (docs: FiscalDocument[]): FiscalKpisSummary => {
  let expired = 0;
  let critical = 0;
  let warning = 0;
  let ok = 0;

  docs.forEach(doc => {
    const status = calculateExpirationStatus(doc.expirationDate);
    if (status.level === 'expired') expired++;
    else if (status.level === 'critical') critical++;
    else if (status.level === 'warning') warning++;
    else ok++;
  });

  return {
    total: docs.length,
    expired,
    critical,
    warning,
    ok,
    urgentCount: expired + critical + warning
  };
};
