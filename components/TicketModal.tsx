import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trash2, Package, Truck, ExternalLink, Paperclip, Eye, Download, Upload, X, FileText, Loader2 } from 'lucide-react';
import type { Ticket, User, TicketHistory, Cargo, Shipment } from '../types';
import { TicketStatus, TicketPriority, UserProfile } from '../types';
import { isDemoUser } from '../auth';
import { useToast } from '../hooks/useToast';
import SearchableSelect, { SearchableOption } from './SearchableSelect';
import { autoFormatInput } from '../utils/formatters';
import { supabase } from '../supabase';
import { DocumentPreviewModal } from './DocumentPreviewModal';

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  users: User[];
  currentUser: User;
  onSave: (ticket: Omit<Ticket, 'id' | 'history' | 'createdAt' | 'createdById'>) => void;
  onUpdate: (ticketId: string, newStatus: TicketStatus, comment: string) => void;
  onDelete: (ticketId: string) => void;
  cargos?: Cargo[];
  shipments?: Shipment[];
  onNavigateTo?: (type: 'cargo' | 'shipment', id?: string) => void;
  initialCreate?: boolean;
}

type FilterType = 'meus' | 'abertos' | 'resolvidos' | 'fechados' | 'todos';

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, tickets, users, currentUser, onSave, onUpdate, onDelete, cargos = [], shipments = [], onNavigateTo, initialCreate = false }) => {
  const isDemo = isDemoUser(currentUser);
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<FilterType>('meus');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    status: TicketStatus.Aberto,
    priority: TicketPriority.Media,
    assignedToId: currentUser.id,
    cargoId: '',
    shipmentId: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialCreate) {
        setIsCreating(true);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setNewTicket({
          title: '',
          description: '',
          status: TicketStatus.Aberto,
          priority: TicketPriority.Media,
          assignedToId: currentUser.id,
          cargoId: '',
          shipmentId: '',
        });
      } else {
        setIsCreating(false);
      }
    }
  }, [isOpen, initialCreate, currentUser.id]);

  const [attendingTicketId, setAttendingTicketId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const toggleExpand = (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      setAttendingTicketId(null); // Close attending state if collapsing
    } else {
      setExpandedTicketId(ticketId);
    }
  };
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

  const cargoOptions: SearchableOption[] = useMemo(() => {
    return cargos.filter(c => c.status !== 'Fechada').map(c => ({
      value: c.id,
      label: `Carga #${c.sequenceId} (${c.origin} - ${c.destination})`,
      filterText: `${c.id} ${c.sequenceId} ${c.origin} ${c.destination}`
    }));
  }, [cargos]);

  const shipmentOptions: SearchableOption[] = useMemo(() => {
    return shipments.filter(s => s.status !== 'Finalizado' && s.status !== 'Cancelado').map(s => ({
      value: s.id,
      label: `${s.id} (${s.horsePlate || 'Sem Placa'} - ${s.driverName || 'Sem Motorista'})`,
      filterText: `${s.id} ${s.horsePlate || ''} ${s.driverName || ''}`
    }));
  }, [shipments]);

  const filteredTickets = useMemo(() => {
    let sortedTickets = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    switch (filter) {
      case 'meus':
        return sortedTickets.filter(t => (t.assignedToId === currentUser.id || t.createdById === currentUser.id) && t.status !== TicketStatus.Fechado && t.status !== TicketStatus.Resolvido);
      case 'abertos':
        return sortedTickets.filter(t => t.status !== TicketStatus.Fechado && t.status !== TicketStatus.Resolvido);
      case 'resolvidos':
        return sortedTickets.filter(t => t.status === TicketStatus.Resolvido);
      case 'fechados':
        return sortedTickets.filter(t => t.status === TicketStatus.Fechado);
      case 'todos':
      default:
        return sortedTickets;
    }
  }, [tickets, filter, currentUser.id]);
  
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'N/A';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const formattedValue = autoFormatInput(name, value);
    setNewTicket(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('O arquivo selecionado excede o limite máximo permitido de 25MB.', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      showToast('Iniciando download do arquivo...', 'info');
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'anexo_chamado';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao baixar arquivo');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'anexo_chamado';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('Download concluído com sucesso!', 'success');
    } catch (err) {
      console.warn('Direct fetch download failed, fallback to window.open:', err);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'anexo_chamado';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) return;

    let attachmentUrl: string | undefined = undefined;
    let attachmentName: string | undefined = undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop() || 'bin';
        const cleanBaseName = selectedFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        const filePath = `tickets/tck_${Date.now()}_${cleanBaseName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('shipment_attachments')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) {
          console.warn('[TicketModal] Storage upload error, using base64 fallback:', uploadError);
          attachmentUrl = await readFileAsDataUrl(selectedFile);
        } else {
          const { data } = supabase.storage
            .from('shipment_attachments')
            .getPublicUrl(filePath);
          attachmentUrl = data.publicUrl;
        }
        attachmentName = selectedFile.name;
      } catch (err) {
        console.warn('[TicketModal] Error uploading file, using base64 fallback:', err);
        try {
          attachmentUrl = await readFileAsDataUrl(selectedFile);
          attachmentName = selectedFile.name;
        } catch (readErr) {
          console.error('[TicketModal] Failed to read file as data url:', readErr);
        }
      } finally {
        setIsUploading(false);
      }
    }

    onSave({
      ...newTicket,
      cargoId: newTicket.cargoId || undefined,
      shipmentId: newTicket.shipmentId || undefined,
      attachmentUrl,
      attachmentName,
    });

    setNewTicket({
      title: '',
      description: '',
      status: TicketStatus.Aberto,
      priority: TicketPriority.Media,
      assignedToId: currentUser.id,
      cargoId: '',
      shipmentId: '',
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsCreating(false);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNewTicket({
      title: '',
      description: '',
      status: TicketStatus.Aberto,
      priority: TicketPriority.Media,
      assignedToId: currentUser.id,
      cargoId: '',
      shipmentId: '',
    });
  };

  const handleAttend = (ticketId: string) => {
    if (isDemo) return;
    setAttendingTicketId(ticketId);
    setObservation('');
    
    // Auto-update to Em Andamento if it's currently Aberto
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status === TicketStatus.Aberto) {
      onUpdate(ticketId, TicketStatus.EmAndamento, 'Chamado em atendimento.');
    }
  };

  const handleCancelAttend = () => {
    setAttendingTicketId(null);
    setObservation('');
  };

  const handleUpdateStatus = (status: TicketStatus) => {
    if (isDemo) return;
    if (attendingTicketId) {
      if ((status === TicketStatus.Fechado || status === TicketStatus.Resolvido) && !observation.trim()) {
        showToast(`Por favor, adicione uma observação para ${status === TicketStatus.Fechado ? 'fechar' : 'resolver'} o chamado.`, 'warning');
        return;
      }
      onUpdate(attendingTicketId, status, observation || 'Status atualizado.');
      handleCancelAttend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all duration-300">
      <div className="glass-panel rounded-2xl p-5 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in relative">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent dark:from-blue-400 dark:to-orange-400">
              {isCreating ? 'Abrir Novo Chamado' : 'Painel de Chamados'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        {isCreating ? (
            <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto">
                <input name="title" value={newTicket.title} onChange={handleInputChange} placeholder="Título do Chamado" className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" required />
                <textarea name="description" value={newTicket.description} onChange={handleInputChange} placeholder="Descrição detalhada..." className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600" rows={4} required />
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nível de urgência</label>
                        <select name="priority" value={newTicket.priority} onChange={handleInputChange} className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
                            {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Direcionado para</label>
                        <select name="assignedToId" value={newTicket.assignedToId} onChange={handleInputChange} className="p-2 w-full border rounded dark:bg-gray-700 dark:border-gray-600">
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <SearchableSelect
                      label="Vincular a Carga (Opcional)"
                      options={cargoOptions}
                      value={newTicket.cargoId}
                      onChange={(val) => setNewTicket(prev => ({ ...prev, cargoId: val }))}
                      placeholder="-- Nenhuma --"
                    />
                    <SearchableSelect
                      label="Vincular a Embarque (Opcional)"
                      options={shipmentOptions}
                      value={newTicket.shipmentId}
                      onChange={(val) => setNewTicket(prev => ({ ...prev, shipmentId: val }))}
                      placeholder="-- Nenhum --"
                    />
                </div>

                {/* Campo de Anexo de Arquivo */}
                <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/40">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Paperclip className="w-4 h-4 text-primary" />
                            Anexar Arquivo ou Foto (Opcional)
                        </label>
                        <span className="text-[11px] text-gray-400 font-normal">PDF, Imagens (PNG, JPG, WEBP) ou Docs (máx. 25MB)</span>
                    </div>

                    {selectedFile ? (
                        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{selectedFile.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {(selectedFile.size / 1024 < 1024) 
                                        ? `${(selectedFile.size / 1024).toFixed(1)} KB` 
                                        : `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title="Remover arquivo selecionado"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="ticket-file-input"
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.xml,.txt,.csv"
                            />
                            <label
                                htmlFor="ticket-file-input"
                                className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            >
                                <Upload className="w-3.5 h-3.5 text-primary" />
                                Escolher Arquivo
                            </label>
                            <span className="text-xs text-gray-400 italic">Nenhum arquivo selecionado</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button type="button" onClick={handleCancelCreate} disabled={isUploading} className="py-2.5 px-5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">Cancelar</button>
                    <button type="submit" disabled={isUploading} className="py-2.5 px-5 btn-premium rounded-xl font-medium shadow-lg flex items-center gap-2">
                        {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isUploading ? 'Enviando arquivo...' : 'Salvar Chamado'}
                    </button>
                </div>
            </form>
        ) : (
            <>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-1 border border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 rounded-full p-1 shadow-inner">
                        {(['meus', 'abertos', 'resolvidos', 'fechados', 'todos'] as FilterType[]).map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-300 ${filter === f ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                        ))}
                    </div>
                    {!isDemo && (
                      <button onClick={() => setIsCreating(true)} className="py-1.5 px-4 text-sm btn-premium rounded-xl font-medium flex items-center gap-1.5 shadow-md">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Novo Chamado
                      </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {filteredTickets.length > 0 ? filteredTickets.map(ticket => {
                        const isExpanded = expandedTicketId === ticket.id;
                        return (
                        <div key={ticket.id} className={`p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-xl ticket-card border ${isExpanded ? 'border-primary dark:border-primary shadow-lg border-l-primary' : 'border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm border-l-transparent'} transition-all duration-300`}>
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(ticket.id)}>
                               <div className="flex items-center gap-3 overflow-hidden flex-1 pr-4">
                                 <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityColors[ticket.priority]}`} title={`Prioridade: ${ticket.priority}`}></div>
                                 <div className="flex items-center gap-2 truncate">
                                   <p className={`font-semibold text-sm md:text-base truncate ${statusColors[ticket.status]}`}>{ticket.title}</p>
                                   {ticket.attachmentUrl && (
                                     <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40 shrink-0" title="Chamado possui anexo">
                                       <Paperclip size={11} /> Com Anexo
                                     </span>
                                   )}
                                 </div>
                                 <span className="text-xs text-gray-500 truncate hidden sm:inline-block">
                                    Para: <span className="font-medium">{getUserName(ticket.assignedToId)}</span> <span className="mx-1">•</span> De: <span className="font-medium">{getUserName(ticket.createdById)}</span> <span className="mx-1">•</span> {formatDate(ticket.createdAt)}
                                 </span>
                               </div>
                               <div className="flex items-center gap-2 flex-shrink-0">
                                   {currentUser.profile === UserProfile.Admin && !isDemo && (
                                       <button onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Excluir Chamado">
                                           <Trash2 size={16} />
                                       </button>
                                   )}
                                   <button className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary whitespace-nowrap bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors flex-shrink-0">
                                      {isExpanded ? 'Ocultar' : 'Exibir mais'}
                                   </button>
                               </div>
                            </div>

                            {isExpanded && (
                               <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4 animate-fade-in">
                                   <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                                       <span>Para: <b>{getUserName(ticket.assignedToId)}</b></span>
                                       <span>De: <b>{getUserName(ticket.createdById)}</b></span>
                                       <span>{formatDate(ticket.createdAt)}</span>
                                   </div>
                                   
                                   <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                       <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Descrição Inicial</p>
                                       <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
                                   </div>

                                   {/* Card do Anexo do Chamado com Visualizar e Baixar */}
                                   {ticket.attachmentUrl && (
                                     <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/90 dark:from-blue-950/40 dark:via-gray-900/60 dark:to-indigo-950/40 rounded-xl border border-blue-200/90 dark:border-blue-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                                       <div className="flex items-center gap-3 overflow-hidden">
                                         <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                                           <Paperclip className="w-5 h-5" />
                                         </div>
                                         <div className="min-w-0">
                                           <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                               Arquivo Anexado
                                             </span>
                                             <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                               (enviado por {getUserName(ticket.createdById)})
                                             </span>
                                           </div>
                                           <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={ticket.attachmentName || 'Arquivo do Chamado'}>
                                             {ticket.attachmentName || 'Arquivo do Chamado'}
                                           </p>
                                         </div>
                                       </div>

                                       <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                         <button
                                           type="button"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setPreviewFile({
                                               url: ticket.attachmentUrl!,
                                               name: ticket.attachmentName || 'Anexo_Chamado'
                                             });
                                           }}
                                           className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer hover:shadow-md"
                                           title="Visualizar documento em tela cheia"
                                         >
                                           <Eye className="w-3.5 h-3.5" />
                                           Visualizar
                                         </button>
                                         <button
                                           type="button"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleDownloadAttachment(ticket.attachmentUrl!, ticket.attachmentName || 'anexo_chamado');
                                           }}
                                           className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-sm transition-all cursor-pointer hover:shadow-md"
                                           title="Baixar arquivo para o computador"
                                         >
                                           <Download className="w-3.5 h-3.5" />
                                           Baixar
                                         </button>
                                       </div>
                                     </div>
                                   )}
                                   
                                   {(ticket.cargoId || ticket.shipmentId) && (
                                     <div className="flex gap-2 flex-wrap">
                                       {ticket.cargoId && (
                                         <button onClick={(e) => { e.stopPropagation(); onClose(); onNavigateTo?.('cargo', ticket.cargoId); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800/50">
                                           <Package size={14} /> Acessar Carga Vinculada
                                           <ExternalLink size={14} className="ml-1 opacity-70" />
                                         </button>
                                       )}
                                       {ticket.shipmentId && (
                                         <button onClick={(e) => { e.stopPropagation(); onClose(); onNavigateTo?.('shipment', ticket.shipmentId); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800/50">
                                           <Truck size={14} /> Acessar Embarque Vinculado
                                           <ExternalLink size={14} className="ml-1 opacity-70" />
                                         </button>
                                       )}
                                     </div>
                                   )}
                                   
                                   {ticket.history && ticket.history.length > 0 && (
                                     <div className="space-y-4 bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-100/50 dark:border-gray-800/50 mt-4">
                                       <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Histórico da Conversa</p>
                                       {ticket.history.map((h, i) => {
                                         const isCurrentUser = h.userId === currentUser.id;
                                         return (
                                         <div key={i} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-4`}>
                                           <div className="text-xs text-gray-500 mb-1 px-1">
                                             <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">{getUserName(h.userId)}</span>
                                             {new Date(h.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                           </div>
                                           <div className={`chat-bubble text-sm shadow-sm max-w-[90%] md:max-w-[80%] ${isCurrentUser ? 'bg-primary text-white rounded-tr-none' : 'chat-bubble-left text-gray-800 dark:text-gray-200'}`}>
                                             <p className="whitespace-pre-wrap">{h.comment}</p>
                                           </div>
                                           {h.newStatus && (
                                              <div className="mt-3 mb-1 text-center w-full">
                                                <span className="inline-block text-[10px] font-bold px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 uppercase tracking-wide shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                                                  Status alterado para: {h.newStatus}
                                                </span>
                                              </div>
                                           )}
                                         </div>
                                       )})}
                                     </div>
                                   )}

                                   <div className="flex justify-end">
                                       {!isDemo && attendingTicketId !== ticket.id && ticket.status !== TicketStatus.Fechado && ticket.status !== TicketStatus.Resolvido && (
                                         <button onClick={(e) => { e.stopPropagation(); handleAttend(ticket.id); }} className="py-2 px-5 text-sm btn-premium rounded-xl whitespace-nowrap shadow-md mt-2">
                                           Atender Chamado
                                         </button>
                                       )}
                                   </div>

                                   {attendingTicketId === ticket.id && (
                                       <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                                         <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Adicionar Observação de Resolução</h4>
                                         <textarea
                                           value={observation}
                                           onChange={(e) => setObservation(e.target.value)}
                                           placeholder="Detalhes da resolução ou motivo do fechamento (obrigatório para Fechar/Resolver)"
                                           className="p-3 w-full border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                           rows={3}
                                         />
                                         <div className="flex flex-wrap justify-end gap-2">
                                           <button onClick={handleCancelAttend} className="py-2 px-4 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                                             Cancelar
                                           </button>
                                           <button onClick={() => handleUpdateStatus(TicketStatus.Resolvido)} className="py-2 px-4 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                                             Resolvido
                                           </button>
                                           <button onClick={() => handleUpdateStatus(TicketStatus.Fechado)} className="py-2 px-4 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 dark:bg-black dark:hover:bg-gray-900 transition-colors shadow-sm">
                                             Fechado
                                           </button>
                                         </div>
                                       </div>
                                   )}
                               </div>
                            )}
                        </div>
                        );
                    }) : <p className="text-center text-gray-500 italic mt-8">Nenhum chamado encontrado.</p>}
                </div>
            </>
        )}
      </div>

      {previewFile && (
        <DocumentPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          category="Anexo do Chamado"
        />
      )}
    </div>
  );
};

export default TicketModal;
