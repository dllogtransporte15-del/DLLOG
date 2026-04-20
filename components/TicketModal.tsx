
import React, { useState, useMemo } from 'react';
import type { Ticket, User, TicketHistory } from '../types';
import { TicketStatus, TicketPriority } from '../types';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  users: User[];
  currentUser: User;
  onSave: (ticket: Omit<Ticket, 'id' | 'history' | 'createdAt' | 'createdById'>) => void;
  onUpdate: (ticketId: string, newStatus: TicketStatus, comment: string) => void;
}

type FilterType = 'meus' | 'abertos' | 'todos';

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, tickets, users, currentUser, onSave, onUpdate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<FilterType>('meus');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    status: TicketStatus.Aberto,
    priority: TicketPriority.Media,
    assignedToId: currentUser.id,
  });
  const [attendingTicketId, setAttendingTicketId] = useState<string | null>(null);
  const [observation, setObservation] = useState('');

  const priorityColors: Record<TicketPriority, string> = {
    [TicketPriority.Baixa]: 'bg-gray-400',
    [TicketPriority.Media]: 'bg-blue-400',
    [TicketPriority.Alta]: 'bg-primary',
    [TicketPriority.Urgente]: 'bg-black',
  };

  const statusColors: Record<TicketStatus, string> = {
    [TicketStatus.Aberto]: 'text-blue-600 dark:text-blue-400',
    [TicketStatus.EmAndamento]: 'text-blue-500 dark:text-blue-300',
    [TicketStatus.Resolvido]: 'text-gray-700 dark:text-gray-300',
    [TicketStatus.Fechado]: 'text-gray-500 dark:text-gray-400 line-through',
  };

  const filteredTickets = useMemo(() => {
    let sortedTickets = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    switch (filter) {
      case 'meus':
        return sortedTickets.filter(t => t.assignedToId === currentUser.id && t.status !== TicketStatus.Fechado);
      case 'abertos':
        return sortedTickets.filter(t => t.status === TicketStatus.Aberto || t.status === TicketStatus.EmAndamento);
      case 'todos':
      default:
        return sortedTickets;
    }
  }, [tickets, filter, currentUser.id]);
  
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'N/A';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTicket(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(newTicket);
    setNewTicket({
      title: '',
      description: '',
      status: TicketStatus.Aberto,
      priority: TicketPriority.Media,
      assignedToId: currentUser.id,
    });
    setIsCreating(false);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
     setNewTicket({
      title: '',
      description: '',
      status: TicketStatus.Aberto,
      priority: TicketPriority.Media,
      assignedToId: currentUser.id,
    });
  }

  const handleAttend = (ticketId: string) => {
    setAttendingTicketId(ticketId);
    setObservation('');
  };

  const handleCancelAttend = () => {
    setAttendingTicketId(null);
    setObservation('');
  };

  const handleResolve = () => {
    if (attendingTicketId) {
      onUpdate(attendingTicketId, TicketStatus.Resolvido, observation);
      handleCancelAttend();
    }
  };

  const handleCloseTicket = () => {
    if (attendingTicketId) {
      if (!observation.trim()) {
        alert("Por favor, adicione uma observação para fechar o chamado.");
        return;
      }
      onUpdate(attendingTicketId, TicketStatus.Fechado, observation);
      handleCancelAttend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Painel de Chamados</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&times;</button>
        </div>

        {isCreating ? (
            <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto">
                <input name="title" value={newTicket.title} onChange={handleInputChange} placeholder="Título do Chamado" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
                <textarea name="description" value={newTicket.description} onChange={handleInputChange} placeholder="Descrição detalhada..." className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" rows={4} required />
                <div className="grid grid-cols-2 gap-4">
                    <select name="priority" value={newTicket.priority} onChange={handleInputChange} className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
                        {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select name="assignedToId" value={newTicket.assignedToId} onChange={handleInputChange} className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={handleCancelCreate} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark">Salvar Chamado</button>
                </div>
            </form>
        ) : (
            <>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        {(['meus', 'abertos', 'todos'] as FilterType[]).map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-sm rounded-md ${filter === f ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                        ))}
                    </div>
                    <button onClick={() => setIsCreating(true)} className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark">Novo Chamado</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                        <div key={ticket.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700 flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                               <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityColors[ticket.priority]}`} title={`Prioridade: ${ticket.priority}`}></div>
                               <div className="flex-1">
                                   <p className={`font-semibold ${statusColors[ticket.status]}`}>{ticket.title}</p>
                                   <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ticket.description}</p>
                                   <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500 mt-2">
                                       <span>Para: <b>{getUserName(ticket.assignedToId)}</b></span>
                                       <span>De: <b>{getUserName(ticket.createdById)}</b></span>
                                       <span>Criado em: <b>{formatDate(ticket.createdAt)}</b></span>
                                   </div>
                               </div>
                               {attendingTicketId !== ticket.id && ticket.status !== TicketStatus.Fechado && ticket.status !== TicketStatus.Resolvido && (
                                 <button onClick={() => handleAttend(ticket.id)} className="py-1 px-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
                                   Atender
                                 </button>
                               )}
                            </div>
                            {attendingTicketId === ticket.id && (
                                <div className="border-t dark:border-gray-600 pt-4 space-y-3">
                                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Adicionar Observação de Atendimento</h4>
                                  <textarea
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                    placeholder="Descreva a ação tomada ou a resolução do chamado..."
                                    className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600"
                                    rows={3}
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button onClick={handleCancelAttend} className="py-2 px-4 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                                      Cancelar
                                    </button>
                                    <button onClick={handleResolve} className="py-2 px-4 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                                      Resolver
                                    </button>
                                    <button onClick={handleCloseTicket} className="py-2 px-4 text-sm bg-black text-white rounded-lg hover:bg-gray-800">
                                      Fechar
                                    </button>
                                  </div>
                                </div>
                            )}
                        </div>
                    )) : <p className="text-center text-gray-500 italic mt-8">Nenhum chamado encontrado.</p>}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default TicketModal;
