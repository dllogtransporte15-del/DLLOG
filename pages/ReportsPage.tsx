import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import type { Shipment, User, Cargo, Client } from '../types';
import { UserProfile, ShipmentStatus } from '../types';
import { BriefcaseIcon } from '../components/icons/BriefcaseIcon';
import { ShipIcon } from '../components/icons/ShipIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import { Filter, X, Calendar, DollarSign, Package, CheckCircle } from 'lucide-react';
import SalespersonReport from '../components/reports/SalespersonReport';
import SupervisorReport from '../components/reports/SupervisorReport';
import ShipperReport from '../components/reports/ShipperReport';
import ClientReport from '../components/reports/ClientReport';
import OperationalTimingReport from '../components/reports/OperationalTimingReport';
import ExternalSalespersonReport from '../components/reports/ExternalSalespersonReport';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

interface ReportsPageProps {
  shipments: Shipment[];
  embarcadores: User[];
  cargos: Cargo[];
  users: User[];
  currentUser: User | null;
  clients: Client[];
}

type ActiveReport = 'comercial' | 'embarcadores' | 'clientes' | 'vendedores' | 'tempo-operacao';

const ReportsPage: React.FC<ReportsPageProps> = ({ shipments, embarcadores, cargos, users, currentUser, clients }) => {
  const [activeReport, setActiveReport] = useState<ActiveReport>('comercial');
  
  // Date range defaults to current month
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterOrigin, setFilterOrigin] = useState<string[]>([]);
  const [filterDest, setFilterDest] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  
  const statusOptions = Object.values(ShipmentStatus);
  const clientOptions = Array.from(new Set(cargos.map(c => clients.find(cl => cl.id === c.clientId)?.nomeFantasia || 'N/A'))).filter(Boolean).sort();
  const originOptions = Array.from(new Set(cargos.map(c => c.origin))).filter(Boolean).sort();
  const destOptions = Array.from(new Set(cargos.map(c => c.destination))).filter(Boolean).sort();

  const getEffectiveDate = (s: Shipment) => {
    const effectiveStatuses = [
      ShipmentStatus.AguardandoNota,
      ShipmentStatus.AguardandoAdiantamento,
      ShipmentStatus.AguardandoAgendamento,
      ShipmentStatus.AguardandoDescarga,
      ShipmentStatus.AguardandoPagamentoSaldo,
      ShipmentStatus.Finalizado
    ];
    
    // Find the earliest entry in status history that matches any of these effective statuses
    const effectiveEntry = s.statusHistory?.find(h => effectiveStatuses.includes(h.status));
    
    // If not loaded yet, fallback to scheduledDate so it appears in "Programado" totals for the month.
    return effectiveEntry ? effectiveEntry.timestamp.substring(0, 10) : s.scheduledDate;
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
       // Filter by effective date (the moment it was loaded/became effective)
       const effDate = getEffectiveDate(s);
       if (!effDate) return false; // Not effective yet

       if (effDate < startDate || effDate > endDate) return false;

       if (filterStatus.length > 0 && !filterStatus.includes(s.status)) return false;

       const cargo = cargoMap.get(s.cargoId);
       if (!cargo) return false;

       if (filterClient.length > 0) {
           const clientName = clients.find(cl => cl.id === cargo.clientId)?.nomeFantasia || 'N/A';
           if (!filterClient.includes(clientName)) return false;
       }

       if (filterOrigin.length > 0 && !filterOrigin.includes(cargo.origin)) return false;
       if (filterDest.length > 0 && !filterDest.includes(cargo.destination)) return false;

       return true;
    });
  }, [shipments, startDate, endDate, filterStatus, filterClient, filterOrigin, filterDest, cargoMap, clients]);

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // Month index starts at 0, so 1 is Jan, 2 is Feb, etc.
    const currentMonthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const currentYearStr = String(now.getFullYear());
    const monthYearPrefix = `${currentYearStr}-${currentMonthStr}`; // YYYY-MM

    let totalProgramado = 0;
    let totalEfetivado = 0;

    const effectiveForwardStatuses = [
      ShipmentStatus.AguardandoNota,
      ShipmentStatus.AguardandoAdiantamento,
      ShipmentStatus.AguardandoAgendamento,
      ShipmentStatus.AguardandoDescarga,
      ShipmentStatus.AguardandoPagamentoSaldo,
      ShipmentStatus.Finalizado
    ];

    shipments.forEach(s => {
      // Filter by scheduledDate (YYYY-MM-DD) for consistency
      if (s.scheduledDate.startsWith(monthYearPrefix) && s.status !== ShipmentStatus.Cancelado) {
        totalProgramado += s.shipmentTonnage || 0;
        
        if (effectiveForwardStatuses.includes(s.status)) {
          totalEfetivado += s.shipmentTonnage || 0;
        }
      }
    });

    return { totalProgramado, totalEfetivado };
  }, [shipments]);

  const kpis = useMemo(() => {
    let grossBilled = 0;
    let netBilled = 0;
    let profitMargin = 0; // This will now represent "Líquido Programado" (Ag. Seguradora onwards)
    let totalProfitMargin = 0; // This will represent "Margem de Lucro Total" (Ag. Nota onwards)

    const profitMarginStatuses = [
        ShipmentStatus.AguardandoSeguradora,
        ShipmentStatus.PreCadastro,
        ShipmentStatus.AguardandoCarregamento,
        ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoAdiantamento,
        ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga,
        ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
    ];

    const totalProfitMarginStatuses = [
        ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoAdiantamento,
        ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga,
        ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
    ];

    filteredShipments.forEach(s => {
       const cargo = cargoMap.get(s.cargoId);
       if (!cargo) return;

       if (profitMarginStatuses.includes(s.status)) {
           const grossRate = s.companyFreightRateSnapshot || cargo.companyFreightValuePerTon;
           const driverRate = s.driverFreightRateSnapshot || cargo.driverFreightValuePerTon;
           const profit = (grossRate - driverRate) * s.shipmentTonnage;
           
           grossBilled += grossRate * s.shipmentTonnage;
           profitMargin += profit;

           if (totalProfitMarginStatuses.includes(s.status)) {
               totalProfitMargin += profit;
           }
       }
    });

    return { grossBilled, netBilled, profitMargin, totalProfitMargin, count: filteredShipments.length };
  }, [filteredShipments, cargoMap]);

  const canViewCommercialReport = useMemo(() => {
    if (!currentUser) return false;
    return [UserProfile.Comercial, UserProfile.Admin, UserProfile.Supervisor, UserProfile.Diretor].includes(currentUser.profile);
  }, [currentUser]);

  const renderReport = () => {
    switch(activeReport) {
      case 'comercial':
        return <SupervisorReport shipments={filteredShipments} cargos={cargos} users={users} />;
      case 'embarcadores':
        return <ShipperReport shipments={filteredShipments} users={users} currentUser={currentUser} />;
      case 'clientes':
        return <ClientReport shipments={filteredShipments} cargos={cargos} clients={clients} />;
      case 'vendedores':
        return <ExternalSalespersonReport shipments={filteredShipments} cargos={cargos} />;
      case 'tempo-operacao':
        return <OperationalTimingReport shipments={filteredShipments} />;
      default:
        return null;
    }
  };
  
  const isEmbarcador = currentUser?.profile === UserProfile.Embarcador;

  const navItems = [
      ...(canViewCommercialReport ? [{ id: 'comercial', label: 'Relatório Supervisão', icon: BriefcaseIcon }] : []),
      { id: 'embarcadores', label: 'Embarcadores', icon: ShipIcon },
      ...(!isEmbarcador ? [
        { id: 'clientes', label: 'Clientes', icon: UsersIcon },
        { id: 'vendedores', label: 'Vendedores', icon: UsersIcon },
      ] : []),
      { id: 'tempo-operacao', label: 'Tempo de Operação', icon: ClockIcon },
  ];

  /* Ensure initial tab is permissible */
  useState(() => {
    if (!canViewCommercialReport && activeReport === 'comercial') {
      setActiveReport('embarcadores');
    }
  });

  const activeFiltersCount = (filterStatus.length > 0 ? 1 : 0) + (filterClient.length > 0 ? 1 : 0) + (filterOrigin.length > 0 ? 1 : 0) + (filterDest.length > 0 ? 1 : 0);

  const clearFilters = () => {
      setFilterStatus([]);
      setFilterClient([]);
      setFilterOrigin([]);
      setFilterDest([]);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
      <Header title="Relatórios" />
      
      {/* GLOBAL FILTERS SECTION */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-2 focus:ring-primary outline-none" title="Data Inicial" />
              <span className="text-gray-500">até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-2 focus:ring-primary outline-none" title="Data Final" />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
            >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtros Opcionais {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>
          </div>
        </div>

        {showFilters && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MultiSelectDropdown label="Status do Embarque" options={statusOptions} selectedValues={filterStatus} onChange={setFilterStatus} placeholder="Todos os status..." />
                    <MultiSelectDropdown label="Cliente" options={clientOptions} selectedValues={filterClient} onChange={setFilterClient} placeholder="Todos os clientes..." />
                    <MultiSelectDropdown label="Origem" options={originOptions} selectedValues={filterOrigin} onChange={setFilterOrigin} placeholder="Todas as origens..." />
                    <MultiSelectDropdown label="Destino" options={destOptions} selectedValues={filterDest} onChange={setFilterDest} placeholder="Todos os destinos..." />
                </div>
                {activeFiltersCount > 0 && (
                    <div className="mt-4 flex justify-end">
                        <button onClick={clearFilters} className="text-sm flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                            <X className="w-4 h-4" /> Limpar Filtros
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* GLOBAL KPIs SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/50 flex flex-shrink-0 items-center justify-center text-blue-600 dark:text-blue-400"><ShipIcon className="w-5 h-5" /></div>
             <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Embarques</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{kpis.count}</p>
             </div>
         </div>
         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex flex-shrink-0 items-center justify-center text-gray-600 dark:text-gray-400"><Package className="w-5 h-5" /></div>
             <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Total Programado</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100" title="Soma de peso de todos os embarques do mês atual">{currentMonthStats.totalProgramado.toLocaleString('pt-BR')} ton</p>
             </div>
         </div>
         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex flex-shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-5 h-5" /></div>
             <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Total efetivado</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100" title="Soma de embarques a partir de Ag. Nota onwards (mês atual)">{currentMonthStats.totalEfetivado.toLocaleString('pt-BR')} ton</p>
             </div>
         </div>
         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/50 flex flex-shrink-0 items-center justify-center text-green-600 dark:text-green-400"><DollarSign className="w-5 h-5" /></div>
             <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Fat. Bruto</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100" title={formatCurrency(kpis.grossBilled)}>
                   R$ {(kpis.grossBilled / 1000).toFixed(1)}k
                </p>
             </div>
         </div>

         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/50 flex flex-shrink-0 items-center justify-center text-teal-600 dark:text-teal-400"><DollarSign className="w-5 h-5" /></div>
             <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Líquido Programado</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100" title={formatCurrency(kpis.profitMargin)}>
                   R$ {(kpis.profitMargin / 1000).toFixed(1)}k
                </p>
             </div>
         </div>

         <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/50 flex flex-shrink-0 items-center justify-center text-blue-600 dark:text-blue-400"><DollarSign className="w-5 h-5" /></div>
             <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Margem Lucro Total</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100" title={formatCurrency(kpis.totalProfitMargin)}>
                   R$ {(kpis.totalProfitMargin / 1000).toFixed(1)}k
                </p>
             </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64">
          <nav className="flex flex-row md:flex-col gap-2">
             {navItems.map(item => (
                 <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id as ActiveReport)}
                    className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors duration-200 ${
                        activeReport === item.id
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                    >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                 </button>
             ))}
          </nav>
        </aside>
        <main className="flex-1 pb-16">
          {renderReport()}
        </main>
      </div>
    </>
  );
};

export default ReportsPage;