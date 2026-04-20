
import React, { useState } from 'react';

interface CancelShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  shipmentId: string;
}

const CancelShipmentModal: React.FC<CancelShipmentModalProps> = ({ isOpen, onClose, onConfirm, shipmentId }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Confirmar Cancelamento</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Tem certeza que deseja cancelar o embarque <span className="font-semibold">{shipmentId}</span>? Esta ação não pode ser desfeita.
        </p>
        
        <div className="mb-6">
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motivo do Cancelamento (Obrigatório)
          </label>
          <textarea
            id="cancel-reason"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={3}
            placeholder="Descreva o motivo do cancelamento..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        
        <div className="flex justify-end space-x-4">
          <button 
            onClick={() => {
              setReason('');
              onClose();
            }} 
            className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            Não
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className={`py-2 px-4 rounded-lg text-white font-medium transition-colors ${
              reason.trim() ? 'bg-black hover:bg-gray-800' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Sim, Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelShipmentModal;
