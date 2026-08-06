
import React, { useMemo } from 'react';
import type { Ticket, User } from '../types';
import { TicketStatus } from '../types';
import { BellIcon } from './icons/BellIcon';

interface MainHeaderProps {
  onOpenTickets: () => void;
  tickets: Ticket[];
  currentUser: User;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onOpenTickets, tickets, currentUser }) => {
  const myOpenTicketsCount = useMemo(() => {
    return tickets.filter(
      t => t.assignedToId === currentUser.id &&
           t.status !== TicketStatus.Resolvido &&
           t.status !== TicketStatus.Fechado
    ).length;
  }, [tickets, currentUser]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 border-b dark:border-gray-700">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              onClick={onOpenTickets}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              aria-label="Abrir chamados"
            >
              <BellIcon className="w-6 h-6" />
            </button>
            {myOpenTicketsCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                {myOpenTicketsCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
