import React, { useState, useRef } from 'react';
import type { Client, Product, FreightOffer } from '../types';
import { FreightOfferStatus } from '../types';
import { XIcon, PackageIcon, MapPinIcon, DollarSignIcon, CalendarIcon, ScaleIcon, PaperclipIcon } from 'lucide-react';
import { supabase } from '../supabase';

interface FreightOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  products: Product[];
  currentClient?: Client;
  onSave: (offer: Omit<FreightOffer, 'id' | 'createdAt'>) => Promise<void>;
}

const FreightOfferModal: React.FC<FreightOfferModalProps> = ({
  isOpen, onClose, clients, products, currentClient, onSave
}) => {
  const [formData, setFormData] = useState({
    origin: '',
    originLocation: '',
    destination: '',
    destinationLocation: '',
    totalTonnage: '',
    dailySchedule: '',
    productId: '',
    observations: '',
  });

  const [additionalDestinations, setAdditionalDestinations] = useState<{city: string, location: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDestination = () => {
    setAdditionalDestinations([...additionalDestinations, { city: '', location: '' }]);
  };

  const handleAdditionalDestinationChange = (index: number, field: 'city' | 'location', value: string) => {
    const newDests = [...additionalDestinations];
    newDests[index][field] = value;
    setAdditionalDestinations(newDests);
  };

  const handleRemoveDestination = (index: number) => {
    setAdditionalDestinations(additionalDestinations.filter((_, i) => i !== index));
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => {
        const existingNames = prev.map(f => f.name);
        const filesToAdd = newFiles.filter(f => !existingNames.includes(f.name));
        return [...prev, ...filesToAdd];
      });
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `freight_offer_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `freight_offers/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('shipment_attachments')
          .upload(filePath, file);
          
        if (uploadError) {
          throw new Error('Falha ao fazer upload de anexo: ' + file.name);
        }
        
        const { data } = supabase.storage
          .from('shipment_attachments')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(`${data.publicUrl}?name=${encodeURIComponent(file.name)}`);
      }

      await onSave({
        clientId: currentClient.id,
        origin: formData.origin,
        originLocation: formData.originLocation,
        destination: formData.destination,
        destinationLocation: formData.destinationLocation,
        totalTonnage: Number(formData.totalTonnage),
        dailySchedule: formData.dailySchedule,
        productId: formData.productId,
        status: FreightOfferStatus.AguardandoPreco,
        observations: formData.observations,
        additionalDestinations: additionalDestinations.filter(d => d.city.trim() !== ''),
        attachments: uploadedUrls,
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving freight offer:', error);
      alert(`Erro ao criar a oferta de frete. ${error?.message || ''} ${error?.details || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <PackageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gerar Oferta de Frete</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="freight-offer-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origem (Cidade)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input required type="text" name="origin" value={formData.origin} onChange={handleChange} className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: São Paulo - SP" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local da Origem</label>
                <input type="text" name="originLocation" value={formData.originLocation} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: Fazenda Boa Esperança" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destino (Cidade)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input required type="text" name="destination" value={formData.destination} onChange={handleChange} className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: Santos - SP" />
                  </div>
                  <button type="button" onClick={handleAddDestination} className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex-shrink-0" title="Adicionar outro destino">
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local do Destino</label>
                <input type="text" name="destinationLocation" value={formData.destinationLocation} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: Porto de Santos" />
              </div>
              {additionalDestinations.map((dest, idx) => (
                <React.Fragment key={idx}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destino Adicional {idx + 1} (Cidade)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input required type="text" value={dest.city} onChange={e => handleAdditionalDestinationChange(idx, 'city', e.target.value)} className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: Campinas - SP" />
                      </div>
                      <button type="button" onClick={() => handleRemoveDestination(idx)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0" title="Remover destino">
                        -
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local do Destino Adicional {idx + 1}</label>
                    <input type="text" value={dest.location} onChange={e => handleAdditionalDestinationChange(idx, 'location', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: Galpão Central" />
                  </div>
                </React.Fragment>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Volume Total (Ton)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ScaleIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input required type="number" min="0" step="0.01" name="totalTonnage" value={formData.totalTonnage} onChange={handleChange} className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: 500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cadência Diária</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input type="text" name="dailySchedule" value={formData.dailySchedule} onChange={handleChange} className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: 50 ton/dia, ou Livre" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produto</label>
                <select required name="productId" value={formData.productId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Selecione um produto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anexos</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAttachmentClick}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 justify-center transition-colors"
                  >
                    <PaperclipIcon className="w-4 h-4" />
                    Anexar Arquivos
                  </button>
                </div>
                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {attachments.map((file, index) => (
                      <li key={index} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 px-2 py-1.5 rounded-md">
                        <span className="truncate max-w-[85%]">{file.name}</span>
                        <button type="button" onClick={() => handleRemoveAttachment(file.name)} className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações / Informações Adicionais</label>
                <textarea name="observations" value={formData.observations} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ex: Necessário agendamento prévio, veículo sider..." />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" form="freight-offer-form" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Criar Oferta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreightOfferModal;
