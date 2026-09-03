import React, { useState, useMemo } from 'react';
import type { Shipment, User, Cargo, Client, Driver, Vehicle, Branch, Product } from '../../types';
import { ShipmentStatus, UserProfile, RISK_QUERY_COST_MAP } from '../../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Eye, 
  Paperclip, 
  Receipt, 
  X, 
  Truck, 
  Building2, 
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Upload,
  Edit2,
  ShieldCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MultiSelectDropdown from '../MultiSelectDropdown';
import AttachmentModal from '../AttachmentModal';
import { openDocumentInNewTab } from '../../utils/documentViewer';
import { getShipmentCte, isCteApplicableForStatus } from '../../utils';
import CteCostAutomationPanel from '../CteCostAutomationPanel';

import { calculateShipmentExpenses } from '../../utils/operationalExpensesCalculator';
import { SyncDocumentsModal } from '../SyncDocumentsModal';
import { RefreshCw } from 'lucide-react';

interface RealProfitReportProps {
  shipments: Shipment[];
  cargos: Cargo[];
  clients: Client[];
  users: User[];
  currentUser: User | null;
  drivers?: Driver[];
  vehicles?: Vehicle[];
  branches?: Branch[];
  products?: Product[];
  companyLogo?: string | null;
  startDate?: string;
  endDate?: string;
  onUpdateAttachment?: (shipmentId: string, data: any) => Promise<void>;
  onBatchUpdateShipments?: (updatedShipments: Shipment[]) => Promise<void> | void;
}

