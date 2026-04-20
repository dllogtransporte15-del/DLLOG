
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import ShipmentTable from '../components/ShipmentTable';
import ShipmentHistoryFilter from '../components/ShipmentHistoryFilter';
import HistoryModal from '../components/HistoryModal';
import AttachmentModal from '../components/AttachmentModal';
import CargoDetailsModal from '../components/CargoDetailsModal';
import CancellationReasonChart from '../components/CancellationReasonChart';
import type { Shipment, Cargo, User, Product, Client, Vehicle } from '../types';
import { ShipmentStatus } from '../types';

interface ShipmentHistoryPageProps {
  shipments: Shipment[];
  cargos: Cargo[];
  users: User[];
  currentUser: User;
  clients: Client[];
  products: Product[];
  vehicles: Vehicle[];
  onDeleteShipment: (shipmentId: string) => void;
  onRevertStatus?: (shipmentId: string) => void;
}

const ShipmentHistoryPage: React.FC<ShipmentHistoryPageProps> = ({ shipments, cargos, users, currentUser, clients, products, vehicles, onDeleteShipment, onRevertStatus }) => {
  const [activeStatus, setActiveStatus] = useState<ShipmentStatus>(ShipmentStatus.Finalizado);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAttachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [detailsModalCargo, setDetailsModalCargo] = useState<Cargo | null>(null);

  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => shipment.status === activeStatus);
  }, [shipments, activeStatus]);

  const cancellationReasonData = useMemo(() => {
    const cancelledShipments = shipments.filter(s => s.status === ShipmentStatus.Cancelado);
    const counts: Record<string, number> = {};
    
    cancelledShipments.forEach(s => {
      const reason = s.cancellationReason || 'Não informado';
      counts[reason] = (counts[reason] || 0) + 1;
    });

    const colors = [
      'bg-red-500', 
      'bg-orange-500', 
      'bg-yellow-500', 
      'bg-blue-500', 
      'bg-emerald-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];

    const sorted = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Limit to top 5 and group others
    if (sorted.length > 5) {
      const top5 = sorted.slice(0, 5);
      const othersValue = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      top5.push({ label: 'Outros', value: othersValue });
      return top5.map((item, i) => ({ ...item, color: colors[i % colors.length] }));
    }

    return sorted.map((item, i) => ({ ...item, color: colors[i % colors.length] }));
  }, [shipments]);

  const handleShowHistory = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsHistoryModalOpen(true);
  };
  
  const handleOpenAttachmentModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setAttachmentModalOpen(true);
  };
  
  const handleDummySave = (data: { filesToAttach: { [key: string]: File[] }, bankDetails?: string, loadedTonnage?: number, advancePercentage?: number, route?: string }) => {
    // This is a read-only page, but the modal needs a function
    setAttachmentModalOpen(false);
  };

  const handleShowCargoDetails = (cargo: Cargo) => {
    setDetailsModalCargo(cargo);
  };

  return (
    <>
      <Header title="Histórico de Embarques">
        <CancellationReasonChart data={cancellationReasonData} />
      </Header>
      <ShipmentHistoryFilter 
        shipments={shipments} 
        activeStatus={activeStatus} 
        onStatusChange={setActiveStatus}
      />
      <ShipmentTable 
        shipments={filteredShipments} 
        cargos={cargos}
        users={users}
        vehicles={vehicles}
        onShowHistory={handleShowHistory}
        onAttach={handleOpenAttachmentModal} // Allow viewing attachments
        onShowCargoDetails={handleShowCargoDetails}
        onDelete={onDeleteShipment}
        onRevertStatus={onRevertStatus}
        currentUser={currentUser}
        activeStatus={activeStatus}
        clients={clients}
        products={products}
        companyLogo={null} // History doesn't typically need PDF generation but the prop is required
      />
      {selectedShipment && (
        <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            history={selectedShipment.history}
            users={users}
            title={`Histórico do Embarque ${selectedShipment.id}`}
        />
      )}
      {selectedShipment && (
        <AttachmentModal
            isOpen={isAttachmentModalOpen}
            onClose={() => setAttachmentModalOpen(false)}
            onSave={handleDummySave} // No saving on this page
            shipment={selectedShipment}
            cargo={cargos.find(c => c.id === selectedShipment.cargoId)}
            documentName="Documento"
            currentUser={currentUser}
        />
      )}
       {detailsModalCargo && (
          <CargoDetailsModal
            isOpen={!!detailsModalCargo}
            onClose={() => setDetailsModalCargo(null)}
            cargo={detailsModalCargo}
            client={clients.find(c => c.id === detailsModalCargo.clientId)}
            product={products.find(p => p.id === detailsModalCargo.productId)}
            commercialUser={users.find(u => u.id === detailsModalCargo.createdById)}
          />
      )}
    </>
  );
};

export default ShipmentHistoryPage;
