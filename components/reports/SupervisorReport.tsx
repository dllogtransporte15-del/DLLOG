import React, { useState, useMemo } from 'react';
import type { Shipment, User, Cargo, Branch } from '../../types';
import { ShipmentStatus, UserProfile } from '../../types';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { StayRecord } from '../../utils/toolStorage';
import { Building2, CheckCircle2, XCircle, TrendingUp, ShieldCheck, Briefcase, Settings, Edit3, X, Save, CheckSquare, Square, Percent, Users } from 'lucide-react';

interface CommercialReportProps {
  shipments: Shipment[];
  cargos: Cargo[];
  users: User[];
  branches?: Branch[];
  stays?: StayRecord[];
  onSaveUser?: (user: User) => void;
  currentUser?: User | null;
}

const StatCard: React.FC<{ 
  title: string; 
  value: number; 
  subtitle?: string; 
  icon: React.ReactElement; 
  subtitleColor?: string;
}> = ({ 
  title, 
  value, 
  subtitle, 
  icon,
  subtitleColor = "text-blue-600 dark:text-blue-400"
}) => {
  return (
    <div className="flex flex-col justify-between p-5 bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-snug">{title}</p>
          <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1.5">
            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      {subtitle && (
        <div className={`mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs font-semibold ${subtitleColor}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

const SupervisorReport: React.FC<CommercialReportProps> = ({ 
  shipments, 
  cargos, 
  users, 
  branches = [], 
  stays = [],
  onSaveUser,
  currentUser
}) => {
  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b])), [branches]);
  const userBranchMap = useMemo(() => new Map(users.map(u => [u.id, u.branchId])), [users]);

  // Verificar permissão para editar base de cálculo (Diretor e Administrador do Sistema)
  const canEditBase = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.profile === UserProfile.Admin || currentUser.profile === UserProfile.Diretor;
  }, [currentUser]);

  // Identificar filial Matriz e demais filiais
  const matrizBranch = useMemo(() => {
    return branches.find(b => b.name.toLowerCase().includes('matriz')) || branches[0];
  }, [branches]);

  const nonMatrizBranches = useMemo(() => {
    return branches.filter(b => !b.name.toLowerCase().includes('matriz'));
  }, [branches]);

  // Modal para editar base de cálculo de um usuário
  const [editingUserForBase, setEditingUserForBase] = useState<User | null>(null);
  const [fixedSalaryInput, setFixedSalaryInput] = useState<number>(5000);
  const [matrizRateInput, setMatrizRateInput] = useState<number>(0.20);
  const [filiaisRateInput, setFiliaisRateInput] = useState<number>(0.10);
  const [selectedBranchesInput, setSelectedBranchesInput] = useState<string[]>([]);
  const [calculationModeInput, setCalculationModeInput] = useState<'bruto' | 'liquido'>('bruto');
  const [isAgencyModeInput, setIsAgencyModeInput] = useState<boolean>(false);
  const [agencyShareInput, setAgencyShareInput] = useState<number | undefined>(undefined);

  // Mapear faturamento bruto e líquido (margem) por filial
  const { 
    fatBrutoMatriz, 
    fatLiquidoMatriz, 
    branchGrossMap, 
    branchNetMap, 
    totalFiliaisGross
  } = useMemo(() => {
    let grossMatriz = 0;
    let netMatriz = 0;

    const grossMap = new Map<string, number>();
    const netMap = new Map<string, number>();

    const countableStatuses = [
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

    shipments.forEach(s => {
      if (!countableStatuses.includes(s.status)) return;
      
      const cargo = cargoMap.get(s.cargoId);
      if (!cargo) return;

      const grossRate = s.companyFreightRateSnapshot || cargo.companyFreightValuePerTon || 0;
      const driverRate = s.driverFreightRateSnapshot || cargo.driverFreightValuePerTon || 0;
      const commissionRate = cargo.salespersonCommissionPerTon || 0;

      const demurrageRevenue = stays
        .filter(stay => stay.shipmentId === s.id)
        .reduce((sum, stay) => sum + (stay.approvedValue || 0), 0);

      const demurrageProfit = stays
        .filter(stay => stay.shipmentId === s.id)
        .reduce((sum, stay) => sum + ((stay.approvedValue || 0) - (stay.driverPaidValue || 0)), 0);
        
      const shipmentGrossRevenue = (grossRate * s.shipmentTonnage) + demurrageRevenue;
      const shipmentNetRevenue = ((grossRate - driverRate - commissionRate) * s.shipmentTonnage) + demurrageProfit;

      // Resolução de Filial em cascata
      const effectiveBranchId = s.branchId || (s.createdById ? userBranchMap.get(s.createdById) : undefined) || cargo.branchId || (cargo.createdById ? userBranchMap.get(cargo.createdById) : undefined);

      const branchObj = effectiveBranchId ? branchMap.get(effectiveBranchId) : null;
      const isMatriz = branchObj 
        ? branchObj.name.toLowerCase().includes('matriz') 
        : (matrizBranch && effectiveBranchId === matrizBranch.id);

      if (isMatriz) {
        grossMatriz += shipmentGrossRevenue;
        netMatriz += shipmentNetRevenue;
      } else if (effectiveBranchId) {
        grossMap.set(effectiveBranchId, (grossMap.get(effectiveBranchId) || 0) + shipmentGrossRevenue);
        netMap.set(effectiveBranchId, (netMap.get(effectiveBranchId) || 0) + shipmentNetRevenue);
      } else {
        grossMatriz += shipmentGrossRevenue;
        netMatriz += shipmentNetRevenue;
      }
    });

    let totalFilGross = 0;
    grossMap.forEach(val => { totalFilGross += val; });

    let totalFilNet = 0;
    netMap.forEach(val => { totalFilNet += val; });

    return {
      fatBrutoMatriz: grossMatriz,
      fatLiquidoMatriz: netMatriz,
      branchGrossMap: grossMap,
      branchNetMap: netMap,
      totalFiliaisGross: totalFilGross,
      totalFiliaisNet: totalFilNet
    };
  }, [shipments, cargoMap, stays, branchMap, matrizBranch, userBranchMap]);

  // Default rates
  const DEFAULT_FIXED = 5000;
  const DEFAULT_MATRIZ_RATE = 0.20; // 0.20%
  const DEFAULT_FILIAIS_RATE = 0.10; // 0.10%

  const comissaoMatrizDefault = fatBrutoMatriz * (DEFAULT_MATRIZ_RATE / 100);
  const comissaoFiliaisDefault = totalFiliaisGross * (DEFAULT_FILIAIS_RATE / 100);
  const comissaoTotalCalculadaDefault = DEFAULT_FIXED + comissaoMatrizDefault + comissaoFiliaisDefault;

  // Filtrar usuários comerciais
  const commercialUsers = useMemo(() => {
    return users.filter(u => 
      u.hasCommercialCommission === true || 
      u.profile === UserProfile.GerenteComercial || 
      u.profile === UserProfile.Comercial ||
      u.profile === UserProfile.Supervisor
    );
  }, [users]);

  const activeCommissionUsers = useMemo(() => {
    return commercialUsers.filter(u => u.hasCommercialCommission === true || u.profile === UserProfile.GerenteComercial);
  }, [commercialUsers]);

  // Mapear contagem de usuários por agência / filial para divisão da comissão no modo Agência
  const agencyMemberCountsMap = useMemo(() => {
    const counts = new Map<string, number>();

    activeCommissionUsers.forEach(u => {
      if (!u.commercialIsAgencyMode) return;
      const selectedBranches = u.commercialSelectedBranchIds || nonMatrizBranches.map(b => b.id);
      
      // Chave baseada no grupo de filiais da agência
      const agencyKey = selectedBranches.sort().join('|') || (u.branchId || 'default');
      counts.set(agencyKey, (counts.get(agencyKey) || 0) + 1);
    });

    return counts;
  }, [activeCommissionUsers, nonMatrizBranches]);

  const toggleCommissionForUser = (user: User) => {
    if (!onSaveUser) return;
    const nextState = !(user.hasCommercialCommission || user.profile === UserProfile.GerenteComercial);
    onSaveUser({
      ...user,
      hasCommercialCommission: nextState
    });
  };

  const handleOpenEditBase = (user: User) => {
    setEditingUserForBase(user);
    setFixedSalaryInput(user.commercialFixedSalary ?? DEFAULT_FIXED);
    setMatrizRateInput(user.commercialMatrizRate ?? DEFAULT_MATRIZ_RATE);
    setFiliaisRateInput(user.commercialFiliaisRate ?? DEFAULT_FILIAIS_RATE);
    setSelectedBranchesInput(user.commercialSelectedBranchIds || nonMatrizBranches.map(b => b.id));
    setCalculationModeInput(user.commercialCalculationMode || 'bruto');
    setIsAgencyModeInput(user.commercialIsAgencyMode || false);
    setAgencyShareInput(user.commercialAgencySharePercent);
  };

  const handleSaveUserBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserForBase || !onSaveUser) return;

    onSaveUser({
      ...editingUserForBase,
      hasCommercialCommission: true,
      commercialFixedSalary: fixedSalaryInput,
      commercialMatrizRate: matrizRateInput,
      commercialFiliaisRate: filiaisRateInput,
      commercialSelectedBranchIds: selectedBranchesInput,
      commercialCalculationMode: calculationModeInput,
      commercialIsAgencyMode: isAgencyModeInput,
      commercialAgencySharePercent: agencyShareInput,
    });

    setEditingUserForBase(null);
  };

  const toggleSelectAllBranches = () => {
    if (selectedBranchesInput.length === nonMatrizBranches.length) {
      setSelectedBranchesInput([]);
    } else {
      setSelectedBranchesInput(nonMatrizBranches.map(b => b.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-blue-800/40 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-blue-400" />
            Relatório Comercial
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-950/80 px-4 py-2 rounded-xl border border-blue-700/50 text-xs font-semibold text-blue-200">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Matriz Principal: <b>{matrizBranch?.name || 'MATRIZ'}</b></span>
          </div>
        </div>
      </div>

      {/* STAT CARDS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Faturamento Matriz" 
          subtitle={`Comissão (0,20%): ${comissaoMatrizDefault.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          value={fatBrutoMatriz} 
          icon={<Building2 className="w-6 h-6 text-blue-500 dark:text-blue-400"/>} 
          subtitleColor="text-blue-600 dark:text-blue-300 font-bold"
        />

        <StatCard 
          title="Faturamento Filiais" 
          subtitle={`Comissão (0,10%): ${comissaoFiliaisDefault.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          value={totalFiliaisGross} 
          icon={<TrendingUp className="w-6 h-6 text-indigo-500 dark:text-indigo-400"/>} 
          subtitleColor="text-indigo-600 dark:text-indigo-300 font-bold"
        />

        <StatCard 
          title="Comissão Total p/ Gerente" 
          subtitle="Fixo R$ 5.000 + 0,20% Matriz + 0,10% Filiais"
          value={comissaoTotalCalculadaDefault} 
          icon={<ShieldCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400"/>} 
          subtitleColor="text-emerald-600 dark:text-emerald-300 font-bold"
        />
      </div>

      {/* TABELA DE COMERCIAIS */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700/80 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Equipe Comercial e Gerentes
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ative comissões, configure a modalidade agência (divisão de comissão) e filiais para cada membro.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-full">
            {activeCommissionUsers.length} comissão(ões) ativa(s)
          </span>
        </div>

        {commercialUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
            Nenhum usuário comercial encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 uppercase font-semibold">
                <tr>
                  <th className="p-4">Usuário / Perfil</th>
                  <th className="p-4">Modalidade / Base</th>
                  <th className="p-4">Status Comissão</th>
                  <th className="p-4">Fixo (R$)</th>
                  <th className="p-4">Com. Matriz (%)</th>
                  <th className="p-4">Com. Filiais Selecionadas (%)</th>
                  <th className="p-4 text-right">Total a Receber</th>
                  {onSaveUser && <th className="p-4 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
                {commercialUsers.map(user => {
                  const isActive = user.hasCommercialCommission === true || user.profile === UserProfile.GerenteComercial;

                  const userFixed = user.commercialFixedSalary ?? DEFAULT_FIXED;
                  const userMatrizRate = user.commercialMatrizRate ?? DEFAULT_MATRIZ_RATE;
                  const userFiliaisRate = user.commercialFiliaisRate ?? DEFAULT_FILIAIS_RATE;
                  const calcMode = user.commercialCalculationMode || 'bruto';
                  const isAgencyMode = user.commercialIsAgencyMode || false;

                  // Filiais selecionadas para este usuário
                  const userSelectedBranchIds = user.commercialSelectedBranchIds || nonMatrizBranches.map(b => b.id);
                  const selectedBranchCount = userSelectedBranchIds.length;

                  // Calcular membros da agência para divisão da comissão
                  const agencyKey = userSelectedBranchIds.sort().join('|') || (user.branchId || 'default');
                  const agencyMembersCount = agencyMemberCountsMap.get(agencyKey) || 1;

                  // Fator de divisão da agência
                  let shareFactor = 1;
                  if (isAgencyMode) {
                    if (user.commercialAgencySharePercent !== undefined && user.commercialAgencySharePercent > 0) {
                      shareFactor = user.commercialAgencySharePercent / 100;
                    } else {
                      shareFactor = 1 / Math.max(1, agencyMembersCount);
                    }
                  }

                  // Escolher entre Bruto e Líquido (Margem)
                  const targetMatrizRevenue = calcMode === 'liquido' ? fatLiquidoMatriz : fatBrutoMatriz;
                  const targetBranchRevenueMap = calcMode === 'liquido' ? branchNetMap : branchGrossMap;

                  // Calcular faturamento das filiais selecionadas
                  const userFiliaisRevenue = userSelectedBranchIds.reduce((sum, bId) => sum + (targetBranchRevenueMap.get(bId) || 0), 0);

                  // Taxas efetivas após divisão da agência
                  const effectiveMatrizRate = userMatrizRate * (isAgencyMode ? shareFactor : 1);
                  const effectiveFiliaisRate = userFiliaisRate * (isAgencyMode ? shareFactor : 1);

                  const matrizForUser = isActive ? targetMatrizRevenue * (effectiveMatrizRate / 100) : 0;
                  const filiaisForUser = isActive ? userFiliaisRevenue * (effectiveFiliaisRate / 100) : 0;
                  const totalForUser = isActive ? (userFixed + matrizForUser + filiaisForUser) : 0;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                            <UsersIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-sm">{user.name}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{user.email} • <span className="font-semibold text-blue-500">{user.profile}</span></div>
                          </div>
                        </div>
                      </td>

                      {/* MODALIDADE E TIPO DE BASE */}
                      <td className="p-4 font-bold space-y-1">
                        <div className="flex flex-col gap-1 items-start">
                          {isAgencyMode ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 text-[10px] uppercase font-extrabold border border-purple-300 dark:border-purple-800">
                              <Users className="w-3 h-3" /> Agência ({ (shareFactor * 100).toFixed(0) }% pool)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] uppercase font-bold">
                              Individual
                            </span>
                          )}

                          {calcMode === 'liquido' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] uppercase font-bold border border-indigo-200 dark:border-indigo-800">
                              <Percent className="w-3 h-3" /> Líquido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 text-[10px] uppercase font-bold border border-blue-200 dark:border-blue-800">
                              Bruto
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Comissão Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-[11px] font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Sem Comissão
                          </span>
                        )}
                      </td>

                      {/* FIXO (R$) */}
                      <td className="p-4 font-mono font-medium">
                        {isActive ? (
                          <span>{userFixed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        ) : (
                          <span className="text-gray-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* COM. MATRIZ (%) */}
                      <td className="p-4 font-mono">
                        {isActive ? (
                          <div>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              ({isAgencyMode ? effectiveMatrizRate.toFixed(2) : userMatrizRate.toFixed(2)}%)
                            </span>
                            <div className="text-[11px] text-gray-500">{matrizForUser.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          </div>
                        ) : 'R$ 0,00'}
                      </td>

                      {/* COM. FILIAIS SELECIONADAS (%) */}
                      <td className="p-4 font-mono">
                        {isActive ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                ({userFiliaisRate.toFixed(2)}% {isAgencyMode ? `➔ ${effectiveFiliaisRate.toFixed(2)}%` : ''})
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                                {selectedBranchCount} filial(is)
                              </span>
                            </div>
                            {isAgencyMode && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                Repartido entre {agencyMembersCount} membro(s) da agência
                              </div>
                            )}
                            <div className="text-[11px] text-gray-500">{filiaisForUser.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          </div>
                        ) : 'R$ 0,00'}
                      </td>

                      {/* TOTAL A RECEBER */}
                      <td className="p-4 text-right font-mono font-black text-sm">
                        {isActive ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            {totalForUser.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <span className="text-gray-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* AÇÕES DE EDIÇÃO E ATIVAÇÃO */}
                      {onSaveUser && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canEditBase && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditBase(user)}
                                title="Editar Base de Cálculo, Modalidade Agência e Filiais"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Editar Base / Filiais
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleCommissionForUser(user)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isActive
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                              }`}
                            >
                              {isActive ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PARA EDITAR BASE DE CÁLCULO E SELECIONAR FILIAIS (DIRETOR / ADMIN) */}
      {editingUserForBase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>Configurar Base de Cálculo</span>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingUserForBase(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserBase} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Comercial Selecionado:</p>
                <p className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{editingUserForBase.name}</p>
                <p className="text-xs text-gray-500">{editingUserForBase.email}</p>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* OPÇÃO DE SELEÇÃO: BRUTO VS LÍQUIDO (MARGEM) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Base do Faturamento para Cálculo da Comissão:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      calculationModeInput === 'bruto'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold dark:bg-blue-950/80 dark:border-blue-600 dark:text-blue-100 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="calculationModeInput" 
                      value="bruto" 
                      checked={calculationModeInput === 'bruto'} 
                      onChange={() => setCalculationModeInput('bruto')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500" 
                    />
                    <div>
                      <div className="text-xs font-bold">Faturamento BRUTO</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">Total faturado empresa</div>
                    </div>
                  </label>

                  <label 
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      calculationModeInput === 'liquido'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold dark:bg-purple-950/80 dark:border-purple-600 dark:text-purple-100 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="calculationModeInput" 
                      value="liquido" 
                      checked={calculationModeInput === 'liquido'} 
                      onChange={() => setCalculationModeInput('liquido')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500" 
                    />
                    <div>
                      <div className="text-xs font-bold">Faturamento LÍQUIDO</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">Margem (Empresa - Motorista)</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* MODALIDADE AGÊNCIA (COMISSÃO DIVIDIDA) */}
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200/80 dark:border-purple-800/80 space-y-2">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="isAgencyModeInput" 
                    checked={isAgencyModeInput} 
                    onChange={(e) => setIsAgencyModeInput(e.target.checked)} 
                    className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="isAgencyModeInput" className="ml-2 block text-xs font-bold text-purple-950 dark:text-purple-200 cursor-pointer">
                    Ativar Modalidade Agência (Comissão Repartida entre a Equipe)
                  </label>
                </div>
                {isAgencyModeInput && (
                  <div className="pl-6 pt-1 space-y-2 text-xs">
                    <p className="text-[11px] text-purple-900 dark:text-purple-300">
                      Na <b>Modalidade Agência</b>, o percentual configurado (ex: 30%) é repartido entre os membros da agência.
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Participação Individual (% do pool):
                      </label>
                      <input 
                        type="number" 
                        step="1" 
                        min="1" 
                        max="100" 
                        value={agencyShareInput ?? ''} 
                        onChange={(e) => setAgencyShareInput(parseFloat(e.target.value) || undefined)} 
                        placeholder="Vazio = divisão igualitária" 
                        className="p-1.5 text-xs w-48 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Fixo Mensal (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      step="100" 
                      value={fixedSalaryInput} 
                      onChange={(e) => setFixedSalaryInput(parseFloat(e.target.value) || 0)} 
                      className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-mono font-bold text-gray-900 dark:text-white"
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Com. MATRIZ (%)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={matrizRateInput} 
                      onChange={(e) => setMatrizRateInput(parseFloat(e.target.value) || 0)} 
                      className="w-full pr-7 pl-2 py-1.5 text-xs border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-mono font-bold text-blue-600 dark:text-blue-400"
                      required 
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-gray-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Com. FILIAIS (%)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      value={filiaisRateInput} 
                      onChange={(e) => setFiliaisRateInput(parseFloat(e.target.value) || 0)} 
                      className="w-full pr-7 pl-2 py-1.5 text-xs border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                      required 
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-gray-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DE FILIAIS PARA ESTE COMERCIAL */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Filiais Selecionadas para Comissão (% Filiais):
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAllBranches}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                  >
                    {selectedBranchesInput.length === nonMatrizBranches.length ? (
                      <>
                        <Square className="w-3 h-3" /> Desmarcar Todas
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3" /> Selecionar Todas
                      </>
                    )}
                  </button>
                </div>

                {nonMatrizBranches.length === 0 ? (
                  <p className="text-xs text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">Nenhuma outra filial cadastrada além da Matriz.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                    {nonMatrizBranches.map(b => {
                      const isChecked = selectedBranchesInput.includes(b.id);
                      return (
                        <label 
                          key={b.id} 
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/80 dark:border-blue-700 dark:text-blue-200 font-bold'
                              : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBranchesInput(prev => [...prev, b.id]);
                              } else {
                                setSelectedBranchesInput(prev => prev.filter(id => id !== b.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <span className="truncate">{b.name} ({b.city}-{b.state})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1.5">
                  A comissão de filiais ({filiaisRateInput}%) deste comercial será calculada sobre o faturamento {calculationModeInput === 'liquido' ? 'LÍQUIDO (margem)' : 'BRUTO'} das filiais marcadas acima{isAgencyModeInput ? ' (Repartida na Modalidade Agência)' : ''}.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditingUserForBase(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorReport;
