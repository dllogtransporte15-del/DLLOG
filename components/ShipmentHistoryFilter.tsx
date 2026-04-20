
import React from 'react';
import { ShipmentStatus } from '../types';
import type { Shipment } from '../types';

interface ShipmentHistoryFilterProps {
  shipments: Shipment[];
  activeStatus: ShipmentStatus;
  onStatusChange: (status: ShipmentStatus) => void;
}

const ShipmentHistoryFilter: React.FC<ShipmentHistoryFilterProps> = ({ shipments, activeStatus, onStatusChange }) => {
  const getStatusCount = (status: ShipmentStatus) => {
    return shipments.filter(s => s.status === status).length;
  };

  const statusOrder = [ShipmentStatus.Finalizado, ShipmentStatus.Cancelado];

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {statusOrder.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeStatus === status
                  ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
              }`}
            >
              {status}
              <span className={`ml-2 inline-block py-0.5 px-2 rounded-full text-xs font-semibold ${
                 activeStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {getStatusCount(status)}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default ShipmentHistoryFilter;