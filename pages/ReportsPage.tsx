import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import type { Shipment, User, Cargo, Client, Branch } from '../types';
import { UserProfile, ShipmentStatus } from '../types';
import { BriefcaseIcon } from '../components/icons/BriefcaseIcon';
import { ShipIcon } from '../components/icons/ShipIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import { Filter, X, Calendar, DollarSign, Package, CheckCircle, Building2, TrendingUp } from 'lucide-react';
import SalespersonReport from '../components/reports/SalespersonReport';
import SupervisorReport from '../components/reports/SupervisorReport';
import ShipperReport from '../components/reports/ShipperReport';
import ClientReport from '../components/reports/ClientReport';
import OperationalTimingReport from '../components/reports/OperationalTimingReport';
import ExternalSalespersonReport from '../components/reports/ExternalSalespersonReport';
import BranchReport from '../components/reports/BranchReport';
import StayFinancialReport from '../components/reports/StayFinancialReport';
import DemandForecastReport from '../components/reports/DemandForecastReport';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { getAllToolStays, getToolStays, StayRecord } from '../utils/toolStorage';

interface ReportsPageProps {
  shipments: Shipment[];
  embarcadores: User[];
  cargos: Cargo[];
  users: User[];
  currentUser: User | null;
  clients: Client[];
  branches: Branch[];
  stays?: StayRecord[];
  companyLogo?: string | null;
  onSaveUser?: (userData: User | Omit<User, 'id'>) => void;
}

type ActiveReport = 'comercial' | 'embarcadores' | 'clientes' | 'vendedores' | 'tempo-operacao' | 'filiais' | 'estadias' | 'previsao-demandas';

