
import React from 'react';
import type { Client, Product } from '../types';
import { CargoStatus } from '../types';

export interface LoadFilters {
  startDate: string;
  endDate: string;
  origin: string;
  destination: string;
  clientId: string;
  productId: string;
  status: string;
}

interface LoadHistoryFilterProps {
  clients: Client[];
  products: Product[];
  filters: LoadFilters;
  onFilterChange: (filters: LoadFilters) => void;
}

const LoadHistoryFilter: React.FC<LoadHistoryFilterProps> = ({ clients, products, filters, onFilterChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      startDate: '',
      endDate: '',
      origin: '',
      destination: '',
      clientId: '',
      productId: '',
      status: '',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 border dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Filters */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Início</label>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Fim</label>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        {/* Text Filters */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Origem</label>
          <input type="text" name="origin" value={filters.origin} onChange={handleInputChange} placeholder="Filtrar por origem..." className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destino</label>
          <input type="text" name="destination" value={filters.destination} onChange={handleInputChange} placeholder="Filtrar por destino..." className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        {/* Select Filters */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
          <select name="clientId" value={filters.clientId} onChange={handleInputChange} className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600">
            <option value="">Todos</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Produto</label>
          <select name="productId" value={filters.productId} onChange={handleInputChange} className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600">
            <option value="">Todos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
          <select name="status" value={filters.status} onChange={handleInputChange} className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600">
            <option value="">Todos</option>
            {Object.values(CargoStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-end">
            <button onClick={clearFilters} className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                Limpar Filtros
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoadHistoryFilter;
