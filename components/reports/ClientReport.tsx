
import React, { useMemo } from 'react';
import type { Shipment, Cargo, Client } from '../../types';
import { ShipmentStatus } from '../../types';
import { DollarSignIcon } from '../icons/DollarSignIcon';
import { PackageIcon } from '../icons/PackageIcon';

interface ClientReportProps {
  shipments: Shipment[];
  cargos: Cargo[];
  clients: Client[];
}

interface ClientStats {
  id: string;
  name: string;
  totalTonnage: number;
  grossBilled: number;
  profitMargin: number;
  totalShipments: number;
  averageTicket: number;
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


const ClientReport: React.FC<ClientReportProps> = ({ shipments, cargos, clients }) => {
  const clientStats = useMemo<ClientStats[]>(() => {
    const statsMap = new Map<string, { totalTonnage: number, grossBilled: number, profitMargin: number, totalShipments: number }>();
    // FIX: Explicitly type `cargoMap` to ensure correct type inference for `cargoMap.get()`.
    const cargoMap: Map<string, Cargo> = new Map(cargos.map(c => [c.id, c]));

    // Initialize map for all clients to ensure they are listed even with no activity if needed, though we filter later.
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
      const profit = netValue - shipment.driverFreightValue;
      clientStat.profitMargin += profit;
    });

    return Array.from(statsMap.entries())
      .map(([clientId, stats]) => ({
        id: clientId,
        name: clients.find(c => c.id === clientId)?.nomeFantasia || 'N/A',
        ...stats,
        averageTicket: stats.totalShipments > 0 ? stats.grossBilled / stats.totalShipments : 0
      }))
      .filter(stat => stat.grossBilled > 0) // Only show clients with activity
      .sort((a, b) => b.grossBilled - a.grossBilled); // Sort by highest billing
  }, [shipments, cargos, clients]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Desempenho por Cliente</h2>
      {clientStats.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum dado de cliente encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-6">
          {clientStats.map(stats => (
            <div key={stats.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-primary dark:text-blue-400 mb-4">{stats.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total de Embarques" value={stats.totalShipments} icon={<PackageIcon className="w-8 h-8 text-blue-500"/>} />
                <StatCard title="Volume Total" value={`${stats.totalTonnage.toLocaleString('pt-BR')} ton`} icon={<PackageIcon className="w-8 h-8 text-gray-500"/>} />
                <StatCard title="Faturamento Bruto" value={stats.grossBilled} icon={<DollarSignIcon className="w-8 h-8 text-blue-500"/>} formatAsCurrency />
                <StatCard title="Margem de Lucro" value={stats.profitMargin} icon={<DollarSignIcon className="w-8 h-8 text-blue-400"/>} formatAsCurrency />
                <StatCard title="Ticket Médio" value={stats.averageTicket} icon={<DollarSignIcon className="w-8 h-8 text-green-500"/>} formatAsCurrency />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientReport;
