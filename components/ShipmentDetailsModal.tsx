import React, { useState } from 'react';
import type { Shipment, Cargo, User, Client, Product, Vehicle } from '../types';
import { UserProfile, ShipmentStatus } from '../types';
import { generateLoadingOrderPDF } from '../utils/pdfGenerator';
import { FileTextIcon } from 'lucide-react';


interface ShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment | null;
  cargo: Cargo | undefined;
  currentUser?: User | null;
  onUpdatePrice?: (shipmentId: string, data: { newTotal: number, newRate?: number, newCompanyRate?: number }) => void;
  clients: Client[];
  products: Product[];
  vehicles: Vehicle[];
  users: User[];
  companyLogo?: string | null;
}


const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {children || <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value ?? 'N/A'}</p>}
    </div>
);

const ShipmentDetailsModal: React.FC<ShipmentDetailsModalProps> = ({ 
  isOpen, onClose, shipment, cargo, currentUser, onUpdatePrice, clients, products, vehicles, users, companyLogo 
}) => {

  const [isEditing, setIsEditing] = useState(false);
  const [editRate, setEditRate] = useState<number>(0);
  const [editCompanyRate, setEditCompanyRate] = useState<number>(0);

  if (!isOpen || !shipment) return null;

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR');

  const canEdit = currentUser?.profile !== UserProfile.Embarcador && !!onUpdatePrice;

  const handleStartEdit = () => {
    setEditRate(shipment.driverFreightRateSnapshot || (shipment.driverFreightValue / (shipment.shipmentTonnage || 1)));
    setEditCompanyRate(shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0);
    setIsEditing(true);
  };

  const mainVehicle = vehicles.find(v => v.plate === shipment.horsePlate);
  const embarcador = users.find(u => u.id === shipment.embarcadorId);
  const product = products.find(p => p.id === cargo?.productId);

  const handleSave = () => {
    if (onUpdatePrice) {
      const newTotal = editRate * shipment.shipmentTonnage;
      onUpdatePrice(shipment.id, {
        newTotal,
        newRate: editRate,
        newCompanyRate: editCompanyRate
      });
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start mb-4 border-b pb-4 dark:border-gray-700">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Detalhes do Embarque</h2>
                    {shipment && ![ShipmentStatus.AguardandoSeguradora, ShipmentStatus.PreCadastro, ShipmentStatus.Cancelado].includes(shipment.status) && (
                        <button
                            onClick={() => cargo && generateLoadingOrderPDF(shipment, cargo, clients, products, vehicles, companyLogo)}
                            title="Gerar Ordem de Carregamento (PDF)"
                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50"
                        >
                            <FileTextIcon size={18} />
                        </button>
                    )}
                </div>
                <p className="text-sm font-mono text-primary dark:text-blue-400 mt-1">{shipment.id}</p>
            </div>

            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            
            {/* Rota e Origem/Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <DetailItem label="Origem da Carga" value={cargo?.origin} />
                <DetailItem label="Destino da Carga" value={cargo?.destination} />
                <DetailItem label="Produto" value={product?.name} />
                <DetailItem label="Carga Vinculada" value={cargo?.sequenceId ? `#${cargo.sequenceId}` : cargo?.id} />
                <DetailItem label="Status Atual" value={shipment.status} />
                <DetailItem label="Comercial (Embarcador)" value={embarcador?.name || 'N/A'} />
                {shipment.status === 'Cancelado' && shipment.cancellationReason && (
                    <div className="md:col-span-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-md">
                        <p className="text-xs font-medium text-red-800 dark:text-red-400">Motivo do Cancelamento</p>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200 mt-1">{shipment.cancellationReason}</p>
                    </div>
                )}
            </div>

            {/* Informações do Motorista e Veículo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t dark:border-gray-700 pt-4">
                <DetailItem label="Motorista" value={shipment.driverName} />
                <DetailItem label="Documento (CPF)" value={shipment.driverCpf} />
                <DetailItem label="Contato" value={shipment.driverContact} />
                
                <div className="md:col-span-2 lg:col-span-3 h-px bg-gray-100 dark:bg-gray-700 my-2" />
                
                <DetailItem label="Placa do Cavalo" value={shipment.horsePlate} />
                <DetailItem label="Placa Carreta 1" value={shipment.trailer1Plate} />
                <DetailItem label="Placa Carreta 2" value={shipment.trailer2Plate || 'N/A'} />
                <DetailItem label="Placa Carreta 3" value={shipment.trailer3Plate || 'N/A'} />
                <DetailItem label="Tag do Veículo" value={shipment.vehicleTag || 'N/A'} />
                <DetailItem label="Tipo de Veículo" value={mainVehicle?.setType || 'N/A'} />
                <DetailItem label="Carroceria" value={mainVehicle?.bodyType || 'N/A'} />
            </div>

            {/* Frete e Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-gray-700 pt-4">
                <div className="md:col-span-2 flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Informações Financeiras</h3>
                    {canEdit && !isEditing && (
                        <button 
                            onClick={handleStartEdit}
                            className="text-xs font-bold text-primary dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            Editar Valores
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <>
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 md:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Taxa Motorista (R$ / Ton)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={editRate}
                                        onChange={(e) => setEditRate(Number(e.target.value))}
                                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Frete Empresa (R$ / Ton)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={editCompanyRate}
                                        onChange={(e) => setEditCompanyRate(Number(e.target.value))}
                                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t dark:border-gray-600 mt-2">
                                <div className="text-sm">
                                    <span className="text-gray-500">Novo Total: </span>
                                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(editRate * shipment.shipmentTonnage)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">Cancelar</button>
                                    <button onClick={handleSave} className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded hover:bg-primary/90 shadow-sm">Salvar Alterações</button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DetailItem label="Valor Frete Motorista">
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">
                                {formatCurrency(shipment.driverFreightValue)}
                            </p>
                            <span className="text-[10px] text-gray-500 font-normal">
                                ({formatCurrency(shipment.driverFreightRateSnapshot || (shipment.driverFreightValue / (shipment.shipmentTonnage || 1)))} /ton)
                            </span>
                        </DetailItem>
                        <DetailItem label="Tonelagem">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {shipment.shipmentTonnage.toLocaleString('pt-BR')} ton
                            </p>
                        </DetailItem>
                        
                        {currentUser?.profile !== UserProfile.Embarcador && (
                            <DetailItem label="Frete Empresa (Foto)">
                                <p className="text-sm font-bold text-primary dark:text-blue-400">
                                    {formatCurrency(shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0)} /ton
                                </p>
                            </DetailItem>
                        )}
                        
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Dados Bancários">
                                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border dark:border-gray-700">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                        {shipment.bankDetails || <span className="text-gray-400 italic">Não informados</span>}
                                    </p>
                                </div>
                            </DetailItem>
                            <DetailItem label="Referências do Motorista">
                                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border dark:border-gray-700">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                        {shipment.driverReferences || <span className="text-gray-400 italic">Não informadas</span>}
                                    </p>
                                </div>
                            </DetailItem>
                        </div>
                        
                        <div className="md:col-span-2">
                            <DetailItem label="Contato do Proprietário">
                                <div className="mt-1 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-800/30">
                                    {shipment.ownerContact ? (
                                        <a 
                                            href={`https://wa.me/${shipment.ownerContact.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm font-semibold text-primary dark:text-blue-400 hover:text-accent dark:hover:text-accent transition-colors flex items-center gap-2 group"
                                            title="Abrir no WhatsApp"
                                        >
                                            {shipment.ownerContact}
                                            <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                            </svg>
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic font-normal">Não informado</p>
                                    )}
                                </div>
                            </DetailItem>
                        </div>
                        
                        <div className="md:col-span-2">
                            <DetailItem label="Titular da ANTT (CPF/CNPJ)">
                                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border dark:border-gray-700">
                                    <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                                        {shipment.anttOwnerIdentifier || <span className="text-gray-400 italic font-sans">Não preenchido no cadastro</span>}
                                    </p>
                                </div>
                            </DetailItem>
                        </div>

                        {shipment.documents && shipment.documents['Arquivos Iniciais'] && shipment.documents['Arquivos Iniciais'].length > 0 && (
                            <div className="md:col-span-2 mt-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Arquivos da Solicitação</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {shipment.documents['Arquivos Iniciais'].map((url, idx) => (
                                        <a 
                                            key={idx} 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-md text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                        >
                                            <FileTextIcon size={14} className="mr-2" />
                                            Ver Anexo {idx + 1}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-gray-700 pt-4 opacity-75">
                <DetailItem label="Criado em" value={formatDate(shipment.createdAt)} />
                <DetailItem label="Data Programada" value={shipment.scheduledDate ? formatDate(`${shipment.scheduledDate}T${shipment.scheduledTime || '00:00'}`) : null} />
            </div>
            
        </div>
        
        <div className="mt-6 flex justify-end border-t dark:border-gray-700 pt-4">
          <button type="button" onClick={onClose} className="py-2 px-6 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetailsModal;
