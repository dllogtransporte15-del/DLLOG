import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Cargo, Client, Product, User, FreightLeg, DailyScheduleEntry, Branch, FreightOffer } from '../types';
import { CargoStatus, CargoType, UserProfile, VehicleSetType, VehicleBodyType, DailyScheduleType, INTERNAL_PROFILES } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { Users, Search } from 'lucide-react';
import { BRAZILIAN_CITIES } from '../brazilianCities';
import { geocodeCity } from '../utils/geocoding';
import { useToast } from '../hooks/useToast';
import { autoFormatInput } from '../utils/formatters';

interface LoadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (load: Cargo | Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById'>) => void;
  loadToEdit: Cargo | null;
  clients: Client[];
  products: Product[];
  currentUser: User;
  users: User[];
  loads: Cargo[];
  branches: Branch[];
  initialStep?: number;
  offerToConvert?: FreightOffer | null;
}

const STEPS = ['Informações da Carga', 'Programação Diária', 'Valores e Regras'];

const DEFAULT_ALLOWED_VEHICLE_TYPES = Object.values(VehicleSetType).map(setType => ({
    setType,
    bodyTypes: Object.values(VehicleBodyType)
}));

const LoadFormModal: React.FC<LoadFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loadToEdit,
  clients,
  products,
  currentUser,
  users,
  loads,
  branches,
  initialStep = 1,
  offerToConvert
}) => {
  const getInitialState = (): Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById'> => {
    const newSequenceId = loads.length > 0 ? Math.max(...loads.map(c => c.sequenceId)) + 1 : 101;
    
    if (offerToConvert) {
      const companyVal = offerToConvert.counterOfferValue || offerToConvert.freightValuePerTon || 0;
      return {
        sequenceId: newSequenceId,
        clientId: offerToConvert.clientId,
        productId: offerToConvert.productId,
        origin: offerToConvert.origin,
        originLocation: offerToConvert.originLocation || '',
        originMapLink: '',
        destination: offerToConvert.destination,
        destinationLocation: offerToConvert.destinationLocation || '',
        destinationMapLink: '',
        totalVolume: offerToConvert.totalTonnage,
        scheduledVolume: 0,
        loadedVolume: 0,
        companyFreightValuePerTon: companyVal,
        driverFreightValuePerTon: 0,
        hasIcms: offerToConvert.hasIcms ?? false,
        icmsPercentage: offerToConvert.icmsPercentage ?? 0,
        requiresScheduling: false,
        type: CargoType.Spot,
        status: CargoStatus.EmAndamento,
        loadingDeadline: '',
        allowedVehicleTypes: DEFAULT_ALLOWED_VEHICLE_TYPES,
        freightLegs: [
          { companyFreightValuePerTon: companyVal, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: offerToConvert.hasIcms ?? false, icmsPercentage: offerToConvert.icmsPercentage ?? 0 },
          { companyFreightValuePerTon: 0, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: false, icmsPercentage: 0 }
        ],
        dailySchedule: [],
        observations: offerToConvert.dailySchedule ? `Cadência sugerida pelo cliente: ${offerToConvert.dailySchedule}` : '',
        attachments: offerToConvert.attachments || [],
        salespersonCommissionPerTon: 0,
        branchId: currentUser.branchId,
        schedulingSystemUrl: '',
        schedulingUser: '',
        schedulingPassword: '',
        allowedProfiles: [...INTERNAL_PROFILES],
        tmsLoteNumber: ''
      };
    }

    return {
      sequenceId: newSequenceId,
      clientId: clients[0]?.id || '',
      productId: products[0]?.id || '',
      origin: '',
      originLocation: '',
      originMapLink: '',
      destination: '',
      destinationLocation: '',
      destinationMapLink: '',
      totalVolume: 0,
      scheduledVolume: 0,
      loadedVolume: 0,
      companyFreightValuePerTon: 0,
      driverFreightValuePerTon: 0,
      hasIcms: false,
      icmsPercentage: 0,
      requiresScheduling: false,
      type: CargoType.Spot,
      status: CargoStatus.EmAndamento,
      loadingDeadline: '',
      allowedVehicleTypes: [],
      freightLegs: [
        { companyFreightValuePerTon: 0, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: false, icmsPercentage: 0 },
        { companyFreightValuePerTon: 0, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: false, icmsPercentage: 0 }
      ],
      dailySchedule: [],
      observations: '',
      attachments: [],
      salespersonCommissionPerTon: 0,
      branchId: currentUser.branchId,
      schedulingSystemUrl: '',
      schedulingUser: '',
      schedulingPassword: '',
      allowedProfiles: [...INTERNAL_PROFILES],
      tmsLoteNumber: ''
    };
  };
  
  const [step, setStep] = useState(initialStep);
  const [load, setLoad] = useState<Omit<Cargo, 'id' | 'history' | 'createdAt' | 'createdById' | 'scheduledVolume' | 'loadedVolume'> & { createdById?: string }>(getInitialState());
  const [hasMultiLeg, setHasMultiLeg] = useState(false);
  const [showSalesperson, setShowSalesperson] = useState(false);
  
  const [newScheduleStartDate, setNewScheduleStartDate] = useState('');
  const [newScheduleEndDate, setNewScheduleEndDate] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<DailyScheduleType>(DailyScheduleType.Livre);
  const [newScheduleTonnage, setNewScheduleTonnage] = useState<number | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for allowed vehicle types rules UI
  const [currentSetType, setCurrentSetType] = useState<VehicleSetType>(VehicleSetType.LSSimples);
  const [currentBodyTypes, setCurrentBodyTypes] = useState<VehicleBodyType[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const commercialUsers = useMemo(() => {
    return users.filter(u => u.profile === UserProfile.Comercial || u.profile === UserProfile.Admin);
  }, [users]);

  const internalUsers = useMemo(() => {
    return users.filter(u => u.active !== false && u.profile !== UserProfile.Cliente && u.profile !== UserProfile.Motorista);
  }, [users]);

  const filteredInternalUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return internalUsers;
    const term = userSearchTerm.toLowerCase();
    return internalUsers.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.profile.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  }, [internalUsers, userSearchTerm]);

  const toggleUserAccess = (userId: string) => {
    setLoad(prev => {
      const current = prev.allowedUserIds || [];
      if (current.includes(userId)) {
        return { ...prev, allowedUserIds: current.filter(id => id !== userId) };
      } else {
        return { ...prev, allowedUserIds: [...current, userId] };
      }
    });
  };

  const handleSelectAllUsers = () => {
    setLoad(prev => ({
      ...prev,
      allowedUserIds: internalUsers.map(u => u.id)
    }));
  };

  const handleDeselectAllUsers = () => {
    setLoad(prev => ({
      ...prev,
      allowedUserIds: []
    }));
  };

  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
        setStep(initialStep);
        if (loadToEdit) {
            const { history, createdAt, id, scheduledVolume, loadedVolume, ...editableLoad } = loadToEdit;
            const legs = editableLoad.freightLegs && editableLoad.freightLegs.length > 0
                ? [...editableLoad.freightLegs]
                : [{
                    companyFreightValuePerTon: editableLoad.companyFreightValuePerTon,
                    driverFreightValuePerTon: editableLoad.driverFreightValuePerTon,
                    driverFreightValuePerTonPf: editableLoad.driverFreightValuePerTon,
                    disablePfFreight: false,
                    hasIcms: editableLoad.hasIcms,
                    icmsPercentage: editableLoad.icmsPercentage
                  }];
            
            while (legs.length < 2) {
                legs.push({ companyFreightValuePerTon: 0, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: false, icmsPercentage: 0 });
            }
            
            setLoad({ 
                ...editableLoad, 
                freightLegs: legs, 
                dailySchedule: editableLoad.dailySchedule || [],
                observations: editableLoad.observations || '',
                attachments: editableLoad.attachments || [],
                allowedVehicleTypes: editableLoad.allowedVehicleTypes || [],
                salespersonName: editableLoad.salespersonName || '',
                salespersonCommissionPerTon: editableLoad.salespersonCommissionPerTon || 0,
                originLocation: editableLoad.originLocation || '',
                destinationLocation: editableLoad.destinationLocation || '',
                branchId: editableLoad.branchId,
                schedulingSystemUrl: editableLoad.schedulingSystemUrl || '',
                schedulingUser: editableLoad.schedulingUser || '',
                schedulingPassword: editableLoad.schedulingPassword || '',
                allowedProfiles: (editableLoad.allowedProfiles && editableLoad.allowedProfiles.length > 0) ? editableLoad.allowedProfiles : [...INTERNAL_PROFILES],
                allowedUserIds: (editableLoad.allowedUserIds && editableLoad.allowedUserIds.length > 0) ? editableLoad.allowedUserIds : internalUsers.map(u => u.id),
                tmsLoteNumber: editableLoad.tmsLoteNumber || ''
            });
            setHasMultiLeg(editableLoad.freightLegs ? editableLoad.freightLegs.length > 1 : false);
            setShowSalesperson(!!editableLoad.salespersonName);
        } else {
            const { scheduledVolume, loadedVolume, ...initialState } = getInitialState();
            setLoad({ ...initialState, createdById: currentUser.id, allowedUserIds: internalUsers.map(u => u.id) });
            setHasMultiLeg(false);
            setShowSalesperson(false);
        }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialStep, currentUser, internalUsers]);
  
  // Financial & Margin Calculations
  const { totalCompanyFreight, totalDriverFreightPj, totalDriverFreightPf, marginPjPercentage, marginPfPercentage } = useMemo(() => {
    const legs = load.freightLegs || [];
    const activeLegs = hasMultiLeg ? legs.slice(0, 2) : legs.slice(0, 1);

    const totalCompanyFreight = activeLegs.reduce((sum, leg) => sum + (leg.companyFreightValuePerTon || 0), 0);
    const totalDriverFreightPj = activeLegs.reduce((sum, leg) => sum + (leg.driverFreightValuePerTon || 0), 0);
    const totalDriverFreightPf = activeLegs.reduce((sum, leg) => sum + (leg.disablePfFreight ? 0 : (leg.driverFreightValuePerTonPf ?? (leg.driverFreightValuePerTon || 0))), 0);
    
    const totalNetCompanyValue = activeLegs.reduce((sum, leg) => {
        const icmsRate = leg.hasIcms ? (leg.icmsPercentage || 0) / 100 : 0;
        return sum + ((leg.companyFreightValuePerTon || 0) * (1 - icmsRate));
    }, 0);

    const totalCommission = load.salespersonCommissionPerTon || 0;
    
    // PJ Margin
    const netProfitPj = totalNetCompanyValue - totalDriverFreightPj - totalCommission;
    const marginPj = (totalNetCompanyValue > 0) ? (netProfitPj / totalNetCompanyValue) * 100 : 0;
    const marginPjPercentage = isNaN(marginPj) || !isFinite(marginPj) ? '0,00%' : `${marginPj.toFixed(2).replace('.', ',')}%`;

    // PF Margin
    const netProfitPf = totalNetCompanyValue - totalDriverFreightPf - totalCommission;
    const marginPf = (totalNetCompanyValue > 0) ? (netProfitPf / totalNetCompanyValue) * 100 : 0;
    const marginPfPercentage = isNaN(marginPf) || !isFinite(marginPf) ? '0,00%' : `${marginPf.toFixed(2).replace('.', ',')}%`;

    return { totalCompanyFreight, totalDriverFreightPj, totalDriverFreightPf, marginPjPercentage, marginPfPercentage };
  }, [load.freightLegs, hasMultiLeg, load.salespersonCommissionPerTon]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const formattedValue = autoFormatInput(name, value);
    
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setLoad(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
        setLoad(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
    else {
        setLoad(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  const handleLegChange = (index: number, field: keyof FreightLeg, value: string | number | boolean) => {
    setLoad(prev => {
        const newLegs = [...(prev.freightLegs || [])];
        const legToUpdate = { ...newLegs[index] };
        
        let finalValue = value;
        if (field === 'companyFreightValuePerTon' || field === 'driverFreightValuePerTon' || field === 'driverFreightValuePerTonPf' || field === 'icmsPercentage') {
            finalValue = parseFloat(value as string) || 0;
        }

        (legToUpdate as any)[field] = finalValue;
        
        if (field === 'hasIcms' && value === false) {
            legToUpdate.icmsPercentage = 0;
        }
        
        newLegs[index] = legToUpdate;
        return { ...prev, freightLegs: newLegs };
    });
  };
  
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
          const newFileNames = Array.from(files).map((file: File) => file.name);
          setLoad(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), ...newFileNames.filter(name => !(prev.attachments || []).includes(name))]
          }));
      }
      e.target.value = '';
  };

  const handleRemoveAttachment = (fileName: string) => {
      setLoad(prev => ({
          ...prev,
          attachments: (prev.attachments || []).filter(name => name !== fileName)
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const activeLegs = hasMultiLeg ? (load.freightLegs || []).slice(0, 2) : (load.freightLegs || []).slice(0, 1);

      // Geocode origin and destination
      const [originCoords, destinationCoords] = await Promise.all([
          geocodeCity(load.origin),
          geocodeCity(load.destination)
      ]);

      const finalLoadData = {
          ...load,
          companyFreightValuePerTon: totalCompanyFreight,
          driverFreightValuePerTon: totalDriverFreightPj,
          freightLegs: activeLegs,
          hasIcms: activeLegs[0]?.hasIcms || false,
          icmsPercentage: activeLegs[0]?.icmsPercentage || 0,
          originCoords: originCoords || undefined,
          destinationCoords: destinationCoords || undefined,
      };

      if (loadToEdit) {
        onSave({
          ...loadToEdit, 
          ...finalLoadData,
          scheduledVolume: loadToEdit.scheduledVolume,
          loadedVolume: loadToEdit.loadedVolume,
        });
      } else {
        onSave({
          ...finalLoadData,
          scheduledVolume: 0,
          loadedVolume: 0,
        });
      }
    } catch (err) {
      console.error('Error saving load:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddSchedule = () => {
    if (!newScheduleStartDate) {
        showToast('Por favor, selecione a data inicial.', 'warning');
        return;
    }
    if (!newScheduleEndDate) {
        showToast('Por favor, selecione a data final.', 'warning');
        return;
    }
    if (newScheduleEndDate < newScheduleStartDate) {
        showToast('A data final deve ser igual ou posterior à data inicial.', 'warning');
        return;
    }
    if (!newScheduleTonnage || newScheduleTonnage <= 0) {
        showToast('Informe a quantidade de toneladas previstas para o período.', 'warning');
        return;
    }

    const entries: DailyScheduleEntry[] = [];
    const start = new Date(newScheduleStartDate + 'T00:00:00');
    const end = new Date(newScheduleEndDate + 'T00:00:00');
    const existing = new Set((load.dailySchedule || []).map(e => e.date));
    const skipped: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (existing.has(dateStr)) {
            skipped.push(new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR'));
        } else {
            entries.push({
                date: dateStr,
                type: newScheduleType,
                tonnage: newScheduleTonnage,
            });
        }
    }

    if (entries.length === 0) {
        showToast('Todas as datas do período já possuem programação.', 'warning');
        return;
    }

    if (skipped.length > 0) {
        showToast(`${entries.length} dia(s) adicionado(s). Ignorados (já existiam): ${skipped.join(', ')}.`, 'warning');
    }

    setLoad(prev => ({
        ...prev,
        dailySchedule: [...(prev.dailySchedule || []), ...entries].sort((a,b) => a.date.localeCompare(b.date)),
    }));
    
    setNewScheduleStartDate('');
    setNewScheduleEndDate('');
    setNewScheduleType(DailyScheduleType.Livre);
    setNewScheduleTonnage(undefined);
  };

  const handleRemoveSchedule = (dateToRemove: string) => {
      setLoad(prev => ({
          ...prev,
          dailySchedule: (prev.dailySchedule || []).filter(e => e.date !== dateToRemove),
      }));
  };

  const handleToggleBodyType = (bt: VehicleBodyType) => {
    setCurrentBodyTypes(prev => 
        prev.includes(bt) ? prev.filter(p => p !== bt) : [...prev, bt]
    );
  };
  
  const handleAddAllowedType = () => {
    if (currentBodyTypes.length === 0) {
        showToast("Selecione ao menos um tipo de carroceria.", 'warning');
        return;
    }
    setLoad(prev => {
        const allowedTypes = prev.allowedVehicleTypes || [];
        const existingIndex = allowedTypes.findIndex(avt => avt.setType === currentSetType);
        
        if (existingIndex !== -1) {
            const updatedTypes = [...allowedTypes];
            const existingEntry = updatedTypes[existingIndex];
            const newBodyTypes = [...new Set([...existingEntry.bodyTypes, ...currentBodyTypes])];
            updatedTypes[existingIndex] = { ...existingEntry, bodyTypes: newBodyTypes };
            return { ...prev, allowedVehicleTypes: updatedTypes };
        } else {
            return {
                ...prev,
                allowedVehicleTypes: [
                    ...(prev.allowedVehicleTypes || []),
                    { setType: currentSetType, bodyTypes: currentBodyTypes }
                ]
            };
        }
    });
    setCurrentBodyTypes([]);
  };

  const handleRemoveAllowedType = (setTypeToRemove: VehicleSetType) => {
      setLoad(prev => ({
          ...prev,
          allowedVehicleTypes: prev.allowedVehicleTypes?.filter(avt => avt.setType !== setTypeToRemove)
      }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (!isOpen) return null;

  const leg1 = load.freightLegs?.[0] || { companyFreightValuePerTon: 0, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: false, icmsPercentage: 0 };
  const leg2 = load.freightLegs?.[1] || { companyFreightValuePerTon: 0, driverFreightValuePerTon: 0, driverFreightValuePerTonPf: 0, disablePfFreight: false, hasIcms: false, icmsPercentage: 0 };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 transition-all">
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {loadToEdit ? 'Editar Carga' : 'Nova Carga'}
        </h2>

        {/* Stepper Header */}
        <div className="mb-8 flex items-center justify-between border-b dark:border-gray-700 pb-6 px-2">
            {STEPS.map((s, i) => {
              const isCurrent = i + 1 === step;
              const isCompleted = i + 1 < step;
              return (
                <React.Fragment key={s}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                          isCurrent || isCompleted 
                            ? 'bg-[#0F5132] text-white shadow-md shadow-emerald-900/20' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                            {i + 1}
                        </div>
                        <span className={`text-sm font-semibold tracking-tight ${
                          isCurrent || isCompleted 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {s}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-[2px] bg-gray-200 dark:bg-gray-700 mx-4" />
                    )}
                </React.Fragment>
              );
            })}
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          
          {/* STEP 1: Informações da Carga */}
          {step === 1 && (
            <div className="space-y-4">
                
                {/* Cliente Tomador */}
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cliente Tomador</label>
                    <select 
                      name="clientId" 
                      value={load.clientId} 
                      onChange={handleChange} 
                      className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-xs font-medium" 
                      required
                    >
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>)}
                    </select>
                </div>

                {/* Origem e Destino Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Origem (Cidade e Local) */}
                    <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Origem (Cidade e Local)</label>
                        <div className="space-y-2">
                            <input 
                              name="origin" 
                              value={load.origin} 
                              onChange={handleChange} 
                              placeholder="Cidade de Origem (Ex: São Paulo, SP)" 
                              className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                              required 
                              list="cities-list" 
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input 
                                  name="originLocation" 
                                  value={load.originLocation ?? ''} 
                                  onChange={handleChange} 
                                  placeholder="Local / Fazenda / Galpão" 
                                  className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                                />
                                <input 
                                  name="originMapLink" 
                                  value={load.originMapLink ?? ''} 
                                  onChange={handleChange} 
                                  placeholder="Link Google Maps (Opcional)" 
                                  className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Destino (Cidade e Local) */}
                    <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Destino (Cidade e Local)</label>
                            <button 
                              type="button" 
                              onClick={() => setHasMultiLeg(prev => !prev)}
                              className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 transition-colors text-xs font-medium flex items-center gap-1"
                              title="Adicionar mais destinos/pernas"
                            >
                                <PlusIcon className="w-3 h-3" />
                                <span>Perna Extra</span>
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            <input 
                              name="destination" 
                              value={load.destination} 
                              onChange={handleChange} 
                              placeholder="Cidade de Destino" 
                              className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                              required 
                              list="cities-list" 
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input 
                                  name="destinationLocation" 
                                  value={load.destinationLocation ?? ''} 
                                  onChange={handleChange} 
                                  placeholder="Local / Porto / Galpão" 
                                  className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                                />
                                <input 
                                  name="destinationMapLink" 
                                  value={load.destinationMapLink ?? ''} 
                                  onChange={handleChange} 
                                  placeholder="Link Google Maps (Opcional)" 
                                  className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <datalist id="cities-list">
                    {BRAZILIAN_CITIES.map(city => <option key={city} value={city} />)}
                </datalist>

                {/* Volume Total & Prazo */}
                <div className="border-t dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2.5">Detalhes do Volume, Prazo e Lote</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Volume Total (ton)</label>
                            <input 
                              name="totalVolume" 
                              value={load.totalVolume || ''} 
                              onChange={handleChange} 
                              type="number" 
                              placeholder="Ex: 5000" 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                              step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prazo de Carregamento</label>
                            <input 
                              name="loadingDeadline" 
                              value={load.loadingDeadline || ''} 
                              onChange={handleChange} 
                              type="date" 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Lote TMS (Opcional)</label>
                            <input 
                              name="tmsLoteNumber" 
                              value={load.tmsLoteNumber || ''} 
                              onChange={handleChange} 
                              type="text" 
                              placeholder="Número do Lote TMS"
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs" 
                            />
                        </div>
                    </div>
                </div>

                {/* Observações e Anexos */}
                <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                        <textarea
                            name="observations"
                            value={load.observations || ''}
                            onChange={handleChange}
                            placeholder="Adicione qualquer observação relevante sobre a carga..."
                            className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 shadow-xs"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Anexos</label>
                        <div>
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
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-xs hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-all"
                            >
                                <PaperclipIcon className="w-3.5 h-3.5" />
                                Anexar Arquivos
                            </button>
                        </div>
                        {(load.attachments && load.attachments.length > 0) && (
                            <ul className="mt-2.5 space-y-1">
                                {load.attachments.map((fileName, index) => (
                                    <li key={index} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-lg">
                                        <span>{fileName}</span>
                                        <button type="button" onClick={() => handleRemoveAttachment(fileName)} className="p-1 text-red-500 hover:text-red-700">
                                            <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
          )}

          {/* STEP 2: Programação Diária */}
          {step === 2 && (
             <div className="space-y-4">
                 {/* Timeline Addition Card */}
                 <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       <div>
                         <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Datas</label>
                         <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="date" 
                              value={newScheduleStartDate} 
                              onChange={(e) => setNewScheduleStartDate(e.target.value)} 
                              className="py-2 px-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white"
                            />
                            <input 
                              type="date" 
                              value={newScheduleEndDate} 
                              min={newScheduleStartDate} 
                              onChange={(e) => setNewScheduleEndDate(e.target.value)} 
                              className="py-2 px-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white"
                            />
                         </div>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Demanda</label>
                         <select 
                           value={newScheduleType} 
                           onChange={(e) => setNewScheduleType(e.target.value as DailyScheduleType)} 
                           className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                         >
                           {Object.values(DailyScheduleType).map(type => <option key={type} value={type}>{type}</option>)}
                         </select>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Toneladas</label>
                         <input 
                           type="number" 
                           value={newScheduleTonnage || ''} 
                           onChange={(e) => setNewScheduleTonnage(parseFloat(e.target.value) || undefined)} 
                           placeholder="Toneladas" 
                           className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" 
                           step="0.01" 
                           min="0.01"
                         />
                       </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleAddSchedule} 
                      className="w-full py-2.5 bg-[#0F5132] hover:bg-[#0B3C21] text-white font-bold rounded-lg shadow-sm transition-all text-sm tracking-wide"
                    >
                      Adicionar à Timeline
                    </button>
                 </div>

                 {/* Checkbox Exige Agendamento */}
                 <div className="space-y-3 pt-1">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        name="requiresScheduling" 
                        checked={load.requiresScheduling} 
                        onChange={handleChange} 
                        className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600" 
                      />
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Exige Agendamento</span>
                    </label>

                    {load.requiresScheduling && (
                      <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Link do Sistema Externo</label>
                            <input 
                              name="schedulingSystemUrl" 
                              value={load.schedulingSystemUrl || ''} 
                              onChange={handleChange} 
                              placeholder="https://..." 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Usuário</label>
                            <input 
                              name="schedulingUser" 
                              value={load.schedulingUser || ''} 
                              onChange={handleChange} 
                              placeholder="Login do sistema" 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Senha</label>
                            <input 
                              name="schedulingPassword" 
                              type="password"
                              value={load.schedulingPassword || ''} 
                              onChange={handleChange} 
                              placeholder="Senha" 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Timeline List */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Timeline de Programação</h3>
                        {(load.dailySchedule || []).length > 0 && (
                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
                                {(load.dailySchedule || []).length} dia(s) — {((load.dailySchedule || []).reduce((s, e) => s + (e.tonnage || 0), 0)).toLocaleString('pt-BR')} ton total
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-2">
                        {(load.dailySchedule || []).length > 0 ? (
                            (load.dailySchedule || []).map(entry => (
                                <div key={entry.date} className="flex justify-between items-center p-2.5 border border-gray-200 rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-gray-800 dark:text-gray-200 text-xs w-24">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{entry.type}</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{(entry.tonnage || 0).toLocaleString('pt-BR')} ton</span>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveSchedule(entry.date)} className="p-1 text-red-500 hover:text-red-700"><XIcon className="w-3.5 h-3.5"/></button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">Nenhuma programação diária definida.</p>
                        )}
                    </div>
                 </div>

                 {/* Visibilidade da Carga por Usuário - LIST VIEW */}
                 <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    Visibilidade da Carga (Usuários Permitidos)
                                </h3>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Marque os usuários internos que têm permissão para visualizar e gerenciar esta carga.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 shadow-2xs">
                                {(load.allowedUserIds || []).length} / {internalUsers.length} com acesso
                            </span>
                        </div>
                    </div>

                    {/* Barra de Busca e Ações em Massa */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative flex-1 w-full">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                placeholder="Buscar por nome ou perfil..."
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={handleSelectAllUsers}
                                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                            >
                                Marcar Todos
                            </button>
                            <button
                                type="button"
                                onClick={handleDeselectAllUsers}
                                className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                            >
                                Limpar
                            </button>
                        </div>
                    </div>

                    {/* Tabela / Lista em Linhas */}
                    <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        {filteredInternalUsers.length > 0 ? (
                            filteredInternalUsers.map((u) => {
                                const isAllowed = (load.allowedUserIds || []).includes(u.id);
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleUserAccess(u.id)}
                                        className={`flex items-center justify-between p-2.5 cursor-pointer select-none transition-colors ${
                                            isAllowed 
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' 
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={isAllowed}
                                                onChange={() => {}} 
                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer flex-shrink-0"
                                            />
                                            <span className={`text-xs font-bold truncate ${isAllowed ? 'text-emerald-950 dark:text-emerald-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {u.name}
                                            </span>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 border ${
                                            isAllowed 
                                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700' 
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                        }`}>
                                            {u.profile}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
                                Nenhum usuário encontrado para a busca "{userSearchTerm}".
                            </p>
                        )}
                    </div>
                 </div>
             </div>
          )}

          {/* STEP 3: Valores e Regras */}
          {step === 3 && (
            <div className="space-y-4">
                
                {/* Header & Legs */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Valores de Frete (por Tonelada)</h3>
                        <button 
                          type="button" 
                          onClick={() => setHasMultiLeg(prev => !prev)} 
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                        >
                            {hasMultiLeg ? (<><XIcon className="h-3.5 w-3.5" /><span>Remover Perna</span></>) : (<><PlusIcon className="h-3.5 w-3.5" /><span>Adicionar Perna</span></>)}
                        </button>
                    </div>

                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                      Destino: {load.destination || 'Cidade de Destino'}
                    </p>

                    {/* Leg 1 */}
                    <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-2.5">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-1.5">
                            <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wide">Perna 1</h4>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={leg1.hasIcms} 
                                  onChange={(e) => handleLegChange(0, 'hasIcms', e.target.checked)} 
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600" 
                                />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Incide ICMS</span>
                            </label>
                        </div>
                        
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${leg1.hasIcms ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2.5`}>
                            {/* Frete Empresa */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Frete Empresa (R$/ton)</label>
                                <input 
                                  value={leg1.companyFreightValuePerTon || ''} 
                                  onChange={(e) => handleLegChange(0, 'companyFreightValuePerTon', e.target.value)} 
                                  type="number" 
                                  placeholder="Ex: 95" 
                                  className="py-1.5 px-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-600 shadow-2xs" 
                                  step="0.01"
                                />
                            </div>

                            {/* ICMS (%) */}
                            {leg1.hasIcms && (
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">ICMS (%)</label>
                                    <input 
                                      value={leg1.icmsPercentage || ''} 
                                      onChange={(e) => handleLegChange(0, 'icmsPercentage', e.target.value)} 
                                      type="number" 
                                      placeholder="Ex: 12" 
                                      className="py-1.5 px-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white shadow-2xs" 
                                      step="0.01"
                                    />
                                </div>
                            )}

                            {/* Frete Motorista PJ */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Frete Motorista PJ (R$/ton)</label>
                                <input 
                                  value={leg1.driverFreightValuePerTon || ''} 
                                  onChange={(e) => handleLegChange(0, 'driverFreightValuePerTon', e.target.value)} 
                                  type="number" 
                                  placeholder="Ex: 80" 
                                  className="py-1.5 px-2.5 w-full border-2 border-emerald-400 dark:border-emerald-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 shadow-2xs" 
                                  step="0.01"
                                />
                            </div>

                            {/* Frete Motorista PF */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Frete Motorista PF (R$/ton)</label>
                                    <label className="flex items-center space-x-1 cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          checked={leg1.disablePfFreight || false} 
                                          onChange={(e) => handleLegChange(0, 'disablePfFreight', e.target.checked)} 
                                          className="h-3 w-3 rounded border-gray-300 text-orange-600 focus:ring-orange-500" 
                                        />
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Desabilitar</span>
                                    </label>
                                </div>
                                <input 
                                  value={leg1.disablePfFreight ? '' : (leg1.driverFreightValuePerTonPf ?? (leg1.driverFreightValuePerTon || ''))} 
                                  onChange={(e) => handleLegChange(0, 'driverFreightValuePerTonPf', e.target.value)} 
                                  type="number" 
                                  disabled={leg1.disablePfFreight}
                                  placeholder="Ex: 80" 
                                  className={`py-1.5 px-2.5 w-full border-2 border-orange-300 dark:border-orange-500/70 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-orange-500 shadow-2xs ${leg1.disablePfFreight ? 'bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed' : ''}`} 
                                  step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Leg 2 if active */}
                    {hasMultiLeg && (
                        <div className="mt-2.5 p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-2.5">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-1.5">
                                <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wide">Perna 2</h4>
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={leg2.hasIcms} 
                                      onChange={(e) => handleLegChange(1, 'hasIcms', e.target.checked)} 
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600" 
                                    />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Incide ICMS</span>
                                </label>
                            </div>
                            
                            <div className={`grid grid-cols-1 sm:grid-cols-2 ${leg2.hasIcms ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2.5`}>
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Frete Empresa (R$/ton)</label>
                                    <input 
                                      value={leg2.companyFreightValuePerTon || ''} 
                                      onChange={(e) => handleLegChange(1, 'companyFreightValuePerTon', e.target.value)} 
                                      type="number" 
                                      placeholder="0" 
                                      className="py-1.5 px-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm shadow-2xs" 
                                      step="0.01"
                                    />
                                </div>

                                {leg2.hasIcms && (
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">ICMS (%)</label>
                                        <input 
                                          value={leg2.icmsPercentage || ''} 
                                          onChange={(e) => handleLegChange(1, 'icmsPercentage', e.target.value)} 
                                          type="number" 
                                          placeholder="Ex: 12" 
                                          className="py-1.5 px-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white shadow-2xs" 
                                          step="0.01"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Frete PJ (R$/ton)</label>
                                    <input 
                                      value={leg2.driverFreightValuePerTon || ''} 
                                      onChange={(e) => handleLegChange(1, 'driverFreightValuePerTon', e.target.value)} 
                                      type="number" 
                                      placeholder="0" 
                                      className="py-1.5 px-2.5 w-full border-2 border-emerald-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm shadow-2xs" 
                                      step="0.01"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-orange-600 uppercase tracking-wide">Frete PF (R$/ton)</label>
                                    <input 
                                      value={leg2.driverFreightValuePerTonPf || ''} 
                                      onChange={(e) => handleLegChange(1, 'driverFreightValuePerTonPf', e.target.value)} 
                                      type="number" 
                                      placeholder="0" 
                                      className="py-1.5 px-2.5 w-full border-2 border-orange-300 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm shadow-2xs" 
                                      step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Cards Row (Margins) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Card 1: Frete Empresa */}
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Frete Empresa (Total)</span>
                            <p className="text-base font-black text-gray-900 dark:text-white">
                              {totalCompanyFreight.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Frete PJ / Margem PJ */}
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Frete PJ / Margem PJ</span>
                            <p className="text-base font-black text-emerald-900 dark:text-emerald-300">
                              {totalDriverFreightPj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs font-extrabold px-2 py-0.5 rounded-md">
                          {marginPjPercentage}
                        </span>
                    </div>

                    {/* Card 3: Frete PF / Margem PF */}
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider block">Frete PF / Margem PF</span>
                            <p className="text-base font-black text-orange-900 dark:text-orange-300">
                              {totalDriverFreightPf.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs font-extrabold px-2 py-0.5 rounded-md">
                          {marginPfPercentage}
                        </span>
                    </div>
                </div>

                {/* Comissão de Vendedor Externo */}
                <div className="border-t dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Comissão de Vendedor Externo</h3>
                        {!showSalesperson && (
                            <button 
                                type="button" 
                                onClick={() => setShowSalesperson(true)}
                                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                            >
                                <UserPlusIcon className="h-3.5 w-3.5" />
                                <span>Adicionar Vendedor</span>
                            </button>
                        )}
                    </div>

                    {showSalesperson && (
                        <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-2.5">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Dados do Vendedor</h4>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowSalesperson(false);
                                        setLoad(prev => ({ ...prev, salespersonName: '', salespersonCommissionPerTon: 0 }));
                                    }}
                                    className="text-xs font-bold text-red-500 hover:text-red-700"
                                >
                                    Remover
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nome do Vendedor</label>
                                    <input 
                                        name="salespersonName" 
                                        value={load.salespersonName || ''} 
                                        onChange={handleChange} 
                                        placeholder="Ex: João da Silva" 
                                        className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Comissão (R$/Ton)</label>
                                    <input 
                                        name="salespersonCommissionPerTon" 
                                        value={load.salespersonCommissionPerTon || ''} 
                                        onChange={handleChange} 
                                        type="number" 
                                        placeholder="Ex: 2,00" 
                                        className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" 
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tipos de Veículos Permitidos */}
                <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Tipos de Veículos Permitidos</h3>
                    
                    <div className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40 shadow-xs space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Conjunto</label>
                                <select 
                                  value={currentSetType} 
                                  onChange={(e) => setCurrentSetType(e.target.value as VehicleSetType)} 
                                  className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                >
                                    {Object.values(VehicleSetType).map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Carrocerias</label>
                                <div className="flex flex-wrap gap-3">
                                    {Object.values(VehicleBodyType).map(bt => (
                                        <label key={bt} className="flex items-center space-x-1.5 cursor-pointer select-none">
                                            <input 
                                              type="checkbox" 
                                              checked={currentBodyTypes.includes(bt)} 
                                              onChange={() => handleToggleBodyType(bt)} 
                                              className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                            />
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{bt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={handleAddAllowedType} 
                          className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-lg transition-all text-xs"
                        >
                          Adicionar Regra
                        </button>
                    </div>

                    {/* Display Added Rules Pills */}
                    {(load.allowedVehicleTypes && load.allowedVehicleTypes.length > 0) && (
                        <div className="space-y-1.5">
                            {load.allowedVehicleTypes.map(avt => (
                                <div 
                                  key={avt.setType} 
                                  className="flex justify-between items-center p-2.5 bg-blue-50/80 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-lg shadow-2xs"
                                >
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                        <span className="font-bold">{avt.setType}:</span> {avt.bodyTypes.join(', ')}
                                    </p>
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveAllowedType(avt.setType)} 
                                      className="p-1 text-red-500 hover:text-red-700"
                                    >
                                      <XIcon className="w-3.5 h-3.5"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Administração */}
                <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Administração</h3>
                    
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Comercial Responsável</label>
                        <select 
                          name="createdById" 
                          value={load.createdById || currentUser.id} 
                          onChange={handleChange} 
                          className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        >
                            {commercialUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Produto</label>
                            <select 
                              name="productId" 
                              value={load.productId} 
                              onChange={handleChange} 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" 
                              required
                            >
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Status da Carga</label>
                            <select 
                              name="status" 
                              value={load.status} 
                              onChange={handleChange} 
                              className="py-2 px-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                            >
                                {Object.values(CargoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

            </div>
          )}
          </div>

          {/* Footer Navigation */}
          <div className="mt-6 flex justify-between items-center border-t dark:border-gray-700 pt-4">
              <div>
                  {step > 1 && (
                    <button 
                      type="button" 
                      onClick={prevStep} 
                      className="py-2.5 px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
                    >
                      Anterior
                    </button>
                  )}
              </div>
              <div className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="py-2.5 px-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-semibold transition-all"
                  >
                    Cancelar
                  </button>

                  {step < STEPS.length && (
                    <button 
                      type="button" 
                      onClick={nextStep} 
                      className="py-2.5 px-6 bg-[#0F5132] hover:bg-[#0B3C21] text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Próximo
                    </button>
                  )}

                  {step === STEPS.length && (
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="py-2.5 px-6 bg-[#0F5132] hover:bg-[#0B3C21] text-white font-bold rounded-xl shadow-lg shadow-emerald-950/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar Carga'}
                    </button>
                  )}
              </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default LoadFormModal;