export const RealProfitReport: React.FC<RealProfitReportProps> = ({
  shipments,
  cargos,
  clients,
  users,
  currentUser,
  drivers = [],
  vehicles = [],
  branches = [],
  products = [],
  companyLogo,
  startDate: propStartDate,
  endDate: propEndDate,
  onUpdateAttachment,
  onBatchUpdateShipments
}) => {
  // Filtros internos
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [onlyWithOcr, setOnlyWithOcr] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Modal de Detalhes de Despesas
  const [selectedShipmentForDetail, setSelectedShipmentForDetail] = useState<Shipment | null>(null);
  
  // Modal de Edição / Anexo de Resumo Financeiro
  const [editingShipmentForAttachment, setEditingShipmentForAttachment] = useState<Shipment | null>(null);

  // Mapeamentos rápidos
  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  const clientMap = useMemo(() => new Map(clients.map(cl => [cl.id, cl])), [clients]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const userBranchMap = useMemo(() => new Map(users.map(u => [u.id, u.branchId])), [users]);

  // Função auxiliar para identificar a filial do embarque (considerando o usuário responsável pelo embarque/carga)
  const getShipmentBranchName = (s: Shipment, cargo?: Cargo): string => {
    const bId = s.branchId || 
                userBranchMap.get(s.embarcadorId) || 
                userBranchMap.get(s.createdById) || 
                cargo?.branchId || 
                (cargo ? userBranchMap.get(cargo.createdById) : undefined);

    if (bId) {
      const branch = branches.find(b => b.id === bId);
      if (branch) return branch.name;
    }
    return 'Matriz';
  };

  // Opções para MultiSelect
  const statusOptions = Object.values(ShipmentStatus);
  const clientOptions = Array.from(new Set(cargos.map(c => {
    const cl = clientMap.get(c.clientId);
    return cl?.nomeFantasia || cl?.razaoSocial || c.clientId;
  }))).filter(Boolean).sort();

  const driverOptions = Array.from(new Set(shipments.map(s => s.driverName))).filter(Boolean).sort();
  
  const branchOptions = useMemo(() => {
    const names = new Set(branches.map(b => b.name));
    names.add('Matriz');
    return Array.from(names).filter(Boolean).sort();
  }, [branches]);

  // Filtragem dos embarques
  const filteredData = useMemo(() => {
    return shipments.filter(s => {
      const cargo = cargoMap.get(s.cargoId);
      const client = cargo ? clientMap.get(cargo.clientId) : undefined;
      const clientName = client?.nomeFantasia || client?.razaoSocial || '';

      // Filtro de texto (ID, CT-e, NF-e, Motorista, Placa)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesId = s.id.toLowerCase().includes(term);
        const matchesCte = s.cteNumber?.toLowerCase().includes(term);
        const matchesNfe = s.nfeNumber?.toLowerCase().includes(term);
        const matchesDriver = s.driverName.toLowerCase().includes(term);
        const matchesPlate = s.horsePlate.toLowerCase().includes(term);
        const matchesClient = clientName.toLowerCase().includes(term);
        const matchesOrigin = cargo?.origin?.toLowerCase().includes(term);
        const matchesDest = cargo?.destination?.toLowerCase().includes(term);

        if (!matchesId && !matchesCte && !matchesNfe && !matchesDriver && !matchesPlate && !matchesClient && !matchesOrigin && !matchesDest) {
          return false;
        }
      }

      // Filtro de Status
      if (selectedStatus.length > 0 && !selectedStatus.includes(s.status)) {
        return false;
      }

      // Filtro de Cliente
      if (selectedClients.length > 0 && !selectedClients.includes(clientName)) {
        return false;
      }

      // Filtro de Motorista
      if (selectedDrivers.length > 0 && !selectedDrivers.includes(s.driverName)) {
        return false;
      }

      // Filtro de Filial / Matriz (verificando filial do embarque e filial dos usuários vinculados)
      if (selectedBranches.length > 0) {
        const branchName = getShipmentBranchName(s, cargo);
        if (!selectedBranches.includes(branchName)) {
          return false;
        }
      }

      // REGRA OBRIGATÓRIA: Contabilizar apenas embarques efetivados que possuem CT-e emitido
      if (s.status === ShipmentStatus.Cancelado || (s.status as string) === 'Cancelado') {
        return false;
      }

      if (!isCteApplicableForStatus(s.status)) {
        return false;
      }

      const cte = getShipmentCte(s);
      const hasCte = Boolean(cte && cte !== '-' && cte.trim() !== '');
      if (!hasCte) {
        return false;
      }

      // Filtro "Apenas com OCR / Demonstrativo"
      if (onlyWithOcr && !s.realProfitData) {
        return false;
      }

      return true;
    });
  }, [shipments, cargoMap, clientMap, branches, userBranchMap, searchTerm, selectedStatus, selectedClients, selectedDrivers, selectedBranches, onlyWithOcr]);

  // Cálculos consolidados para cada embarque (Conforme Automatização do CT-e)
  const enrichedRows = useMemo(() => {
    return filteredData.map(s => {
      const cargo = cargoMap.get(s.cargoId);
      const client = cargo ? clientMap.get(cargo.clientId) : undefined;
      const clientName = client?.nomeFantasia || client?.razaoSocial || 'Cliente N/A';
      
      // Apuração Completa e Parametrizada idêntica à "Automatização do CT-e"
      const calculatedExpenses = calculateShipmentExpenses(s, cargo);
      const {
        companyFreight,
        driverFreight,
        freightDifference,
        freightDifferenceMarginPercent,
        totalExpenses,
        netProfit,
        profitMarginPercent,
        expenseItems: rawExpenseItems,
        riskCost,
      } = calculatedExpenses;

      // Comprovante / Anexo de saldo ou despesas
      const saldoDoc = s.documents?.['Comprovante de Pagamento de Saldo'] || 
                       s.documents?.['Comprovante de Saldo'] || 
                       s.documents?.['Resumo de Custos'] ||
                       (s.documents ? Object.values(s.documents).flat().find(f => typeof f === 'string' && (f.includes('saldo') || f.includes('comprovante') || f.includes('resumo'))) : undefined);

      const attachmentUrl = Array.isArray(saldoDoc) ? saldoDoc[0] : (typeof saldoDoc === 'string' ? saldoDoc : undefined);

      const cte = getShipmentCte(s);

      return {
        shipment: s,
        cargo,
        clientName,
        cte: (cte && cte !== '-') ? cte : '',
        companyFreight,
        driverFreight,
        freightDifference,
        freightDifferenceMarginPercent,
        totalExpenses,
        netProfit,
        profitMarginPercent,
        hasOcr: Boolean(s.realProfitData),
        expenseItems: rawExpenseItems,
        attachmentUrl,
        riskCost,
        calculatedExpenses,
      };
    });
  }, [filteredData, cargoMap, clientMap]);

  // Totalizadores globais (Footer / KPIs)
  const totals = useMemo(() => {
    let sumCompanyFreight = 0;
    let sumDriverFreight = 0;
    let sumExpenses = 0;
    let sumFreightDiff = 0;
    let sumNetProfit = 0;
    let countOcr = 0;

    enrichedRows.forEach(r => {
      sumCompanyFreight += r.companyFreight;
      sumDriverFreight += r.driverFreight;
      sumExpenses += r.totalExpenses;
      sumFreightDiff += r.freightDifference;
      sumNetProfit += r.netProfit;
      if (r.hasOcr) countOcr++;
    });

    const consolidatedMargin = sumCompanyFreight > 0 
      ? (sumNetProfit / sumCompanyFreight) * 100 
      : 0;

    const consolidatedFreightDiffMargin = sumCompanyFreight > 0 
      ? (sumFreightDiff / sumCompanyFreight) * 100 
      : 0;

    return {
      totalShipments: enrichedRows.length,
      countOcr,
      sumCompanyFreight,
      sumDriverFreight,
      sumExpenses,
      sumFreightDiff,
      sumNetProfit,
      consolidatedMargin,
      consolidatedFreightDiffMargin
    };
  }, [enrichedRows]);

  // Exportação para PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Cabeçalho
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório: Lucro Real da Operação de Embarque', 14, 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const periodText = propStartDate && propEndDate ? `Período: ${propStartDate} a ${propEndDate}` : 'Todos os períodos';
    doc.text(`${periodText} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 21);

    // Tabela
    const tableData = enrichedRows.map(r => [
      r.shipment.id,
      r.cte || '---',
      r.shipment.scheduledDate || '---',
      r.clientName,
      `${r.shipment.driverName} (${r.shipment.horsePlate})`,
      `R$ ${r.companyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${r.driverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${r.freightDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${r.freightDifferenceMarginPercent.toFixed(1)}%)`,
      `R$ ${r.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${r.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${r.profitMarginPercent.toFixed(1)}%)`,
      r.hasOcr ? 'Sim (IA)' : 'Estimado'
    ]);

    autoTable(doc, {
      head: [[
        'ID Embarque', 
        'CT-e',
        'Data', 
        'Cliente', 
        'Motorista / Placa', 
        'Frete Empresa (+)', 
        'Frete Motorista (-)', 
        'Dif. Frete', 
        'Despesas (-)', 
        'Lucro Real (=)', 
        'OCR'
      ]],
      body: tableData,
      startY: 26,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      foot: [[
        'TOTAL CONSOLIDADO',
        '---',
        `${totals.totalShipments} emb.`,
        '---',
        '---',
        `R$ ${totals.sumCompanyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${totals.sumDriverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${totals.sumFreightDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${totals.sumExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${totals.sumNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${totals.consolidatedMargin.toFixed(1)}%)`,
        `${totals.countOcr} lidos`
      ]],
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    doc.save(`relatorio_lucro_real_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Exportação para CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      'ID Embarque',
      'CT-e',
      'Data',
      'Status',
      'Cliente',
      'Origem',
      'Destino',
      'Motorista',
      'Placa',
      'Frete Empresa (R$)',
      'Frete Motorista (R$)',
      'Diferenca de Frete (R$)',
      'Margem Frete (%)',
      'Despesas Operacionais (R$)',
      'Lucro Real / Resultado (R$)',
      'Margem Real (%)',
      'Despesas Detalhadas',
      'Processado via OCR'
    ];

    const rows = enrichedRows.map(r => {
      const expenseDesc = r.expenseItems.map(e => `${e.name}: R$ ${e.value}`).join(' | ');
      return [
        r.shipment.id,
        r.cte || '',
        r.shipment.scheduledDate || '',
        r.shipment.status,
        `"${r.clientName.replace(/"/g, '""')}"`,
        `"${(r.cargo?.origin || '').replace(/"/g, '""')}"`,
        `"${(r.cargo?.destination || '').replace(/"/g, '""')}"`,
        `"${r.shipment.driverName.replace(/"/g, '""')}"`,
        r.shipment.horsePlate,
        r.companyFreight.toFixed(2),
        r.driverFreight.toFixed(2),
        r.freightDifference.toFixed(2),
        r.freightDifferenceMarginPercent.toFixed(2),
        r.totalExpenses.toFixed(2),
        r.netProfit.toFixed(2),
        r.profitMarginPercent.toFixed(2),
        `"${expenseDesc.replace(/"/g, '""')}"`,
        r.hasOcr ? 'SIM' : 'NAO'
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lucro_real_embarques_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO RELATÓRIO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Lucro Real da Operação de Embarque
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Detalhamento exato de receitas, despesas operacionais e resultado consolidado de embarques efetivados (com CT-e emitido).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              showFilters || selectedStatus.length > 0 || selectedClients.length > 0 || selectedDrivers.length > 0 || onlyWithOcr
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                : 'bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros Avançados
            {(selectedStatus.length > 0 || selectedClients.length > 0 || selectedDrivers.length > 0 || onlyWithOcr) && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>

          {onBatchUpdateShipments && (
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-xs cursor-pointer"
              title="Lê e atualiza dados de CT-e, Nota Fiscal, MDF-e e Carta Frete em lote"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Sincronizar Documentos
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar CSV / Excel
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* CARDS DE INDICADORES / KPIS NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Frete Empresa Total */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Frete Empresa (+)
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white">
            R$ {totals.sumCompanyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Faturamento bruto dos embarques
          </p>
        </div>

        {/* Frete Motorista Total */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Frete Motoristas (-)
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white">
            R$ {totals.sumDriverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Custo total de frete pago a terceiros
          </p>
        </div>

        {/* Despesas Operacionais Totais */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
              Despesas Operacionais (-)
            </span>
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-mono font-black text-red-600 dark:text-red-400">
            R$ {totals.sumExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Impostos, CPRB, comissões, seguros, etc.
          </p>
        </div>

        {/* Lucro Real Líquido */}
        <div className={`p-4 rounded-2xl border-2 shadow-sm relative overflow-hidden ${
          totals.sumNetProfit >= 0 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60' 
            : 'bg-red-50/80 dark:bg-red-950/20 border-red-300 dark:border-red-700/60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Lucro Real Consolidado (=)
            </span>
            <div className={`p-1.5 rounded-lg ${totals.sumNetProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-lg sm:text-xl font-mono font-black ${totals.sumNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            R$ {totals.sumNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400 mt-1 font-semibold">
            Margem Líquida Real: {totals.consolidatedMargin.toFixed(2)}%
          </p>
        </div>

        {/* Total de Embarques & OCR */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Embarques Filtrados
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white">
            {totals.totalShipments} <span className="text-xs font-normal text-gray-500">embarques</span>
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
            {totals.countOcr} com demonstrativo OCR lido
          </p>
        </div>
      </div>

      {/* BANNER DE REGRAS DE DESPESAS OPERACIONAIS E TRIBUTÁRIAS */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl border border-indigo-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-100">
              Despesas & Encargos Operacionais Configurados para Apuração do Lucro Real
            </p>
            <p className="text-indigo-200/80 text-[11px] mt-0.5">
              Aplicados automaticamente na apuração contábil de cada viagem e discriminados nos detalhes da operação.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10 font-medium">
            🛡️ Seguro Acidente: <strong className="text-white">0,0125% NF</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10 font-medium">
            🔒 Seguro Roubo: <strong className="text-white">0,0125% NF</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10 font-medium">
            🚛 Seguro RCV: <strong className="text-white">R$ 5,00 / carga</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-amber-300 border border-amber-400/20 font-medium">
            🏛️ INSS Patronal: <strong className="text-amber-200">4% Frete PF</strong>
          </span>
        </div>
      </div>

      {/* PAINEL DE FILTROS */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Busca textual */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Busca Rápida
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ID, CT-e, Motorista, Placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Filtro Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Status do Embarque
              </label>
              <MultiSelectDropdown
                options={statusOptions}
                selectedValues={selectedStatus}
                onChange={setSelectedStatus}
                placeholder="Todos os status"
              />
            </div>

            {/* Filtro Cliente */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Cliente
              </label>
              <MultiSelectDropdown
                options={clientOptions}
                selectedValues={selectedClients}
                onChange={setSelectedClients}
                placeholder="Todos os clientes"
              />
            </div>

            {/* Filtro Motorista */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Motorista
              </label>
              <MultiSelectDropdown
                options={driverOptions}
                selectedValues={selectedDrivers}
                onChange={setSelectedDrivers}
                placeholder="Todos os motoristas"
              />
            </div>

            {/* Filtro Filial / Matriz */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Filial / Matriz
              </label>
              <MultiSelectDropdown
                options={branchOptions}
                selectedValues={selectedBranches}
                onChange={setSelectedBranches}
                placeholder="Todas as filiais"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={onlyWithOcr}
                onChange={(e) => setOnlyWithOcr(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded dark:bg-gray-700 dark:border-gray-600"
              />
              Exibir apenas embarques com comprovante OCR processado
            </label>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus([]);
                setSelectedClients([]);
                setSelectedDrivers([]);
                setSelectedBranches([]);
                setOnlyWithOcr(false);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}

      {/* TABELA DETALHADA DE LUCRO REAL */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 font-bold border-b dark:border-gray-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">ID / Data</th>
                <th className="py-3.5 px-4">Cliente / Trajeto</th>
                <th className="py-3.5 px-4">Motorista / Placa</th>
                <th className="py-3.5 px-4 text-right">Frete Empresa (+)</th>
                <th className="py-3.5 px-4 text-right">Frete Motorista (-)</th>
                <th className="py-3.5 px-4 text-right">Dif. Frete</th>
                <th className="py-3.5 px-4 text-center">Despesas Operacionais</th>
                <th className="py-3.5 px-4 text-right">Resultado Final (=)</th>
                <th className="py-3.5 px-4 text-center">Anexo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {enrichedRows.length > 0 ? (
                enrichedRows.map((row) => (
                  <tr key={row.shipment.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                    {/* ID / Data */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          {row.shipment.id}
                        </span>
                        {row.hasOcr && (
                          <span title="Processado via IA Multimodal" className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[9px] font-extrabold">
                            IA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {row.shipment.scheduledDate ? new Date(row.shipment.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR') : '---'}
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {row.shipment.status}
                      </span>
                    </td>

                    {/* Cliente / Trajeto */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <p className="font-semibold text-gray-900 dark:text-white truncate" title={row.clientName}>
                        {row.clientName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={`${row.cargo?.origin || ''} → ${row.cargo?.destination || ''}`}>
                        {row.cargo?.origin || '---'} → {row.cargo?.destination || '---'}
                      </p>
                      {row.cte ? (
                        <span className="inline-block mt-1 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          CT-e nº {row.cte}
                        </span>
                      ) : null}
                    </td>

                    {/* Motorista / Placa */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {row.shipment.driverName}
                      </p>
                      <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                        Placa: {row.shipment.horsePlate}
                      </p>
                    </td>

                    {/* Frete Empresa */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <span className="font-bold text-gray-900 dark:text-white">
                        R$ {row.companyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {row.shipment.realProfitData?.complementCharged ? (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          + R$ {row.shipment.realProfitData.complementCharged.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} compl.
                        </p>
                      ) : null}
                    </td>

                    {/* Frete Motorista */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        R$ {row.driverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Diferença de Frete */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">
                        R$ {row.freightDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        {row.freightDifferenceMarginPercent.toFixed(1)}%
                      </span>
                    </td>

                    {/* Despesas Operacionais */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {row.totalExpenses > 0 || row.expenseItems.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-red-600 dark:text-red-400">
                            - R$ {row.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedShipmentForDetail(row.shipment)}
                            className="mt-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" />
                            Ver {row.expenseItems.length} despesa(s)
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">R$ 0,00</span>
                      )}
                    </td>

                    {/* Resultado Final (Lucro Real da Operação) */}
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${
                          row.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          R$ {row.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded mt-0.5 ${
                          row.netProfit >= 0 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        }`}>
                          {row.profitMarginPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    {/* Acesso ao Anexo e Ação de Correção */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => openDocumentInNewTab(row.attachmentUrl!, `Resumo Custos - ${row.shipment.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                            title="Visualizar Comprovante / Imagem Original"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ver</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[10px] hidden sm:inline mr-1">Sem anexo</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingShipmentForAttachment(row.shipment)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                          title="Anexar ou corrigir imagem do resumo de custos e recalcular o Lucro Real"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{row.hasOcr ? 'Editar' : 'Anexar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum embarque encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>

            {/* RODAPÉ COM TOTALIZADORES */}
            {enrichedRows.length > 0 && (
              <tfoot className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td className="py-3.5 px-4 font-mono font-black uppercase text-xs" colSpan={3}>
                    Total Consolidado ({totals.totalShipments} embarques)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-blue-700 dark:text-blue-300">
                    R$ {totals.sumCompanyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-amber-700 dark:text-amber-300">
                    R$ {totals.sumDriverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-indigo-700 dark:text-indigo-300">
                    R$ {totals.sumFreightDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <p className="text-[10px] font-normal">{totals.consolidatedFreightDiffMargin.toFixed(1)}%</p>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-red-600 dark:text-red-400">
                    - R$ {totals.sumExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs">
                    <span className={`text-sm font-black ${
                      totals.sumNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      R$ {totals.sumNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className={`text-[10px] font-extrabold ${
                      totals.sumNetProfit >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'
                    }`}>
                      Margem: {totals.consolidatedMargin.toFixed(2)}%
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-gray-500">
                    {totals.countOcr} IA
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHAMENTO DE DESPESAS DA OPERAÇÃO - AUTOMATIZAÇÃO DO CT-E */}
      {selectedShipmentForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Automatização do CT-e & Lucro Real - Embarque {selectedShipmentForDetail.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShipmentForDetail(null)}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const detailRow = enrichedRows.find(r => r.shipment.id === selectedShipmentForDetail.id);
              const cargo = detailRow?.cargo;
              const tonnage = selectedShipmentForDetail.shipmentTonnage || cargo?.totalVolume || 0;

              return (
                <div className="p-4 sm:p-5 overflow-y-auto">
                  <CteCostAutomationPanel
                    shipment={selectedShipmentForDetail}
                    cargo={cargo}
                    loadedTonnage={tonnage}
                  />
                </div>
              );
            })()}

            <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t dark:border-gray-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedShipmentForDetail(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ATUALIZAÇÃO / ANEXO DE RESUMO DE CUSTOS */}
      {editingShipmentForAttachment && currentUser && (
        <AttachmentModal
          isOpen={Boolean(editingShipmentForAttachment)}
          onClose={() => setEditingShipmentForAttachment(null)}
          onSave={async (data) => {
            if (onUpdateAttachment && editingShipmentForAttachment) {
              await onUpdateAttachment(editingShipmentForAttachment.id, data);
            }
            setEditingShipmentForAttachment(null);
          }}
          shipment={editingShipmentForAttachment}
          cargo={cargoMap.get(editingShipmentForAttachment.cargoId)}
          documentName="Comprovante de Pagamento de Saldo"
          currentUser={currentUser}
          products={products}
          clients={clients}
          users={users}
        />
      )}

      {/* MODAL DE SINCRONIZAÇÃO EM LOTE DE DOCUMENTOS */}
      {isSyncModalOpen && onBatchUpdateShipments && (
        <SyncDocumentsModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          shipments={shipments}
          onBatchUpdateShipments={onBatchUpdateShipments}
        />
      )}
    </div>
  );
};

export default RealProfitReport;
