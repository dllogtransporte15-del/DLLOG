
import React, { useState } from 'react';
import Header from '../components/Header';
import ArmadorTable from '../components/ArmadorTable';
import ArmadorFormModal from '../components/ArmadorFormModal';
import type { Embarcador } from '../types';

interface ArmadoresPageProps {
  armadores: Embarcador[];
  setArmadores: React.Dispatch<React.SetStateAction<Embarcador[]>>;
  onSaveArmador: (armadorData: Embarcador | Omit<Embarcador, 'id'>) => void;
}

const ArmadoresPage: React.FC<ArmadoresPageProps> = ({ armadores, setArmadores, onSaveArmador }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [armadorToEdit, setArmadorToEdit] = useState<Embarcador | null>(null);

  const handleOpenModal = () => {
    setArmadorToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleEditArmador = (armador: Embarcador) => {
    setArmadorToEdit(armador);
    setIsModalOpen(true);
  };
  
  const handleDeleteArmador = (armadorId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este armador?')) {
        setArmadores(prev => prev.filter(a => a.id !== armadorId));
    }
  };

  const handleSaveArmador = (armador: Embarcador | Omit<Embarcador, 'id'>) => {
    onSaveArmador(armador);
    handleCloseModal();
  };

  return (
    <>
      <Header title="Cadastro de Armadores">
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Adicionar Armador
        </button>
      </Header>

      <ArmadorTable armadores={armadores} onEdit={handleEditArmador} onDelete={handleDeleteArmador} />

      <ArmadorFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveArmador}
        armadorToEdit={armadorToEdit}
      />
    </>
  );
};

export default ArmadoresPage;