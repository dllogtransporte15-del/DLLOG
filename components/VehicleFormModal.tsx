
import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import type { Vehicle, Owner } from '../types';
import { VehicleSetType, VehicleBodyType, DriverClassification } from '../types';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle | Omit<Vehicle, 'id'>) => void;
  vehicleToEdit: Vehicle | null;
  owners: Owner[];
  onShowHistory?: (vehicle: Vehicle) => void;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  vehicleToEdit, 
  owners,
  onShowHistory 
}) => {
  const getInitialState = (): Omit<Vehicle, 'id'> => ({
    plate: '',
    setType: VehicleSetType.LSSimples,
    bodyType: VehicleBodyType.Graneleiro,
    classification: DriverClassification.Terceiro,
    ownerId: owners[0]?.id || '',
    driverId: undefined,
  });

  const [vehicle, setVehicle] = useState<Omit<Vehicle, 'id'>>(getInitialState());

  useEffect(() => {
    if (isOpen) {
      setVehicle(vehicleToEdit ? { ...vehicleToEdit } : getInitialState());
    }
  }, [vehicleToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'plate') {
      processedValue = value.toUpperCase();
    }
    
    setVehicle(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleToEdit) {
        onSave({
            ...vehicle,
            id: vehicleToEdit.id,
        });
    } else {
        onSave(vehicle);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {vehicleToEdit ? 'Editar Veículo' : 'Novo Veículo'}
          </h2>
          {vehicleToEdit && onShowHistory && (
             <button
               type="button"
               onClick={() => onShowHistory(vehicleToEdit)}
               className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg font-bold text-sm transition-all border border-blue-100 dark:border-blue-800 shadow-sm"
             >
               <History className="w-4 h-4" />
               Ver Histórico
             </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="plate" value={vehicle.plate} onChange={handleChange} placeholder="Placa do Veículo" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Conjunto</label>
              <select name="setType" value={vehicle.setType} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
                {Object.values(VehicleSetType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Carroceria</label>
               <select name="bodyType" value={vehicle.bodyType} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
                {Object.values(VehicleBodyType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Classificação</label>
            <select name="classification" value={vehicle.classification} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
              {Object.values(DriverClassification).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Proprietário</label>
            <select name="ownerId" value={vehicle.ownerId} onChange={handleChange} className="mt-1 p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required>
              {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-bold">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark font-bold shadow-md">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleFormModal;
