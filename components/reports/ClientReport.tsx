import React, { useState, useMemo } from 'react';
import type { Shipment, Cargo, Client } from '../../types';
import { ShipmentStatus } from '../../types';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { PackageIcon } from '../icons/PackageIcon';
import { StayRecord } from '../../utils/toolStorage';
import { Download, List, X, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MultiSelectDropdown from '../MultiSelectDropdown';

interface ClientReportProps {
  shipments: Shipment[];
  cargos: Cargo[];
  clients: Client[];
  stays?: StayRecord[];
  companyLogo?: string | null;
}

interface ClientStats {
  id: string;
  name: string;
  totalTonnage: number;
  grossBilled: number;
  profitMargin: number;
  totalShipments: number;
  profitMarginPercentage: number;
}

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactElement, formatAsCurrency?: boolean }> = ({ title, value, icon, formatAsCurrency=false }) => {
    const displayValue = formatAsCurrency && typeof value === 'number'
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : value;

    return (
        <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {icon}
            <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{displayValue}</p>
            </div>
        </div>
    );
};


const ClientReport: React.FC<ClientReportProps> = ({ shipments, cargos, clients, stays = [], companyLogo }) => {
  const [showListModal, setShowListModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | 'ALL'>('ALL');
  const [filterModalStatus, setFilterModalStatus] = useState<string[]>([]);
  const [filterModalOrigin, setFilterModalOrigin] = useState<string[]>([]);
  const [filterModalDest, setFilterModalDest] = useState<string[]>([]);
  const [filterModalDriver, setFilterModalDriver] = useState<string[]>([]);
  const [showModalFilters, setShowModalFilters] = useState(false);

  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);

  const clientStats = useMemo<ClientStats[]>(() => {
    const statsMap = new Map<string, { totalTonnage: number, grossBilled: number, profitMargin: number, totalShipments: number }>();

    clients.forEach(client => {
      statsMap.set(client.id, { totalTonnage: 0, grossBilled: 0, profitMargin: 0, totalShipments: 0 });
    });

    const effectiveStatuses = [
        ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoAdiantamento,
        ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga,
        ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
    ];

    const effectiveShipments = shipments.filter(s => effectiveStatuses.includes(s.status));

    effectiveShipments.forEach(shipment => {
      const cargo = cargoMap.get(shipment.cargoId);
      if (!cargo) return;

      const clientStat = statsMap.get(cargo.clientId);
      if (!clientStat) return;

      clientStat.totalTonnage += shipment.shipmentTonnage;
      clientStat.totalShipments += 1;
      
      const grossRate = shipment.companyFreightRateSnapshot || cargo.companyFreightValuePerTon;
      const grossValue = grossRate * shipment.shipmentTonnage;
      clientStat.grossBilled += grossValue;

      const icmsValue = cargo.hasIcms ? grossValue * (cargo.icmsPercentage / 100) : 0;
      const netValue = grossValue - icmsValue;
      const commissionRate = cargo.salespersonCommissionPerTon || 0;
      
      const demurrageProfit = stays
          .filter(stay => stay.shipmentId === shipment.id)
          .reduce((sum, stay) => sum + ((stay.approvedValue || 0) - (stay.driverPaidValue || 0)), 0);

      const profit = netValue - shipment.driverFreightValue - (commissionRate * shipment.shipmentTonnage) + demurrageProfit;
      clientStat.profitMargin += profit;
    });

    return Array.from(statsMap.entries())
      .map(([clientId, stats]) => ({
        id: clientId,
        name: clients.find(c => c.id === clientId)?.nomeFantasia || 'N/A',
        ...stats,
        profitMarginPercentage: stats.grossBilled > 0 ? (stats.profitMargin / stats.grossBilled) * 100 : 0
      }))
      .filter(stat => stat.grossBilled > 0) 
      .sort((a, b) => b.grossBilled - a.grossBilled); 
  }, [shipments, cargos, clients, stays, cargoMap]);

  const getShipmentsForPdfAndList = (clientId?: string) => {
      if (clientId && clientId !== 'ALL') {
          return shipments.filter(s => cargoMap.get(s.cargoId)?.clientId === clientId);
      }
      return shipments;
  };

  const baseModalShipments = useMemo(() => {
      if (selectedClientId && selectedClientId !== 'ALL') {
          return shipments.filter(s => cargoMap.get(s.cargoId)?.clientId === selectedClientId);
      }
      return shipments;
  }, [shipments, selectedClientId, cargoMap]);

  const modalStatusOptions = useMemo(() => Array.from(new Set(baseModalShipments.map(s => s.status))).filter(Boolean).sort(), [baseModalShipments]);
  const modalOriginOptions = useMemo(() => Array.from(new Set(baseModalShipments.map(s => cargoMap.get(s.cargoId)?.origin || ''))).filter(Boolean).sort(), [baseModalShipments, cargoMap]);
  const modalDestOptions = useMemo(() => Array.from(new Set(baseModalShipments.map(s => cargoMap.get(s.cargoId)?.destination || ''))).filter(Boolean).sort(), [baseModalShipments, cargoMap]);
  const modalDriverOptions = useMemo(() => Array.from(new Set(baseModalShipments.map(s => s.driverName))).filter(Boolean).sort(), [baseModalShipments]);

  const filteredModalShipments = useMemo(() => {
      return baseModalShipments.filter(shipment => {
          const cargo = cargoMap.get(shipment.cargoId);
          if (filterModalStatus.length > 0 && !filterModalStatus.includes(shipment.status)) return false;
          if (filterModalOrigin.length > 0 && !filterModalOrigin.includes(cargo?.origin || '')) return false;
          if (filterModalDest.length > 0 && !filterModalDest.includes(cargo?.destination || '')) return false;
          if (filterModalDriver.length > 0 && !filterModalDriver.includes(shipment.driverName)) return false;
          return true;
      });
  }, [baseModalShipments, filterModalStatus, filterModalOrigin, filterModalDest, filterModalDriver, cargoMap]);

  const activeModalFiltersCount = filterModalStatus.length + filterModalOrigin.length + filterModalDest.length + filterModalDriver.length;

  const clearModalFilters = () => {
      setFilterModalStatus([]);
      setFilterModalOrigin([]);
      setFilterModalDest([]);
      setFilterModalDriver([]);
  };

  const generatePDFFromModal = () => {
      const clientName = selectedClientId === 'ALL'
          ? 'Geral'
          : clients.find(c => c.id === selectedClientId)?.nomeFantasia || 'Cliente';

      const filterDesc: string[] = [];
      if (filterModalStatus.length > 0) filterDesc.push(`Status: ${filterModalStatus.join(', ')}`);
      if (filterModalDriver.length > 0) filterDesc.push(`Motorista: ${filterModalDriver.join(', ')}`);
      if (filterModalOrigin.length > 0) filterDesc.push(`Origem: ${filterModalOrigin.join(', ')}`);
      if (filterModalDest.length > 0) filterDesc.push(`Destino: ${filterModalDest.join(', ')}`);

      const doc = new jsPDF('landscape');

      if (companyLogo) {
          try {
              const pageWidth = doc.internal.pageSize.getWidth();
              doc.addImage(companyLogo, 'PNG', pageWidth - 14 - 35, 5, 35, 15);
          } catch (e) {
              console.warn("Could not add company logo to PDF", e);
          }
      }

      doc.setFontSize(16);
      doc.text(`Listagem de Embarques - Cliente: ${clientName}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);
      if (filterDesc.length > 0) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`Filtros: ${filterDesc.join(' | ')}`, 14, 28);
          doc.setTextColor(0);
      }

      const startY = filterDesc.length > 0 ? 34 : 28;
      const tableColumn = ["ID", "Início", "Fim", "Cliente", "Motorista", "Placa", "Origem", "Destino", "Frete Emp/Ton", "Frete Mot/Ton", "Peso Carregado", "Peso Destino", "Quebra", "Status"];
      const tableRows: any[] = [];

      let totalFreteEmpresa = 0;
      let totalFreteMotorista = 0;
      let totalPesoCarregado = 0;
      let totalPesoDestino = 0;

      const shipmentsForPdf = filteredModalShipments.filter(s => s.status === ShipmentStatus.Finalizado);

      shipmentsForPdf.forEach(shipment => {
          const cargo = cargoMap.get(shipment.cargoId);
          const origem = cargo?.origin || 'N/A';
          const destino = cargo?.destination || 'N/A';
          const cliente = clients.find(c => c.id === cargo?.clientId)?.nomeFantasia || 'N/A';

          const dataInicio = new Date(shipment.createdAt).toLocaleDateString('pt-BR');
          const statusFinalizado = shipment.statusHistory?.find(h => h.status === ShipmentStatus.Finalizado);
          const dataFim = statusFinalizado ? new Date(statusFinalizado.timestamp).toLocaleDateString('pt-BR') : '-';

          const freteEmpresa = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
          const freteMotorista = shipment.driverFreightRateSnapshot || (shipment.driverFreightValue / (shipment.shipmentTonnage || 1));

          const pesoOrigem = shipment.shipmentTonnage || 0;
          const pesoDestino = shipment.unloadedTonnage;

          let quebra = '-';
          if (pesoDestino !== undefined && pesoDestino < pesoOrigem) {
              quebra = (pesoOrigem - pesoDestino).toFixed(2) + ' t';
          }
          
          totalFreteEmpresa += freteEmpresa * pesoOrigem;
          totalFreteMotorista += shipment.driverFreightValue;
          totalPesoCarregado += pesoOrigem;
          if (pesoDestino !== undefined) {
              totalPesoDestino += pesoDestino;
          }

          const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

          tableRows.push([
              shipment.id,
              dataInicio,
              dataFim,
              cliente,
              shipment.driverName,
              shipment.horsePlate || '-',
              origem,
              destino,
              fmt(freteEmpresa),
              fmt(freteMotorista),
              pesoOrigem.toFixed(2) + ' t',
              pesoDestino !== undefined ? pesoDestino.toFixed(2) + ' t' : '-',
              quebra,
              shipment.status
          ]);
      });

      const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
      
      tableRows.push([
          "TOTAIS", "-", "-", "-", "-", `Embarques: ${shipmentsForPdf.length}`, "-", "-",
          fmt(totalFreteEmpresa),
          fmt(totalFreteMotorista),
          totalPesoCarregado.toFixed(2) + ' t',
          totalPesoDestino > 0 ? totalPesoDestino.toFixed(2) + ' t' : '-',
          "-", "-"
      ]);

      tableRows.push([
          "LÍQUIDO", "-", "-", "-", "-", "-", "-", "-",
          fmt(totalFreteEmpresa - totalFreteMotorista),
          "-", "-", "-", "-", "-"
      ]);

      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY,
          theme: 'grid',
          styles: { fontSize: 7.5 },
          headStyles: { fillColor: [29, 59, 141], textColor: 255 },
          didParseCell: (data) => {
              if (data.cell.section === 'body') {
                  const rawRow = data.row.raw;
                  if (Array.isArray(rawRow)) {
                      if (rawRow[0] === 'TOTAIS' || rawRow[0] === 'TOTAL') {
                          data.cell.styles.fillColor = [240, 240, 240];
                          data.cell.styles.fontStyle = 'bold';
                          data.cell.styles.textColor = [0, 0, 0];
                      } else if (rawRow[0] === 'LÍQUIDO') {
                          data.cell.styles.fillColor = [220, 245, 220];
                          data.cell.styles.fontStyle = 'bold';
                          data.cell.styles.textColor = [0, 102, 0];
                      }
                  }
              }
          }
      });

      const suffix = activeModalFiltersCount > 0 ? '_filtrado' : '';
      doc.save(`Listagem_Cliente_${clientName.replace(/\s+/g, '_')}${suffix}_${new Date().getTime()}.pdf`);
  };

  const generatePDF = (clientId?: string) => {
      const targetShipments = getShipmentsForPdfAndList(clientId).filter(s => s.status === ShipmentStatus.Finalizado);
      const clientName = clientId && clientId !== 'ALL' 
          ? clients.find(c => c.id === clientId)?.nomeFantasia 
          : 'Geral';

      const doc = new jsPDF('landscape');
      
      if (companyLogo) {
          try {
              const pageWidth = doc.internal.pageSize.getWidth();
              doc.addImage(companyLogo, 'PNG', pageWidth - 14 - 35, 5, 35, 15);
          } catch (e) {
              console.warn("Could not add company logo to PDF", e);
          }
      }
      
      doc.setFontSize(16);
      doc.text(`Relatório de Embarques Finalizados - Cliente: ${clientName || 'Todos'}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

      const tableColumn = ["ID", "Início", "Fim", "Cliente", "Motorista", "Placa", "Origem", "Destino", "Frete Emp/Ton", "Frete Mot/Ton", "Peso Carregado", "Peso Destino", "Quebra"];
      const tableRows: any[] = [];

      let totalFreteEmpresa = 0;
      let totalFreteMotorista = 0;
      let totalPesoCarregado = 0;
      let totalPesoDestino = 0;

      targetShipments.forEach(shipment => {
          const cargo = cargoMap.get(shipment.cargoId);
          const origem = cargo?.origin || 'N/A';
          const destino = cargo?.destination || 'N/A';
          const cliente = clients.find(c => c.id === cargo?.clientId)?.nomeFantasia || 'N/A';
          
          const dataInicio = new Date(shipment.createdAt).toLocaleDateString('pt-BR');
          const statusFinalizado = shipment.statusHistory?.find(h => h.status === ShipmentStatus.Finalizado);
          const dataFim = statusFinalizado ? new Date(statusFinalizado.timestamp).toLocaleDateString('pt-BR') : '-';
          
          const freteEmpresa = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
          const freteMotorista = shipment.driverFreightRateSnapshot || (shipment.driverFreightValue / (shipment.shipmentTonnage || 1));
          
          const pesoOrigem = shipment.shipmentTonnage || 0;
          const pesoDestino = shipment.unloadedTonnage;
          
          let quebra = '-';
          if (pesoDestino !== undefined && pesoDestino < pesoOrigem) {
              quebra = (pesoOrigem - pesoDestino).toFixed(2) + ' t';
          }
          
          totalFreteEmpresa += freteEmpresa * pesoOrigem;
          totalFreteMotorista += shipment.driverFreightValue;
          totalPesoCarregado += pesoOrigem;
          if (pesoDestino !== undefined) {
              totalPesoDestino += pesoDestino;
          }

          const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

          const rowData = [
              shipment.id,
              dataInicio,
              dataFim,
              cliente,
              shipment.driverName,
              shipment.horsePlate || '-',
              origem,
              destino,
              formatCurrency(freteEmpresa),
              formatCurrency(freteMotorista),
              pesoOrigem.toFixed(2) + ' t',
              pesoDestino !== undefined ? pesoDestino.toFixed(2) + ' t' : '-',
              quebra
          ];
          tableRows.push(rowData);
      });

      const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

      tableRows.push([
          "TOTAIS", "-", "-", "-", "-", `Embarques: ${targetShipments.length}`, "-", "-",
          formatCurrency(totalFreteEmpresa),
          formatCurrency(totalFreteMotorista),
          totalPesoCarregado.toFixed(2) + ' t',
          totalPesoDestino > 0 ? totalPesoDestino.toFixed(2) + ' t' : '-',
          "-"
      ]);

      tableRows.push([
          "LÍQUIDO", "-", "-", "-", "-", "-", "-", "-",
          formatCurrency(totalFreteEmpresa - totalFreteMotorista),
          "-", "-", "-", "-"
      ]);

      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 28,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [29, 59, 141], textColor: 255 },
          didParseCell: (data) => {
              if (data.cell.section === 'body') {
                  const rawRow = data.row.raw;
                  if (Array.isArray(rawRow)) {
                      if (rawRow[0] === 'TOTAIS' || rawRow[0] === 'TOTAL') {
                          data.cell.styles.fillColor = [240, 240, 240];
                          data.cell.styles.fontStyle = 'bold';
                          data.cell.styles.textColor = [0, 0, 0];
                      } else if (rawRow[0] === 'LÍQUIDO') {
                          data.cell.styles.fillColor = [220, 245, 220];
                          data.cell.styles.fontStyle = 'bold';
                          data.cell.styles.textColor = [0, 102, 0];
                      }
                  }
              }
          }
      });

      doc.save(`Relatorio_Embarques_Cliente_${clientName?.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
  };

  const openListModal = (clientId: string) => {
      setSelectedClientId(clientId);
      clearModalFilters();
      setShowModalFilters(false);
      setShowListModal(true);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Desempenho por Cliente</h2>
          <div className="flex gap-2">
              <button 
                  onClick={() => generatePDF('ALL')}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
              >
                  <Download className="w-4 h-4" /> Baixar PDF Geral
              </button>
              <button 
                  onClick={() => openListModal('ALL')}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
              >
                  <List className="w-4 h-4" /> Listagem Geral
              </button>
          </div>
      </div>

      {clientStats.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
            Nenhum dado de cliente encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-6">
          {clientStats.map(stats => (
            <div key={stats.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <h3 className="text-xl font-bold text-primary dark:text-blue-400">{stats.name}</h3>
                  <div className="flex gap-2">
                      <button 
                          onClick={() => generatePDF(stats.id)}
                          className="flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-md font-medium transition-colors text-xs border border-red-200 dark:border-red-800"
                      >
                          <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button 
                          onClick={() => openListModal(stats.id)}
                          className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-md font-medium transition-colors text-xs border border-blue-200 dark:border-blue-800"
                      >
                          <List className="w-3.5 h-3.5" /> Listagem
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total de Embarques" value={stats.totalShipments} icon={<PackageIcon className="w-8 h-8 text-blue-500"/>} />
                <StatCard title="Volume Total" value={`${stats.totalTonnage.toLocaleString('pt-BR')} ton`} icon={<PackageIcon className="w-8 h-8 text-gray-500"/>} />
                <StatCard title="Faturamento Bruto" value={stats.grossBilled} icon={<DollarSignIcon className="w-8 h-8 text-blue-500"/>} formatAsCurrency />
                <StatCard title="Lucro Operacional Efetivado" value={stats.profitMargin} icon={<DollarSignIcon className="w-8 h-8 text-blue-400"/>} formatAsCurrency />
                <StatCard title="Margem de Lucro" value={`${stats.profitMarginPercentage.toFixed(2)}%`} icon={<DollarSignIcon className="w-8 h-8 text-green-500"/>} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              Listagem de Embarques
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedClientId === 'ALL' ? 'Todos os Clientes' : `Cliente: ${clients.find(c => c.id === selectedClientId)?.nomeFantasia}`}
                          </p>
                      </div>
                      <div className="flex items-center gap-2">
                          <button
                              onClick={generatePDFFromModal}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800"
                              title={activeModalFiltersCount > 0 ? 'Baixar PDF com filtros aplicados' : 'Baixar PDF completo'}
                          >
                              <Download className="w-4 h-4" />
                              PDF {activeModalFiltersCount > 0 && <span className="ml-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{filteredModalShipments.length}</span>}
                          </button>
                          <button 
                              onClick={() => setShowModalFilters(!showModalFilters)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${showModalFilters || activeModalFiltersCount > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                          >
                              <Filter className="w-4 h-4" /> Filtros {activeModalFiltersCount > 0 && `(${activeModalFiltersCount})`}
                          </button>
                          <button
                              onClick={() => setShowListModal(false)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
                  {showModalFilters && (
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <MultiSelectDropdown label="Status" options={modalStatusOptions} selectedValues={filterModalStatus} onChange={setFilterModalStatus} placeholder="Todos..." />
                              <MultiSelectDropdown label="Motorista" options={modalDriverOptions} selectedValues={filterModalDriver} onChange={setFilterModalDriver} placeholder="Todos..." />
                              <MultiSelectDropdown label="Origem" options={modalOriginOptions} selectedValues={filterModalOrigin} onChange={setFilterModalOrigin} placeholder="Todas..." />
                              <MultiSelectDropdown label="Destino" options={modalDestOptions} selectedValues={filterModalDest} onChange={setFilterModalDest} placeholder="Todos..." />
                          </div>
                          {activeModalFiltersCount > 0 && (
                              <div className="mt-3 flex justify-end">
                                  <button onClick={clearModalFilters} className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400">
                                      <X className="w-3.5 h-3.5" /> Limpar Filtros
                                  </button>
                              </div>
                          )}
                      </div>
                  )}
                  <div className="p-0 overflow-auto flex-1">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 shadow-sm">
                              <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID / Motorista</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Datas (Início/Fim)</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placa</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rota (Origem → Destino)</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valores (/Ton)</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pesos (Orig. / Dest.)</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredModalShipments.map((shipment) => {
                                  const cargo = cargoMap.get(shipment.cargoId);
                                  const origem = cargo?.origin || 'N/A';
                                  const destino = cargo?.destination || 'N/A';
                                  const clienteNome = clients.find(c => c.id === cargo?.clientId)?.nomeFantasia || '-';
                                  
                                  const dataInicio = new Date(shipment.createdAt).toLocaleDateString('pt-BR');
                                  const statusFinalizado = shipment.statusHistory?.find(h => h.status === ShipmentStatus.Finalizado);
                                  const dataFim = statusFinalizado ? new Date(statusFinalizado.timestamp).toLocaleDateString('pt-BR') : '-';
                                  
                                  const freteEmpresa = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
                                  const freteMotorista = shipment.driverFreightRateSnapshot || (shipment.driverFreightValue / (shipment.shipmentTonnage || 1));
                                  
                                  const pesoOrigem = shipment.shipmentTonnage || 0;
                                  const pesoDestino = shipment.unloadedTonnage;
                                  let quebra = null;
                                  if (pesoDestino !== undefined && pesoDestino < pesoOrigem) {
                                      quebra = (pesoOrigem - pesoDestino).toFixed(2);
                                  }

                                  return (
                                      <tr key={shipment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="text-sm font-bold text-gray-900 dark:text-white">{shipment.id}</div>
                                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{shipment.driverName}</div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex flex-col gap-1 text-sm">
                                                  <div className="flex items-center gap-1">
                                                      <span className="text-gray-500 dark:text-gray-400">Início:</span>
                                                      <span className="font-medium text-gray-900 dark:text-gray-200">{dataInicio}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                      <span className="text-gray-500 dark:text-gray-400">Fim:</span>
                                                      <span className="font-medium text-gray-900 dark:text-gray-200">{dataFim}</span>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                                  {shipment.horsePlate || '-'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{clienteNome}</span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex flex-col gap-1 text-sm">
                                                  <span className="font-medium text-gray-900 dark:text-white">{origem}</span>
                                                  <span className="text-gray-400 text-xs">para</span>
                                                  <span className="font-medium text-gray-900 dark:text-white">{destino}</span>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex flex-col gap-1 text-sm">
                                                  <div className="flex justify-between w-40">
                                                      <span className="text-gray-500 dark:text-gray-400">Empresa:</span>
                                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteEmpresa)}
                                                      </span>
                                                  </div>
                                                  <div className="flex justify-between w-40">
                                                      <span className="text-gray-500 dark:text-gray-400">Motorista:</span>
                                                      <span className="font-medium text-gray-900 dark:text-gray-200">
                                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteMotorista)}
                                                      </span>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex flex-col gap-1 text-sm">
                                                  <div className="flex justify-between w-32">
                                                      <span className="text-gray-500 dark:text-gray-400">Origem:</span>
                                                      <span className="font-medium text-gray-900 dark:text-gray-200">{pesoOrigem.toFixed(2)} t</span>
                                                  </div>
                                                  <div className="flex justify-between w-32">
                                                      <span className="text-gray-500 dark:text-gray-400">Destino:</span>
                                                      <span className="font-medium text-gray-900 dark:text-gray-200">{pesoDestino !== undefined ? `${pesoDestino.toFixed(2)} t` : '-'}</span>
                                                  </div>
                                                  {quebra && (
                                                      <div className="flex justify-between w-32 mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                                                          <span className="text-red-500 dark:text-red-400 font-medium text-xs">Quebra:</span>
                                                          <span className="text-red-600 dark:text-red-400 font-bold text-xs">{quebra} t</span>
                                                      </div>
                                                  )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>
                                                  {shipment.status}
                                              </span>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                      {filteredModalShipments.length === 0 && (
                          <div className="text-center py-12">
                              <p className="text-gray-500 dark:text-gray-400">Nenhum embarque encontrado com os filtros atuais.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ClientReport;
