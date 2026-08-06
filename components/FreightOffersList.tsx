import React, { useState, useRef } from 'react';
import type { FreightOffer, Client, Product, Cargo, User } from '../types';
import { FreightOfferStatus, CargoStatus, UserProfile } from '../types';
import { PackageIcon, CheckIcon, XIcon, MessageCircleIcon, HistoryIcon, TrashIcon, MapPinIcon, EyeIcon, PaperclipIcon, DownloadIcon, UserIcon, Clock, Edit } from 'lucide-react';
import VolumeBar from './VolumeBar';
import { supabase } from '../supabase';

interface FreightOffersListProps {
  offers: FreightOffer[];
  clients: Client[];
  products: Product[];
  cargos?: Cargo[];
  isClientProfile: boolean;
  currentUser?: User;
  onAccept: (offer: FreightOffer) => void;
  onRefuse: (offer: FreightOffer) => void;
  onCounterOffer: (offer: FreightOffer, newValue: number) => void;
  onDelete?: (offer: FreightOffer) => void;
  onConvertToCargo?: (offer: FreightOffer) => void;
  onShowDriverHistory?: (driverId: string) => void;
  title?: string;
  onUpdateStatus?: (offer: FreightOffer, status: FreightOfferStatus) => void;
}

const FreightOffersList: React.FC<FreightOffersListProps> = ({
  offers, clients, products, cargos, isClientProfile, currentUser, onAccept, onRefuse, onCounterOffer, onDelete, onConvertToCargo, onShowDriverHistory, title, onUpdateStatus
}) => {
  const [counterOfferModal, setCounterOfferModal] = useState<FreightOffer | null>(null);
  const [counterValue, setCounterValue] = useState<string>('');
  const [historyModal, setHistoryModal] = useState<FreightOffer | null>(null);
  const [detailsModal, setDetailsModal] = useState<FreightOffer | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [confirmAcceptModal, setConfirmAcceptModal] = useState<FreightOffer | null>(null);
  const [acceptAttachments, setAcceptAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const acceptFileInputRef = useRef<HTMLInputElement>(null);

  if (offers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Nenhuma oferta de frete no momento.</p>
      </div>
    );
  }

  const displayedOffers = isExpanded ? offers : offers.slice(0, 2);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.nomeFantasia || 'Cliente Desconhecido';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Produto Desconhecido';

  const renderLocationValue = (text: string | undefined, className: string, prefix?: React.ReactNode) => {
    if (!text) return null;
    const isUrl = text.startsWith('http://') || text.startsWith('https://');
    if (isUrl) {
      return (
        <div className="flex items-center gap-2">
          {prefix && <span className={className}>{prefix}</span>}
          <a 
            href={text} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-800 transition-colors"
          >
            <MapPinIcon className="w-3 h-3" />
            Ver Localização
          </a>
        </div>
      );
    }
    return <span className={className}>{prefix}{text}</span>;
  };

  const getStatusColor = (status: FreightOfferStatus) => {
    switch (status) {
      case FreightOfferStatus.AguardandoPreco: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case FreightOfferStatus.AnaliseCliente: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case FreightOfferStatus.Pendente: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case FreightOfferStatus.Aceita: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case FreightOfferStatus.Recusada: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case FreightOfferStatus.Contraproposta: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case FreightOfferStatus.ContrapropostaAceita: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case FreightOfferStatus.AguardandoFechamento: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const handleCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (counterOfferModal && counterValue) {
      onCounterOffer(counterOfferModal, Number(counterValue));
      setCounterOfferModal(null);
      setCounterValue('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-2">
        <PackageIcon className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-800 dark:text-white">
          {title || (isClientProfile ? 'Minhas Ofertas de Frete' : 'Ofertas de Frete Pendentes')}
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              {!isClientProfile && <th className="px-4 py-3 font-medium">Cliente</th>}
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Total (Ton)</th>
              <th className="px-4 py-3 font-medium">Valor (R$/Ton)</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {displayedOffers.map(offer => {
              const matchedCargo = offer.status === FreightOfferStatus.Aceita && cargos
                ? cargos.find(c => 
                    c.clientId === offer.clientId && 
                    c.productId === offer.productId && 
                    c.origin === offer.origin && 
                    c.destination === offer.destination && 
                    c.status === CargoStatus.EmAndamento
                  )
                : null;
              const scheduledButNotLoaded = matchedCargo ? Math.max(0, matchedCargo.scheduledVolume - matchedCargo.loadedVolume) : 0;

              return (
              <tr key={offer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-md">
                    {offer.displayId || offer.id}
                  </span>
                </td>
                {!isClientProfile && (
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {getClientName(offer.clientId)}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <div className="flex flex-col items-start gap-1.5">
                    {renderLocationValue(offer.origin, "")}
                    {renderLocationValue(offer.originLocation, "block text-xs text-gray-500 mt-1")}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2">
                      {renderLocationValue(offer.destination, "")}
                      {offer.additionalDestinations && offer.additionalDestinations.length > 0 && (
                        <button 
                          onClick={() => setDetailsModal(offer)}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 rounded-full transition-colors flex items-center justify-center min-w-[20px]"
                          title="Ver oferta para mais destinos"
                        >
                          +{offer.additionalDestinations.length}
                        </button>
                      )}
                    </div>
                    {renderLocationValue(offer.destinationLocation, "block text-xs text-gray-500 mt-1")}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{getProductName(offer.productId)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {matchedCargo ? (
                    <div className="w-32 space-y-1">
                      <div className="flex justify-between items-start text-[10px] font-bold text-gray-500 uppercase">
                        <span>Progresso</span>
                        <div className="text-right">
                          <div className="text-gray-700 dark:text-gray-300">{matchedCargo.loadedVolume} / {matchedCargo.totalVolume}</div>
                        </div>
                      </div>
                      <VolumeBar
                        loaded={matchedCargo.loadedVolume}
                        scheduled={scheduledButNotLoaded}
                        total={matchedCargo.totalVolume}
                      />
                    </div>
                  ) : (
                    offer.totalTonnage
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {matchedCargo ? (
                    <div>R$ {(offer.counterOfferValue || offer.freightValuePerTon || 0).toFixed(2)}</div>
                  ) : (
                    <>
                      <div>{offer.freightValuePerTon ? `R$ ${offer.freightValuePerTon.toFixed(2)}` : 'Aguardando Preço'}</div>
                      {offer.counterOfferValue && (
                        <div className="text-xs text-blue-500 font-medium mt-0.5">
                          Contraproposta: R$ {offer.counterOfferValue.toFixed(2)}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-center ${getStatusColor(offer.status)}`}>
                    {isClientProfile && matchedCargo
                      ? 'Carga em andamento'
                      : isClientProfile && offer.status === FreightOfferStatus.AguardandoPreco
                        ? 'Aguardando preço da transportadora'
                        : isClientProfile && offer.status === FreightOfferStatus.AnaliseCliente
                          ? 'Aguardando sua análise'
                          : isClientProfile && offer.status === FreightOfferStatus.AguardandoFechamento
                            ? 'Aguardando fechamento'
                          : !isClientProfile && offer.status === FreightOfferStatus.AguardandoFechamento
                            ? 'Aguardando fechamento do cliente'
                          : !isClientProfile && offer.status === FreightOfferStatus.AnaliseCliente
                            ? 'Aguardando análise do cliente'
                          : !isClientProfile && offer.status === FreightOfferStatus.AguardandoPreco
                            ? 'Aguardando envio de preço'
                            : isClientProfile && offer.status === FreightOfferStatus.ContrapropostaAceita
                              ? 'Aceita'
                              : offer.status === FreightOfferStatus.Pendente && isClientProfile
                                ? 'Oferta enviada, aguardando resposta'
                                : offer.status === FreightOfferStatus.Contraproposta && !isClientProfile
                                  ? 'Contraproposta enviada, aguardando aprovação'
                                  : offer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Ações da Transportadora */}
                    {!isClientProfile && (
                      <>
                        {offer.status === FreightOfferStatus.AguardandoPreco && (
                          <button onClick={() => {
                            setCounterOfferModal(offer);
                            setCounterValue('');
                          }} title="Enviar Preço" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                            <MessageCircleIcon className="w-4 h-4" />
                          </button>
                        )}
                        {(offer.status === FreightOfferStatus.AnaliseCliente || offer.status === FreightOfferStatus.AguardandoFechamento) && (
                          <button 
                            onClick={() => {
                              if (offer.status === FreightOfferStatus.AnaliseCliente) {
                                setCounterOfferModal(offer);
                                setCounterValue(offer.freightValuePerTon ? offer.freightValuePerTon.toString() : '');
                              }
                            }} 
                            disabled={offer.status === FreightOfferStatus.AguardandoFechamento}
                            title={offer.status === FreightOfferStatus.AguardandoFechamento ? "Edição desabilitada - Aguardando Fechamento" : "Editar Preço Enviado"} 
                            className={`p-1.5 rounded-lg transition-colors ${offer.status === FreightOfferStatus.AguardandoFechamento ? 'text-gray-400 bg-gray-100 cursor-not-allowed dark:bg-gray-700/50 dark:text-gray-500' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {offer.status === FreightOfferStatus.Contraproposta && (
                          <>
                            <button onClick={() => onAccept(offer)} title="Aceitar Contraproposta" className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onRefuse(offer)} title="Recusar Contraproposta" className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                              <XIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                         {(offer.status === FreightOfferStatus.Pendente || offer.status === FreightOfferStatus.ContrapropostaAceita) && (
                           <>
                             {/* Driver request — show labeled buttons */}
                             {offer.driverId ? (
                               <>
                                 <button
                                   onClick={() => onAccept(offer)}
                                   className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                 >
                                   <CheckIcon className="w-3.5 h-3.5" />
                                   Aceitar Embarque
                                 </button>
                                 <button
                                   onClick={() => onRefuse(offer)}
                                   className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                 >
                                   <XIcon className="w-3.5 h-3.5" />
                                   Recusar
                                 </button>
                               </>
                             ) : (
                               <>
                                 <button onClick={() => onAccept(offer)} title="Aceitar Oferta" className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                                   <CheckIcon className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => setCounterOfferModal(offer)} title="Fazer Contraproposta" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                   <MessageCircleIcon className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => onRefuse(offer)} title="Recusar Oferta" className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                   <XIcon className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                           </>
                         )}
                         {offer.status === FreightOfferStatus.Aceita && onConvertToCargo && !offer.driverId && (
                           <button onClick={() => onConvertToCargo(offer)} title="Gerar Carga a partir desta oferta" className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1">
                             <PackageIcon className="w-4 h-4" />
                           </button>
                         )}
                          {onShowDriverHistory && offer.driverId && (
                            <button onClick={() => offer.driverId && onShowDriverHistory(offer.driverId)} title="Ver Histórico do Motorista" className="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                            </button>
                          )}
                      </>
                    )}
                    {/* Ações do Cliente */}
                    {isClientProfile && (
                      <>
                        {(offer.status === FreightOfferStatus.AnaliseCliente || offer.status === FreightOfferStatus.AguardandoFechamento) && (
                          <>
                            <button onClick={() => {
                              setConfirmAcceptModal(offer);
                              setAcceptAttachments([]);
                            }} title="Aceitar Preço" className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCounterOfferModal(offer)} title="Fazer Contraproposta" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                              <MessageCircleIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onRefuse(offer)} title="Recusar Preço" className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                              <XIcon className="w-4 h-4" />
                            </button>
                            {offer.status === FreightOfferStatus.AnaliseCliente && onUpdateStatus && (
                              <button onClick={() => onUpdateStatus(offer, FreightOfferStatus.AguardandoFechamento)} title="Mudar para Aguardando Fechamento" className="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {/* Botão Visualizar Solicitação */}
                    <button
                      onClick={() => setDetailsModal(offer)}
                      title="Visualizar Solicitação"
                      className={`transition-colors rounded-lg flex items-center gap-1.5 ${offer.driverId && !isClientProfile ? 'px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200' : 'p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                    >
                      <EyeIcon className="w-4 h-4" />
                      {offer.driverId && !isClientProfile && <span>Visualizar</span>}
                    </button>
                    <button onClick={() => setHistoryModal(offer)} title="Ver Histórico" className="p-1.5 text-gray-600 bg-gray-50 hover:bg-gray-200 rounded-lg transition-colors">
                      <HistoryIcon className="w-4 h-4" />
                    </button>
                    {/* Botão de Excluir (Apenas Admin) */}
                    {onDelete && currentUser?.profile === UserProfile.Admin && (
                      <button onClick={() => onDelete(offer)} title="Excluir Oferta" className="p-1.5 text-red-600 bg-red-50 hover:bg-red-200 rounded-lg transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      {offers.length > 2 && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-center">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
          >
            {isExpanded ? 'Exibir Menos' : `Exibir Mais (${offers.length - 2})`}
          </button>
        </div>
      )}

      {counterOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                {counterOfferModal.status === FreightOfferStatus.AguardandoPreco 
                  ? 'Enviar Preço da Oferta' 
                  : counterOfferModal.status === FreightOfferStatus.AnaliseCliente 
                    ? 'Editar Preço Enviado' 
                    : 'Fazer Contraproposta'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {counterOfferModal.status === FreightOfferStatus.AguardandoPreco 
                  ? `Informe o valor por tonelada (R$) para o frete do cliente ${getClientName(counterOfferModal.clientId)}.`
                  : counterOfferModal.status === FreightOfferStatus.AnaliseCliente 
                    ? `Informe o novo valor por tonelada (R$) para o frete do cliente ${getClientName(counterOfferModal.clientId)}.`
                    : isClientProfile 
                      ? 'Informe o novo valor por tonelada (R$) que deseja contrapropor para a transportadora.' 
                      : `Informe o novo valor por tonelada (R$) que deseja propor ao cliente ${getClientName(counterOfferModal.clientId)}.`}
              </p>
              <form onSubmit={handleCounterSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Novo Valor (R$/Ton)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={counterValue}
                    onChange={(e) => setCounterValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder={`Atual: R$ ${counterOfferModal.freightValuePerTon ? counterOfferModal.freightValuePerTon.toFixed(2) : '0.00'}`}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setCounterOfferModal(null)} className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                    {counterOfferModal.status === FreightOfferStatus.AguardandoPreco 
                      ? 'Enviar Preço' 
                      : counterOfferModal.status === FreightOfferStatus.AnaliseCliente 
                        ? 'Salvar Preço' 
                        : 'Enviar Contraproposta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-indigo-500" />
                Histórico da Negociação
              </h3>
              <button onClick={() => setHistoryModal(null)} className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {historyModal.history && historyModal.history.length > 0 ? (
                <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-600 before:to-transparent">
                  {historyModal.history.map((log, i) => (
                    <div key={log.id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4 last:mb-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                        <HistoryIcon className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                        <div className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">{log.description}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                           {new Date(log.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum histórico disponível para esta oferta.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
              <button onClick={() => setHistoryModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-indigo-500" />
                Detalhes da Oferta
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md">
                  {detailsModal.displayId || detailsModal.id}
                </span>
              </h3>
              <button onClick={() => setDetailsModal(null)} className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-5 text-sm text-gray-700 dark:text-gray-300">
               <div>
                  <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Origem:</span>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex flex-col">
                    {renderLocationValue(detailsModal.origin, "font-medium text-gray-900 dark:text-gray-100")}
                    {renderLocationValue(detailsModal.originLocation, "text-xs text-gray-500 mt-1")}
                  </div>
               </div>
               
               <div>
                  <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Destinos:</span>
                  <div className="flex flex-col gap-2">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex flex-col">
                      {renderLocationValue(detailsModal.destination, "font-medium text-gray-900 dark:text-gray-100", "1. ")}
                      {renderLocationValue(detailsModal.destinationLocation, "block text-xs text-gray-500 mt-1")}
                    </div>
                    {detailsModal.additionalDestinations?.map((d, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex flex-col">
                        {renderLocationValue(d.city, "font-medium text-gray-900 dark:text-gray-100", `${i + 2}. `)}
                        {renderLocationValue(d.location, "block text-xs text-gray-500 mt-1")}
                      </div>
                    ))}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                    <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Produto:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{getProductName(detailsModal.productId)}</span>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                    <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Volume Total:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{detailsModal.totalTonnage} Ton</span>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                    <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Valor (R$/Ton):</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{detailsModal.freightValuePerTon ? `R$ ${detailsModal.freightValuePerTon.toFixed(2)}` : 'Aguardando'}</span>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                    <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Cadência:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{detailsModal.dailySchedule || 'Não informada'}</span>
                 </div>
               </div>

               {detailsModal.observations && (
                 <div>
                    <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Observações:</span>
                    <p className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-sm font-medium text-gray-900 dark:text-gray-100">{detailsModal.observations}</p>
                 </div>
               )}

               {detailsModal.attachments && detailsModal.attachments.length > 0 && (
                 <div>
                    <span className="font-semibold block text-gray-500 dark:text-gray-400 mb-1">Anexos:</span>
                    <ul className="space-y-2">
                      {detailsModal.attachments.map((fileUrlOrName, i) => {
                        const isUrl = fileUrlOrName.startsWith('http');
                        const displayName = fileUrlOrName.includes('?name=') ? decodeURIComponent(fileUrlOrName.split('?name=')[1]) : fileUrlOrName;
                        return (
                        <li key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-sm font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <PaperclipIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">{displayName}</span>
                          </div>
                          {isUrl ? (
                            <a 
                              href={fileUrlOrName.includes('?') ? `${fileUrlOrName}&download=` : `${fileUrlOrName}?download=`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={displayName || 'download'}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors ml-2 shrink-0"
                              title="Baixar anexo"
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </a>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => {
                                alert(`O anexo ${displayName} é de uma versão antiga e o arquivo não foi salvo no servidor.`);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors ml-2 shrink-0"
                              title="Baixar anexo"
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                 </div>
               )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
              <button onClick={() => setDetailsModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAcceptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-500" />
                Confirmar Aceite de Preço
              </h3>
              <button 
                onClick={() => {
                  setConfirmAcceptModal(null);
                  setAcceptAttachments([]);
                }} 
                className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja aceitar o preço de{' '}
                <strong className="text-gray-900 dark:text-white">
                  R$ {(confirmAcceptModal.counterOfferValue || confirmAcceptModal.freightValuePerTon || 0).toFixed(2)} / Ton
                </strong>{' '}
                para a oferta de <strong className="text-gray-900 dark:text-white">{confirmAcceptModal.origin}</strong> para{' '}
                <strong className="text-gray-900 dark:text-white">{confirmAcceptModal.destination}</strong>?
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anexos</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    ref={acceptFileInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        const newFiles = Array.from(files);
                        setAcceptAttachments(prev => {
                          const existingNames = prev.map(f => f.name);
                          const filesToAdd = newFiles.filter(f => !existingNames.includes(f.name));
                          return [...prev, ...filesToAdd];
                        });
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => acceptFileInputRef.current?.click()}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 justify-center transition-colors font-medium"
                  >
                    <PaperclipIcon className="w-4 h-4" />
                    Anexar Arquivos
                  </button>
                </div>
                {acceptAttachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {acceptAttachments.map((file, index) => (
                      <li key={index} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 px-2 py-1.5 rounded-md">
                        <span className="truncate max-w-[85%]">{file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setAcceptAttachments(prev => prev.filter(f => f.name !== file.name))} 
                          className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setConfirmAcceptModal(null);
                  setAcceptAttachments([]);
                }} 
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isUploading}
                onClick={async () => {
                  setIsUploading(true);
                  try {
                    const uploadedUrls: string[] = [];
                    for (const file of acceptAttachments) {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `freight_offer_accept_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                      const filePath = `freight_offers/${fileName}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from('shipment_attachments')
                        .upload(filePath, file);
                        
                      if (uploadError) throw new Error('Falha no upload: ' + file.name);
                      
                      const { data } = supabase.storage
                        .from('shipment_attachments')
                        .getPublicUrl(filePath);
                        
                      uploadedUrls.push(`${data.publicUrl}?name=${encodeURIComponent(file.name)}`);
                    }

                    const updatedOffer = {
                      ...confirmAcceptModal,
                      attachments: [...(confirmAcceptModal.attachments || []), ...uploadedUrls]
                    };
                    onAccept(updatedOffer);
                    setConfirmAcceptModal(null);
                    setAcceptAttachments([]);
                  } catch (error: any) {
                    console.error('Error uploading attachments:', error);
                    alert(`Erro ao salvar anexos: ${error.message}`);
                  } finally {
                    setIsUploading(false);
                  }
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {isUploading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreightOffersList;
