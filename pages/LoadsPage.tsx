
import React, { useState } from 'react';
import Header from '../components/Header';
import LoadTable from '../components/LoadTable';
import LoadFormModal from '../components/LoadFormModal';
import HistoryModal from '../components/HistoryModal';
import CargoDetailsModal from '../components/CargoDetailsModal';
import CargoShipmentsSidePanel from '../components/CargoShipmentsSidePanel';
import RecommendedDriversModal from '../components/RecommendedDriversModal';
import NewShipmentModal from '../components/NewShipmentModal';
import type { Cargo, Client, Product, Driver, User, ProfilePermissions, Shipment, DailyScheduleEntry, Vehicle, Branch } from '../types';
import { CargoStatus, UserProfile } from '../types';
import { can } from '../auth';
import { StayRecord } from '../utils/toolStorage';
import type { Ticket, FreightOffer } from '../types';

interface LoadsPageProps {
  loads: Cargo[];
  setLoads: React.Dispatch<React.SetStateAction<Cargo[]>>;
  clients: Client[];
  products: Product[];
  drivers: Driver[];
  shipments: Shipment[];
  allShipments: Shipment[];
  vehicles: Vehicle[];
  // FIX: Changed Omit to use a union type for the keys to be omitted.
  onSaveLoad: (loadData: Cargo | Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById'>) => void;
  currentUser: User;
  profilePermissions: ProfilePermissions;
  users: User[];
  onDeleteLoad: (cargoId: string) => void;
  onReactivateLoad?: (cargo: Cargo) => void;
  onSuspendLoad?: (cargo: Cargo) => void;
  onUpdatePrice: (shipmentId: string, data: { newTotal: number, newRate?: number, newCompanyRate?: number }) => void;
  onModalStateChange: (isOpen: boolean) => void;
  companyLogo?: string | null;
  onDeleteAttachment?: (shipmentId: string, url: string) => Promise<void>;
  branches: Branch[];
  stays?: StayRecord[];
  tickets?: Ticket[];
  offerToConvert?: FreightOffer | null;
  setOfferToConvert?: (offer: FreightOffer | null) => void;
  onCreateShipment?: (data: any) => Promise<void>;
}

const LoadsPage: React.FC<LoadsPageProps> = ({ loads, setLoads, clients, products, shipments, allShipments, onSaveLoad, onReactivateLoad, onSuspendLoad, onUpdatePrice, currentUser, profilePermissions, users, onDeleteLoad, onModalStateChange, companyLogo, vehicles, drivers, onDeleteAttachment, branches, stays = [], tickets = [], offerToConvert, setOfferToConvert, onCreateShipment }) => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadToEdit, setLoadToEdit] = useState<Cargo | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedLoadForHistory, setSelectedLoadForHistory] = useState<Cargo | null>(null);
  const [dailyBalanceDate, setDailyBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialModalStep, setInitialModalStep] = useState(1);
  const [detailsModalCargo, setDetailsModalCargo] = useState<Cargo | null>(null);
  const [isShipmentsPanelOpen, setIsShipmentsPanelOpen] = useState(false);
  const [selectedCargoForShipments, setSelectedCargoForShipments] = useState<Cargo | null>(null);
  const [isRecommendedDriversModalOpen, setIsRecommendedDriversModalOpen] = useState(false);
  const [selectedCargoForRecommendations, setSelectedCargoForRecommendations] = useState<Cargo | null>(null);
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false);
  const [selectedCargoForShipment, setSelectedCargoForShipment] = useState<Cargo | null>(null);

  React.useEffect(() => {
    const isAnyOpen = isModalOpen || isHistoryModalOpen || !!detailsModalCargo || isShipmentsPanelOpen || isRecommendedDriversModalOpen || isNewShipmentModalOpen;
    onModalStateChange(isAnyOpen);
  }, [isModalOpen, isHistoryModalOpen, detailsModalCargo, isShipmentsPanelOpen, isRecommendedDriversModalOpen, isNewShipmentModalOpen, onModalStateChange]);

  React.useEffect(() => {
    if (offerToConvert) {
      if (offerToConvert.cargoId && offerToConvert.driverId) {
        // Driver request - open NewShipmentModal
        const cargo = loads.find(c => c.id === offerToConvert.cargoId);
        if (cargo) {
           setSelectedCargoForShipment(cargo);
           setIsNewShipmentModalOpen(true);
        }
      } else {
        // Client request - open LoadFormModal
        setLoadToEdit(null);
        setInitialModalStep(1);
        setIsModalOpen(true);
      }
    }
  }, [offerToConvert, loads]);

  const handleCloseNewShipmentModal = () => {
    setIsNewShipmentModalOpen(false);
    setSelectedCargoForShipment(null);
    if (setOfferToConvert) setOfferToConvert(null);
  };

  const handleSaveShipment = (shipmentData: any) => {
    if (selectedCargoForShipment && onCreateShipment) {
      onCreateShipment({
        cargoId: selectedCargoForShipment.id,
        ...shipmentData,
      });
    }
    handleCloseNewShipmentModal();
  };

  const handleShowDetails = (cargo: Cargo) => {
    setDetailsModalCargo(cargo);
  };

  const handleShowShipments = (cargo: Cargo) => {
    setSelectedCargoForShipments(cargo);
    setIsShipmentsPanelOpen(true);
  };

  const handleOpenRecommendations = (cargo: Cargo) => {
    setSelectedCargoForRecommendations(cargo);
    setIsRecommendedDriversModalOpen(true);
  };

  const canCreate = can('create', currentUser, 'loads', profilePermissions);
  const canUpdate = can('update', currentUser, 'loads', profilePermissions);
  const canDelete = can('delete', currentUser, 'loads', profilePermissions);

  const handleOpenModal = () => {
    setLoadToEdit(null);
    setInitialModalStep(1);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (setOfferToConvert) setOfferToConvert(null);
  };

  const handleEditLoad = (load: Cargo) => {
    setLoadToEdit(load);
    setInitialModalStep(1);
    setIsModalOpen(true);
  };
  
  // FIX: Changed Omit to use a union type for the keys to be omitted.
  const handleSaveLoad = (load: Cargo | Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById'>) => {
    onSaveLoad(load);
    handleCloseModal();
  };

  const handleCloseLoad = (cargoToClose: Cargo) => {
    if (window.confirm(`Tem certeza que deseja fechar a carga ${cargoToClose.id}? Essa ação mudará o status para "Fechada".`)) {
        onSaveLoad({ ...cargoToClose, status: CargoStatus.Fechada });
    }
  };

  const handleShowHistory = (load: Cargo) => {
    setSelectedLoadForHistory(load);
    setIsHistoryModalOpen(true);
  };

  const handleEditSchedule = (load: Cargo) => {
    setLoadToEdit(load);
    setInitialModalStep(2); // Step 2 is the scheduling timeline
    setIsModalOpen(true);
  };

  return (
    <>
      <Header title="Cadastro de Cargas">
        {canCreate && (
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Adicionar Carga
          </button>
        )}
      </Header>
      
      <div className="mt-6">
        <LoadTable 
            loads={loads} 
            clients={clients} 
            products={products}
            shipments={shipments}
            dailyBalanceDate={dailyBalanceDate}
            onDailyBalanceDateChange={setDailyBalanceDate}
            onEdit={canUpdate ? handleEditLoad : undefined}
            onClose={(canDelete || currentUser.profile === UserProfile.Supervisor) ? handleCloseLoad : undefined}
            onShowHistory={handleShowHistory}
            onReactivate={(currentUser.profile !== UserProfile.Embarcador && currentUser.profile !== UserProfile.Motorista) ? onReactivateLoad : undefined}
            onSuspend={(currentUser.profile !== UserProfile.Embarcador && currentUser.profile !== UserProfile.Motorista) ? onSuspendLoad : undefined}
            onEditSchedule={canUpdate ? handleEditSchedule : undefined}
            onShowDetails={handleShowDetails}
            onShowShipments={handleShowShipments}
            onRecommendDrivers={handleOpenRecommendations}
            onDelete={onDeleteLoad}
            currentUser={currentUser}
            stays={stays}
            tickets={tickets}
            onSaveLoad={handleSaveLoad}
        />
      </div>


      <LoadFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLoad}
        loadToEdit={loadToEdit}
        clients={clients}
        products={products}
        currentUser={currentUser}
        users={users}
        loads={loads}
        branches={branches}
        initialStep={initialModalStep}
        offerToConvert={offerToConvert}
      />

      {selectedLoadForHistory && (
          <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            history={selectedLoadForHistory.history}
            users={users}
            title={`Histórico da Carga ${selectedLoadForHistory.id}`}
          />
      )}

      <CargoDetailsModal
        isOpen={!!detailsModalCargo}
        onClose={() => setDetailsModalCargo(null)}
        cargo={detailsModalCargo}
        client={detailsModalCargo ? clients.find(c => c.id === detailsModalCargo.clientId) : undefined}
        product={detailsModalCargo ? products.find(p => p.id === detailsModalCargo.productId) : undefined}
        commercialUser={users.find(u => u.id === detailsModalCargo?.createdById)}
        stays={stays}
        shipments={shipments}
        currentUser={currentUser}
      />

      <CargoShipmentsSidePanel
        isOpen={isShipmentsPanelOpen}
        onClose={() => setIsShipmentsPanelOpen(false)}
        cargo={selectedCargoForShipments}
        shipments={shipments}
        users={users}
        currentUser={currentUser}
        onUpdatePrice={onUpdatePrice}
        clients={clients}
        products={products}
        companyLogo={companyLogo}
        vehicles={vehicles}
        onDeleteAttachment={onDeleteAttachment}
      />

      {isRecommendedDriversModalOpen && selectedCargoForRecommendations && (
        <RecommendedDriversModal
          isOpen={isRecommendedDriversModalOpen}
          onClose={() => {
            setIsRecommendedDriversModalOpen(false);
            setSelectedCargoForRecommendations(null);
          }}
          currentCargo={selectedCargoForRecommendations}
          drivers={drivers}
          shipments={allShipments}
          cargos={loads}
        />
      )}
      <NewShipmentModal
        isOpen={isNewShipmentModalOpen}
        onClose={handleCloseNewShipmentModal}
        onSave={handleSaveShipment}
        cargo={selectedCargoForShipment}
        drivers={drivers}
        clients={clients}
        vehicles={vehicles}
        currentUser={currentUser}
        shipments={shipments}
        users={users}
        offer={offerToConvert}
      />
    </>
  );
};

export default LoadsPage;
