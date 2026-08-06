
import React, { useState } from 'react';
import Header from '../components/Header';
import EmbarcadorTable from '../components/EmbarcadorTable';
import EmbarcadorFormModal from '../components/EmbarcadorFormModal';
import type { Embarcador, User, ProfilePermissions } from '../types';
import { can } from '../auth';

interface EmbarcadoresPageProps {
  embarcadores: Embarcador[];
  setEmbarcadores: React.Dispatch<React.SetStateAction<Embarcador[]>>;
  onSaveEmbarcador: (embarcadorData: Embarcador | Omit<Embarcador, 'id'>) => void;
  currentUser: User;
  profilePermissions: ProfilePermissions;
}

const EmbarcadoresPage: React.FC<EmbarcadoresPageProps> = ({ embarcadores, setEmbarcadores, onSaveEmbarcador, currentUser, profilePermissions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [embarcadorToEdit, setEmbarcadorToEdit] = useState<Embarcador | null>(null);

  const canCreate = can('create', currentUser, 'embarcadores', profilePermissions);
  const canUpdate = can('update', currentUser, 'embarcadores', profilePermissions);
  const canDelete = can('delete', currentUser, 'embarcadores', profilePermissions);

  const handleOpenModal = () => {
    setEmbarcadorToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleEditEmbarcador = (embarcador: Embarcador) => {
    setEmbarcadorToEdit(embarcador);
    setIsModalOpen(true);
  };
  
  const handleDeleteEmbarcador = (embarcadorId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este embarcador?')) {
        setEmbarcadores(prev => prev.filter(a => a.id !== embarcadorId));
    }
  };

  const handleSaveEmbarcador = (embarcador: Embarcador | Omit<Embarcador, 'id'>) => {
    onSaveEmbarcador(embarcador);
    handleCloseModal();
  };

  return (
    <>
      <Header title="Cadastro de Embarcadores">
        {canCreate && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Adicionar Embarcador
          </button>
        )}
      </Header>

      <EmbarcadorTable 
        embarcadores={embarcadores} 
        onEdit={canUpdate ? handleEditEmbarcador : undefined} 
        onDelete={canDelete ? handleDeleteEmbarcador : undefined} 
      />

      <EmbarcadorFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEmbarcador}
        embarcadorToEdit={embarcadorToEdit}
      />
    </>
  );
};

export default EmbarcadoresPage;
