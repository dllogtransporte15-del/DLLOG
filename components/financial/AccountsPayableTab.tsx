import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { 
  FinancialTransaction, 
  Shipment, 
  Cargo, 
  Client, 
  User, 
  Branch,
  FinancialInvoice,
  InvoicePaymentStatus,
  PayrollSettlementDoc,
  PayrollAdvanceRecord
} from '../../types';
import { FinancialTransactionStatus, UserProfile, ShipmentStatus, INTERNAL_PROFILES } from '../../types';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Tag, 
  FileText, 
  ExternalLink, 
  ArrowDownCircle, 
  Eye, 
  Download, 
  X,
  Receipt,
  Award,
  Users,
  Calendar,
  CalendarClock,
  TrendingUp,
  CreditCard,
  Copy,
  ChevronDown,
  ChevronUp,
  Building2,
  Trash2,
  Check,
  RefreshCw,
  Info,
  ChevronRight,
  Briefcase,
  Wallet,
  SlidersHorizontal,
  Edit3,
  Banknote,
  ShieldAlert,
  Paperclip,
  Upload,
  FileCheck,
  History,
  CheckSquare,
  Layers,
  FolderCheck,
  Archive,
  Sparkles,
  AlertTriangle,
  UserX,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { openDocumentInNewTab } from '../../utils/documentViewer';
import { 
  financialInvoiceService,
  subscribeToFinancialInvoices,
  uploadInvoiceAttachmentToStorage
} from '../../services/financialInvoiceService';
import { parseBrazilianCurrency, formatBrl } from '../../utils/financialCalculations';
import { getShipmentCte, getShipmentEffectiveDate, isCteApplicableForStatus, parseDateToYmd } from '../../utils';
import { calculateShipmentExpenses } from '../../utils/operationalExpensesCalculator';
import { useToast } from '../../hooks/useToast';
import { PayrollDocsModal } from './PayrollDocsModal';

