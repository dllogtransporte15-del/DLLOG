import React from 'react';
import type { Ticket, User, Shipment, FreightOffer, Cargo, Driver, Page } from '../types';
import NotificationBell from './NotificationBell';

interface MainHeaderProps {
  onOpenTickets: () => void;
  tickets: Ticket[];
  currentUser: User;
  shipments?: Shipment[];
  freightOffers?: FreightOffer[];
  cargos?: Cargo[];
  drivers?: Driver[];
  onNavigateTo?: (page: Page) => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({ 
  onOpenTickets, 
  tickets, 
  currentUser,
  shipments = [],
  freightOffers = [],
  cargos = [],
  drivers = [],
  onNavigateTo
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 border-b dark:border-gray-700">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-end">
          <NotificationBell
            user={currentUser}
            shipments={shipments}
            freightOffers={freightOffers}
            cargos={cargos}
            drivers={drivers}
            tickets={tickets}
            onOpenTickets={onOpenTickets}
            onNavigateTo={onNavigateTo}
          />
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
