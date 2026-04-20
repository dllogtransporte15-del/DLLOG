
import React from 'react';
import { History } from 'lucide-react';
import type { Vehicle, Owner } from '../types';

interface VehicleTableProps {
  vehicles: Vehicle[];
  owners: Owner[];
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicleId: string) => void;
  onShowHistory?: (vehicle: Vehicle) => void;
}

const VehicleTable: React.FC<VehicleTableProps> = ({ vehicles, owners, onEdit, onDelete, onShowHistory }) => {
  const getOwnerName = (ownerId: string) => {
    return owners.find(o => o.id === ownerId)?.name || 'Desconhecido';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Placa</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Conjunto / Carroceria</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Classificação</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Proprietário</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider">Histórico</th>
              {(onEdit || onDelete) && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{vehicle.plate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="text-gray-900 dark:text-white">{vehicle.setType}</div>
                  <div className="text-gray-500 dark:text-gray-400">{vehicle.bodyType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{vehicle.classification}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getOwnerName(vehicle.ownerId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button 
                    onClick={() => onShowHistory?.(vehicle)}
                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                    title="Ver Histórico"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </td>
                {(onEdit || onDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {onEdit && <button onClick={() => onEdit(vehicle)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Editar</button>}
                    {onDelete && <button onClick={() => onDelete(vehicle.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-4">Excluir</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleTable;