export const formatMonthKeyToLabel = (monthKey: string): string => {
  if (!monthKey) return '-';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${months[mIndex] || parts[1]}/${parts[0]}`;
};

export interface PayrollSettlementItem {
  id: string; // `${user.id}_${monthKey}`
  userId: string;
  user: User;
  leader: User;
  regime: 'CLT' | 'PJ' | 'Gestor AG';
  monthKey: string;
  monthLabel: string;
  isPreviousMonth: boolean;
  branchName: string;
  profileLabel: string;
  teamCount: number;
  shipmentsCount: number;
  totalFreightRevenue: number;
  totalNetProfit: number;
  commissionPct: number;
  commissionEarned: number;
  commercialFixedSalary: number;
  fixedSalary: number;
  taxesClt: number;
  customAdvance: number;
  totalAdvances: number;
  totalDeductions: number;
  grossTotal: number;
  netDue: number;
  totalDue: number;
  totalPaid: number;
  totalPlannedPending: number;
  balancePending: number;
  status: 'liquidado' | 'pendente' | 'sem_movimento';

  // Documentos
  invoiceNumber?: string;
  invoiceIssueDate?: string;
  invoiceFileUrl?: string;
  invoiceFileName?: string;
  receiptFileUrl?: string;
  receiptFileName?: string;
  paymentDate?: string;
  paymentAuthCode?: string;

  hasInvoice: boolean;
  hasReceipt: boolean;
  isCompleted: boolean;
  isDocumentPending: boolean;
  missingDocsText: string;

  // Detalhamento do Adiantamento com Data e Comprovante de Transferência
  advanceDate?: string;
  advanceReceiptUrl?: string;
  advanceReceiptFileName?: string;

  shipments: Array<{
    id: string;
    cte: string;
    date: string;
    clientName: string;
    origin: string;
    destination: string;
    driverName: string;
    plate: string;
    companyFreight: number;
    totalExpenses: number;
    netProfit: number;
    commissionPct: number;
    commissionVal: number;
    status: string;
  }>;
}

interface AccountsPayableTabProps {
  transactions: FinancialTransaction[];
  onAddTransaction: (t: Omit<FinancialTransaction, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: FinancialTransactionStatus) => void;
  onDeleteTransaction?: (id: string) => void;
  shipments?: Shipment[];
  cargos?: Cargo[];
  clients?: Client[];
  users?: User[];
  branches?: Branch[];
  currentUser?: User | null;
  onNavigateToInvoices?: () => void;
}

export const AccountsPayableTab: React.FC<AccountsPayableTabProps> = ({
  transactions = [],
  onAddTransaction,
  onUpdateStatus,
  onDeleteTransaction,
  shipments = [],
  cargos = [],
  clients = [],
  users = [],
  branches = [],
  currentUser,
  onNavigateToInvoices,
}) => {
  // Sub-abas do Contas a Pagar
  const [activeSection, setActiveSection] = useState<'all' | 'invoices' | 'manual' | 'leaders'>('all');

  // Filtros Gerais
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState<string>('all');
  
  // Filtro de Período
  const [periodPreset, setPeriodPreset] = useState<'all' | 'current_month' | 'last_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Estado das Notas Fiscais
  const [invoices, setInvoices] = useState<FinancialInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Modal de Lançamento Manual Avulso Geral
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Custos com Motoristas / Terceiros');
  const [supplierName, setSupplierName] = useState('');
  const [costCenter, setCostCenter] = useState('Operacional');
  const [notes, setNotes] = useState('');

  // Modal de Planejamento de Pagamento para Agenciador Líder
  const [isPlanLeaderModalOpen, setIsPlanLeaderModalOpen] = useState(false);
  const [planLeaderId, setPlanLeaderId] = useState('');
  const [planPaymentType, setPlanPaymentType] = useState('Comissão de Agenciamento');
  const [planAmount, setPlanAmount] = useState('');
  const [planDueDate, setPlanDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [planPaymentMethod, setPlanPaymentMethod] = useState('PIX');
  const [planPixKey, setPlanPixKey] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [planInitialStatus, setPlanInitialStatus] = useState<FinancialTransactionStatus>(FinancialTransactionStatus.Pendente);

  // Modal de Auditoria de Fretes da Agência do Líder / Gestor AG
  const [auditingLeaderId, setAuditingLeaderId] = useState<string | null>(null);

  // Feedback de Cópia de PIX
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Sub-Aba da Folha de Pagamento: 'pending' (Contas em Aberto / Tela Inicial) ou 'completed' (Pagamento Feito - Histórico)
  const [payrollSubTab, setPayrollSubTab] = useState<'pending' | 'completed'>('pending');

  // Mês Selecionado para Filtro e Visualização da Folha ('current' | 'last' | 'all')
  const [payrollSelectedMonth, setPayrollSelectedMonth] = useState<string>('current');

  // Documentos de Liquidação da Folha (Nota Fiscal e Comprovante de Pagamento)
  const [payrollDocs, setPayrollDocs] = useState<Record<string, PayrollSettlementDoc>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_docs_v2');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Modal de Lançamento de Documentos da Folha
  const [selectedSettlementForDocs, setSelectedSettlementForDocs] = useState<PayrollSettlementItem | null>(null);

  const savePayrollDoc = (key: string, doc: Partial<PayrollSettlementDoc>) => {
    setPayrollDocs(prev => {
      const existing = prev[key] || {
        userId: doc.userId || '',
        monthKey: doc.monthKey || '',
        monthLabel: doc.monthLabel || '',
        regime: doc.regime || 'CLT',
      };
      const nextDoc: PayrollSettlementDoc = {
        ...existing,
        ...doc,
        updatedAt: new Date().toISOString()
      };
      const next = { ...prev, [key]: nextDoc };
      try { localStorage.setItem('transcunha_payroll_docs_v2', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Filtro de Regime da Folha de Pagamento
  const [selectedRegimeFilter, setSelectedRegimeFilter] = useState<'all' | 'CLT' | 'PJ' | 'Gestor AG'>('all');

  // Estado de Regimes, Salários Fixos, Tributos CLT e Adiantamentos (Persistidos localmente)
  const [userRegimes, setUserRegimes] = useState<Record<string, 'CLT' | 'PJ' | 'Gestor AG'>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_regimes');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [userSalaries, setUserSalaries] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_salaries');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [userTaxes, setUserTaxes] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_taxes');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [userCustomAdvances, setUserCustomAdvances] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_advances');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [userCustomCommissions, setUserCustomCommissions] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_commissions');
      const parsed = raw ? JSON.parse(raw) : {};
      // Se houver resíduo do cálculo incorreto antigo (1272.96 para Maurício), descartar e limpar
      if (parsed['USR-294'] === 1272.96 || parsed['USR-294'] === 1272.95) {
        delete parsed['USR-294'];
        try { localStorage.setItem('transcunha_payroll_commissions', JSON.stringify(parsed)); } catch {}
      }
      return parsed;
    } catch {
      return {};
    }
  });

  // Adiantamentos Estruturados com Data e Comprovante de Transferência (por userId_monthKey)
  const [payrollAdvances, setPayrollAdvances] = useState<Record<string, PayrollAdvanceRecord>>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_advances_v2');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Modal de Configuração de Valores do Colaborador (Salário, Tributos, Comissão, Regime)
  const [editingUserForValues, setEditingUserForValues] = useState<User | null>(null);
  const [editRegime, setEditRegime] = useState<'CLT' | 'PJ' | 'Gestor AG'>('CLT');
  const [editSalary, setEditSalary] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editTaxes, setEditTaxes] = useState('');
  const [editAdvance, setEditAdvance] = useState('');
  const [editAdvanceDate, setEditAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [editAdvanceReceiptUrl, setEditAdvanceReceiptUrl] = useState('');
  const [editAdvanceReceiptName, setEditAdvanceReceiptName] = useState('');
  const [isUploadingAdvanceReceipt, setIsUploadingAdvanceReceipt] = useState(false);
  const advanceFileInputRef = useRef<HTMLInputElement>(null);
  const [editPixKey, setEditPixKey] = useState('');

  // Upload do Comprovante de Transferência do Adiantamento
  const handleAdvanceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAdvanceReceipt(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const uploadedUrl = await uploadInvoiceAttachmentToStorage(
            dataUrl,
            `adv_${editingUserForValues?.id || 'temp'}_${Date.now()}`,
            'comprovante_transferencia',
            file.name,
            file.type
          );
          setEditAdvanceReceiptUrl(uploadedUrl || dataUrl);
          setEditAdvanceReceiptName(file.name);
          showToast('Comprovante de transferência anexado com sucesso!', 'success');
        } catch (err) {
          console.warn('Erro ao enviar comprovante:', err);
          setEditAdvanceReceiptUrl(dataUrl);
          setEditAdvanceReceiptName(file.name);
          showToast('Comprovante anexado.', 'info');
        } finally {
          setIsUploadingAdvanceReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      setIsUploadingAdvanceReceipt(false);
      showToast('Falha ao processar arquivo.', 'error');
    }
  };

  // Atualizar Regime de um Colaborador
  const handleUpdateUserRegime = (userId: string, regime: 'CLT' | 'PJ' | 'Gestor AG') => {
    setUserRegimes(prev => {
      const next = { ...prev, [userId]: regime };
      try { localStorage.setItem('transcunha_payroll_regimes', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Lista de IDs de Colaboradores Excluídos da Folha de Pagamento (Persistidos localmente)
  const [excludedPayrollUserIds, setExcludedPayrollUserIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('transcunha_payroll_excluded_users');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isExcludedUsersModalOpen, setIsExcludedUsersModalOpen] = useState(false);

  // Excluir Colaborador da Folha de Pagamento
  const handleExcludeUserFromPayroll = (targetUser: User) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir "${targetUser.name}" da tela de Folha de Pagamento?\n\nEle não aparecerá mais nesta apuração da folha. Você poderá restaurá-lo a qualquer momento.`
    );
    if (!confirmed) return;

    setExcludedPayrollUserIds(prev => {
      if (prev.includes(targetUser.id)) return prev;
      const next = [...prev, targetUser.id];
      try {
        localStorage.setItem('transcunha_payroll_excluded_users', JSON.stringify(next));
      } catch {}
      return next;
    });

    showToast(`"${targetUser.name}" foi excluído da tela de Folha de Pagamento.`, 'info');
  };

  // Restaurar Colaborador para a Folha de Pagamento
  const handleRestoreUserToPayroll = (userId: string) => {
    setExcludedPayrollUserIds(prev => {
      const next = prev.filter(id => id !== userId);
      try {
        localStorage.setItem('transcunha_payroll_excluded_users', JSON.stringify(next));
      } catch {}
      return next;
    });

    const restoredUser = (users || []).find(u => u.id === userId);
    showToast(`"${restoredUser?.name || 'Colaborador'}" foi restaurado para a Folha de Pagamento.`, 'success');
  };

  // Restaurar Todos os Colaboradores
  const handleRestoreAllUsersToPayroll = () => {
    setExcludedPayrollUserIds([]);
    try {
      localStorage.removeItem('transcunha_payroll_excluded_users');
    } catch {}
    showToast('Todos os colaboradores foram restaurados para a Folha de Pagamento.', 'success');
    setIsExcludedUsersModalOpen(false);
  };

  // Carregar Notas Fiscais
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const data = await financialInvoiceService.getInvoices(users);
      setInvoices(data);
    } catch (err) {
      console.error('Erro ao carregar notas fiscais em Contas a Pagar:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadInvoices();

    // Sincronização em tempo real (WebSockets Supabase + Postgres + Local)
    const unsubscribe = subscribeToFinancialInvoices(() => {
      loadInvoices();
    });

    return () => {
      unsubscribe();
    };
  }, [users]);

  // Data atual para cálculo de vencimento
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Datas para períodos pré-definidos
  const { currentMonthPrefix, lastMonthPrefix } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curPrefix = `${curYear}-${curMonth}`;

    const prevMonthDate = new Date(curYear, now.getMonth() - 1, 1);
    const lastYear = prevMonthDate.getFullYear();
    const lastMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const lastPrefix = `${lastYear}-${lastMonth}`;

    return { currentMonthPrefix: curPrefix, lastMonthPrefix: lastPrefix };
  }, []);

  // 1. Identificação dos Colaboradores da Folha de Pagamento (Usuários Internos, menos o Agenciador Embarque e Excluídos)
  const payrollUsers = useMemo(() => {
    const list: User[] = [];
    const idSet = new Set<string>();
    const excludedSet = new Set(excludedPayrollUserIds);

    (users || []).forEach(u => {
      // Ignorar se o usuário foi excluído da folha de pagamento
      if (excludedSet.has(u.id)) return;

      const prof = u.profile as string;
      // Excluir motoristas e clientes (usuários externos)
      if (prof === UserProfile.Motorista || prof === 'Motorista') return;
      if (prof === UserProfile.Cliente || prof === 'Cliente') return;

      // Excluir expressamente o "Agenciador Embarque" (esse é pago diretamente pelo "Agenciador Líder" dele)
      if (u.agencyRole === 'embarque') return;

      // Considerar todos os perfis internos do sistema Transcunha
      const isInternal = INTERNAL_PROFILES.includes(u.profile as UserProfile) || 
        ['Admin', 'Administrador do Sistema', 'Diretor', 'Supervisor', 'Gerente Comercial', 'Comercial', 'Financeiro', 'Fiscal', 'Gerenciadora de Risco', 'Embarcador', 'Agenciador', 'Demonstração'].includes(prof);

      if (isInternal) {
        if (!idSet.has(u.id)) {
          idSet.add(u.id);
          list.push(u);
        }
      }
    });

    return list;
  }, [users, excludedPayrollUserIds]);

  // Alias para manter compatibilidade total
  const leaderUsers = payrollUsers;

  // Helper para obter o regime de contratação do colaborador (CLT, PJ ou Gestor AG)
  const getUserRegime = (u: User): 'CLT' | 'PJ' | 'Gestor AG' => {
    if (userRegimes[u.id]) return userRegimes[u.id];

    const isAgenciador = u.profile === UserProfile.Agenciador || (u.profile as string) === 'Agenciador';
    const isExplicitLeader = u.agencyRole === 'lider' || (isAgenciador && u.agencyRole !== 'embarque');
    const isReferencedAsLeader = (users || []).some(other => other.agencyLeaderId === u.id);
    const isKnownAgencyLeader = 
      u.name?.toLowerCase().includes('maurício') || 
      u.name?.toLowerCase().includes('mauricio') || 
      u.name?.toLowerCase().includes('rafael pinheiro') || 
      u.name?.toLowerCase().includes('rafael tarantelli') ||
      Boolean(u.commercialIsAgencyMode);

    if (isExplicitLeader || isReferencedAsLeader || isKnownAgencyLeader || (isAgenciador && !u.agencyRole)) {
      return 'Gestor AG';
    }

    return 'CLT';
  };

  // Abrir Modal de Edição de Salário, Tributos, Comissão e Valores do Colaborador
  const handleOpenEditUserValues = (u: User) => {
    setEditingUserForValues(u);
    const regime = getUserRegime(u);
    setEditRegime(regime);

    const sal = userSalaries[u.id] !== undefined
      ? userSalaries[u.id]
      : (u.commercialFixedSalary ? Number(u.commercialFixedSalary) : 0);
    setEditSalary(sal > 0 ? sal.toFixed(2).replace('.', ',') : '');

    const hasManualComm = userCustomCommissions[u.id] !== undefined && userCustomCommissions[u.id] !== 1272.96;
    setEditCommission(hasManualComm && userCustomCommissions[u.id] > 0 ? userCustomCommissions[u.id].toFixed(2).replace('.', ',') : '');

    const tax = userTaxes[u.id] !== undefined ? userTaxes[u.id] : 0;
    setEditTaxes(tax > 0 ? tax.toFixed(2).replace('.', ',') : '');

    const docKey = `${u.id}_${currentMonthPrefix}`;
    const advRecord = payrollAdvances[docKey];
    const adv = advRecord !== undefined 
      ? advRecord.amount 
      : (userCustomAdvances[u.id] !== undefined ? userCustomAdvances[u.id] : 0);
    setEditAdvance(adv > 0 ? adv.toFixed(2).replace('.', ',') : '');
    setEditAdvanceDate(advRecord?.date || new Date().toISOString().split('T')[0]);
    setEditAdvanceReceiptUrl(advRecord?.receiptFileUrl || '');
    setEditAdvanceReceiptName(advRecord?.receiptFileName || '');

    setEditPixKey(u.phone || u.corporateEmail || u.email || '');
  };

  // Salvar Configuração de Valores do Colaborador
  const handleSaveUserValues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserForValues) return;
    const uid = editingUserForValues.id;
    const parsedSal = parseBrazilianCurrency(editSalary);
    const parsedComm = parseBrazilianCurrency(editCommission);
    const parsedTax = parseBrazilianCurrency(editTaxes);
    const parsedAdv = parseBrazilianCurrency(editAdvance);
    const docKey = `${uid}_${currentMonthPrefix}`;

    setUserRegimes(prev => {
      const next = { ...prev, [uid]: editRegime };
      try { localStorage.setItem('transcunha_payroll_regimes', JSON.stringify(next)); } catch {}
      return next;
    });

    setUserSalaries(prev => {
      const next = { ...prev, [uid]: parsedSal };
      try { localStorage.setItem('transcunha_payroll_salaries', JSON.stringify(next)); } catch {}
      return next;
    });

    setUserCustomCommissions(prev => {
      const next = { ...prev };
      if (!editCommission || editCommission.trim() === '' || parsedComm <= 0) {
        delete next[uid];
      } else {
        next[uid] = parsedComm;
      }
      try { localStorage.setItem('transcunha_payroll_commissions', JSON.stringify(next)); } catch {}
      return next;
    });

    setUserTaxes(prev => {
      const next = { ...prev, [uid]: parsedTax };
      try { localStorage.setItem('transcunha_payroll_taxes', JSON.stringify(next)); } catch {}
      return next;
    });

    // Salvar Adiantamento com Data e Comprovante de Transferência
    setPayrollAdvances(prev => {
      const next = {
        ...prev,
        [docKey]: {
          userId: uid,
          monthKey: currentMonthPrefix,
          amount: parsedAdv,
          date: editAdvanceDate || todayStr,
          receiptFileUrl: editAdvanceReceiptUrl || undefined,
          receiptFileName: editAdvanceReceiptName || undefined,
          updatedAt: new Date().toISOString(),
        }
      };
      try { localStorage.setItem('transcunha_payroll_advances_v2', JSON.stringify(next)); } catch {}
      return next;
    });

    setUserCustomAdvances(prev => {
      const next = { ...prev, [uid]: parsedAdv };
      try { localStorage.setItem('transcunha_payroll_advances', JSON.stringify(next)); } catch {}
      return next;
    });

    showToast(`Configurações e adiantamento de "${editingUserForValues.name}" gravados com sucesso!`, 'success');
    setEditingUserForValues(null);
  };

  // Helper para verificar se uma transação pertence à Folha de Pagamento
  const isLeaderTx = (t: FinancialTransaction) => {
    if (t.type !== 'payable') return false;
    const cat = t.category?.toLowerCase() || '';
    const notesStr = t.notes?.toLowerCase() || '';
    const desc = t.description?.toLowerCase() || '';
    const costCenterStr = t.costCenter?.toLowerCase() || '';
    const supp = t.supplierOrClientName?.toLowerCase() || '';

    return (
      cat.includes('folha de pagamento') ||
      cat.includes('salário') ||
      cat.includes('salario') ||
      cat.includes('adiantamento salarial') ||
      cat.includes('pró-labore') ||
      cat.includes('pro-labore') ||
      cat.includes('agenciador líder') ||
      cat.includes('agenciador lider') ||
      cat.includes('comissão de agenciador') ||
      cat.includes('comissao de agenciador') ||
      cat.includes('comissão agência') ||
      cat.includes('comissao agencia') ||
      costCenterStr.includes('folha') ||
      costCenterStr.includes('agenciamento') ||
      costCenterStr.includes('agenciadores líder') ||
      notesStr.includes('folha de pagamento') ||
      notesStr.includes('agenciador líder') ||
      notesStr.includes('agenciador lider') ||
      notesStr.includes('[planejamento folha') ||
      notesStr.includes('[planejamento agenciador líder]') ||
      desc.includes('folha') ||
      desc.includes('salário') ||
      desc.includes('salario') ||
      desc.includes('adiantamento salarial') ||
      desc.includes('agenciador líder') ||
      desc.includes('agenciador lider') ||
      Boolean(t.ownerId && payrollUsers.some(l => l.id === t.ownerId)) ||
      Boolean(supp && payrollUsers.some(l => l.name?.toLowerCase() === supp))
    );
  };

  // 2. Processar Notas Fiscais a Pagar
  const invoicePayables = useMemo(() => {
    return (invoices || [])
      .filter(inv => inv.status !== 'Cancelado' && inv.status !== 'Somente Volume')
      .map(inv => {
      const isOverdue = inv.status === 'Atrasado' || (inv.status === 'Pendente' && inv.dueDate < todayStr);
      const displayStatus: 'Pendente' | 'Pago' | 'Atrasado' = inv.status === 'Pago' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente';

      return {
        id: inv.id,
        documentType: inv.documentType || 'Nota Fiscal',
        invoiceNumber: inv.invoiceNumber,
        series: inv.series,
        supplierName: inv.supplierName,
        supplierCnpjCpf: inv.supplierCnpjCpf,
        totalAmount: inv.totalAmount,
        payableAmount: inv.payableAmount !== undefined && inv.payableAmount > 0 ? inv.payableAmount : inv.totalAmount,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paymentDate: inv.paymentDate,
        status: displayStatus,
        rawStatus: inv.status,
        costCenterName: inv.costCenterName,
        costTypeName: inv.costTypeName,
        costNature: inv.costNature,
        responsibleUserName: inv.responsibleUserName,
        fileUrl: inv.fileUrl,
        fileName: inv.fileName,
        fileType: inv.fileType,
        boletoFileUrl: inv.boletoFileUrl,
        boletoFileName: inv.boletoFileName,
        boletoFileType: inv.boletoFileType,
        paymentMethod: inv.paymentMethod,
        paymentDetails: inv.paymentDetails,
        description: inv.description,
      };
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [invoices, todayStr]);

  // 3. Processar Lançamentos de Agenciadores Líder
  const leaderPayables = useMemo(() => {
    return (transactions || [])
      .filter(t => isLeaderTx(t))
      .map(t => {
        const isOverdue = t.status === FinancialTransactionStatus.Atrasado || (t.status === FinancialTransactionStatus.Pendente && t.dueDate < todayStr);
        const displayStatus: 'Pendente' | 'Pago' | 'Atrasado' = t.status === FinancialTransactionStatus.Pago ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente';

        // Extrair chave PIX ou dados de pagamento das notes se houver
        let parsedPixKey = '';
        if (t.notes && t.notes.includes('PIX:')) {
          const match = t.notes.match(/PIX:\s*([^|]+)/i);
          if (match && match[1]) parsedPixKey = match[1].trim();
        }

        return {
          id: t.id,
          description: t.description,
          supplierName: t.supplierOrClientName || 'Agenciador Líder',
          category: t.category,
          costCenter: t.costCenter || 'Operacional',
          totalAmount: t.amount,
          payableAmount: t.amount,
          dueDate: t.dueDate,
          paymentDate: t.paymentDate,
          status: displayStatus,
          rawStatus: t.status,
          ownerId: t.ownerId,
          notes: t.notes,
          pixKey: parsedPixKey,
          documentNumber: t.documentNumber,
        };
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [transactions, todayStr, leaderUsers]);

  // 4. Processar Lançamentos Manuais Avulsos Gerais (não-líderes)
  const manualPayables = useMemo(() => {
    return (transactions || [])
      .filter(t => t.type === 'payable' && !isLeaderTx(t))
      .map(t => {
        const isOverdue = t.status === FinancialTransactionStatus.Atrasado || (t.status === FinancialTransactionStatus.Pendente && t.dueDate < todayStr);
        const displayStatus: 'Pendente' | 'Pago' | 'Atrasado' = t.status === FinancialTransactionStatus.Pago ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente';

        return {
          id: t.id,
          description: t.description,
          supplierName: t.supplierOrClientName || 'Despesa Geral',
          category: t.category,
          costCenter: t.costCenter || 'Operacional',
          totalAmount: t.amount,
          payableAmount: t.amount,
          dueDate: t.dueDate,
          paymentDate: t.paymentDate,
          status: displayStatus,
          rawStatus: t.status,
          shipmentId: t.shipmentId,
          documentNumber: t.documentNumber,
        };
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [transactions, todayStr, leaderUsers]);

  // Alternar status de Nota Fiscal (Dar Baixa)
  const handleToggleInvoiceStatus = async (invoiceId: string, currentStatus: string) => {
    const newStatus: InvoicePaymentStatus = currentStatus === 'Pago' ? 'Pendente' : 'Pago';
    try {
      await financialInvoiceService.updateInvoiceStatus(
        invoiceId, 
        newStatus, 
        newStatus === 'Pago' ? todayStr : undefined
      );
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? {
        ...inv,
        status: newStatus,
        paymentDate: newStatus === 'Pago' ? todayStr : undefined
      } : inv));
    } catch (err) {
      console.error('Erro ao dar baixa na nota fiscal:', err);
    }
  };

  // Filtro de Período
  const matchesPeriod = (dateStr: string) => {
    if (!dateStr) return true;
    if (periodPreset === 'all') return true;
    if (periodPreset === 'current_month') {
      return dateStr.startsWith(currentMonthPrefix);
    }
    if (periodPreset === 'last_month') {
      return dateStr.startsWith(lastMonthPrefix);
    }
    if (periodPreset === 'custom') {
      if (customStartDate && dateStr < customStartDate) return false;
      if (customEndDate && dateStr > customEndDate) return false;
      return true;
    }
    return true;
  };

  // Filtragem: Notas Fiscais
  const filteredInvoices = useMemo(() => {
    return invoicePayables.filter(item => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = 
          item.invoiceNumber.toLowerCase().includes(s) ||
          item.supplierName.toLowerCase().includes(s) ||
          (item.supplierCnpjCpf && item.supplierCnpjCpf.toLowerCase().includes(s)) ||
          item.costCenterName.toLowerCase().includes(s) ||
          (item.description && item.description.toLowerCase().includes(s));
        if (!match) return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!matchesPeriod(item.dueDate) && !matchesPeriod(item.issueDate)) {
        return false;
      }

      return true;
    });
  }, [invoicePayables, searchTerm, statusFilter, periodPreset, customStartDate, customEndDate, currentMonthPrefix, lastMonthPrefix]);

  // Filtragem: Manuais Avulsos
  const filteredManuals = useMemo(() => {
    return manualPayables.filter(item => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = 
          item.description.toLowerCase().includes(s) ||
          item.supplierName.toLowerCase().includes(s) ||
          item.category.toLowerCase().includes(s) ||
          (item.documentNumber && item.documentNumber.toLowerCase().includes(s));
        if (!match) return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!matchesPeriod(item.dueDate)) {
        return false;
      }

      return true;
    });
  }, [manualPayables, searchTerm, statusFilter, periodPreset, customStartDate, customEndDate, currentMonthPrefix, lastMonthPrefix]);

  // Filtragem: Agenciadores Líder
  const filteredLeaderPayables = useMemo(() => {
    return leaderPayables.filter(item => {
      if (selectedLeaderFilter !== 'all') {
        const targetLeader = leaderUsers.find(l => l.id === selectedLeaderFilter);
        const matchLeader = (item.ownerId && item.ownerId === selectedLeaderFilter) ||
          (targetLeader && item.supplierName.toLowerCase().includes(targetLeader.name.toLowerCase()));
        if (!matchLeader) return false;
      }

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = 
          item.description.toLowerCase().includes(s) ||
          item.supplierName.toLowerCase().includes(s) ||
          item.category.toLowerCase().includes(s) ||
          (item.notes && item.notes.toLowerCase().includes(s)) ||
          (item.documentNumber && item.documentNumber.toLowerCase().includes(s));
        if (!match) return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!matchesPeriod(item.dueDate) && !(item.paymentDate && matchesPeriod(item.paymentDate))) {
        return false;
      }

      return true;
    });
  }, [leaderPayables, selectedLeaderFilter, searchTerm, statusFilter, periodPreset, customStartDate, customEndDate, currentMonthPrefix, lastMonthPrefix, leaderUsers]);

  // Mapeamento de Cargas e Filiais para Apuração das Comissões
  const cargoMap = useMemo(() => {
    const map = new Map<string, Cargo>();
    (cargos || []).forEach(c => map.set(c.id, c));
    return map;
  }, [cargos]);

  const branchMap = useMemo(() => {
    const map = new Map<string, Branch>();
    (branches || []).forEach(b => map.set(b.id, b));
    return map;
  }, [branches]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    (users || []).forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  // Helper canônico de resolução de liderança de agência (ex: operador Murilo -> líder Maurício)
  const getLeaderIdForUser = useCallback((userId?: string): string | undefined => {
    if (!userId) return undefined;
    const user = userMap.get(userId);
    if (!user) {
      const userByName = (users || []).find(u => 
        u.name.toLowerCase() === userId.toLowerCase() || 
        u.email?.toLowerCase() === userId.toLowerCase()
      );
      if (userByName) {
        if (userByName.agencyRole === 'embarque' && userByName.agencyLeaderId) {
          return userByName.agencyLeaderId;
        }
        if (userByName.agencyLeaderId) {
          return userByName.agencyLeaderId;
        }
        return userByName.id;
      }
      return undefined;
    }
    if (user.agencyRole === 'embarque' && user.agencyLeaderId) {
      return user.agencyLeaderId;
    }
    if (user.agencyLeaderId) {
      return user.agencyLeaderId;
    }
    return user.id;
  }, [userMap, users]);

  // 5. APURAÇÃO CONSOLIDADA DA FOLHA DE PAGAMENTO (CLT, PJ E GESTORES AG)
  // 5. APURAÇÃO CONSOLIDADA DA FOLHA DE PAGAMENTO (CLT, PJ E GESTORES AG) COM CONTROLE DE VIRADA DE MÊS E DOCUMENTOS
  const { allPayrollSettlements, pendingPayrollItems, completedPayrollItems } = useMemo(() => {
    const buildSettlementForMonth = (user: User, monthKey: string, isPrevious: boolean): PayrollSettlementItem => {
      const regime = getUserRegime(user);
      const branch = (user.branchId && branchMap.get(user.branchId)) || 
                     (user.filialId && branchMap.get(user.filialId));
      const branchName = branch ? branch.name : (user.branchId || 'Matriz');
      const profileLabel = user.profile === UserProfile.Agenciador && regime === 'Gestor AG' ? 'Gestor AG' : String(user.profile);

      const teamMembers = (users || []).filter(u => u.agencyLeaderId === user.id);
      const teamCount = teamMembers.length;
      const commissionPct = user.agencyCommissionPercentage ?? 30;

      // Salário Fixo / Base
      const fixedSalary = userSalaries[user.id] !== undefined
        ? userSalaries[user.id]
        : (user.commercialFixedSalary ? Number(user.commercialFixedSalary) : 0);

      // Tributos CLT (INSS, IRRF, descontos)
      const taxesClt = (regime === 'CLT')
        ? (userTaxes[user.id] !== undefined ? userTaxes[user.id] : 0)
        : 0;

      // Adiantamento manual registrado (com data e comprovante)
      const advKey = `${user.id}_${monthKey}`;
      const advRecord = payrollAdvances[advKey];
      const customAdvance = advRecord !== undefined
        ? advRecord.amount
        : (userCustomAdvances[user.id] !== undefined ? userCustomAdvances[user.id] : 0);

      let shipmentsCount = 0;
      let totalFreightRevenue = 0;
      let totalNetProfit = 0;
      let commissionEarned = 0;
      const shipmentDetails: Array<{
        id: string;
        cte: string;
        date: string;
        clientName: string;
        origin: string;
        destination: string;
        driverName: string;
        plate: string;
        companyFreight: number;
        totalExpenses: number;
        netProfit: number;
        commissionPct: number;
        commissionVal: number;
        status: string;
      }> = [];

      // Perfil de Agenciamento (Gestor AG / Agenciador Líder)
      const isAgencyProfile = 
        regime === 'Gestor AG' || 
        user.profile === UserProfile.Agenciador || 
        user.agencyRole === 'lider';

      // Perfil Comercial (Representante / Gerente Comercial) - exclusivo para quem NÃO é Gestor AG
      const isCommercialProfile = !isAgencyProfile && (
        user.profile === UserProfile.Comercial || 
        user.profile === UserProfile.GerenteComercial ||
        String(user.profile).toLowerCase().includes('comercial') ||
        user.hasCommercialCommission === true
      );

      // Taxas comerciais padrão (ou configuradas no cadastro do usuário)
      const commMatrizRate = user.commercialMatrizRate !== undefined ? Number(user.commercialMatrizRate) : 0.20; // 0,20%
      const commFiliaisRate = user.commercialFiliaisRate !== undefined ? Number(user.commercialFiliaisRate) : 0.10; // 0,10%

      // Apuração dos fretes do mês para usuários com comissão (Comercial ou Gestores AG Líderes)
      if (isAgencyProfile || isCommercialProfile) {
        (shipments || []).forEach(s => {
          if (s.status === ShipmentStatus.Cancelado || !isCteApplicableForStatus(s.status)) return;
          const cteVal = getShipmentCte(s);
          if (!cteVal || cteVal === '-') return;

          const sDate = getShipmentEffectiveDate(s) || (s.scheduledDate ? parseDateToYmd(s.scheduledDate) : null) || (s.createdAt ? s.createdAt.split('T')[0] : null);
          if (!sDate || !sDate.startsWith(monthKey)) return;

          const cargo = cargoMap.get(s.cargoId);
          const exp = calculateShipmentExpenses(s, cargo);
          const opProfit = exp.netProfit;

          let isMatch = false;
          let matchCommVal = 0;
          let pct = 0;

          if (isAgencyProfile) {
            // 1. Identificar o Agenciador Líder / Agência responsável por este frete (direto ou via operador vinculado)
            let targetLeaderId = getLeaderIdForUser(s.embarcadorId) || 
                                 getLeaderIdForUser(s.createdById) || 
                                 (cargo?.createdById ? getLeaderIdForUser(cargo.createdById) : undefined);

            // 2. Identificação por nome de agência gravado no embarque
            if (!targetLeaderId && s.agencyCommissionAgencyName) {
              const matchedUser = (users || []).find(u => 
                u.name.toLowerCase() === s.agencyCommissionAgencyName?.toLowerCase() ||
                s.agencyCommissionAgencyName?.toLowerCase().includes(u.name.toLowerCase()) ||
                u.email?.toLowerCase() === s.agencyCommissionAgencyName?.toLowerCase()
              );
              if (matchedUser) {
                targetLeaderId = getLeaderIdForUser(matchedUser.id);
              }
            }

            // 3. Fallback por filial exclusiva de agência (apenas se for líder daquela filial)
            if (!targetLeaderId && s.branchId) {
              const matchedLeaderByBranch = (users || []).find(u => 
                u.profile === UserProfile.Agenciador && 
                u.agencyRole !== 'embarque' && 
                u.branchId === s.branchId
              );
              if (matchedLeaderByBranch) {
                targetLeaderId = matchedLeaderByBranch.id;
              }
            }

            // Se o frete pertence à agência deste Gestor AG:
            if (targetLeaderId === user.id) {
              isMatch = true;
              const isAgencyEnabled = s.agencyCommissionEnabled !== false && (s.agencyCommissionEnabled === true || Boolean(user.profile === UserProfile.Agenciador));
              pct = s.agencyCommissionPercentage !== undefined 
                ? Number(s.agencyCommissionPercentage) 
                : commissionPct;
              matchCommVal = (isAgencyEnabled && opProfit > 0) ? Number((opProfit * (pct / 100)).toFixed(2)) : 0;
            }
          } else if (isCommercialProfile) {
            // Vínculo Comercial: usuário comercial com fretes da Matriz / Filiais
            const effectiveBranchId = s.branchId || (s.createdById ? userMap.get(s.createdById)?.branchId : undefined) || cargo?.branchId;
            const branchObj = effectiveBranchId ? branchMap.get(effectiveBranchId) : null;
            const isMatriz = branchObj 
              ? branchObj.name.toLowerCase().includes('matriz') 
              : (!effectiveBranchId || effectiveBranchId === 'matriz' || effectiveBranchId === user.branchId);

            if (isMatriz) {
              isMatch = true;
              pct = commMatrizRate;
              const calcBase = (user.commercialCalculationMode === 'liquido') ? opProfit : exp.companyFreight;
              matchCommVal = (s.commercialCommission !== undefined && s.commercialCommission > 0)
                ? s.commercialCommission
                : (exp.comissaoComercial > 0 ? exp.comissaoComercial : Number((calcBase * (pct / 100)).toFixed(2)));
            } else {
              const selectedBranchIds = user.commercialSelectedBranchIds;
              if (!selectedBranchIds || (effectiveBranchId && selectedBranchIds.includes(effectiveBranchId))) {
                isMatch = true;
                pct = commFiliaisRate;
                const calcBase = (user.commercialCalculationMode === 'liquido') ? opProfit : exp.companyFreight;
                matchCommVal = (s.commercialCommission !== undefined && s.commercialCommission > 0)
                  ? s.commercialCommission
                  : (exp.comissaoComercial > 0 ? exp.comissaoComercial : Number((calcBase * (pct / 100)).toFixed(2)));
              }
            }
          }

          if (!isMatch) return;

          const client = clients.find(c => c.id === (cargo?.clientId || s.embarcadorId));
          const clientName = client?.nomeFantasia || client?.razaoSocial || 'Cliente';

          shipmentsCount += 1;
          totalFreightRevenue += exp.companyFreight;
          totalNetProfit += opProfit;
          commissionEarned += matchCommVal;

          shipmentDetails.push({
            id: s.id,
            cte: cteVal,
            date: sDate ? new Date(sDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
            clientName,
            origin: cargo?.origin || s.route || 'Origem',
            destination: cargo?.destination || 'Destino',
            driverName: s.driverName || 'Motorista',
            plate: (s as any).vehiclePlate || (s as any).plate || (s.documents as any)?.plate || '-',
            companyFreight: exp.companyFreight,
            totalExpenses: exp.totalExpenses,
            netProfit: opProfit,
            commissionPct: pct,
            commissionVal: matchCommVal,
            status: s.status,
          });
        });
      }

      // Se houver valor de comissão customizado/manual salvo para o colaborador, respeitar o override (exceto resíduo de bug 1272.96)
      if (userCustomCommissions[user.id] !== undefined && userCustomCommissions[user.id] !== 1272.96) {
        commissionEarned = userCustomCommissions[user.id];
      }

      // Transações pagas ou pendentes vinculadas a este colaborador no mês
      const relatedTxs = leaderPayables.filter(t => 
        (t.ownerId && t.ownerId === user.id) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(user.name.toLowerCase()))
      ).filter(t => (t.dueDate && t.dueDate.startsWith(monthKey)) || (t.paymentDate && t.paymentDate.startsWith(monthKey)));

      // Identificar adiantamentos vinculados
      const advanceTxs = relatedTxs.filter(t => {
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        return cat.includes('adiantamento') || cat.includes('vale') || desc.includes('adiantamento') || desc.includes('vale') || notes.includes('adiantamento');
      });

      const advanceTxsPaid = advanceTxs
        .filter(t => t.rawStatus === FinancialTransactionStatus.Pago)
        .reduce((sum, t) => sum + t.payableAmount, 0);

      const totalAdvances = advanceTxsPaid + customAdvance;

      // Demais pagamentos (salários / comissões) já liquidados
      const regularPaidTxs = relatedTxs
        .filter(t => t.rawStatus === FinancialTransactionStatus.Pago && !advanceTxs.includes(t))
        .reduce((sum, t) => sum + t.payableAmount, 0);

      let totalPaid = advanceTxsPaid + regularPaidTxs;

      const totalPlannedPending = relatedTxs
        .filter(t => t.rawStatus !== FinancialTransactionStatus.Pago && t.rawStatus !== FinancialTransactionStatus.Cancelado)
        .reduce((sum, t) => sum + t.payableAmount, 0);

      // Total Bruto e Total Devido (Fixo + Comissão em qualquer regime)
      const grossTotal = fixedSalary + commissionEarned;

      const totalDeductions = taxesClt + totalAdvances;
      const netDue = Math.max(0, grossTotal - taxesClt - totalAdvances);

      // Documentos anexados e dados salvos
      const docKey = `${user.id}_${monthKey}`;
      const savedDoc = payrollDocs[docKey];

      // Regra de início de uso: os acertos do mês de Setembro (2026-09) já foram realizados e quitados
      const isSeptemberInitial = (monthKey === '2026-09');

      if (savedDoc?.isPaid || (isSeptemberInitial && savedDoc?.isPaid !== false)) {
        totalPaid = Math.max(totalPaid, netDue);
      }

      const balancePending = (isSeptemberInitial && savedDoc?.isPaid !== false)
        ? 0
        : Math.max(0, netDue - totalPaid);

      const totalDue = grossTotal;

      const invoiceNumber = savedDoc?.invoiceNumber;
      const invoiceIssueDate = savedDoc?.invoiceIssueDate;
      const invoiceFileUrl = savedDoc?.invoiceFileUrl;
      const invoiceFileName = savedDoc?.invoiceFileName;

      const receiptFileUrl = savedDoc?.receiptFileUrl;
      const receiptFileName = savedDoc?.receiptFileName;
      const paymentDate = savedDoc?.paymentDate || (totalPaid > 0 ? (isSeptemberInitial ? '2026-09-30' : todayStr) : undefined);
      const paymentAuthCode = savedDoc?.paymentAuthCode;

      const hasInvoice = Boolean(invoiceFileUrl);
      const hasReceipt = Boolean(receiptFileUrl);

      // Verificação de pendências documentais por regime:
      // Se for Setembro/2026 (já quitado na implantação), não bloqueia pendência documental
      let isAllDocsAttached = false;
      let isDocumentPending = false;
      let missingDocsText = '';

      if (isSeptemberInitial) {
        isAllDocsAttached = true;
        isDocumentPending = false;
        missingDocsText = '';
      } else if (regime === 'CLT') {
        isAllDocsAttached = hasReceipt;
        isDocumentPending = !hasReceipt;
        missingDocsText = !hasReceipt ? 'Falta Comprovante' : '';
      } else {
        isAllDocsAttached = hasInvoice && hasReceipt;
        isDocumentPending = !hasInvoice || !hasReceipt;
        if (!hasInvoice && !hasReceipt) {
          missingDocsText = 'Falta NF e Comprovante';
        } else if (!hasInvoice) {
          missingDocsText = 'Falta Nota Fiscal';
        } else if (!hasReceipt) {
          missingDocsText = 'Falta Comprovante';
        }
      }

      const isBalanceCleared = (balancePending <= 0 && (grossTotal > 0 || totalPaid > 0)) || Boolean(savedDoc?.isPaid) || isSeptemberInitial;
      const isCompleted = isSeptemberInitial ? true : (Boolean(savedDoc?.isCompleted) || (isBalanceCleared && isAllDocsAttached));

      return {
        id: docKey,
        userId: user.id,
        user,
        leader: user,
        regime,
        monthKey,
        monthLabel: formatMonthKeyToLabel(monthKey),
        isPreviousMonth: isPrevious,
        branchName,
        profileLabel,
        teamCount,
        shipmentsCount,
        totalFreightRevenue,
        totalNetProfit,
        commissionPct,
        commissionEarned,
        commercialFixedSalary: fixedSalary,
        fixedSalary,
        taxesClt,
        customAdvance,
        totalAdvances,
        totalDeductions,
        grossTotal,
        netDue,
        totalDue,
        totalPaid,
        totalPlannedPending,
        balancePending,
        status: isCompleted ? 'liquidado' : (balancePending > 0 ? 'pendente' : 'sem_movimento'),

        invoiceNumber,
        invoiceIssueDate,
        invoiceFileUrl,
        invoiceFileName,
        receiptFileUrl,
        receiptFileName,
        paymentDate,
        paymentAuthCode,
        hasInvoice,
        hasReceipt,
        isCompleted,
        isDocumentPending,
        missingDocsText,

        // Detalhes do Adiantamento
        advanceDate: advRecord?.date || (advanceTxs[0]?.paymentDate || advanceTxs[0]?.dueDate),
        advanceReceiptUrl: advRecord?.receiptFileUrl,
        advanceReceiptFileName: advRecord?.receiptFileName,

        shipments: shipmentDetails,
      };
    };

    const allItems: PayrollSettlementItem[] = [];
    const pendingItems: PayrollSettlementItem[] = [];
    const completedItems: PayrollSettlementItem[] = [];

    payrollUsers.forEach(user => {
      // 1. Mês Anterior (verificar se virou o mês e ainda tem pendência financeira ou documental)
      const prev = buildSettlementForMonth(user, lastMonthPrefix, true);
      allItems.push(prev);
      if (prev.isCompleted) {
        completedItems.push(prev);
      } else {
        // PERMANECE na tela inicial se o acerto do mês anterior ainda não foi concluído!
        pendingItems.push(prev);
      }

      // 2. Mês Atual (nova apuração de cada um a cada mês)
      const curr = buildSettlementForMonth(user, currentMonthPrefix, false);
      allItems.push(curr);
      if (curr.isCompleted) {
        completedItems.push(curr);
      } else {
        pendingItems.push(curr);
      }
    });

    // Ordenar pendentes: meses anteriores pendentes no topo com prioridade, seguidos do mês atual
    pendingItems.sort((a, b) => {
      if (a.isPreviousMonth && !b.isPreviousMonth) return -1;
      if (!a.isPreviousMonth && b.isPreviousMonth) return 1;
      return a.user.name.localeCompare(b.user.name);
    });

    completedItems.sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

    return {
      allPayrollSettlements: allItems,
      pendingPayrollItems: pendingItems,
      completedPayrollItems: completedItems
    };
  }, [payrollUsers, leaderPayables, shipments, cargos, clients, users, branchMap, cargoMap, userMap, getLeaderIdForUser, currentMonthPrefix, lastMonthPrefix, userRegimes, userSalaries, userCustomCommissions, userTaxes, userCustomAdvances, payrollAdvances, payrollDocs, todayStr]);

  // Totais consolidados e separados por Mês da Folha de Pagamento
  const payrollMonthTotals = useMemo(() => {
    const calcTotals = (items: PayrollSettlementItem[]) => {
      return items.reduce((acc, it) => {
        acc.gross += (it.grossTotal || it.totalDue);
        acc.taxes += (it.taxesClt || 0);
        acc.advances += (it.totalAdvances || 0);
        acc.netDue += (it.netDue || 0);
        acc.paid += it.totalPaid;
        acc.pending += it.balancePending;
        acc.count += 1;
        return acc;
      }, { gross: 0, taxes: 0, advances: 0, netDue: 0, paid: 0, pending: 0, count: 0 });
    };

    const currentItems = allPayrollSettlements.filter(it => it.monthKey === currentMonthPrefix);
    const lastItems = allPayrollSettlements.filter(it => it.monthKey === lastMonthPrefix);

    return {
      current: {
        ...calcTotals(currentItems),
        label: formatMonthKeyToLabel(currentMonthPrefix)
      },
      last: {
        ...calcTotals(lastItems),
        label: formatMonthKeyToLabel(lastMonthPrefix)
      },
      all: {
        ...calcTotals(allPayrollSettlements),
        label: 'Todos os Meses'
      }
    };
  }, [allPayrollSettlements, currentMonthPrefix, lastMonthPrefix]);

  // leadersSummary para compatibilidade com KPIs e telas existentes (baseado na sub-aba ativa e filtro de mês)
  const leadersSummary = useMemo(() => {
    let list = payrollSubTab === 'completed' ? completedPayrollItems : pendingPayrollItems;
    if (payrollSelectedMonth === 'current') {
      list = list.filter(item => item.monthKey === currentMonthPrefix);
    } else if (payrollSelectedMonth === 'last') {
      list = list.filter(item => item.monthKey === lastMonthPrefix);
    }
    return list;
  }, [payrollSubTab, completedPayrollItems, pendingPayrollItems, payrollSelectedMonth, currentMonthPrefix, lastMonthPrefix]);

  // Handler para Salvar Documentos e Concluir Acerto de Pagamento
  const handleSavePayrollDocs = async (docKey: string, data: {
    invoiceNumber?: string;
    invoiceIssueDate?: string;
    invoiceFileUrl?: string;
    invoiceFileName?: string;
    receiptFileUrl?: string;
    receiptFileName?: string;
    paymentDate?: string;
    paymentAuthCode?: string;
    markAsPaid?: boolean;
    notes?: string;
  }) => {
    const settlement = allPayrollSettlements.find(s => s.id === docKey);
    const regime = settlement?.regime || 'CLT';
    const hasInv = Boolean(data.invoiceFileUrl);
    const hasRec = Boolean(data.receiptFileUrl);
    const isPaid = Boolean(data.markAsPaid) || (settlement ? settlement.balancePending <= 0 : false);

    const isAllDocsAttached = (regime === 'CLT') ? hasRec : (hasInv && hasRec);
    const willComplete = isPaid && isAllDocsAttached;

    savePayrollDoc(docKey, {
      ...data,
      isPaid,
      isCompleted: willComplete,
      completedAt: willComplete ? new Date().toISOString() : undefined
    });

    if (data.markAsPaid && settlement && settlement.balancePending > 0) {
      onAddTransaction({
        type: 'payable',
        description: `Quitação Folha - ${settlement.user.name} (${settlement.monthLabel})`,
        amount: settlement.balancePending,
        dueDate: data.paymentDate || todayStr,
        paymentDate: data.paymentDate || todayStr,
        status: FinancialTransactionStatus.Pago,
        category: regime === 'Gestor AG' ? 'Comissão de Agenciador Líder' : 'Folha de Pagamento',
        costCenter: regime === 'Gestor AG' ? 'Operacional' : 'Administrativo',
        supplierOrClientName: settlement.user.name,
        notes: `[Quitação Folha de Pagamento] ${settlement.monthLabel} | Regime: ${regime}${data.invoiceNumber ? ` | NF: ${data.invoiceNumber}` : ''}${data.paymentAuthCode ? ` | Aut: ${data.paymentAuthCode}` : ''}`,
        ownerId: settlement.userId
      });
    }

    if (willComplete) {
      showToast(`🎉 Pagamento de ${settlement?.user.name} (${settlement?.monthLabel}) concluído com sucesso! Documentos validados e movido para o histórico de "Pagamento Feito".`, 'success');
    } else {
      const missing: string[] = [];
      if (regime === 'CLT') {
        if (!hasRec) missing.push('Comprovante de Pagamento');
      } else {
        if (!hasInv) missing.push('Nota Fiscal');
        if (!hasRec) missing.push('Comprovante de Pagamento');
      }
      if (!isPaid) missing.push('Quitação do saldo');
      showToast(`Documentos salvos! Ainda pendente: ${missing.join(', ')}. O acerto permanece na tela inicial.`, 'info');
    }
  };

  // Lista Consolidada Unificada para exibição em "Todas as Contas a Pagar"
  const consolidatedList = useMemo(() => {
    const list: Array<{
      id: string;
      kind: 'invoice' | 'manual' | 'leader';
      docNumber: string;
      title: string;
      entityName: string;
      categoryOrCenter: string;
      dueDate: string;
      totalAmount: number;
      payableAmount: number;
      status: 'Pendente' | 'Pago' | 'Atrasado';
      documentUrl?: string | null;
      boletoUrl?: string | null;
      details?: string;
      pixKey?: string;
      originalItem: any;
    }> = [];

    if (activeSection === 'all' || activeSection === 'invoices') {
      filteredInvoices.forEach(inv => {
        const isFatura = inv.documentType === 'Fatura';
        list.push({
          id: `inv_${inv.id}`,
          kind: 'invoice',
          docNumber: isFatura ? `Fatura nº ${inv.invoiceNumber}` : `NF nº ${inv.invoiceNumber}`,
          title: isFatura ? `Fatura ${inv.supplierName}` : `NF-e ${inv.supplierName}`,
          entityName: inv.supplierName,
          categoryOrCenter: `${inv.costCenterName} • ${inv.costTypeName}`,
          dueDate: inv.dueDate,
          totalAmount: inv.totalAmount,
          payableAmount: inv.payableAmount,
          status: inv.status,
          documentUrl: inv.fileUrl,
          boletoUrl: inv.boletoFileUrl,
          details: inv.description,
          originalItem: inv,
        });
      });
    }

    if (activeSection === 'all' || activeSection === 'manual') {
      filteredManuals.forEach(man => {
        list.push({
          id: `man_${man.id}`,
          kind: 'manual',
          docNumber: man.documentNumber ? `Doc ${man.documentNumber}` : 'Avulso',
          title: man.description,
          entityName: man.supplierName,
          categoryOrCenter: `${man.category} • ${man.costCenter}`,
          dueDate: man.dueDate,
          totalAmount: man.totalAmount,
          payableAmount: man.payableAmount,
          status: man.status,
          details: man.shipmentId ? `Embarque ${man.shipmentId}` : undefined,
          originalItem: man,
        });
      });
    }

    if (activeSection === 'all' || activeSection === 'leaders') {
      filteredLeaderPayables.forEach(lead => {
        list.push({
          id: `lead_${lead.id}`,
          kind: 'leader',
          docNumber: lead.documentNumber ? `Doc ${lead.documentNumber}` : 'Planejamento Líder',
          title: lead.description,
          entityName: lead.supplierName,
          categoryOrCenter: `${lead.category} • ${lead.costCenter}`,
          dueDate: lead.dueDate,
          totalAmount: lead.totalAmount,
          payableAmount: lead.payableAmount,
          status: lead.status,
          details: lead.notes,
          pixKey: lead.pixKey,
          originalItem: lead,
        });
      });
    }

    return list.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [activeSection, filteredInvoices, filteredManuals, filteredLeaderPayables]);

  // KPIs Gerais
  const kpiPending = useMemo(() => {
    return consolidatedList.filter(i => i.status === 'Pendente').reduce((acc, i) => acc + i.payableAmount, 0);
  }, [consolidatedList]);

  const kpiPaid = useMemo(() => {
    return consolidatedList.filter(i => i.status === 'Pago').reduce((acc, i) => acc + i.payableAmount, 0);
  }, [consolidatedList]);

  const kpiOverdue = useMemo(() => {
    return consolidatedList.filter(i => i.status === 'Atrasado').reduce((acc, i) => acc + i.payableAmount, 0);
  }, [consolidatedList]);

  const kpiTotal = useMemo(() => {
    return consolidatedList.reduce((acc, i) => acc + i.payableAmount, 0);
  }, [consolidatedList]);

  const subtotalInvoices = useMemo(() => filteredInvoices.reduce((acc, i) => acc + i.payableAmount, 0), [filteredInvoices]);
  const subtotalManuals = useMemo(() => filteredManuals.reduce((acc, i) => acc + i.payableAmount, 0), [filteredManuals]);
  const subtotalLeaders = useMemo(() => filteredLeaderPayables.reduce((acc, i) => acc + i.payableAmount, 0), [filteredLeaderPayables]);

  // KPIs Específicos da Folha de Pagamento
  const kpiPayrollGross = useMemo(() => leadersSummary.reduce((acc, l) => acc + (l.grossTotal || l.totalDue), 0), [leadersSummary]);
  const kpiPayrollTaxes = useMemo(() => leadersSummary.reduce((acc, l) => acc + (l.taxesClt || 0), 0), [leadersSummary]);
  const kpiPayrollAdvances = useMemo(() => leadersSummary.reduce((acc, l) => acc + (l.totalAdvances || 0), 0), [leadersSummary]);
  const kpiPayrollNetDue = useMemo(() => leadersSummary.reduce((acc, l) => acc + (l.netDue || 0), 0), [leadersSummary]);
  const kpiPayrollPaid = useMemo(() => leadersSummary.reduce((acc, l) => acc + l.totalPaid, 0), [leadersSummary]);
  const kpiPayrollPending = useMemo(() => leadersSummary.reduce((acc, l) => acc + l.balancePending, 0), [leadersSummary]);
  const leaderKpiTotalDue = kpiPayrollGross;
  const leaderKpiTotalPaid = kpiPayrollPaid;
  const leaderKpiBalancePending = kpiPayrollPending;
  const leaderKpiPlannedPending = useMemo(() => filteredLeaderPayables.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + l.payableAmount, 0), [filteredLeaderPayables]);

  // Abrir modal de planejamento de folha para um colaborador (com sugestão de saldo em aberto)
  const handleOpenPlanModal = (targetUserId?: string, suggestedAmount?: number) => {
    const userToSelect = targetUserId || payrollUsers[0]?.id || '';
    setPlanLeaderId(userToSelect);

    const userObj = payrollUsers.find(l => l.id === userToSelect);
    const summary = leadersSummary.find(s => s.user.id === userToSelect);
    
    // Sugerir valor
    const amountVal = suggestedAmount !== undefined 
      ? suggestedAmount 
      : (summary?.balancePending && summary.balancePending > 0 ? summary.balancePending : 0);
    
    setPlanAmount(amountVal > 0 ? amountVal.toFixed(2).replace('.', ',') : '');
    setPlanDueDate(new Date().toISOString().split('T')[0]);

    if (userObj) {
      const reg = getUserRegime(userObj);
      if (reg === 'CLT') {
        setPlanPaymentType('Salário Mensal (Folha)');
      } else if (reg === 'PJ') {
        setPlanPaymentType('Pró-labore / Pagamento PJ');
      } else {
        setPlanPaymentType('Comissão de Agenciamento');
      }
      setPlanPixKey(userObj.phone || userObj.corporateEmail || userObj.email || '');
      setPlanNotes(summary?.commissionEarned ? `Apuração de comissões (${summary.commissionPct}% sobre lucro real) - ${summary.shipmentsCount} embarques.` : '');
    } else {
      setPlanPaymentType('Salário Mensal (Folha)');
      setPlanPixKey('');
      setPlanNotes('');
    }

    setPlanPaymentMethod('PIX');
    setPlanInitialStatus(FinancialTransactionStatus.Pendente);
    setIsPlanLeaderModalOpen(true);
  };

  // Submit Lançamento Manual Avulso
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !dueDate) return;

    const parsedAmount = parseBrazilianCurrency(amount);
    if (parsedAmount <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    onAddTransaction({
      type: 'payable',
      description,
      amount: parsedAmount,
      dueDate,
      status: FinancialTransactionStatus.Pendente,
      category,
      costCenter,
      supplierOrClientName: supplierName || undefined,
      notes: notes || undefined,
    });

    setDescription('');
    setAmount('');
    setSupplierName('');
    setNotes('');
    setIsModalOpen(false);
  };

  // Submit Planejamento de Pagamento da Folha
  const handleSubmitPlanLeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planLeaderId || !planAmount || !planDueDate) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const parsedAmount = parseBrazilianCurrency(planAmount);
    if (parsedAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    const user = payrollUsers.find(l => l.id === planLeaderId);
    if (!user) {
      alert('Selecione um colaborador válido.');
      return;
    }

    const reg = getUserRegime(user);
    const desc = `${planPaymentType} - ${user.name}`;
    const fullNotes = `[Planejamento Folha de Pagamento] Colaborador: ${user.name} | Perfil: ${user.profile} | Regime: ${reg} | Tipo: ${planPaymentType} | Forma: ${planPaymentMethod}${planPixKey ? ` | PIX: ${planPixKey}` : ''}${planNotes ? ` | Detalhes: ${planNotes}` : ''}`;

    const category = planPaymentType.toLowerCase().includes('adiantamento')
      ? 'Adiantamento Salarial'
      : (reg === 'Gestor AG' ? 'Comissão de Agenciador Líder' : 'Folha de Pagamento');

    const costCenter = reg === 'Gestor AG' ? 'Operacional' : 'Administrativo';

    onAddTransaction({
      type: 'payable',
      description: desc,
      amount: parsedAmount,
      dueDate: planDueDate,
      paymentDate: planInitialStatus === FinancialTransactionStatus.Pago ? planDueDate : undefined,
      status: planInitialStatus,
      category,
      costCenter,
      supplierOrClientName: user.name,
      supplierOrClientCpfCnpj: user.phone || user.email || undefined,
      notes: fullNotes,
      ownerId: user.id,
    });

    setIsPlanLeaderModalOpen(false);
  };

  // Exportar CSV
  const handleExportCsv = () => {
    if (activeSection === 'leaders') {
      if (filteredLeaderPayables.length === 0) {
        alert('Nenhum lançamento de Agenciador Líder para exportar.');
        return;
      }
      const headers = ['Líder / Favorecido', 'Descrição', 'Categoria', 'Vencimento / Previsão', 'Data Pagamento', 'Valor (R$)', 'Status', 'PIX / Pagamento', 'Observações'];
      const rows = filteredLeaderPayables.map(item => [
        `"${item.supplierName.replace(/"/g, '""')}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
        item.paymentDate ? new Date(item.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
        item.payableAmount.toFixed(2).replace('.', ','),
        item.status,
        `"${(item.pixKey || '-').replace(/"/g, '""')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `planejamento_agenciadores_lider_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (consolidatedList.length === 0) return;

    const headers = ['Tipo', 'Documento', 'Fornecedor / Favorecido', 'Categoria / Centro de Custo', 'Vencimento', 'Valor Total', 'Valor a Pagar', 'Status'];
    const rows = consolidatedList.map(item => [
      item.kind === 'invoice' ? 'Nota Fiscal' : (item.kind === 'leader' ? 'Agenciador Líder' : 'Despesa Avulsa'),
      item.docNumber,
      `"${item.entityName.replace(/"/g, '""')}"`,
      `"${item.categoryOrCenter.replace(/"/g, '""')}"`,
      new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
      item.totalAmount.toFixed(2).replace('.', ','),
      item.payableAmount.toFixed(2).replace('.', ','),
      item.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contas_a_pagar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copiar chave PIX com feedback visual
  const handleCopyPix = (pixKey: string, id: string) => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  // Obter líder/colaborador atualmente em auditoria
  const currentAuditingSummary = useMemo(() => {
    if (!auditingLeaderId) return null;
    return leadersSummary.find(s => (s.user?.id === auditingLeaderId || s.leader?.id === auditingLeaderId || s.userId === auditingLeaderId)) ||
           allPayrollSettlements.find(s => (s.user?.id === auditingLeaderId || s.leader?.id === auditingLeaderId || s.userId === auditingLeaderId)) || null;
  }, [auditingLeaderId, leadersSummary, allPayrollSettlements]);

  return (
    <div className="space-y-6">
      {/* 1. SELETOR DE VISÃO (SUB-ABAS) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          {/* Aba 1: Todas as Contas a Pagar */}
          <button
            onClick={() => setActiveSection('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Todas as Contas a Pagar</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {invoicePayables.length + manualPayables.length + leaderPayables.length}
            </span>
          </button>

          {/* Aba 2: Notas Fiscais / Faturas a Pagar */}
          <button
            onClick={() => setActiveSection('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'invoices'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Notas Fiscais / Faturas a Pagar</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {invoicePayables.length}
            </span>
          </button>

          {/* Aba 3: Lançamentos Avulsos */}
          <button
            onClick={() => setActiveSection('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'manual'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Lançamentos Avulsos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {manualPayables.length}
            </span>
          </button>

          {/* Aba 4: Folha de Pagamento */}
          <button
            onClick={() => setActiveSection('leaders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'leaders'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
            title="Folha de Pagamento: Acompanhar salários, comissões, tributos e planejar pagamentos de usuários internos (CLT, PJ e Gestor AG)"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>Folha de Pagamento</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === 'leaders'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
            }`}>
              {payrollUsers.length}
            </span>
          </button>
        </div>

        {/* Botões de Ação Rápida no Cabeçalho */}
        <div className="flex items-center gap-2 px-2 pb-1 sm:pb-0 flex-wrap">
          {onNavigateToInvoices && (
            <button
              onClick={onNavigateToInvoices}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Acessar o módulo completo de Notas Fiscais e OCR com IA"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>+ Lançar NF</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            title="Cadastrar nova despesa avulsa"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Lançamento Avulso</span>
          </button>

          {/* Botão de Planejar Pagamento de Folha */}
          <button
            onClick={() => handleOpenPlanModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="Planejar ou cadastrar pagamento para colaborador da folha"
          >
            <CalendarClock className="w-3.5 h-3.5 text-amber-200" />
            <span>+ Planejar Pagamento</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE KPIS */}
      {activeSection === 'leaders' ? (
        /* KPIs Especializados para Folha de Pagamento */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Folha Bruta Total */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Folha Bruta
              </span>
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-2 tracking-tight">
              {formatBrl(kpiPayrollGross)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Fixos + Comissões AG
            </span>
          </div>

          {/* 2. Tributos CLT */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tributos CLT
              </span>
              <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
              {formatBrl(kpiPayrollTaxes)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              INSS / IRRF Retidos
            </span>
          </div>

          {/* 3. Adiantamentos Concedidos */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Adiantamentos
              </span>
              <div className="p-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-lg">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-orange-600 dark:text-orange-400 mt-2 tracking-tight">
              {formatBrl(kpiPayrollAdvances)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Vales & Antecipações
            </span>
          </div>

          {/* 4. Folha Líquida Devida */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Líquido Devido
              </span>
              <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-2 tracking-tight">
              {formatBrl(kpiPayrollNetDue)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Bruto - Descontos
            </span>
          </div>

          {/* 5. Total Já Liquidado */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Já Pago
              </span>
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
              {formatBrl(kpiPayrollPaid)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Baixas efetuadas
            </span>
          </div>

          {/* 6. Saldo em Aberto */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Saldo a Pagar
              </span>
              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
              {formatBrl(kpiPayrollPending)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Pendente de quitação
            </span>
          </div>
        </div>
      ) : (
        /* KPIs Padrão de Contas a Pagar */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total a Pagar Pendente */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                A Pagar (Pendente)
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">
                {formatBrl(kpiPending)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Obrigações em aberto
              </span>
            </div>
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Total Pago */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Total Liquidado (Pago)
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">
                {formatBrl(kpiPaid)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Baixas realizadas no período
              </span>
            </div>
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Total Vencido */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                Contas em Atraso
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">
                {formatBrl(kpiOverdue)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Vencimento ultrapassado
              </span>
            </div>
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Composição das Contas */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Composição Atual
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatBrl(kpiTotal)}
              </span>
            </div>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-500" />
                  Notas Fiscais:
                </span>
                <span className="font-bold">{formatBrl(subtotalInvoices)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-500" />
                  Lançamentos Avulsos:
                </span>
                <span className="font-bold">{formatBrl(subtotalManuals)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-amber-500" />
                  Folha de Pagamento:
                </span>
                <span className="font-bold">{formatBrl(subtotalLeaders)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BARRA DE FILTROS AVANÇADOS */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeSection === 'leaders' ? "Buscar por líder, agência, observação, forma de pagamento..." : "Buscar por descrição, fornecedor, centro de custo, número da NF..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Líder Específico (na aba de Agenciadores Líder) */}
            {activeSection === 'leaders' && (
              <div className="relative">
                <select
                  value={selectedLeaderFilter}
                  onChange={(e) => setSelectedLeaderFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 outline-none cursor-pointer"
                >
                  <option value="all">👑 Todos os Agenciadores Líder</option>
                  {leaderUsers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="Pendente">🟡 Pendente</option>
                <option value="Pago">🟢 Pago</option>
                <option value="Atrasado">🔴 Atrasado</option>
              </select>
            </div>

            {/* Filtro por Período Preset */}
            <div className="relative">
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">📅 Todo o Período</option>
                <option value="current_month">Mês Atual</option>
                <option value="last_month">Mês Anterior</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>

            {/* Botão de Exportar */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Exportar planilha CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Inputs de Período Personalizado */}
        {periodPreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">De:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            />
            <span className="font-semibold text-slate-600 dark:text-slate-400">Até:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            />
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                className="text-xs text-rose-500 hover:underline cursor-pointer"
              >
                Limpar datas
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. CONTEÚDO ESPECÍFICO: FOLHA DE PAGAMENTO */}
      {activeSection === 'leaders' && (
        <div className="space-y-6">
          {/* SEÇÃO 4.1: CARDS DE ACOMPANHAMENTO CONSOLIDADO DA FOLHA */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Apurações de Pagamento
                </h3>
                <span className="text-xs text-slate-400 hidden md:inline">
                  (Folha dos Usuários Internos: CLT, PJ e Gestores AG)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenPlanModal()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Planejamento</span>
                </button>
              </div>
            </div>

            {/* SOMA DOS MESES SEPARADAMENTE: COMPARAÇÃO LADO A LADO (OUTUBRO EM ABERTO vs SETEMBRO QUITADO) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* Card 1: Mês Atual (Outubro / 2026) */}
              <div 
                onClick={() => {
                  setPayrollSelectedMonth('current');
                }}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all cursor-pointer border ${
                  payrollSelectedMonth === 'current'
                    ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-amber-400/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          Mês Atual: {payrollMonthTotals.current.label}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Em Andamento
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {payrollMonthTotals.current.count} colaboradores em apuração
                      </span>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                    payrollSelectedMonth === 'current'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {payrollSelectedMonth === 'current' ? 'Filtro Ativo' : 'Clique p/ Filtrar'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Folha Bruta</span>
                    <strong className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                      {formatBrl(payrollMonthTotals.current.gross)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">(-) Descontos/Trib.</span>
                    <strong className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                      -{formatBrl(payrollMonthTotals.current.taxes + payrollMonthTotals.current.advances)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Líquido Devido</span>
                    <strong className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
                      {formatBrl(payrollMonthTotals.current.netDue)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Saldo a Pagar</span>
                    <strong className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatBrl(payrollMonthTotals.current.pending)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Mês Anterior (Setembro / 2026 - Quitado) */}
              <div 
                onClick={() => {
                  setPayrollSelectedMonth('last');
                }}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all cursor-pointer border ${
                  payrollSelectedMonth === 'last'
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-emerald-400/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          Mês Anterior: {payrollMonthTotals.last.label}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          100% Quitado / Feito
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Acertos de Setembro já foram concluídos na implantação
                      </span>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                    payrollSelectedMonth === 'last'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {payrollSelectedMonth === 'last' ? 'Filtro Ativo' : 'Clique p/ Filtrar'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Folha Bruta</span>
                    <strong className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                      {formatBrl(payrollMonthTotals.last.gross)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quitado (Pago)</span>
                    <strong className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatBrl(payrollMonthTotals.last.paid)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Líquido Liquidado</span>
                    <strong className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
                      {formatBrl(payrollMonthTotals.last.netDue)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Saldo Pendente</span>
                    <strong className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      R$ 0,00 (Quitado)
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor de Sub-Aba: Contas em Aberto / Pendências (Tela Inicial) vs Pagamento Feito (Histórico) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('pending')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    payrollSubTab === 'pending'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-200" />
                  <span>Contas em Aberto & Pendências (Tela Inicial)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    payrollSubTab === 'pending' ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {pendingPayrollItems.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayrollSubTab('completed')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    payrollSubTab === 'completed'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Pagamento Feito (Histórico)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    payrollSubTab === 'completed' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {completedPayrollItems.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
                {payrollSubTab === 'pending' ? (
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Contas com saldo pendente ou aguardando anexação de NF / Comprovante
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Histórico de acertos quitados com documentos arquivados
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Filtro de Mês e Regime da Folha */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Mês:</span>
                {[
                  { id: 'current', label: `Mês Atual (${payrollMonthTotals.current.label})` },
                  { id: 'last', label: `Mês Anterior (${payrollMonthTotals.last.label} - Quitado)` },
                  { id: 'all', label: 'Todos os Meses' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayrollSelectedMonth(m.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      payrollSelectedMonth === m.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}

                <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Regime:</span>
                {[
                  { id: 'all', label: 'Todos', count: leadersSummary.length },
                  { id: 'CLT', label: 'CLT', count: leadersSummary.filter(l => l.regime === 'CLT').length },
                  { id: 'PJ', label: 'PJ', count: leadersSummary.filter(l => l.regime === 'PJ').length },
                  { id: 'Gestor AG', label: 'Gestor AG (Líderes)', count: leadersSummary.filter(l => l.regime === 'Gestor AG').length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedRegimeFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedRegimeFilter === tab.id
                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                {payrollSubTab === 'pending' ? (
                  <span>Apurações em aberto: <strong className="text-slate-800 dark:text-slate-200">{leadersSummary.length}</strong></span>
                ) : (
                  <span>Contas quitadas e arquivadas: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{leadersSummary.length}</strong></span>
                )}

                {excludedPayrollUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsExcludedUsersModalOpen(true)}
                    className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/70 cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 transition-colors"
                    title="Visualizar e gerenciar colaboradores excluídos da folha de pagamento"
                  >
                    <UserX className="w-3 h-3 text-rose-500" />
                    <span>{excludedPayrollUserIds.length} excluído{excludedPayrollUserIds.length > 1 ? 's' : ''} (Gerenciar)</span>
                  </button>
                )}
              </div>
            </div>

            {leadersSummary.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
                {payrollSelectedMonth === 'last' && payrollSubTab === 'pending' ? (
                  <div className="max-w-md mx-auto py-2">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                    <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
                      Acertos de Setembro já foram concluídos!
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-4 leading-relaxed">
                      Como estamos iniciando as operações agora, todos os acertos do mês de Setembro já foram integralmente realizados e quitados. Eles estão arquivados com segurança no histórico.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPayrollSubTab('completed')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <FolderCheck className="w-4 h-4" />
                      <span>Ver Acertos de Setembro em "Pagamento Feito"</span>
                    </button>
                  </div>
                ) : payrollSubTab === 'completed' ? (
                  <>
                    <FolderCheck className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Nenhum acerto arquivado em "Pagamento Feito" para este filtro
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                      Assim que você anexar todos os documentos pendentes de cada colaborador (Comprovante para CLT; NF e Comprovante para PJ/Gestor AG) e liquidar o acerto, a conta sairá da tela inicial e aparecerá aqui no histórico.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Tudo em dia! Nenhuma conta com pendência em aberto
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Todos os colaboradores do período já tiveram seus documentos anexados e saldos liquidados.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {leadersSummary
                  .filter(item => {
                    if (selectedLeaderFilter !== 'all' && item.user.id !== selectedLeaderFilter) return false;
                    if (selectedRegimeFilter !== 'all' && item.regime !== selectedRegimeFilter) return false;
                    if (searchTerm) {
                      const s = searchTerm.toLowerCase();
                      const matchName = item.user.name.toLowerCase().includes(s);
                      const matchProf = (item.profileLabel || '').toLowerCase().includes(s) || (String(item.user.profile) || '').toLowerCase().includes(s);
                      const matchBranch = (item.branchName || '').toLowerCase().includes(s);
                      if (!matchName && !matchProf && !matchBranch) return false;
                    }
                    return true;
                  })
                  .map(item => {
                    const hasPendingBalance = item.balancePending > 0;
                    const isFullyPaid = item.balancePending <= 0 && (item.grossTotal > 0 || item.totalPaid > 0);
                    const userPix = item.user.phone || item.user.corporateEmail || item.user.email || '';

                    const avatarGradient = item.regime === 'Gestor AG'
                      ? 'from-amber-500 to-amber-700'
                      : item.regime === 'PJ'
                      ? 'from-purple-600 to-violet-800'
                      : 'from-blue-600 to-indigo-700';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                          item.isPreviousMonth && !item.isCompleted
                            ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/90 dark:border-rose-900/60'
                            : item.isCompleted
                            ? 'bg-white dark:bg-slate-800 border-emerald-200/80 dark:border-emerald-800/60'
                            : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700'
                        }`}
                      >
                        {/* Topo do Card */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl bg-linear-to-br ${avatarGradient} text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0`}>
                                {item.user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                  {item.user.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                    <Briefcase className="w-3 h-3 text-slate-400" />
                                    {item.profileLabel}
                                  </span>
                                  {item.branchName && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      • {item.branchName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status da Quitação */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                              item.isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : isFullyPaid
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                : hasPendingBalance
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                            }`}>
                              {item.isCompleted ? '✓ Pagamento Feito' : isFullyPaid ? 'Saldo Pago (Falta Docs)' : hasPendingBalance ? 'Pendente' : 'Sem Movimento'}
                            </span>
                          </div>

                          {/* Destaque do Mês de Referência (Mês Anterior Pendente vs Mês Atual vs Mês Quitado) */}
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-1.5">
                            {item.isPreviousMonth && !item.isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-800 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                ⚠️ Mês Anterior Pendente ({item.monthLabel})
                              </span>
                            ) : item.isPreviousMonth && item.isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                Mês Anterior Quitado ({item.monthLabel})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Mês de Referência: <strong className="text-slate-900 dark:text-white ml-0.5">{item.monthLabel}</strong>
                              </span>
                            )}

                            {item.paymentDate && (
                              <span className="text-[10px] text-slate-400">
                                Pago em: <strong className="text-slate-700 dark:text-slate-300">{new Date(item.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                              </span>
                            )}
                          </div>

                          {/* Seletor Rápido de Regime (CLT | PJ | Gestor AG) e Opção de Excluir da Folha */}
                          <div className="flex items-center justify-between mb-3 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 whitespace-nowrap">
                              Classificação:
                            </span>
                            <div className="inline-flex items-center rounded-lg p-0.5 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                              {(['CLT', 'PJ', 'Gestor AG'] as const).map(reg => (
                                <button
                                  key={reg}
                                  type="button"
                                  onClick={() => handleUpdateUserRegime(item.user.id, reg)}
                                  title={`Alterar regime de ${item.user.name} para ${reg}`}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                    item.regime === reg
                                      ? reg === 'Gestor AG'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : reg === 'PJ'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-blue-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                  }`}
                                >
                                  {reg}
                                </button>
                              ))}

                              {/* Divisor */}
                              <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 self-center mx-1" />

                              {/* Botão de Excluir o Usuário da Folha de Pagamento */}
                              <button
                                type="button"
                                onClick={() => handleExcludeUserFromPayroll(item.user)}
                                title={`Excluir ${item.user.name} da tela de Folha de Pagamento`}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/60 flex items-center gap-1 active:scale-95"
                              >
                                <UserX className="w-3 h-3 text-rose-500" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>

                          {/* Memória de Cálculo / Dados Financeiros por Regime */}
                          {item.regime === 'CLT' && (
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs mb-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Salário Base (Fixo)</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                                  title="Clique para editar salário fixo"
                                >
                                  {formatBrl(item.fixedSalary)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                                <span className="text-[10px] uppercase tracking-wider flex items-center gap-1 font-semibold">
                                  (+) Comissão {item.shipmentsCount > 0 ? `(${item.shipmentsCount} fretes)` : ''}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {item.shipmentsCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setAuditingLeaderId(item.user.id)}
                                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                      title="Auditar fretes e comissões deste colaborador"
                                    >
                                      Auditar ({item.shipmentsCount})
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUserValues(item.user)}
                                    className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Clique para ajustar ou lançar comissão"
                                  >
                                    +{formatBrl(item.commissionEarned)}
                                    <Edit3 className="w-3 h-3 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                                <span className="text-[10px] uppercase tracking-wider">(-) Tributos / INSS (CLT)</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Clique para ajustar retenções e tributos CLT"
                                >
                                  -{formatBrl(item.taxesClt)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] uppercase tracking-wider font-semibold">
                                    (-) Adiantamentos / Vales
                                  </span>
                                  {item.advanceDate && item.totalAdvances > 0 && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-mono font-bold">
                                      {new Date(item.advanceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  {item.advanceReceiptUrl && (
                                    <button
                                      type="button"
                                      onClick={() => openDocumentInNewTab(item.advanceReceiptUrl!, item.advanceReceiptFileName || 'Comprovante_Transferencia')}
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                                      title="Visualizar Comprovante de Transferência do Adiantamento"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span>Comprovante</span>
                                      <ExternalLink className="w-2 h-2 opacity-70" />
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Clique para registrar adiantamentos feitos, data e comprovante"
                                >
                                  -{formatBrl(item.totalAdvances)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Folha Líquida Devida</span>
                                <span className="font-black text-purple-600 dark:text-purple-400">{formatBrl(item.netDue)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Já Pago</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBrl(item.totalPaid)}</span>
                              </div>
                            </div>
                          )}

                          {item.regime === 'PJ' && (
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs mb-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Contrato / Remuneração PJ</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 cursor-pointer"
                                  title="Clique para editar valor de contrato PJ"
                                >
                                  {formatBrl(item.fixedSalary)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                                <span className="text-[10px] uppercase tracking-wider flex items-center gap-1 font-semibold">
                                  (+) Comissão {item.shipmentsCount > 0 ? `(${item.shipmentsCount} fretes)` : ''}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {item.shipmentsCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setAuditingLeaderId(item.user.id)}
                                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                      title="Auditar fretes e comissões deste colaborador"
                                    >
                                      Auditar ({item.shipmentsCount})
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUserValues(item.user)}
                                    className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Clique para ajustar ou lançar comissão"
                                  >
                                    +{formatBrl(item.commissionEarned)}
                                    <Edit3 className="w-3 h-3 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] uppercase tracking-wider font-semibold">
                                    (-) Adiantamentos / Vales
                                  </span>
                                  {item.advanceDate && item.totalAdvances > 0 && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-mono font-bold">
                                      {new Date(item.advanceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  {item.advanceReceiptUrl && (
                                    <button
                                      type="button"
                                      onClick={() => openDocumentInNewTab(item.advanceReceiptUrl!, item.advanceReceiptFileName || 'Comprovante_Transferencia')}
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                                      title="Visualizar Comprovante de Transferência do Adiantamento"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span>Comprovante</span>
                                      <ExternalLink className="w-2 h-2 opacity-70" />
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Clique para registrar adiantamentos feitos, data e comprovante"
                                >
                                  -{formatBrl(item.totalAdvances)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Líquido Devido</span>
                                <span className="font-black text-purple-600 dark:text-purple-400">{formatBrl(item.netDue)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Já Pago</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBrl(item.totalPaid)}</span>
                              </div>
                            </div>
                          )}

                          {item.regime === 'Gestor AG' && (
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs mb-3 space-y-1.5">
                              <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-200/70 dark:border-slate-800">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Embarques CT-e</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.shipmentsCount} fretes</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Lucro Real Agência</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatBrl(item.totalNetProfit)}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Comissão ({item.commissionPct}%)</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Clique para ajustar comissão"
                                >
                                  {formatBrl(item.commissionEarned)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">(+) Salário Fixo Adicional</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                                  title="Clique para editar salário fixo adicional"
                                >
                                  {formatBrl(item.fixedSalary)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] uppercase tracking-wider font-semibold">
                                    (-) Adiantamentos
                                  </span>
                                  {item.advanceDate && item.totalAdvances > 0 && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-mono font-bold">
                                      {new Date(item.advanceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  {item.advanceReceiptUrl && (
                                    <button
                                      type="button"
                                      onClick={() => openDocumentInNewTab(item.advanceReceiptUrl!, item.advanceReceiptFileName || 'Comprovante_Transferencia')}
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                                      title="Visualizar Comprovante de Transferência do Adiantamento"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span>Comprovante</span>
                                      <ExternalLink className="w-2 h-2 opacity-70" />
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserValues(item.user)}
                                  className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Clique para registrar adiantamentos feitos, data e comprovante"
                                >
                                  -{formatBrl(item.totalAdvances)}
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Já Liquidado</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBrl(item.totalPaid)}</span>
                              </div>
                            </div>
                          )}

                          {/* Seção de Documentos Obrigatórios por Regime */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs mb-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                                Documentos ({item.regime}):
                              </span>
                              {item.isCompleted ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Arquivado
                                </span>
                              ) : item.isDocumentPending ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {item.missingDocsText || 'Pendente'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Anexados ✓
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {/* Nota Fiscal (Obrigatória para PJ e Gestor AG) */}
                              {(item.regime === 'PJ' || item.regime === 'Gestor AG') && (
                                <div className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] font-medium border ${
                                  item.hasInvoice
                                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300'
                                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                }`}>
                                  <span className="flex items-center gap-1 truncate">
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span className="truncate">NF: {item.invoiceNumber || (item.hasInvoice ? 'Anexada ✓' : 'Falta NF ⚠️')}</span>
                                  </span>
                                  {item.invoiceFileUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDocumentInNewTab(item.invoiceFileUrl!, item.invoiceFileName || 'Nota Fiscal');
                                      }}
                                      className="p-1 hover:bg-purple-200/50 dark:hover:bg-purple-900/50 rounded text-purple-700 dark:text-purple-300 cursor-pointer"
                                      title="Abrir Nota Fiscal em nova aba"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Comprovante de Pagamento (Obrigatório para CLT, PJ e Gestor AG) */}
                              <div className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] font-medium border ${
                                item.hasReceipt
                                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300'
                                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                              } ${item.regime === 'CLT' ? 'sm:col-span-2' : ''}`}>
                                <span className="flex items-center gap-1 truncate">
                                  <Receipt className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Comprovante: {item.hasReceipt ? (item.paymentAuthCode ? `Aut ${item.paymentAuthCode.slice(0, 8)}...` : 'Anexado ✓') : 'Falta Comprovante ⚠️'}</span>
                                </span>
                                {item.receiptFileUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDocumentInNewTab(item.receiptFileUrl!, item.receiptFileName || 'Comprovante');
                                    }}
                                    className="p-1 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 rounded text-blue-700 dark:text-blue-300 cursor-pointer"
                                    title="Abrir Comprovante em nova aba"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Saldo Restante / A Pagar em Destaque */}
                          <div className={`p-3.5 rounded-xl border mb-3 flex items-center justify-between ${
                            hasPendingBalance
                              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                              : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          }`}>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                                {hasPendingBalance ? 'Saldo Pendente de Pagamento' : 'Situação Contábil'}
                              </span>
                              <div className="text-lg font-black tracking-tight mt-0.5">
                                {hasPendingBalance ? formatBrl(item.balancePending) : '100% Em Dia'}
                              </div>
                            </div>

                            {/* Chave PIX Rápida */}
                            {userPix && (
                              <button
                                type="button"
                                onClick={() => handleCopyPix(userPix, item.user.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                                title="Copiar Chave PIX cadastrada do Colaborador"
                              >
                                {copiedPixId === item.user.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600 font-bold">Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-400" />
                                    <span>Copiar PIX</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Ações do Card */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex-wrap sm:flex-nowrap">
                          {/* Botão de Lançar NF / Comprovante */}
                          <button
                            type="button"
                            onClick={() => setSelectedSettlementForDocs(item)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs flex-1 ${
                              item.isCompleted
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : item.isDocumentPending
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                            title="Lançar Nota Fiscal e Comprovante de Pagamento"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>
                              {item.isCompleted 
                                ? 'Ver Documentos' 
                                : item.regime === 'CLT' 
                                ? 'Lançar Comprovante' 
                                : 'Lançar NF / Recibo'}
                            </span>
                          </button>

                          {/* Auditoria de Fretes (se houver fretes vinculados, comissão ou Gestor AG) */}
                          {(item.shipmentsCount > 0 || item.commissionEarned > 0 || item.regime === 'Gestor AG') && (
                            <button
                              type="button"
                              onClick={() => setAuditingLeaderId(item.user.id)}
                              className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="Auditar fretes e comissões deste colaborador"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Auditar{item.shipmentsCount > 0 ? ` (${item.shipmentsCount})` : ''}</span>
                            </button>
                          )}

                          {/* Configurar Regime, Salário e Encargos */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditUserValues(item.user)}
                            className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                            title="Configurar regime, salário fixo, tributos CLT e adiantamentos"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                          </button>

                          {/* Botão de Planejar Pagamento */}
                          <button
                            type="button"
                            onClick={() => handleOpenPlanModal(item.user.id, item.balancePending)}
                            className="py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                            title="Planejar ou quitar pagamento para este colaborador"
                          >
                            <CalendarClock className="w-3.5 h-3.5 text-amber-200" />
                            <span>Planejar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* SEÇÃO 4.2: CRONOGRAMA & TABELA DE PAGAMENTOS PLANEJADOS DA FOLHA */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Cronograma & Histórico de Pagamentos da Folha de Pagamento
                </h4>
                <span className="text-[11px] text-slate-400">
                  ({filteredLeaderPayables.length} lançamentos encontrados)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3.5 px-4">Colaborador Favorecido</th>
                    <th className="py-3.5 px-4">Tipo / Finalidade</th>
                    <th className="py-3.5 px-4">Dados de Pagamento (PIX)</th>
                    <th className="py-3.5 px-4">Data Prevista / Vencimento</th>
                    <th className="py-3.5 px-4 text-right">Valor Planejado</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredLeaderPayables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
                        <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                          Nenhum pagamento programado para colaboradores da folha
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Clique em "+ Planejar Pagamento" para registrar um vencimento, salário ou acerto de comissões.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLeaderPayables.map(item => {
                      const isPaid = item.status === 'Pago';
                      const isOverdue = item.status === 'Atrasado';

                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          {/* 1. Líder Favorecido */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-xs shrink-0 border border-amber-200 dark:border-amber-800">
                                <Award className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">
                                  {item.supplierName}
                                </span>
                                <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[200px]" title={item.description}>
                                  {item.description}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Tipo / Finalidade */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                              <Briefcase className="w-3 h-3 text-amber-500" />
                              {item.category}
                            </span>
                            {item.notes && (
                              <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[200px] mt-0.5" title={item.notes}>
                                {item.notes}
                              </span>
                            )}
                          </td>

                          {/* 3. Dados de Pagamento (PIX) */}
                          <td className="py-3 px-4">
                            {item.pixKey ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 max-w-[150px] truncate" title={item.pixKey}>
                                  {item.pixKey}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPix(item.pixKey, item.id)}
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                                  title="Copiar Chave PIX"
                                >
                                  {copiedPixId === item.id ? 'Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">PIX não informado</span>
                            )}
                          </td>

                          {/* 4. Data Prevista / Vencimento */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                              {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            {isPaid && item.paymentDate && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                                Baixa: {new Date(item.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </td>

                          {/* 5. Valor Planejado */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 tracking-tight">
                              {formatBrl(item.payableAmount)}
                            </span>
                          </td>

                          {/* 6. Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}>
                              {isPaid && <CheckCircle2 className="w-3 h-3" />}
                              {isOverdue && <AlertCircle className="w-3 h-3" />}
                              {!isPaid && !isOverdue && <Clock className="w-3 h-3" />}
                              <span>{item.status}</span>
                            </span>
                          </td>

                          {/* 7. Ações */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão de Dar Baixa / Reabrir */}
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(
                                  item.id,
                                  isPaid ? FinancialTransactionStatus.Pendente : FinancialTransactionStatus.Pago
                                )}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  isPaid
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                                title={isPaid ? 'Reabrir lançamento para Pendente' : 'Confirmar quitação deste pagamento'}
                              >
                                {isPaid ? 'Reabrir' : 'Dar Baixa'}
                              </button>

                              {/* Botão de Excluir Lançamento Planejado */}
                              {onDeleteTransaction && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Deseja realmente remover este lançamento de ${formatBrl(item.payableAmount)} para ${item.supplierName}?`)) {
                                      onDeleteTransaction(item.id);
                                    }
                                  }}
                                  className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Remover planejamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TABELA PADRÃO DE CONTAS A PAGAR (TODAS, NOTAS FISCAIS OU AVULSOS) */}
      {activeSection !== 'leaders' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Tipo / Documento</th>
                  <th className="py-3.5 px-4">Fornecedor / Favorecido</th>
                  <th className="py-3.5 px-4">Classificação / Centro de Custo</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4 text-right">Valor Total</th>
                  <th className="py-3.5 px-4 text-right">Valor a Pagar</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Documento</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {consolidatedList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <ArrowDownCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">Nenhuma conta a pagar encontrada</p>
                      <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou cadastre um novo lançamento.</p>
                    </td>
                  </tr>
                ) : (
                  consolidatedList.map((item) => {
                    const isPaid = item.status === 'Pago';
                    const isOverdue = item.status === 'Atrasado';

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        {/* 1. Tipo / Documento */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {item.kind === 'invoice' ? (
                              item.boletoUrl ? (
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 border border-emerald-300 dark:border-emerald-800" title="Boleto Bancário vinculado à Nota Fiscal">
                                  <Receipt className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl shrink-0" title="Nota Fiscal de Entrada">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )
                            ) : item.kind === 'leader' ? (
                              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0 border border-amber-200 dark:border-amber-800" title="Pagamento / Planejamento de Agenciador Líder">
                                <Award className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl shrink-0" title="Lançamento Avulso">
                                <Tag className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.kind === 'invoice' && item.originalItem?.id && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-mono font-bold border border-blue-200 dark:border-blue-800 shrink-0">
                                    {item.originalItem.id}
                                  </span>
                                )}
                                {item.kind === 'invoice' && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                                    item.originalItem?.documentType === 'Fatura'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  }`}>
                                    {item.originalItem?.documentType === 'Fatura' ? 'Fatura' : 'NF'}
                                  </span>
                                )}
                                {item.kind === 'leader' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold border bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0">
                                    Agenciador Líder
                                  </span>
                                )}
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {item.docNumber}
                                </span>
                                {item.boletoUrl && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    Boleto Vinculado
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[170px]">
                                {item.boletoUrl ? `Boleto • ${item.title}` : item.title}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Fornecedor / Favorecido */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 max-w-[200px]" title={item.entityName}>
                            {item.entityName}
                          </div>
                          {item.kind === 'invoice' && item.originalItem.supplierCnpjCpf && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {item.originalItem.supplierCnpjCpf}
                            </span>
                          )}
                          {item.kind === 'leader' && item.pixKey && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                              PIX: {item.pixKey}
                            </span>
                          )}
                        </td>

                        {/* 3. Classificação & Linha Digitável */}
                        <td className="py-3 px-4">
                          <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1 max-w-[200px]" title={item.categoryOrCenter}>
                            {item.categoryOrCenter}
                          </span>
                          {item.originalItem?.paymentDetails ? (
                            <div className="flex items-center gap-1 mt-0.5 max-w-[200px]">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate" title={item.originalItem.paymentDetails}>
                                {item.originalItem.paymentDetails}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.originalItem.paymentDetails);
                                  alert('Linha digitável / código copiado para a área de transferência!');
                                }}
                                className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                                title="Copiar linha digitável / código de barras"
                              >
                                Copiar
                              </button>
                            </div>
                          ) : item.details ? (
                            <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[200px]" title={item.details}>
                              {item.details}
                            </span>
                          ) : null}
                        </td>

                        {/* 4. Vencimento */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                            {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          {item.kind === 'invoice' && item.originalItem.issueDate && (
                            <span className="text-[10px] text-slate-400 block">
                              Emissão: {new Date(item.originalItem.issueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </td>

                        {/* 5. Valor Total */}
                        <td className="py-3 px-4 text-right whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {formatBrl(item.totalAmount)}
                        </td>

                        {/* 6. Valor a Pagar */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {formatBrl(item.payableAmount)}
                          </span>
                          {item.payableAmount !== item.totalAmount && (
                            <span className="text-[9px] text-slate-400 block line-through">
                              Cheio: {formatBrl(item.totalAmount)}
                            </span>
                          )}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}>
                            {isPaid && <CheckCircle2 className="w-3 h-3" />}
                            {isOverdue && <AlertCircle className="w-3 h-3" />}
                            {!isPaid && !isOverdue && <Clock className="w-3 h-3" />}
                            <span>{item.status}</span>
                          </span>
                        </td>

                        {/* 8. Documento Anexado */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.boletoUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.boletoUrl) {
                                    openDocumentInNewTab(item.boletoUrl, `Boleto_${item.docNumber}`);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
                                title="Abrir Boleto para Pagamento em nova aba"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Boleto</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </button>
                            )}
                            {item.documentUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.documentUrl) {
                                    openDocumentInNewTab(item.documentUrl, item.docNumber);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 rounded-lg text-[11px] font-bold border border-blue-200 dark:border-blue-800/60 transition-colors cursor-pointer"
                                title="Abrir visualização do documento em nova aba"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{item.boletoUrl ? 'NF' : 'Ver Doc'}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </button>
                            ) : (
                              !item.boletoUrl && <span className="text-slate-400 text-[10px] italic">Sem anexo</span>
                            )}
                          </div>
                        </td>

                        {/* 9. Ações: Dar Baixa / Alternar */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {item.kind === 'invoice' && (
                            <button
                              type="button"
                              onClick={() => handleToggleInvoiceStatus(item.originalItem.id, item.status)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isPaid
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {isPaid ? 'Reabrir' : 'Dar Baixa'}
                            </button>
                          )}

                          {(item.kind === 'manual' || item.kind === 'leader') && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(
                                item.originalItem.id, 
                                isPaid ? FinancialTransactionStatus.Pendente : FinancialTransactionStatus.Pago
                              )}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isPaid
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {isPaid ? 'Reabrir' : 'Dar Baixa'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODAL DE NOVO LANÇAMENTO MANUAL AVULSO GERAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Novo Lançamento Avulso - Contas a Pagar
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Fornecedor de Pneus / Manutenção de Pátio"
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Valor a Pagar (R$) *</label>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Fornecedor / Favorecido</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Razão Social ou Nome Fantasia"
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Custos com Motoristas / Terceiros">Custos com Motoristas</option>
                    <option value="Pedágios">Pedágios</option>
                    <option value="Impostos e Tributos">Impostos e Tributos</option>
                    <option value="Despesas Operacionais">Despesas Operacionais</option>
                    <option value="Pessoal e Encargos">Pessoal e Encargos</option>
                    <option value="Despesas Administrativas">Despesas Administrativas</option>
                    <option value="Despesas Financeiras / Tarifas">Despesas Financeiras</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Centro de Custo</label>
                  <select
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Operacional">Operacional</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Frota">Frota</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais..."
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DE PLANEJAMENTO DE PAGAMENTO - FOLHA DE PAGAMENTO */}
      {isPlanLeaderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Planejar Pagamento • Folha de Pagamento
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Programe quitações de salários, comissões de Gestor AG, adiantamentos ou pró-labore
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPlanLeaderModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlanLeader} className="space-y-4">
              {/* Seleção do Colaborador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Colaborador Favorecido *
                </label>
                <select
                  required
                  value={planLeaderId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setPlanLeaderId(newId);
                    const userObj = payrollUsers.find(l => l.id === newId);
                    const sum = leadersSummary.find(s => s.user.id === newId);
                    if (userObj) {
                      const reg = getUserRegime(userObj);
                      if (reg === 'CLT') {
                        setPlanPaymentType('Salário Mensal (Folha)');
                      } else if (reg === 'PJ') {
                        setPlanPaymentType('Pró-labore / Pagamento PJ');
                      } else {
                        setPlanPaymentType('Comissão de Gestor AG');
                      }
                      setPlanPixKey(userObj.phone || userObj.corporateEmail || userObj.email || '');
                    }
                    if (sum && sum.balancePending > 0) {
                      setPlanAmount(sum.balancePending.toFixed(2).replace('.', ','));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Selecione o Colaborador...</option>
                  {payrollUsers.map(u => {
                    const sum = leadersSummary.find(s => s.user.id === u.id);
                    const reg = sum?.regime || getUserRegime(u);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} ({reg} - {u.profile}) - Saldo a Pagar: {formatBrl(sum?.balancePending || 0)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Card Contextual do Colaborador Selecionado */}
              {planLeaderId && (() => {
                const selSummary = leadersSummary.find(s => s.user.id === planLeaderId);
                if (!selSummary) return null;

                return (
                  <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        {selSummary.user.name} • {selSummary.branchName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                        Regime: {selSummary.regime}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {selSummary.regime === 'Gestor AG' ? 'Comissão + Fixo:' : 'Salário / Contrato:'}
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {formatBrl(selSummary.grossTotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Já Pago:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBrl(selSummary.totalPaid)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo em Aberto:</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          {formatBrl(selSummary.balancePending)}
                        </span>
                      </div>
                    </div>

                    {selSummary.regime === 'CLT' && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-amber-200/40 dark:border-amber-800/40 pt-1">
                        <span>Retenções Tributos: <strong className="text-rose-600">-{formatBrl(selSummary.taxesClt)}</strong></span>
                        <span>Adiantamentos: <strong className="text-orange-600">-{formatBrl(selSummary.totalAdvances)}</strong></span>
                        <span>Líquido: <strong className="text-purple-600 font-bold">{formatBrl(selSummary.netDue)}</strong></span>
                      </div>
                    )}

                    {selSummary.balancePending > 0 && (
                      <button
                        type="button"
                        onClick={() => setPlanAmount(selSummary.balancePending.toFixed(2).replace('.', ','))}
                        className="w-full mt-1 py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        ⚡ Preencher Saldo em Aberto ({formatBrl(selSummary.balancePending)})
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Tipo de Pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Tipo de Pagamento *
                  </label>
                  <select
                    value={planPaymentType}
                    onChange={(e) => setPlanPaymentType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Salário Mensal (Folha)">Salário Mensal (Folha)</option>
                    <option value="Adiantamento Salarial (Vale)">Adiantamento Salarial (Vale)</option>
                    <option value="Comissão de Gestor AG">Comissão de Gestor AG</option>
                    <option value="Pró-labore / Pagamento PJ">Pró-labore / Pagamento PJ</option>
                    <option value="13º Salário / Férias">13º Salário / Férias</option>
                    <option value="Premiação / Bônus">Premiação / Bônus</option>
                    <option value="Acerto Operacional">Acerto Operacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={planPaymentMethod}
                    onChange={(e) => setPlanPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência / TED">Transferência / TED</option>
                    <option value="Depósito em Conta">Depósito em Conta</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Valor e Data de Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Valor Planejado (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Data Prevista / Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={planDueDate}
                    onChange={(e) => setPlanDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Chave PIX e Status Inicial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Chave PIX / Favorecido
                  </label>
                  <input
                    type="text"
                    value={planPixKey}
                    onChange={(e) => setPlanPixKey(e.target.value)}
                    placeholder="CPF, Telefone, Email ou Chave Aleatória"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={planInitialStatus}
                    onChange={(e) => setPlanInitialStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value={FinancialTransactionStatus.Pendente}>🟡 Pendente (Planejado / A Pagar)</option>
                    <option value={FinancialTransactionStatus.Pago}>🟢 Pago (Já Liquidado Hoje)</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Observações / Memória de Cálculo
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais do acerto de contas..."
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPlanLeaderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/25 cursor-pointer active:scale-95"
                >
                  Salvar Planejamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL DE CONFIGURAÇÃO DE FOLHA DO COLABORADOR (REGIME, SALÁRIO, TRIBUTOS, ADIANTAMENTO) */}
      {editingUserForValues && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Configurar Folha • {editingUserForValues.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Perfil: {editingUserForValues.profile} • {editingUserForValues.branchId || 'Matriz'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUserForValues(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserValues} className="space-y-4">
              {/* Regime de Contratação */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Regime de Contratação / Classificação *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CLT', 'PJ', 'Gestor AG'] as const).map(reg => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setEditRegime(reg)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        editRegime === reg
                          ? reg === 'Gestor AG'
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : reg === 'PJ'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                            : 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {editRegime === 'CLT' && 'Colaborador com registro CLT, sujeito a tributos/retenções (INSS/IRRF).'}
                  {editRegime === 'PJ' && 'Prestador PJ com valor de remuneração contratual fixa/negociada.'}
                  {editRegime === 'Gestor AG' && 'Agenciador Líder: apuração automática por lucro real dos fretes + fixo opcional.'}
                </p>
              </div>

              {/* Salário Fixo / Remuneração Base */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {editRegime === 'PJ' ? 'Remuneração Contratual (R$)' : editRegime === 'Gestor AG' ? 'Salário Fixo Adicional (R$)' : 'Salário Fixo Mensal (R$)'}
                </label>
                <input
                  type="text"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Salário informado para apuração regular no sistema
                </span>
              </div>

              {/* Comissão / Ajuste de Comissão */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Comissão / Ajuste de Comissão (R$)
                  </label>
                  {editCommission.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => setEditCommission('')}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-semibold"
                      title="Limpar ajuste manual e restaurar apuração automática dos fretes"
                    >
                      Usar Apuração Automática dos Fretes
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                  placeholder="Automático (calculado pelos fretes CT-e)"
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {editCommission.trim() === '' ? 'Deixe em branco para usar o cálculo automático apurado dos fretes.' : 'Valor manual informado. Para restaurar o cálculo automático, clique em "Usar Apuração Automática dos Fretes" acima.'}
                </span>
              </div>

              {/* Tributos / Retenções CLT */}
              {editRegime === 'CLT' && (
                <div>
                  <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                    Tributos & Descontos CLT (INSS, IRRF, Encargos) (R$)
                  </label>
                  <input
                    type="text"
                    value={editTaxes}
                    onChange={(e) => setEditTaxes(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Valor total de tributos e retenções descontados do salário bruto
                  </span>
                </div>
              )}

              {/* Adiantamento Salarial / Vale Registrado com Data e Comprovante */}
              <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span>Adiantamento / Vale Concedido</span>
                  </label>
                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300 bg-orange-200/60 dark:bg-orange-900/60 px-2 py-0.5 rounded-md border border-orange-300 dark:border-orange-800">
                    Comprovante & Data
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Valor do Adiantamento (R$)
                    </label>
                    <input
                      type="text"
                      value={editAdvance}
                      onChange={(e) => setEditAdvance(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-900 text-orange-900 dark:text-orange-200 font-bold outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data da Transferência *
                    </label>
                    <input
                      type="date"
                      value={editAdvanceDate}
                      onChange={(e) => setEditAdvanceDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Comprovante de Transferência Bancária */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Comprovante de Transferência Bancária / PIX
                  </label>

                  {editAdvanceReceiptUrl ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                      <div className="flex items-center gap-2 truncate mr-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={editAdvanceReceiptName || 'Comprovante_Transferencia'}>
                            {editAdvanceReceiptName || 'Comprovante_Transferencia'}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                            Comprovante anexado e gravado
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(editAdvanceReceiptUrl, editAdvanceReceiptName || 'Comprovante_Transferencia')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Abrir e Visualizar Comprovante de Transferência"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditAdvanceReceiptUrl('');
                            setEditAdvanceReceiptName('');
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Remover Comprovante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        ref={advanceFileInputRef}
                        onChange={handleAdvanceFileSelected}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingAdvanceReceipt}
                        onClick={() => advanceFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 border border-dashed border-orange-300 dark:border-orange-800 hover:border-orange-500 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        {isUploadingAdvanceReceipt ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                            <span>Carregando Comprovante...</span>
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-4 h-4 text-orange-500" />
                            <span>Anexar Comprovante de Transferência (PDF ou Imagem)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 block leading-tight">
                  A data informada e o comprovante de transferência ficam gravados no acerto mensal da folha.
                </span>
              </div>

              {/* Chave PIX */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chave PIX Cadastrada
                </label>
                <input
                  type="text"
                  value={editPixKey}
                  onChange={(e) => setEditPixKey(e.target.value)}
                  placeholder="CPF, Telefone, Email ou Chave Aleatória"
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Memória Prévia do Líquido */}
              {(() => {
                const s = parseBrazilianCurrency(editSalary);
                const c = parseBrazilianCurrency(editCommission);
                const t = editRegime === 'CLT' ? parseBrazilianCurrency(editTaxes) : 0;
                const a = parseBrazilianCurrency(editAdvance);
                const gross = s + c;
                const net = Math.max(0, gross - t - a);

                return (
                  <div className="bg-slate-100 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Fixo / Base Informado:</span>
                      <span className="font-bold">{formatBrl(s)}</span>
                    </div>
                    {c > 0 && (
                      <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                        <span>(+) Comissão Informada:</span>
                        <span className="font-bold">+{formatBrl(c)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span>Total Bruto:</span>
                      <span className="font-bold">{formatBrl(gross)}</span>
                    </div>
                    {t > 0 && (
                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                        <span>(-) Tributos CLT:</span>
                        <span className="font-bold">-{formatBrl(t)}</span>
                      </div>
                    )}
                    {a > 0 && (
                      <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                        <span>(-) Adiantamentos:</span>
                        <span className="font-bold">-{formatBrl(a)}</span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Líquido Previsto:</span>
                      <span className="text-purple-600 dark:text-purple-400 font-black">{formatBrl(net)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Botões do Modal */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    const u = editingUserForValues;
                    setEditingUserForValues(null);
                    handleExcludeUserFromPayroll(u);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  title="Excluir este colaborador da tela de folha de pagamento"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Excluir da Folha</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUserForValues(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    Salvar Configuração
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL DE AUDITORIA DE FRETES DA AGÊNCIA DO LÍDER */}
      {auditingLeaderId && currentAuditingSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Auditoria de Fretes • {currentAuditingSummary.user?.name || currentAuditingSummary.leader?.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentAuditingSummary.branchName} • {
                      currentAuditingSummary.regime === 'Gestor AG'
                        ? `Taxa de Comissão: ${currentAuditingSummary.commissionPct}% sobre Lucro Real Líquido`
                        : `Apuração Comercial • ${currentAuditingSummary.shipmentsCount} fretes vinculados no período`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditingLeaderId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner com Totais Consolidados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Embarques Auditados</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{currentAuditingSummary.shipmentsCount} fretes</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Faturamento Empresa</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatBrl(currentAuditingSummary.totalFreightRevenue)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Lucro Real Líquido</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBrl(currentAuditingSummary.totalNetProfit)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  {currentAuditingSummary.regime === 'Gestor AG' ? 'Comissão da Agência' : 'Comissão Apurada'}
                </span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">{formatBrl(currentAuditingSummary.commissionEarned)}</span>
              </div>
            </div>

            {/* Tabela de Embarques */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">CT-e / Data</th>
                    <th className="py-2.5 px-3">Tomador / Cliente</th>
                    <th className="py-2.5 px-3">Rota (Origem → Destino)</th>
                    <th className="py-2.5 px-3">Motorista / Placa</th>
                    <th className="py-2.5 px-3 text-right">Frete Bruto</th>
                    <th className="py-2.5 px-3 text-right">Lucro Real</th>
                    <th className="py-2.5 px-3 text-right">
                      {currentAuditingSummary.regime === 'Gestor AG' ? `Comissão (${currentAuditingSummary.commissionPct}%)` : 'Comissão (R$)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {currentAuditingSummary.shipments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhum embarque faturado com CT-e encontrado no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    currentAuditingSummary.shipments.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white block">{s.cte}</span>
                          <span className="text-[10px] text-slate-400">{s.date}</span>
                        </td>
                        <td className="py-2 px-3 max-w-[150px] truncate" title={s.clientName}>
                          {s.clientName}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300 max-w-[170px] truncate" title={`${s.origin} → ${s.destination}`}>
                          {s.origin} → {s.destination}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-[11px]">
                          <span className="text-slate-700 dark:text-slate-300 block line-clamp-1">{s.driverName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{s.plate}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatBrl(s.companyFreight)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatBrl(s.netProfit)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {formatBrl(s.commissionVal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400">
                Auditoria gerada com base nos registros do Módulo Fiscal & Operacional
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuditingLeaderId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lId = currentAuditingSummary.leader.id;
                    const bal = currentAuditingSummary.balancePending;
                    setAuditingLeaderId(null);
                    handleOpenPlanModal(lId, bal);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Planejar Pagamento deste Saldo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL DE LANÇAMENTO DE DOCUMENTOS DA FOLHA (NF E COMPROVANTE) */}
      <PayrollDocsModal
        isOpen={Boolean(selectedSettlementForDocs)}
        onClose={() => setSelectedSettlementForDocs(null)}
        settlement={selectedSettlementForDocs}
        onSave={handleSavePayrollDocs}
      />

      {/* 9. MODAL DE GERENCIAMENTO DE COLABORADORES EXCLUÍDOS DA FOLHA */}
      {isExcludedUsersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Colaboradores Excluídos da Folha
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estes usuários não são exibidos nas apurações mensais da folha
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExcludedUsersModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto flex-1">
              {excludedPayrollUserIds.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <UserX className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="text-xs font-semibold">Nenhum colaborador excluído no momento.</p>
                </div>
              ) : (
                excludedPayrollUserIds.map(uid => {
                  const u = (users || []).find(usr => usr.id === uid);
                  if (!u) return null;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          Perfil: {u.profile} {u.branchId ? `• Filial: ${u.branchId}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreUserToPayroll(u.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              {excludedPayrollUserIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleRestoreAllUsersToPayroll}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                >
                  Restaurar Todos
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setIsExcludedUsersModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
