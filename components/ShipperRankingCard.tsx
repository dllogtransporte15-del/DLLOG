
import React, { useMemo } from 'react';
import type { Shipment, Cargo, User } from '../types';
import { UserProfile, ShipmentStatus } from '../types';

interface ShipperRankingCardProps {
  shipments: Shipment[];
  cargos: Cargo[];
  users: User[];
  currentUser: User | null;
}

interface ShipperStat {
  id: string;
  name: string;
  vehicleCount: number;
  netMargin: number;
  effectiveTonnage: number;
  commission: number;
}

const ShipperRankingCard: React.FC<ShipperRankingCardProps> = ({ shipments, cargos, users, currentUser }) => {
  const canViewCommission = React.useMemo(() => {
    if (!currentUser) return false;
    return [UserProfile.Diretor, UserProfile.Comercial, UserProfile.Admin].includes(currentUser.profile);
  }, [currentUser]);

  const shipperStats = useMemo<ShipperStat[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const shippers = users.filter(u => u.profile === UserProfile.Embarcador);
    // Explicitly type `cargoMap` to ensure correct type inference.
    const cargoMap: Map<string, Cargo> = new Map(cargos.map(c => [c.id, c]));

    const stats = shippers.map(shipper => {
      const shipperShipments = shipments.filter(s => s.embarcadorId === shipper.id);
      
      const uniqueVehicles = new Set<string>();
      let netMargin = 0;
      let effectiveTonnage = 0;

      shipperShipments.forEach(shipment => {
        const isEffective = ![ShipmentStatus.PreCadastro, ShipmentStatus.AguardandoSeguradora, ShipmentStatus.AguardandoCarregamento, ShipmentStatus.Cancelado].includes(shipment.status);
        
        let referenceDate = new Date(shipment.createdAt);
        
        if (isEffective) {
          const effectiveEntry = shipment.statusHistory?.find(h => ![ShipmentStatus.PreCadastro, ShipmentStatus.AguardandoSeguradora, ShipmentStatus.AguardandoCarregamento, ShipmentStatus.Cancelado].includes(h.status));
          
          if (effectiveEntry && effectiveEntry.timestamp) {
            referenceDate = new Date(effectiveEntry.timestamp);
          } else {
            const currentStatusEntry = shipment.statusHistory && shipment.statusHistory.length > 0 
              ? shipment.statusHistory[shipment.statusHistory.length - 1] 
              : undefined;
            if (currentStatusEntry && currentStatusEntry.timestamp) {
               referenceDate = new Date(currentStatusEntry.timestamp);
            }
          }
        }

        const isCurrentMonth = referenceDate.getMonth() === currentMonth && referenceDate.getFullYear() === currentYear;

        if (isCurrentMonth) {
          if (shipment.horsePlate) {
              uniqueVehicles.add(shipment.horsePlate);
          }

          const cargo = cargoMap.get(shipment.cargoId);
          if (cargo) {
            const companyRate = shipment.companyFreightRateSnapshot || cargo.companyFreightValuePerTon;
            const companyFreightValue = companyRate * shipment.shipmentTonnage;
            const driverFreightValue = shipment.driverFreightValue;
            netMargin += (companyFreightValue - driverFreightValue);
          }

          if (isEffective) {
            effectiveTonnage += (shipment.shipmentTonnage || 0);
          }
        }
      });

      const commission = effectiveTonnage * 2;

      return {
        id: shipper.id,
        name: shipper.name,
        vehicleCount: uniqueVehicles.size,
        netMargin: netMargin,
        effectiveTonnage,
        commission
      };
    });

    return stats.sort((a, b) => b.netMargin - a.netMargin);
  }, [shipments, cargos, users]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md col-span-1 lg:col-span-2">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">Ranking de Embarcadores</h3>
      <p className="text-xs text-gray-500 mb-4">Resultados do mês atual</p>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b dark:border-gray-700">
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">#</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Embarcador</th>
              <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Veículos</th>
              <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">T. Efetivas</th>

              {canViewCommission && <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Comissão</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {shipperStats.map((stat, index) => (
              <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-3 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">{index + 1}</td>
                <td className="py-3 px-3 text-sm font-medium text-gray-900 dark:text-white">{stat.name}</td>
                <td className="py-3 px-3 text-sm text-center text-gray-500 dark:text-gray-400">{stat.vehicleCount}</td>
                <td className="py-3 px-3 text-sm text-center font-medium text-gray-700 dark:text-gray-300">{stat.effectiveTonnage.toLocaleString('pt-BR')} t</td>

                {canViewCommission && <td className="py-3 px-3 text-sm text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stat.commission)}</td>}
              </tr>
            ))}
            {shipperStats.length === 0 && (
                <tr>
                    <td colSpan={canViewCommission ? 5 : 4} className="py-4 px-3 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum embarcador com movimentação.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShipperRankingCard;
