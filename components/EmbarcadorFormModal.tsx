
import React, { useState, useEffect } from 'react';
import type { Embarcador } from '../types';

interface EmbarcadorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (embarcador: Embarcador | Omit<Embarcador, 'id'>) => void;
  embarcadorToEdit: Embarcador | null;
}

const EmbarcadorFormModal: React.FC<EmbarcadorFormModalProps> = ({ isOpen, onClose, onSave, embarcadorToEdit }) => {
  const [embarcador, setEmbarcador] = useState<Omit<Embarcador, 'id'>>({
    name: '',
  });

  useEffect(() => {
    if (embarcadorToEdit) {
      setEmbarcador(embarcadorToEdit);
    } else {
      setEmbarcador({
        name: '',
      });
    }
  }, [embarcadorToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmbarcador(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (embarcadorToEdit) {
      onSave({
        ...embarcador,
        id: embarcadorToEdit.id,
      });
    } else {
      onSave(embarcador);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{embarcadorToEdit ? 'Editar Embarcador' : 'Novo Embarcador'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <input name="name" value={embarcador.name} onChange={handleChange} placeholder="Nome do Embarcador" className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" required />
          </div>
          <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
              Cancelar
            </button>
            <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmbarcadorFormModal;