const ReportsPage: React.FC<ReportsPageProps> = ({ shipments, embarcadores, cargos, users, currentUser, clients, branches, stays = [], companyLogo, onSaveUser }) => {
  const [activeReport, setActiveReport] = useState<ActiveReport>('comercial');
  const [loadingStays, setLoadingStays] = useState(false);
  
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
  const [filterClientCnpj, setFilterClientCnpj] = useState<string[]>([]);
  const [filterOrigin, setFilterOrigin] = useState<string[]>([]);
  const [filterDest, setFilterDest] = useState<string[]>([]);
  const [filterBranch, setFilterBranch] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  
  const statusOptions = Object.values(ShipmentStatus);
  const clientOptions = Array.from(new Set(cargos.map(c => clients.find(cl => cl.id === c.clientId)?.nomeFantasia || 'N/A'))).filter(Boolean).sort();
  
  const cnpjOptions = useMemo(() => {
    const options = new Set<string>();
    cargos.forEach(c => {
      const cl = clients.find(item => item.id === c.clientId);
      if (!cl) return;
      const cnpj = c.clientCnpj || cl.cnpj;
      if (!cnpj) return;
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const cleanMain = cl.cnpj.replace(/\D/g, '');
      let label = `${cl.nomeFantasia || cl.razaoSocial} - Matriz (${cl.cnpj})`;
      if (cleanCnpj !== cleanMain && cl.secondaryCnpjs) {
        const branch = cl.secondaryCnpjs.find(b => b.cnpj.replace(/\D/g, '') === cleanCnpj || b.id === c.clientBranchId);
        if (branch) {
          label = `${cl.nomeFantasia || cl.razaoSocial} - ${branch.nomeFantasia || branch.city || 'Filial'} (${branch.cnpj})`;
        }
      }
      options.add(label);
    });
    return Array.from(options).sort();
  }, [cargos, clients]);

  const originOptions = Array.from(new Set(cargos.map(c => c.origin))).filter(Boolean).sort();
  const destOptions = Array.from(new Set(cargos.map(c => c.destination))).filter(Boolean).sort();
  const branchOptions = branches.map(b => b.name).sort();

  const getEffectiveDate = (s: Shipment) => {
    // Find when it reached Aguardando Nota (effective volume)
    const effectiveEntry = s.statusHistory?.find(h => h.status === ShipmentStatus.AguardandoNota);
    
    // Return the effective timestamp date string, or scheduledDate if not effective yet
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

       if (filterClientCnpj.length > 0) {
         const cl = clients.find(item => item.id === cargo.clientId);
         const cnpj = cargo.clientCnpj || cl?.cnpj;
         const cleanCnpj = cnpj?.replace(/\D/g, '') || '';
         const cleanMain = cl?.cnpj?.replace(/\D/g, '') || '';
         let label = `${cl?.nomeFantasia || cl?.razaoSocial} - Matriz (${cl?.cnpj})`;
         if (cleanCnpj !== cleanMain && cl?.secondaryCnpjs) {
           const branch = cl.secondaryCnpjs.find(b => b.cnpj.replace(/\D/g, '') === cleanCnpj || b.id === cargo.clientBranchId);
           if (branch) {
             label = `${cl.nomeFantasia || cl.razaoSocial} - ${branch.nomeFantasia || branch.city || 'Filial'} (${branch.cnpj})`;
           }
         }
         if (!filterClientCnpj.includes(label)) return false;
       }

       if (filterOrigin.length > 0 && !filterOrigin.includes(cargo.origin)) return false;
       if (filterDest.length > 0 && !filterDest.includes(cargo.destination)) return false;

       if (filterBranch.length > 0) {
         const branchName = branches.find(b => b.id === s.branchId)?.name || 'N/A';
         if (!filterBranch.includes(branchName)) return false;
       }

       return true;
    });
  }, [shipments, startDate, endDate, filterStatus, filterClient, filterClientCnpj, filterOrigin, filterDest, filterBranch, cargoMap, clients, branches]);

  const filteredStays = useMemo(() => {
    return stays.filter(s => {
      const stayDate = s.date.substring(0, 10);
      return stayDate >= startDate && stayDate <= endDate;
    });
  }, [stays, startDate, endDate]);

  const filteredStats = useMemo(() => {
    let totalProgramado = 0;
    let totalEfetivado = 0;

    const programmedStatuses = [
      ShipmentStatus.AguardandoSeguradora,
      ShipmentStatus.PreCadastro,
      ShipmentStatus.AguardandoCarregamento
    ];

    shipments.forEach(s => {
      // Total Programado: Based on requested statuses and date range
      const isProgrammedStatus = programmedStatuses.includes(s.status);
      if (isProgrammedStatus && s.scheduledDate >= startDate && s.scheduledDate <= endDate) {
        totalProgramado += s.shipmentTonnage || 0;
      }

      // Total Efetivado: Based on reaching 'Ag. Nota' WITHIN FILTER RANGE
      const effectiveEntry = s.statusHistory?.find(h => h.status === ShipmentStatus.AguardandoNota);
      if (effectiveEntry) {
        const effDateStr = effectiveEntry.timestamp.substring(0, 10);
        if (effDateStr >= startDate && effDateStr <= endDate) {
          totalEfetivado += s.shipmentTonnage || 0;
        }
      }
    });

    return { totalProgramado, totalEfetivado };
  }, [shipments, startDate, endDate]);

  const kpis = useMemo(() => {
    let grossBilled = 0;
    let effectiveGrossBilled = 0;
    let profitMargin = 0; 
    let totalProfitMargin = 0; 

    const profitMarginStatuses = [
        ShipmentStatus.AguardandoSeguradora,
        ShipmentStatus.PreCadastro,
        ShipmentStatus.AguardandoCarregamento,
        ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoFiscal,
        ShipmentStatus.AguardandoAdiantamento,
        ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga,
        ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
    ];

    const totalProfitMarginStatuses = [
        ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoFiscal,
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
           const commissionRate = cargo.salespersonCommissionPerTon || 0;
           
           const demurrageRevenue = stays
               .filter(stay => stay.shipmentId === s.id)
               .reduce((sum, stay) => sum + (stay.approvedValue || 0), 0);
               
           const demurrageProfit = stays
               .filter(stay => stay.shipmentId === s.id)
               .reduce((sum, stay) => sum + ((stay.approvedValue || 0) - (stay.driverPaidValue || 0)), 0);
               
           const profit = ((grossRate - driverRate - commissionRate) * s.shipmentTonnage) + demurrageProfit;
           const revenue = (grossRate * s.shipmentTonnage) + demurrageRevenue;
           
           grossBilled += revenue;
           profitMargin += profit;

           if (totalProfitMarginStatuses.includes(s.status)) {
               totalProfitMargin += profit;
               effectiveGrossBilled += revenue;
           }
       }
    });

    const percentageMargin = grossBilled > 0 ? (profitMargin / grossBilled) * 100 : 0;
    const effectivePercentageMargin = effectiveGrossBilled > 0 ? (totalProfitMargin / effectiveGrossBilled) * 100 : 0;

    return { 
        grossBilled, 
        profitMargin, 
        totalProfitMargin, 
        percentageMargin,
        effectivePercentageMargin,
        count: filteredShipments.length 
    };
  }, [filteredShipments, cargoMap, stays]);

  const canViewCommercialReport = useMemo(() => {
    if (!currentUser) return false;
    return [UserProfile.Comercial, UserProfile.Admin, UserProfile.Supervisor, UserProfile.Diretor].includes(currentUser.profile);
  }, [currentUser]);

  const renderReport = () => {
    switch(activeReport) {
      case 'comercial':
        return <SupervisorReport shipments={filteredShipments} cargos={cargos} users={users} branches={branches} stays={stays} onSaveUser={onSaveUser as any} currentUser={currentUser} />;
      case 'embarcadores':
        return <ShipperReport shipments={filteredShipments} cargos={cargos} clients={clients} users={users} currentUser={currentUser} companyLogo={companyLogo} />;
      case 'clientes':
        return <ClientReport shipments={filteredShipments} cargos={cargos} clients={clients} stays={stays} companyLogo={companyLogo} currentUser={currentUser} />;
      case 'vendedores':
        return <ExternalSalespersonReport shipments={filteredShipments} cargos={cargos} />;
      case 'tempo-operacao':
        return <OperationalTimingReport shipments={filteredShipments} />;
      case 'filiais':
        return <BranchReport shipments={filteredShipments} cargos={cargos} branches={branches} users={users} stays={stays} />;
      case 'estadias':
        if (loadingStays) {
          return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium animate-pulse">Carregando dados financeiros das estadias...</p>
            </div>
          );
        }
        return <StayFinancialReport stays={filteredStays} />;
      case 'previsao-demandas':
        return <DemandForecastReport cargos={cargos} clients={clients} shipments={shipments} companyLogo={companyLogo} />;
      default:
        return null;
    }
  };
  
  const isEmbarcador = currentUser?.profile === UserProfile.Embarcador;
  const isCliente = currentUser?.profile === UserProfile.Cliente;

  const navItems = [
      ...(canViewCommercialReport ? [{ id: 'comercial', label: 'Relatório Comercial', icon: BriefcaseIcon }] : []),
      ...(!isCliente ? [{ id: 'embarcadores', label: 'Embarcadores', icon: ShipIcon }] : []),
      ...(!isEmbarcador ? [
        { id: 'clientes', label: isCliente ? 'Histórico & Desempenho por CNPJ' : 'Clientes', icon: UsersIcon },
        ...(!isCliente ? [{ id: 'vendedores', label: 'Vendedores', icon: UsersIcon }] : []),
      ] : []),
      { id: 'tempo-operacao', label: 'Tempo de Operação', icon: ClockIcon },
      ...(!isCliente ? [
        { id: 'filiais', label: 'Filiais', icon: Building2 },
        { id: 'estadias', label: 'Financeiro Estadias', icon: DollarSign },
        { id: 'previsao-demandas', label: 'Previsão de Demandas', icon: TrendingUp },
      ] : []),
  ];

  /* Ensure initial tab is permissible */
  useState(() => {
    if (isCliente) {
      setActiveReport('clientes');
    } else if (!canViewCommercialReport && activeReport === 'comercial') {
      setActiveReport('embarcadores');
    }
  });

  const activeFiltersCount = (filterStatus.length > 0 ? 1 : 0) + (filterClient.length > 0 ? 1 : 0) + (filterClientCnpj.length > 0 ? 1 : 0) + (filterOrigin.length > 0 ? 1 : 0) + (filterDest.length > 0 ? 1 : 0) + (filterBranch.length > 0 ? 1 : 0);

  const clearFilters = () => {
      setFilterStatus([]);
      setFilterClient([]);
      setFilterClientCnpj([]);
      setFilterOrigin([]);
      setFilterDest([]);
      setFilterBranch([]);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
      <Header title="Relatórios" />
      
      {/* GLOBAL FILTERS SECTION */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl mb-8 border border-gray-200/80 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between p-5 gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/80 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 ml-2" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1.5 bg-transparent border-none text-sm focus:ring-0 outline-none font-medium text-gray-800 dark:text-gray-100" title="Data Inicial" />
              <span className="text-gray-400 dark:text-gray-500 font-medium">até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1.5 bg-transparent border-none text-sm focus:ring-0 outline-none font-medium text-gray-800 dark:text-gray-100" title="Data Final" />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 shadow-sm font-medium cursor-pointer ${showFilters || activeFiltersCount > 0 ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/70 hover:shadow-md'}`}
            >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filtros Avançados {activeFiltersCount > 0 && <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">{activeFiltersCount}</span>}</span>
            </button>
          </div>
        </div>

        {showFilters && (
            <div className="p-5 border-t border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/40 rounded-b-2xl animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <MultiSelectDropdown label="Status do Embarque" options={statusOptions} selectedValues={filterStatus} onChange={setFilterStatus} placeholder="Todos..." />
                    {!isCliente && (
                      <MultiSelectDropdown label="Cliente (Empresa)" options={clientOptions} selectedValues={filterClient} onChange={setFilterClient} placeholder="Todos..." />
                    )}
                    <MultiSelectDropdown label="CNPJ / Filial" options={cnpjOptions} selectedValues={filterClientCnpj} onChange={setFilterClientCnpj} placeholder="Todos os CNPJs..." />
                    <MultiSelectDropdown label="Origem" options={originOptions} selectedValues={filterOrigin} onChange={setFilterOrigin} placeholder="Todas..." />
                    <MultiSelectDropdown label="Destino" options={destOptions} selectedValues={filterDest} onChange={setFilterDest} placeholder="Todos..." />
                    {!isCliente && (
                      <MultiSelectDropdown label="Filial Transcunha" options={branchOptions} selectedValues={filterBranch} onChange={setFilterBranch} placeholder="Todas..." />
                    )}
                </div>
                {activeFiltersCount > 0 && (
                    <div className="mt-4 flex justify-end">
                        <button onClick={clearFilters} className="text-sm flex items-center gap-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg transition-colors font-medium cursor-pointer">
                            <X className="w-4 h-4" /> Limpar Filtros
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* GLOBAL KPIs SECTION */}
      {isCliente ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex flex-shrink-0 items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50"><ShipIcon className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5">Embarques Totais</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{kpis.count}</p>
               </div>
           </div>
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex flex-shrink-0 items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600/50"><Package className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Total Programado">Total Programado</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{Math.round(filteredStats.totalProgramado).toLocaleString('pt-BR')} <span className="text-[10px] font-medium text-gray-400">ton</span></p>
               </div>
           </div>
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex flex-shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50"><CheckCircle className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Total Efetivado">Total Efetivado</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{Math.round(filteredStats.totalEfetivado).toLocaleString('pt-BR')} <span className="text-[10px] font-medium text-gray-400">ton</span></p>
               </div>
           </div>
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950/60 flex flex-shrink-0 items-center justify-center text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/50"><DollarSign className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Total em Frete">Total em Frete</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate" title={formatCurrency(kpis.grossBilled)}>
                     R$ {(kpis.grossBilled / 1000).toFixed(1)}k
                  </p>
               </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex flex-shrink-0 items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50"><ShipIcon className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5">Embarques</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{kpis.count}</p>
               </div>
           </div>
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex flex-shrink-0 items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600/50"><Package className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Total Programado">Total Prog.</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{Math.round(filteredStats.totalProgramado).toLocaleString('pt-BR')} <span className="text-[10px] font-medium text-gray-400">ton</span></p>
               </div>
           </div>
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex flex-shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50"><CheckCircle className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Total Efetivado">Total Efetiv.</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{Math.round(filteredStats.totalEfetivado).toLocaleString('pt-BR')} <span className="text-[10px] font-medium text-gray-400">ton</span></p>
               </div>
           </div>
           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950/60 flex flex-shrink-0 items-center justify-center text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/50"><DollarSign className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Faturamento Bruto">Fat. Bruto</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate" title={formatCurrency(kpis.grossBilled)}>
                     R$ {(kpis.grossBilled / 1000).toFixed(1)}k
                  </p>
               </div>
           </div>

           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex flex-shrink-0 items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/50"><DollarSign className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Lucro Estimado">Lucro Est.</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate" title={formatCurrency(kpis.profitMargin)}>
                     R$ {(kpis.profitMargin / 1000).toFixed(1)}k
                  </p>
               </div>
           </div>

           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex flex-shrink-0 items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50"><DollarSign className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Lucro Efetivado">Lucro Efe.</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate" title={formatCurrency(kpis.totalProfitMargin)}>
                     R$ {(kpis.totalProfitMargin / 1000).toFixed(1)}k
                  </p>
               </div>
           </div>

           <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
               <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex flex-shrink-0 items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50"><TrendingUp className="w-5 h-5" /></div>
               <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider truncate mb-0.5" title="Margem de Lucro Total">Margem</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate" title={`${kpis.percentageMargin.toFixed(2)}% (Efetivado: ${kpis.effectivePercentageMargin.toFixed(2)}%)`}>
                     {kpis.percentageMargin.toFixed(1)}%
                  </p>
               </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64">
          <nav className="flex flex-row md:flex-col gap-2 p-2 bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl overflow-x-auto shadow-sm">
             {navItems.map(item => (
                 <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id as ActiveReport)}
                    className={`flex items-center w-full px-4 py-3.5 text-sm font-semibold text-left rounded-xl transition-all duration-300 whitespace-nowrap md:whitespace-normal ${
                        activeReport === item.id
                        ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md transform scale-[1.02]'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
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