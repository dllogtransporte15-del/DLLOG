import React, { useState, useMemo, useEffect } from 'react';
import type { 
  FinancialTransaction, 
  Shipment, 
  Cargo, 
  Client, 
  User, 
  FinancialInvoice,
  InvoicePaymentStatus
} from '../../types';
import { FinancialTransactionStatus } from '../../types';
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
  X
} from 'lucide-react';
import { openDocumentInNewTab } from '../../utils/documentViewer';
import { financialInvoiceService } from '../../services/financialInvoiceService';
import { parseBrazilianCurrency, formatBrl } from '../../utils/financialCalculations';

interface AccountsPayableTabProps {
  transactions: FinancialTransaction[];
  onAddTransaction: (t: Omit<FinancialTransaction, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: FinancialTransactionStatus) => void;
  shipments?: Shipment[];
  cargos?: Cargo[];
  clients?: Client[];
  users?: User[];
  currentUser?: User | null;
  onNavigateToInvoices?: () => void;
}

export const AccountsPayableTab: React.FC<AccountsPayableTabProps> = ({
  transactions,
  onAddTransaction,
  onUpdateStatus,
  users = [],
  currentUser,
  onNavigateToInvoices,
}) => {
  // Sub-abas do Contas a Pagar
  const [activeSection, setActiveSection] = useState<'all' | 'invoices' | 'manual'>('all');

  // Filtros Gerais
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Filtro de Período
  const [periodPreset, setPeriodPreset] = useState<'all' | 'current_month' | 'last_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Estado das Notas Fiscais
  const [invoices, setInvoices] = useState<FinancialInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Modal de Lançamento Manual Avulso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Custos com Motoristas / Terceiros');
  const [supplierName, setSupplierName] = useState('');
  const [costCenter, setCostCenter] = useState('Operacional');
  const [notes, setNotes] = useState('');

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

  // 1. Processar Notas Fiscais a Pagar
  const invoicePayables = useMemo(() => {
    return (invoices || []).map(inv => {
      const isOverdue = inv.status === 'Atrasado' || (inv.status === 'Pendente' && inv.dueDate < todayStr);
      const displayStatus: 'Pendente' | 'Pago' | 'Atrasado' = inv.status === 'Pago' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente';

      return {
        id: inv.id,
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
        paymentMethod: inv.paymentMethod,
        paymentDetails: inv.paymentDetails,
        description: inv.description,
      };
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [invoices, todayStr]);

  // 2. Processar Lançamentos Manuais de Despesas
  const manualPayables = useMemo(() => {
    return (transactions || [])
      .filter(t => t.type === 'payable')
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
          status: displayStatus,
          shipmentId: t.shipmentId,
          documentNumber: t.documentNumber,
        };
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [transactions, todayStr]);

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

  // Filtragem: Manuais
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

  // Lista Consolidada
  const consolidatedList = useMemo(() => {
    const list: Array<{
      id: string;
      kind: 'invoice' | 'manual';
      docNumber: string;
      title: string;
      entityName: string;
      categoryOrCenter: string;
      dueDate: string;
      totalAmount: number;
      payableAmount: number;
      status: 'Pendente' | 'Pago' | 'Atrasado';
      documentUrl?: string | null;
      details?: string;
      originalItem: any;
    }> = [];

    if (activeSection === 'all' || activeSection === 'invoices') {
      filteredInvoices.forEach(inv => {
        list.push({
          id: `inv_${inv.id}`,
          kind: 'invoice',
          docNumber: `NF nº ${inv.invoiceNumber}`,
          title: `NF-e ${inv.supplierName}`,
          entityName: inv.supplierName,
          categoryOrCenter: `${inv.costCenterName} • ${inv.costTypeName}`,
          dueDate: inv.dueDate,
          totalAmount: inv.totalAmount,
          payableAmount: inv.payableAmount,
          status: inv.status,
          documentUrl: inv.fileUrl,
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

    return list.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [activeSection, filteredInvoices, filteredManuals]);

  // KPIs
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

  // Submit Lançamento Manual
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

  // Exportar CSV
  const handleExportCsv = () => {
    if (consolidatedList.length === 0) return;

    const headers = ['Tipo', 'Documento', 'Fornecedor / Favorecido', 'Categoria / Centro de Custo', 'Vencimento', 'Valor Total', 'Valor a Pagar', 'Status'];
    const rows = consolidatedList.map(item => [
      item.kind === 'invoice' ? 'Nota Fiscal' : 'Despesa Avulsa',
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

  return (
    <div className="space-y-6">
      {/* 1. SELETOR DE VISÃO (SUB-ABAS) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
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
              {invoicePayables.length + manualPayables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'invoices'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Notas Fiscais a Pagar</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {invoicePayables.length}
            </span>
          </button>

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
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2 px-2 pb-1 sm:pb-0">
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Lançamento Avulso</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE KPIS */}
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
              Contas quitadas
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Atrasado */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Vencidos / Atrasados
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">
              {formatBrl(kpiOverdue)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Vencimento expirado
            </span>
          </div>
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Distribuição por Categoria */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
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
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS AVANÇADOS */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, fornecedor, centro de custo, número da NF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

      {/* 4. TABELA DE CONTAS A PAGAR */}
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
                        <div className="flex items-center gap-2">
                          {item.kind === 'invoice' ? (
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0" title="Nota Fiscal de Entrada">
                              <FileText className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0" title="Lançamento Avulso">
                              <Tag className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {item.docNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[160px]">
                              {item.title}
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
                      </td>

                      {/* 3. Classificação */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1 max-w-[200px]" title={item.categoryOrCenter}>
                          {item.categoryOrCenter}
                        </span>
                        {item.details && (
                          <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[200px]" title={item.details}>
                            {item.details}
                          </span>
                        )}
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
                            <span>Ver Doc</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Sem anexo</span>
                        )}
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

                        {item.kind === 'manual' && (
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

      {/* 5. MODAL DE NOVO LANÇAMENTO MANUAL AVULSO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Novo Lançamento - Contas a Pagar
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
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
    </div>
  );
};
