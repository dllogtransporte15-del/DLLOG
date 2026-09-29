import React, { useState, useMemo } from 'react';
import type { ShipmentControlItem } from '../../utils/financialCalculations';
import { Search, Download, Filter, ArrowUpDown, Truck, FileSpreadsheet } from 'lucide-react';

interface ControlShipmentsTabProps {
  items: ShipmentControlItem[];
}

export const ControlShipmentsTab: React.FC<ControlShipmentsTabProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.cteNumber && item.cteNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.horsePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  // Totals
  const totalCompany = filteredItems.reduce((s, i) => s + i.companyFreightTotal, 0);
  const totalDriver = filteredItems.reduce((s, i) => s + i.driverFreightTotal, 0);
  const totalMargin = filteredItems.reduce((s, i) => s + i.grossMargin, 0);
  const totalTonnage = filteredItems.reduce((s, i) => s + i.tonnage, 0);
  const overallMarginPercent = totalCompany > 0 ? (totalMargin / totalCompany) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleExportCsv = () => {
    const headers = [
      'Embarque', 'CT-e', 'Data', 'Origem', 'Destino', 'Cliente', 
      'Motorista', 'Placa', 'Toneladas', 'Frete Empresa (R$)', 
      'Frete Motorista (R$)', 'Pedágio (R$)', 'Adiantamento (R$)', 
      'Saldo (R$)', 'Margem (R$)', 'Margem (%)', 'Status'
    ];

    const rows = filteredItems.map(i => [
      i.shipmentId,
      i.cteNumber || '',
      i.scheduledDate,
      `"${i.origin}"`,
      `"${i.destination}"`,
      `"${i.clientName}"`,
      `"${i.driverName}"`,
      i.horsePlate,
      i.tonnage.toFixed(2),
      i.companyFreightTotal.toFixed(2),
      i.driverFreightTotal.toFixed(2),
      i.tollValue.toFixed(2),
      i.advanceValue.toFixed(2),
      i.balanceValue.toFixed(2),
      i.grossMargin.toFixed(2),
      i.grossMarginPercent.toFixed(1),
      i.status
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planilha_controladoria_embarques_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Frete Faturado (Empresa)</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalCompany)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {filteredItems.length} viagens • {totalTonnage.toFixed(1)} ton
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Custo Frete Motoristas</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalDriver)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {totalCompany > 0 ? ((totalDriver / totalCompany) * 100).toFixed(1) : 0}% da receita
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Margem Retida Bruta</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalMargin)}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            Margem de {overallMarginPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Exportação</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">Planilha Completa</div>
            <span className="text-xs text-slate-500 block mt-0.5">Formato CSV / Excel</span>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por embarque, CT-e, cliente, motorista, placa, rota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="3 - Ag. Carregamento">Ag. Carregamento</option>
            <option value="4 - Em Viagem">Em Viagem</option>
            <option value="5 - Ag. Descarga">Ag. Descarga</option>
            <option value="6 - Concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Main Control Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Embarque / CT-e</th>
                <th className="px-4 py-3.5">Data</th>
                <th className="px-4 py-3.5">Rota (Origem x Destino)</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Motorista / Placa</th>
                <th className="px-4 py-3.5 text-right">Peso</th>
                <th className="px-4 py-3.5 text-right">Frete Empresa</th>
                <th className="px-4 py-3.5 text-right">Frete Motorista</th>
                <th className="px-4 py-3.5 text-right">Pedágio</th>
                <th className="px-4 py-3.5 text-right">Margem (R$)</th>
                <th className="px-4 py-3.5 text-right">Margem (%)</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                    Nenhum embarque localizado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.shipmentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 dark:text-white block font-mono">{item.shipmentId}</span>
                      {item.cteNumber && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">CT-e: {item.cteNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                      {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="font-semibold truncate max-w-[180px]">{item.origin} → {item.destination}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      {item.clientName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[140px]">{item.driverName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.horsePlate}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {item.tonnage.toFixed(2)} ton
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.companyFreightTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.driverFreightTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      {item.tollValue > 0 ? formatCurrency(item.tollValue) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-black ${
                      item.grossMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}>
                      {formatCurrency(item.grossMargin)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        item.grossMarginPercent >= 15 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        item.grossMarginPercent > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {item.grossMarginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
