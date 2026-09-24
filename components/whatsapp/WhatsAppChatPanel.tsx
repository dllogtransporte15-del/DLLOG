import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Paperclip, 
  Phone, 
  User, 
  Check, 
  CheckCheck, 
  Clock, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Plus, 
  RefreshCw, 
  X, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Trash2, 
  Copy, 
  FileCheck2,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import type { WhatsAppChat, WhatsAppChatMessage, WhatsAppTemplate } from '../../types/whatsapp';
import { 
  getWhatsAppChats, 
  getWhatsAppChatMessages, 
  sendDirectChatMessage, 
  createOrGetChat, 
  deleteWhatsAppChat, 
  getWhatsAppTemplates,
  formatDisplayPhone,
  sanitizePhoneNumber
} from '../../services/whatsappService';

interface WhatsAppChatPanelProps {
  mode?: 'embedded' | 'modal' | 'floating';
  onClose?: () => void;
  initialPhone?: string;
  initialName?: string;
}

export const WhatsAppChatPanel: React.FC<WhatsAppChatPanelProps> = ({
  mode = 'embedded',
  onClose,
  initialPhone,
  initialName
}) => {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(mode === 'modal');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const chatList = await getWhatsAppChats();
      setChats(chatList);

      // Se passou telefone inicial, seleciona ou cria
      if (initialPhone) {
        const clean = sanitizePhoneNumber(initialPhone);
        let found = chatList.find(c => sanitizePhoneNumber(c.phone_number) === clean);
        if (!found) {
          found = await createOrGetChat(clean, initialName);
          setChats(prev => [found!, ...prev]);
        }
        setSelectedChat(found);
      } else if (!selectedChat && chatList.length > 0) {
        setSelectedChat(chatList[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas de WhatsApp:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const tpls = await getWhatsAppTemplates();
      setTemplates(tpls.filter(t => t.is_active));
    } catch (err) {
      console.warn('Erro ao carregar templates:', err);
    }
  };

  useEffect(() => {
    loadChats();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const loadMsgs = async () => {
        setLoadingMessages(true);
        try {
          const msgs = await getWhatsAppChatMessages(selectedChat.phone_number);
          setMessages(msgs);
        } catch (err) {
          console.error('Erro ao buscar mensagens do chat:', err);
        } finally {
          setLoadingMessages(false);
        }
      };
      loadMsgs();
    } else {
      setMessages([]);
    }
  }, [selectedChat?.phone_number]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedChat || sending) return;

    const messageText = inputText.trim();
    let mediaUrl: string | undefined = undefined;
    let mediaFilename: string | undefined = undefined;

    if (selectedFile) {
      mediaFilename = selectedFile.name;
      // Converte arquivo temporário em DataURL/Blob URL para visualização
      mediaUrl = URL.createObjectURL(selectedFile);
    }

    setSending(true);
    try {
      const newMsg = await sendDirectChatMessage({
        recipientPhone: selectedChat.phone_number,
        recipientName: selectedChat.name,
        text: messageText,
        mediaUrl,
        mediaFilename
      });

      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setSelectedFile(null);

      // Atualiza lista de conversas
      const updatedChats = await getWhatsAppChats();
      setChats(updatedChats);
    } catch (err) {
      console.error('Erro ao despachar mensagem no chat:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setInputText(prev => prev ? `${prev}\n\n${template.body_text}` : template.body_text);
    setShowTemplatesDropdown(false);
  };

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim()) return;

    const cleanPhone = sanitizePhoneNumber(newChatPhone);
    const created = await createOrGetChat(cleanPhone, newChatName.trim() || undefined);
    
    setChats(prev => {
      const exists = prev.some(c => sanitizePhoneNumber(c.phone_number) === cleanPhone);
      return exists ? prev : [created, ...prev];
    });

    setSelectedChat(created);
    setShowNewChatModal(false);
    setNewChatPhone('');
    setNewChatName('');
  };

  const handleDeleteCurrentChat = async () => {
    if (!selectedChat) return;
    if (window.confirm(`Deseja realmente excluir a conversa com ${selectedChat.name}?`)) {
      await deleteWhatsAppChat(selectedChat.phone_number);
      const remaining = chats.filter(c => c.phone_number !== selectedChat.phone_number);
      setChats(remaining);
      setSelectedChat(remaining.length > 0 ? remaining[0] : null);
      setMessages([]);
    }
  };

  const handleCopyPhone = () => {
    if (!selectedChat) return;
    navigator.clipboard.writeText(selectedChat.phone_number);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const filteredChats = chats.filter(chat => {
    const q = searchQuery.toLowerCase();
    return (
      chat.name.toLowerCase().includes(q) ||
      chat.phone_number.includes(q) ||
      (chat.last_message?.text && chat.last_message.text.toLowerCase().includes(q))
    );
  });

  const containerClasses = mode === 'modal'
    ? isFullscreen 
      ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4'
      : 'fixed inset-4 sm:inset-10 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center'
    : 'w-full h-[720px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900';

  return (
    <div className={containerClasses}>
      <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* TOPO DE CONTROLE DA JANELA (quando em modo modal) */}
        {mode === 'modal' && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-white select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black tracking-tight flex items-center gap-1.5">
                  WhatsApp Web Transcunha
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">
                  Central de Atendimento e Conversas ao Vivo
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={isFullscreen ? 'Restaurar Tamanho' : 'Maximizar'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Fechar Janela"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CORPO PRINCIPAL: 2 COLUNAS (LISTA DE CONVERSAS + ÁREA DO CHAT) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* COLUNA ESQUERDA: LISTA DE CONVERSAS */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex-shrink-0">
            {/* CABEÇALHO DA LISTA */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                    Conversas
                  </h2>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {chats.length} {chats.length === 1 ? 'contato ativo' : 'contatos ativos'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  title="Nova Conversa"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Novo</span>
                </button>
                <button
                  type="button"
                  onClick={loadChats}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Recarregar Conversas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingChats ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* BUSCA DE CONTATOS */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversa ou telefone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* LISTA ROLÁVEL DE CONVERSAS */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
              {loadingChats ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                  <span className="text-xs">Carregando conversas...</span>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Nenhuma conversa encontrada</p>
                  <p className="text-[10px] text-slate-400 mt-1">Inicie um novo chat com um motorista</p>
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Iniciar Conversa
                  </button>
                </div>
              ) : (
                filteredChats.map(chat => {
                  const isSelected = selectedChat?.phone_number === chat.phone_number;
                  const initials = chat.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const timeFormatted = chat.last_message?.timestamp 
                    ? new Date(chat.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <button
                      key={chat.id || chat.phone_number}
                      type="button"
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* AVATAR */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600/40 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {initials || <User className="w-4 h-4 text-slate-300" />}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                      </div>

                      {/* DETALHES DA CONVERSA */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {chat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                            {timeFormatted}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                          {formatDisplayPhone(chat.phone_number)}
                        </span>

                        <div className="flex items-center justify-between gap-1 mt-1">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            {chat.last_message?.from_me && (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{chat.last_message?.text || 'Sem mensagens'}</span>
                          </p>
                          {chat.unread_count && chat.unread_count > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white flex-shrink-0">
                              {chat.unread_count}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: JANELA DO CHAT (MENSAGENS + ENVIADOR) */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-100/70 dark:bg-[#0b1120] relative">
            {selectedChat ? (
              <>
                {/* CABEÇALHO DO CHAT ATIVO */}
                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                      {selectedChat.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {selectedChat.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          WhatsApp Conectado
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatDisplayPhone(selectedChat.phone_number)}</span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copiar número de telefone"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copyFeedback ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AÇÕES RÁPIDAS NO TOPO DO CHAT */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://wa.me/${selectedChat.phone_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                      title="Abrir no WhatsApp Web Oficial"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="hidden sm:inline">WhatsApp Web</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        const loadMsgs = async () => {
                          setLoadingMessages(true);
                          const msgs = await getWhatsAppChatMessages(selectedChat.phone_number);
                          setMessages(msgs);
                          setLoadingMessages(false);
                        };
                        loadMsgs();
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Atualizar histórico de mensagens"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteCurrentChat}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir histórico desta conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* HISTÓRICO DE MENSAGENS */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative">
                  {/* BACKGROUND PATTERN SUAVE */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-xs">Carregando histórico do WhatsApp...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma mensagem nesta conversa ainda</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Envie uma mensagem abaixo ou utilize um modelo de disparo rápido.</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.from_me;
                      const timeString = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={msg.id || index}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md relative ${
                              isMe
                                ? 'bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white rounded-tr-none border border-emerald-700/50'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {/* NOME DO REMETENTE CASO NÃO SEJA O SISTEMA */}
                            {!isMe && (
                              <span className="text-[10px] font-bold text-emerald-400 block mb-1">
                                {msg.sender_name || selectedChat.name}
                              </span>
                            )}

                            {/* DOCUMENTO / MÍDIA ANEXADA */}
                            {msg.media_filename && (
                              <div className="mb-2 p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-bold block truncate">{msg.media_filename}</span>
                                  <span className="text-[10px] text-slate-300">Documento Anexado</span>
                                </div>
                                {msg.media_url && (
                                  <a
                                    href={msg.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs"
                                    title="Visualizar anexo"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* CORPO DE TEXTO DA MENSAGEM */}
                            <p className="text-xs leading-relaxed whitespace-pre-wrap select-text break-words">
                              {msg.text}
                            </p>

                            {/* RODAPÉ DO BALÃO COM HORÁRIO E STATUS DE ENTREGA */}
                            <div className="flex items-center justify-end gap-1 mt-1.5 -mb-0.5 text-[10px] opacity-75">
                              <span>{timeString}</span>
                              {isMe && (
                                <span>
                                  {msg.status === 'read' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                  ) : msg.status === 'delivered' || msg.status === 'sent' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-amber-400" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* PAINEL DE ANEXO SELECIONADO */}
                {selectedFile && (
                  <div className="px-4 py-2 bg-emerald-950/40 border-t border-emerald-900/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-300">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold">Anexo pronto para envio:</span>
                      <span className="truncate max-w-xs">{selectedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                      title="Remover anexo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* BARRA INFERIOR DE ENVIO DE MENSAGENS */}
                <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative z-20">
                  {/* DROPDOWN DE TEMPLATES / RÉGUAS */}
                  {showTemplatesDropdown && (
                    <div className="absolute bottom-full left-4 right-4 sm:left-6 sm:right-auto sm:w-96 mb-2 p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-30 max-h-72 overflow-y-auto space-y-1 animate-fade-in">
                      <div className="px-2 py-1.5 flex items-center justify-between border-b border-slate-800 text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          Modelos & Respostas Rápidas
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowTemplatesDropdown(false)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {templates.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl)}
                          className="w-full text-left p-2 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start gap-2 text-white group cursor-pointer"
                        >
                          <FileCheck2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold block truncate group-hover:text-emerald-300">
                              {tpl.name}
                            </span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">
                              {tpl.body_text}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    {/* BOTÃO DE ANEXO */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex-shrink-0"
                      title="Anexar documento ou imagem"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* BOTÃO DE MODELOS RÁPIDOS */}
                    <button
                      type="button"
                      onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                      className={`p-2.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
                        showTemplatesDropdown 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                      title="Usar Modelo / Resposta Rápida"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    {/* CAMPO DE DIGITAÇÃO */}
                    <div className="flex-1 relative">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Digite uma mensagem... (Enter para enviar)"
                        rows={1}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none max-h-32 transition-all leading-normal"
                      />
                    </div>

                    {/* BOTÃO DE ENVIAR */}
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !selectedFile) || sending}
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center cursor-pointer flex-shrink-0"
                      title="Enviar Mensagem"
                    >
                      {sending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* ESTADO VAZIO: NENHUMA CONVERSA SELECIONADA */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Canal Integrado de Mensagens WhatsApp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
                  Selecione uma conversa à esquerda para visualizar o histórico em tempo real ou inicie um novo chat com qualquer motorista ou parceiro.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nova Conversa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE NOVA CONVERSA */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Nova Conversa de WhatsApp</h3>
                  <p className="text-[10px] text-slate-400">Inicie um atendimento direto com o motorista</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Número de Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="Ex: (64) 99305-8754 ou 5564993058754"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  DDD + Número (o DDI 55 é inserido automaticamente se omitido).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome do Motorista / Contato (Opcional)
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Ex: João Ferreira (Bitrem)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Abrir Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
