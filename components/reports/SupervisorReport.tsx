
import React, { useMemo } from 'react';
import type { Shipment, User, Cargo } from '../../types';
import { ShipmentStatus, UserProfile } from '../../types';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { StayRecord } from '../../utils/toolStorage';

interface SupervisorReportProps {
  shipments: Shipment[];
  cargos: Cargo[];
  users: User[];
  stays?: StayRecord[];
}

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactElement, formatAsCurrency?: boolean }> = ({ title, value, icon, formatAsCurrency=false }) => {
    const displayValue = formatAsCurrency && typeof value === 'number'
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : value;

    return (
        <div className="flex items-center p-5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 flex items-center justify-center">
                {icon}
            </div>
            <div className="ml-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{displayValue}</p>
            </div>
        </div>
    );
};

const SupervisorReport: React.FC<SupervisorReportProps> = ({ shipments, cargos, users, stays = [] }) => {
  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);

  const totalProfitMargin = useMemo(() => {
    return shipments.reduce((acc, s) => {
      const countableStatuses = [
        ShipmentStatus.AguardandoNota,
        ShipmentStatus.AguardandoAdiantamento,
        ShipmentStatus.AguardandoAgendamento,
        ShipmentStatus.AguardandoDescarga,
        ShipmentStatus.AguardandoPagamentoSaldo,
        ShipmentStatus.Finalizado
      ];
      if (!countableStatuses.includes(s.status)) return acc;
      
      const cargo = cargoMap.get(s.cargoId);
      if (!cargo) return acc;

      const grossRate = s.companyFreightRateSnapshot || cargo.companyFreightValuePerTon;
      const driverRate = s.driverFreightRateSnapshot || cargo.driverFreightValuePerTon;
      const commissionRate = cargo.salespersonCommissionPerTon || 0;
      
      const demurrageProfit = stays
          .filter(stay => stay.shipmentId === s.id)
          .reduce((sum, stay) => sum + ((stay.approvedValue || 0) - (stay.driverPaidValue || 0)), 0);
          
      const profit = ((grossRate - driverRate - commissionRate) * s.shipmentTonnage) + demurrageProfit;
      
      return acc + profit;
    }, 0);
  }, [shipments, cargoMap, stays]);

  const supervisors = useMemo(() => {
    return users.filter(u => u.profile === UserProfile.Supervisor);
  }, [users]);

  const commissionRate = 0.015; // 1.5%

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Relatório Supervisão</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatCard 
            title="Margem de Lucro Total (Período)" 
            value={totalProfitMargin} 
            icon={<DollarSignIcon className="w-7 h-7 text-blue-500 dark:text-blue-400"/>} 
            formatAsCurrency 
          />
          <StatCard 
            title="Comissão Total (1,5%)" 
            value={totalProfitMargin * commissionRate} 
            icon={<DollarSignIcon className="w-7 h-7 text-emerald-500 dark:text-emerald-400"/>} 
            formatAsCurrency 
          />
      </div>

      {supervisors.length === 0 ? (
        <div className="bg-white dark:bg-gray-800/90 rounded-xl p-8 text-center text-gray-500 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80 shadow-sm font-medium">
            Nenhum supervisor encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Comissões por Supervisor</h3>
          <div className="grid grid-cols-1 gap-4">
            {supervisors.map(supervisor => (
              <div key={supervisor.id} className="bg-white dark:bg-gray-800/90 p-5 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 flex justify-between items-center">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                        <UsersIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">{supervisor.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Perfil: Supervisor</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Comissão (1,5%)</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {(totalProfitMargin * commissionRate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorReport;
