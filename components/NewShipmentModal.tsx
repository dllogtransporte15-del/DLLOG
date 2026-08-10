import React, { useState, useEffect, useMemo } from 'react';
import type { Cargo, Driver, Shipment, Client, Vehicle, User } from '../types';
import { UserProfile, DailyScheduleType, VehicleSetType, VehicleBodyType, DriverPaymentMethod, ShipmentStatus } from '../types';
import { supabase } from '../supabase';
import { useToast } from '../hooks/useToast';
import { toCargo } from '../lib/db';
import { AlertTriangle, CheckCircle2, X, RefreshCw, ShieldCheck, Zap } from 'lucide-react';


interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shipmentData: any) => void;
  cargo: Cargo | null;
  drivers: Driver[];
  clients: Client[];
  vehicles: Vehicle[];
  currentUser: User | null;
  shipments: Shipment[];
  users: User[];
  offer?: any;
}

const NewShipmentModal: React.FC<NewShipmentModalProps> = ({ isOpen, onClose, onSave, cargo, drivers, clients, vehicles, currentUser, shipments, users, offer }) => {
  const [activeCargo, setActiveCargo] = useState<Cargo | null>(cargo);
  const [isUpdatingCargoPermission, setIsUpdatingCargoPermission] = useState(false);
  const [isSyncingCargo, setIsSyncingCargo] = useState(false);

  const [driverName, setDriverName] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [horsePlate, setHorsePlate] = useState('');
  const [trailer1Plate, setTrailer1Plate] = useState('');
  const [trailer2Plate, setTrailer2Plate] = useState('');
  const [trailer3Plate, setTrailer3Plate] = useState('');
  const [shipmentTonnage, setShipmentTonnage] = useState<number>(0);
  const [driverContact, setDriverContact] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [embarcadorId, setEmbarcadorId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleSetType, setVehicleSetType] = useState<VehicleSetType | ''>('');
  const [vehicleBodyType, setVehicleBodyType] = useState<VehicleBodyType | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<DriverPaymentMethod | string>(DriverPaymentMethod.PixEFrete);
  const [pixKey, setPixKey] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [advancePercentage, setAdvancePercentage] = useState<number>(70);
  const [vehicleTag, setVehicleTag] = useState('');
  const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
  const [driverReferences, setDriverReferences] = useState('');
  const [driverFreightType, setDriverFreightType] = useState<'PJ' | 'PF'>('PJ');
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeShipmentsFound, setActiveShipmentsFound] = useState<Shipment[]>([]);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (cargo) {
      setActiveCargo(cargo);
    }
  }, [cargo]);

  const handleScanDocument = async (files: File[]) => {
    if (files.length === 0) {
        showToast('Selecione um arquivo primeiro.', 'warning');
        return;
    }
    
    setIsScanning(true);
    try {
        for (const file of files) {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
            });
            reader.readAsDataURL(file);
            const base64Image = await base64Promise;

            const { data, error } = await supabase.functions.invoke('process-document', {
                body: { image: base64Image, fileType: file.type }
            });

            if (error) throw error;

            if (data) {
                if (data.driverName) setDriverName(data.driverName);
                if (data.driverCpf) setDriverCpf(data.driverCpf);
                if (data.horsePlate) setHorsePlate(data.horsePlate.toUpperCase());
                if (data.trailerPlates && Array.isArray(data.trailerPlates)) {
                    if (data.trailerPlates[0]) setTrailer1Plate(data.trailerPlates[0].toUpperCase());
                    if (data.trailerPlates[1]) setTrailer2Plate(data.trailerPlates[1].toUpperCase());
                    if (data.trailerPlates[2]) setTrailer3Plate(data.trailerPlates[2].toUpperCase());
                }
                
                let refs = driverReferences;
                if (data.driverCnh) refs += `\nCNH: ${data.driverCnh}`;
                if (data.ownerName) refs += `\nProprietário: ${data.ownerName}`;
                if (data.ownerCpfCnpj) refs += `\nCPF/CNPJ Proprietário: ${data.ownerCpfCnpj}`;
                setDriverReferences(refs.trim());
            }
        }
        showToast('Digitalização concluída! Por favor, revise os campos preenchidos.', 'success');
    } catch (err: any) {
        console.error('Erro ao digitalizar:', err);
        showToast(`Erro na Digitalização: ${err.message || 'Ocorreu um erro ao processar o documento.'}\n\nCertifique-se de que a GEMINI_API_KEY está configurada no Supabase.`, 'error');
    } finally {
        setIsScanning(false);
    }
  };

  const embarcadores = useMemo(() => {
    return users
      .filter(u => u.active !== false && u.profile !== UserProfile.Motorista && u.profile !== UserProfile.Cliente)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [users]);

  const prevIsOpen = React.useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      const driverUser = users.find(u => u.id === offer?.driverId);
      const initialDriverName = offer?.driverName || driverUser?.name || '';
      setDriverName(initialDriverName);
      
      const driverInDb = initialDriverName 
        ? drivers.find(d => d.name.trim().toLowerCase() === initialDriverName.trim().toLowerCase())
        : undefined;

      let lastShipment;
      if (initialDriverName) {
         lastShipment = shipments
            .filter(s => s.driverName.trim().toLowerCase() === initialDriverName.trim().toLowerCase())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      }

      setDriverCpf(driverInDb?.cpf || lastShipment?.driverCpf || '');
      setOwnerContact(lastShipment?.ownerContact || '');
      setHorsePlate(lastShipment?.horsePlate || '');
      setTrailer1Plate(lastShipment?.trailer1Plate || '');
      setTrailer2Plate(lastShipment?.trailer2Plate || '');
      setTrailer3Plate(lastShipment?.trailer3Plate || '');
      setShipmentTonnage(0);
      setDriverContact(offer?.driverContact || lastShipment?.driverContact || '');
      setScheduledDate('');
      setScheduledTime('');
      setSelectedVehicle(null);
      setVehicleSetType(lastShipment?.vehicleSetType || '');
      setVehicleBodyType(lastShipment?.vehicleBodyType || '');
      setPaymentMethod(lastShipment?.paymentMethod || DriverPaymentMethod.PixEFrete);
      setPixKey(lastShipment?.pixKey || '');
      setBankDetails(lastShipment?.bankDetails || '');
      setAdvancePercentage(lastShipment?.advancePercentage !== undefined ? lastShipment.advancePercentage : 70);
      setVehicleTag(lastShipment?.vehicleTag || '');
      setFilesToAttach([]);
      setDriverReferences(lastShipment?.driverReferences || '');
      setDriverFreightType(lastShipment?.driverFreightType || 'PJ');
      setEmbarcadorId(currentUser?.id || '');
      setShowConfirmModal(false);
      setActiveShipmentsFound([]);
      setPendingPayload(null);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, currentUser]);

  // Driver selection & Autofill logic
  const [lastAlertedDriverId, setLastAlertedDriverId] = useState<string>('');
  const [lastAutofilledDriverId, setLastAutofilledDriverId] = useState<string>('');
  const [lastAutofilledPlate, setLastAutofilledPlate] = useState<string>('');

  useEffect(() => {
    const cleanName = driverName.trim().toLowerCase();
    const cleanCpf = driverCpf.replace(/\D/g, '');

    const driverByName = cleanName ? drivers.find(d => d.name.trim().toLowerCase() === cleanName) : undefined;
    const driverByCpf = cleanCpf.length === 11 ? drivers.find(d => d.cpf.replace(/\D/g, '') === cleanCpf) : undefined;

    const selectedDriver = driverByName || driverByCpf;

    if (selectedDriver) {
        if (driverByName && selectedDriver.cpf && selectedDriver.cpf.replace(/\D/g, '') !== cleanCpf && !driverCpf) {
            setDriverCpf(selectedDriver.cpf);
        } else if (driverByCpf && selectedDriver.name.trim().toLowerCase() !== cleanName && !driverName) {
            setDriverName(selectedDriver.name);
        }

        setDriverContact(selectedDriver.phone || '');

        if (!selectedDriver.active && lastAlertedDriverId !== selectedDriver.id) {
            showToast(`ATENÇÃO: Este motorista encontra-se RESTRITO! Motivo: ${selectedDriver.restrictionReason || 'Sem motivo especificado'}. O sistema impedirá a criação desta ordem.`, 'error', 10000);
            setLastAlertedDriverId(selectedDriver.id);
        } else if (selectedDriver.active) {
            setLastAlertedDriverId(''); 
        }

        if (lastAutofilledDriverId !== selectedDriver.id && selectedDriver.active) {
            const selectedCleanCpf = selectedDriver.cpf ? selectedDriver.cpf.replace(/\D/g, '') : '';
            const lastShipment = shipments
                .filter(s => 
                    (s.driverCpf && s.driverCpf.replace(/\D/g, '') === selectedCleanCpf) || 
                    (s.driverName.trim().toLowerCase() === selectedDriver.name.trim().toLowerCase())
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

            if (lastShipment) {
                setHorsePlate(lastShipment.horsePlate || '');
                setTrailer1Plate(lastShipment.trailer1Plate || '');
                setTrailer2Plate(lastShipment.trailer2Plate || '');
                setTrailer3Plate(lastShipment.trailer3Plate || '');
                setOwnerContact(lastShipment.ownerContact || '');
                if (lastShipment.paymentMethod) setPaymentMethod(lastShipment.paymentMethod);
                if (lastShipment.pixKey) setPixKey(lastShipment.pixKey);
                if (lastShipment.bankDetails) setBankDetails(lastShipment.bankDetails);
                if (lastShipment.advancePercentage !== undefined) setAdvancePercentage(lastShipment.advancePercentage);
                setVehicleTag(lastShipment.vehicleTag || '');
                if (lastShipment.driverFreightType) {
                  setDriverFreightType(lastShipment.driverFreightType);
                }
            }
            setLastAutofilledDriverId(selectedDriver.id);
        } else if (!selectedDriver.active) {
            setLastAutofilledDriverId(selectedDriver.id);
        }
    } else {
        setLastAutofilledDriverId('');
        setLastAlertedDriverId('');
    }
  }, [driverName, driverCpf, drivers, shipments, lastAlertedDriverId, lastAutofilledDriverId]);
  
  useEffect(() => {
    const cleanPlate = horsePlate.trim().toLowerCase();
    const vehicle = vehicles.find(v => v.plate.trim().toLowerCase() === cleanPlate);
    setSelectedVehicle(vehicle || null);
    
    if (vehicle) {
        setVehicleSetType(vehicle.setType);
        setVehicleBodyType(vehicle.bodyType);
    } else {
        setVehicleSetType('');
        setVehicleBodyType('');
    }

    if (cleanPlate && cleanPlate.length >= 7 && lastAutofilledPlate !== cleanPlate) {
        const lastShipmentByPlate = shipments
            .filter(s => s.horsePlate && s.horsePlate.trim().toLowerCase() === cleanPlate)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (lastShipmentByPlate) {
            setTrailer1Plate(lastShipmentByPlate.trailer1Plate || '');
            setTrailer2Plate(lastShipmentByPlate.trailer2Plate || '');
            setTrailer3Plate(lastShipmentByPlate.trailer3Plate || '');
        }
        setLastAutofilledPlate(cleanPlate);
    } else if (!cleanPlate) {
        setLastAutofilledPlate('');
    }
  }, [horsePlate, vehicles, shipments, lastAutofilledPlate]);

  // Live Vehicle Compatibility Validator
  const vehicleValidationInfo = useMemo(() => {
    const setType = vehicleSetType || selectedVehicle?.setType || '';
    const bodyType = vehicleBodyType || selectedVehicle?.bodyType || '';

    if (!activeCargo?.allowedVehicleTypes || activeCargo.allowedVehicleTypes.length === 0) {
      return { hasRules: false, isAllowed: true, setType, bodyType };
    }

    if (!setType || !bodyType) {
      return { hasRules: true, isAllowed: true, setType, bodyType };
    }

    const isAllowed = activeCargo.allowedVehicleTypes.some(allowed => 
      allowed.setType === setType && allowed.bodyTypes.includes(bodyType as VehicleBodyType)
    );

    return { hasRules: true, isAllowed, setType, bodyType };
  }, [activeCargo, vehicleSetType, vehicleBodyType, selectedVehicle]);

  // Sync Cargo Data on Demand without losing form state
  const handleSyncCargo = async () => {
    if (!activeCargo?.id) return;
    setIsSyncingCargo(true);
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('id', activeCargo.id)
        .single();
      if (error) throw error;
      if (data) {
        const updated = toCargo(data);
        setActiveCargo(updated);
        showToast('Dados e permissões da carga sincronizados com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar carga:', err);
      showToast(`Erro ao sincronizar carga: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingCargo(false);
    }
  };

  // 1-Click Allow Vehicle Type on Cargo
  const handleAllowCurrentVehicleOnCargo = async () => {
    if (!activeCargo) return;
    const currentSetType = vehicleSetType || selectedVehicle?.setType;
    const currentBodyType = vehicleBodyType || selectedVehicle?.bodyType;

    if (!currentSetType || !currentBodyType) {
      showToast('Selecione primeiro o Tipo de Veículo e Carroceria.', 'warning');
      return;
    }

    setIsUpdatingCargoPermission(true);
    try {
      const existingAllowed = [...(activeCargo.allowedVehicleTypes || [])];
      const existingIndex = existingAllowed.findIndex(item => item.setType === currentSetType);

      if (existingIndex >= 0) {
        const bodyTypes = [...existingAllowed[existingIndex].bodyTypes];
        if (!bodyTypes.includes(currentBodyType as VehicleBodyType)) {
          bodyTypes.push(currentBodyType as VehicleBodyType);
          existingAllowed[existingIndex] = {
            ...existingAllowed[existingIndex],
            bodyTypes
          };
        }
      } else {
        existingAllowed.push({
          setType: currentSetType as VehicleSetType,
          bodyTypes: [currentBodyType as VehicleBodyType]
        });
      }

      const { error } = await supabase
        .from('cargos')
        .update({
          allowed_vehicle_types: existingAllowed
        })
        .eq('id', activeCargo.id);

      if (error) throw error;

      const updatedCargo: Cargo = {
        ...activeCargo,
        allowedVehicleTypes: existingAllowed
      };
      setActiveCargo(updatedCargo);
      showToast(`Veículo (${currentSetType} - ${currentBodyType}) permitido nesta carga com sucesso!`, 'success');
    } catch (err: any) {
      console.error('Erro ao atualizar permissão de veículo na carga:', err);
      showToast(`Erro ao atualizar carga: ${err.message || err}`, 'error');
    } finally {
      setIsUpdatingCargoPermission(false);
    }
  };

  // Freight Rate Calculations for PJ and PF
  const leg1 = activeCargo?.freightLegs?.[0] || {
    companyFreightValuePerTon: activeCargo?.companyFreightValuePerTon || 0,
    driverFreightValuePerTon: activeCargo?.driverFreightValuePerTon || 0,
    driverFreightValuePerTonPf: activeCargo?.driverFreightValuePerTon || 0,
    disablePfFreight: false,
    hasIcms: activeCargo?.hasIcms || false,
    icmsPercentage: activeCargo?.icmsPercentage || 0,
  };

  const ratePj = leg1.driverFreightValuePerTon || activeCargo?.driverFreightValuePerTon || 0;
  const isPfDisabled = leg1.disablePfFreight || false;
  const ratePf = isPfDisabled ? 0 : (leg1.driverFreightValuePerTonPf ?? (leg1.driverFreightValuePerTon || activeCargo?.driverFreightValuePerTon || 0));

  const currentFreightRate = (driverFreightType === 'PF' && !isPfDisabled) ? ratePf : ratePj;

  const calculatedFreight = useMemo(() => {
    if (!activeCargo || shipmentTonnage <= 0) return 0;
    return currentFreightRate * shipmentTonnage;
  }, [activeCargo, shipmentTonnage, currentFreightRate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCargo) {
      showToast('Esta carga não existe mais no sistema ou foi removida. Não é possível criar o embarque.', 'error');
      return;
    }

    // Check for Restricted Driver
    const selectedDriverObj = drivers.find(d => 
        (d.name.trim().toLowerCase() === driverName.trim().toLowerCase() && driverName.trim() !== '') || 
        (d.cpf.replace(/\D/g, '') === driverCpf.replace(/\D/g, '') && driverCpf.trim() !== '')
    );

    if (selectedDriverObj && !selectedDriverObj.active) {
        showToast(`Motorista com Restrição: ${selectedDriverObj.restrictionReason || 'Sem motivo especificado'}. Não é permitido criar ordens para este motorista.`, 'error');
        return;
    }

    if (!driverName || !horsePlate || shipmentTonnage <= 0 || !scheduledDate || !embarcadorId || !scheduledTime) {
        showToast('Por favor, preencha todos os campos obrigatórios do formulário.', 'warning');
        return;
    }

    if (driverFreightType === 'PF' && isPfDisabled) {
        showToast('O frete PF (Pessoa Física) foi desabilitado nesta carga. Selecione o frete PJ (Pessoa Jurídica).', 'warning');
        return;
    }
    
    const isNewDriver = !drivers.find(d => d.name.trim().toLowerCase() === driverName.trim().toLowerCase());
    if (isNewDriver && !driverCpf) {
        showToast('Para novos motoristas, o CPF é obrigatório.', 'warning');
        return;
    }
    
    let vehicleInfo: { setType?: VehicleSetType | '', bodyType?: VehicleBodyType | '' };

    if (selectedVehicle) {
        vehicleInfo = selectedVehicle;
    } else {
        if (!vehicleSetType || !vehicleBodyType) {
            showToast('Para novos veículos, o Tipo de Veículo e Carroceria são obrigatórios.', 'warning');
            return;
        }
        vehicleInfo = { setType: vehicleSetType, bodyType: vehicleBodyType };
    }

    if (activeCargo?.allowedVehicleTypes && activeCargo.allowedVehicleTypes.length > 0 && vehicleInfo.setType && vehicleInfo.bodyType) {
        const isAllowed = activeCargo.allowedVehicleTypes.some(allowed => 
            allowed.setType === vehicleInfo.setType && allowed.bodyTypes.includes(vehicleInfo.bodyType as VehicleBodyType)
        );
        if (!isAllowed) {
            showToast(`O tipo do veículo selecionado (${vehicleInfo.setType} - ${vehicleInfo.bodyType}) não é permitido para esta carga. Use o botão "Permitir Este Veículo" acima para liberar.`, 'error');
            return;
        }
    }

    if (activeCargo?.dailySchedule) {
        const scheduleRule = activeCargo.dailySchedule.find(rule => rule.date === scheduledDate);
        if (!scheduleRule) {
            showToast('Não é permitido criar ordens para datas sem programação lançada na carga. Verifique a Data Programada.', 'error');
            return;
        }

        if (scheduleRule.type === DailyScheduleType.Verificar) {
            showToast('Atenção: A programação para este dia exige verificação com o comercial antes de marcar.', 'warning');
        } else if (scheduleRule.type === DailyScheduleType.Fixo && scheduleRule.tonnage) {
            const alreadyScheduledTonnage = shipments
                .filter(s => s.cargoId === activeCargo.id && s.scheduledDate === scheduledDate)
                .reduce((sum, s) => sum + s.shipmentTonnage, 0);
            
            if (alreadyScheduledTonnage + shipmentTonnage > scheduleRule.tonnage) {
                showToast(`Erro: A tonelagem para este dia excede o limite programado de ${scheduleRule.tonnage} ton. Já existem ${alreadyScheduledTonnage} ton programadas.`, 'error');
                return;
            }
        }
    }

    // Validation: Only allow future date/time
    const now = new Date();
    const inputDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    if (inputDateTime <= now) {
        showToast('Data/Hora Inválida: A data e hora programada deve ser posterior ao momento atual.', 'warning');
        return;
    }

    // Hard Validation: Balance Check
    const availableBalance = activeCargo.totalVolume - activeCargo.scheduledVolume;
    if (shipmentTonnage > (availableBalance + 0.001)) {
        showToast(`SALDO INSUFICIENTE: Esta carga possui apenas ${availableBalance.toLocaleString('pt-BR')} ton disponíveis. Você está tentando solicitar ${shipmentTonnage.toLocaleString('pt-BR')} ton.`, 'error');
        return;
    }

    if (paymentMethod === DriverPaymentMethod.PixEFrete && !pixKey.trim()) {
        showToast('Para pagamento via PIX - E-FRETE, a Chave Pix é obrigatória.', 'warning');
        return;
    }

    if (paymentMethod === DriverPaymentMethod.DepositoConta && !bankDetails.trim()) {
        showToast('Para depósito em conta, os Dados Bancários são obrigatórios.', 'warning');
        return;
    }

    const shipmentData = {
      cargoId: activeCargo.id,
      driverName,
      driverCpf,
      driverContact,
      ownerContact: ownerContact || undefined,
      horsePlate,
      trailer1Plate,
      trailer2Plate,
      trailer3Plate,
      shipmentTonnage,
      driverFreightValue: calculatedFreight,
      driverFreightRateSnapshot: currentFreightRate,
      driverFreightType: driverFreightType,
      embarcadorId: embarcadorId,
      scheduledDate,
      scheduledTime,
      vehicleSetType: vehicleSetType || undefined,
      vehicleBodyType: vehicleBodyType || undefined,
      paymentMethod,
      pixKey: paymentMethod === DriverPaymentMethod.PixEFrete ? pixKey : undefined,
      bankDetails: (paymentMethod === DriverPaymentMethod.DepositoConta || bankDetails) ? bankDetails : undefined,
      advancePercentage,
      vehicleTag: vehicleTag || undefined,
      filesToAttach: filesToAttach.length > 0 ? filesToAttach : undefined,
      driverReferences: driverReferences || undefined,
    };

    // Check for active shipments for this driver
    const cleanCpf = driverCpf.replace(/\D/g, '');
    const cleanName = driverName.trim().toLowerCase();

    const activeShipments = (shipments || []).filter(s => {
      if (s.status === ShipmentStatus.Finalizado || s.status === ShipmentStatus.Cancelado) {
        return false;
      }
      const sCpf = s.driverCpf ? s.driverCpf.replace(/\D/g, '') : '';
      const sName = s.driverName ? s.driverName.trim().toLowerCase() : '';

      const matchesCpf = cleanCpf.length === 11 && sCpf === cleanCpf;
      const matchesName = cleanName.length > 0 && sName === cleanName;

      return matchesCpf || matchesName;
    });

    if (activeShipments.length > 0) {
      setPendingPayload(shipmentData);
      setActiveShipmentsFound(activeShipments);
      setShowConfirmModal(true);
      return;
    }

    onSave(shipmentData);
  };

  const handleConfirmSave = () => {
    if (pendingPayload) {
      onSave(pendingPayload);
      setPendingPayload(null);
      setShowConfirmModal(false);
      setActiveShipmentsFound([]);
    }
  };

  if (!isOpen) return null;

  if (!cargo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Carga Não Encontrada</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A carga vinculada a esta solicitação foi removida do sistema ou não está mais disponível. Não é possível criar o embarque.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const clientName = clients.find(c => c.id === activeCargo.clientId)?.nomeFantasia || 'Cliente não encontrado';
  const isExistingDriver = !!drivers.find(d => d.name.trim().toLowerCase() === driverName.trim().toLowerCase() && driverName.trim() !== '');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitação de Embarque</h2>
          <button
            type="button"
            onClick={handleSyncCargo}
            disabled={isSyncingCargo}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Atualizar dados da carga direto do banco sem perder o que digitou"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCargo ? 'animate-spin text-primary' : 'text-gray-500'}`} />
            <span>{isSyncingCargo ? 'Atualizando...' : 'Atualizar Carga'}</span>
          </button>
        </div>
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">Cliente: <span className="font-bold text-gray-900 dark:text-gray-100">{clientName}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Rota: <span className="font-bold text-gray-900 dark:text-gray-100">{activeCargo.origin} → {activeCargo.destination}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Saldo Disponível: <span className="font-bold text-emerald-600 dark:text-emerald-400">{(activeCargo.totalVolume - activeCargo.scheduledVolume).toLocaleString('pt-BR')} ton</span></p>
          </div>
          {activeCargo.allowedVehicleTypes && activeCargo.allowedVehicleTypes.length > 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Veículos Permitidos: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeCargo.allowedVehicleTypes.map(vt => `${vt.setType} (${vt.bodyTypes.join('/')})`).join(', ')}</span>
              </p>
          ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                ✓ Todos os tipos de veículos são permitidos nesta carga
              </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Data Programada</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Horário Previsto</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                </div>
            </div>
            
            {/* Embarcador */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Embarcador Responsável</label>
                <select
                    value={embarcadorId}
                    onChange={(e) => setEmbarcadorId(e.target.value)}
                    className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                >
                    <option value="" disabled>Selecione um responsável...</option>
                    {embarcadores.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>

            {/* Driver info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">CPF do Motorista</label>
                <input type="text" value={driverCpf} onChange={(e) => setDriverCpf(e.target.value)} placeholder="Digite o CPF do motorista" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
              </div>
              <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Contato (WhatsApp)</label>
                  <input type="text" value={driverContact} onChange={(e) => setDriverContact(e.target.value)} placeholder="Contato (auto-preenchido)" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" disabled={isExistingDriver} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Motorista</label>
                  <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Digite o nome do motorista" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required list="driver-names" />
                  <datalist id="driver-names">{drivers.map(d => <option key={d.id} value={d.name} />)}</datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Contato do Proprietário</label>
                <input type="text" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} placeholder="Telefone/WhatsApp do proprietário" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Vehicle Plates & Types */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placa Cavalo</label>
                <input value={horsePlate} onChange={(e) => setHorsePlate(e.target.value.toUpperCase())} placeholder="AAA-1234" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required list="vehicle-plates" />
                <datalist id="vehicle-plates">{vehicles.map(v => <option key={v.id} value={v.plate} />)}</datalist>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Veículo</label>
                    <select value={vehicleSetType} onChange={(e) => setVehicleSetType(e.target.value as VehicleSetType)} className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required={!selectedVehicle} disabled={!!selectedVehicle}>
                        <option value="" disabled>Selecione...</option>
                        {Object.values(VehicleSetType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Carroceria</label>
                    <select value={vehicleBodyType} onChange={(e) => setVehicleBodyType(e.target.value as VehicleBodyType)} className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required={!selectedVehicle} disabled={!!selectedVehicle}>
                        <option value="" disabled>Selecione...</option>
                        {Object.values(VehicleBodyType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Live Vehicle Compatibility & 1-Click Permission Banner */}
            {vehicleValidationInfo.hasRules && (
              <div>
                {!vehicleValidationInfo.isAllowed ? (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          Veículo não permitido na carga: {vehicleValidationInfo.setType} - {vehicleValidationInfo.bodyType}
                        </p>
                        <p className="text-amber-700 dark:text-amber-400 mt-0.5 text-[11px]">
                          Permitidos atualmente: {activeCargo?.allowedVehicleTypes?.map(vt => `${vt.setType} (${vt.bodyTypes.join('/')})`).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSyncCargo}
                        disabled={isSyncingCargo}
                        className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 text-gray-700 dark:text-gray-200 rounded-lg font-semibold flex items-center gap-1 shadow-xs transition-all text-xs"
                        title="Verificar se outra pessoa já atualizou a carga"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingCargo ? 'animate-spin text-primary' : ''}`} />
                        <span>{isSyncingCargo ? 'Checando...' : 'Sincronizar'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAllowCurrentVehicleOnCargo}
                        disabled={isUpdatingCargoPermission}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-all text-xs"
                        title="Adiciona este tipo de veículo nas regras da carga agora sem recarregar a tela"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isUpdatingCargoPermission ? 'Liberando...' : 'Permitir Este Veículo'}</span>
                      </button>
                    </div>
                  </div>
                ) : (vehicleValidationInfo.setType && vehicleValidationInfo.bodyType ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tipo de veículo compatível com as regras desta carga</span>
                  </div>
                ) : null)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placa Carreta 1</label><input type="text" value={trailer1Plate} onChange={(e) => setTrailer1Plate(e.target.value.toUpperCase())} placeholder="Obrigatório" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placa Carreta 2</label><input type="text" value={trailer2Plate} onChange={(e) => setTrailer2Plate(e.target.value.toUpperCase())} placeholder="Opcional" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placa Carreta 3</label><input type="text" value={trailer3Plate} onChange={(e) => setTrailer3Plate(e.target.value.toUpperCase())} placeholder="Opcional" className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            </div>
            
            {/* Formas de Pagamento & Adiantamento */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      FORMA DE PAGAMENTO & ADIANTAMENTO <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span>Adiantamento:</span>
                        <div className="relative w-24">
                            <input 
                                type="number" 
                                value={advancePercentage} 
                                onChange={(e) => setAdvancePercentage(parseFloat(e.target.value) || 0)} 
                                className="p-1.5 pr-6 w-full text-right font-bold text-emerald-600 dark:text-emerald-400 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500"
                                min="0"
                                max="100"
                                required
                            />
                            <span className="absolute right-2 top-1.5 text-xs font-bold text-gray-400">%</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setPaymentMethod(DriverPaymentMethod.PixEFrete)}
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center justify-center gap-1 ${
                            paymentMethod === DriverPaymentMethod.PixEFrete
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                        }`}
                    >
                        <span className="text-sm">⚡ PIX - E-FRETE</span>
                        <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">Via Chave Pix</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPaymentMethod(DriverPaymentMethod.DepositoConta)}
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center justify-center gap-1 ${
                            paymentMethod === DriverPaymentMethod.DepositoConta
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                        }`}
                    >
                        <span className="text-sm">🏦 DEPÓSITO EM CONTA</span>
                        <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">Dados Bancários</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPaymentMethod(DriverPaymentMethod.SmsCartaFrete)}
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center justify-center gap-1 ${
                            paymentMethod === DriverPaymentMethod.SmsCartaFrete
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                        }`}
                    >
                        <span className="text-sm">📱 SMS CARTA FRETE</span>
                        <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">Carta Frete</span>
                    </button>
                </div>

                {paymentMethod === DriverPaymentMethod.PixEFrete && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Chave Pix <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={pixKey} 
                            onChange={(e) => setPixKey(e.target.value)} 
                            placeholder="CPF, CNPJ, Telefone, E-mail ou Chave Aleatória" 
                            className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            required
                        />
                    </div>
                )}

                {paymentMethod === DriverPaymentMethod.DepositoConta && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Dados Bancários <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                            value={bankDetails} 
                            onChange={(e) => setBankDetails(e.target.value)} 
                            placeholder="Banco, Agência, Conta Corrente/Poupança, Favorecido, CPF/CNPJ..." 
                            className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y text-sm" 
                            rows={2} 
                            required
                        />
                    </div>
                )}

                {paymentMethod === DriverPaymentMethod.SmsCartaFrete && (
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
                        <span>ℹ️ Pagamento via SMS Carta Frete para o condutor.</span>
                    </div>
                )}
            </div>

            {/* Document Attachment & Scan */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Anexar Documentos</label>
                <div className="mt-1 flex items-center h-full">
                    <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2.5 px-4 rounded-xl inline-flex items-center transition-colors font-medium text-sm border border-gray-300 dark:border-gray-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                        Anexar
                        <input type="file" multiple className="hidden" onChange={(e) => {
                            if (e.target.files) {
                                setFilesToAttach(Array.from(e.target.files));
                            }
                        }} />
                    </label>
                    <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                        {filesToAttach.length > 0 ? `${filesToAttach.length} arquivo(s) selecionado(s)` : 'Nenhum'}
                    </span>
                    {filesToAttach.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleScanDocument(filesToAttach)}
                            disabled={isScanning}
                            className={`ml-3 text-xs font-bold uppercase py-1.5 px-3 rounded-lg border transition-all ${
                                isScanning 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white'
                            }`}
                        >
                            {isScanning ? 'Processando...' : 'Digitalizar com IA'}
                        </button>
                    )}
                </div>
            </div>
          
            {/* Target Layout from Screenshot: 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                
                {/* Left Column: Toneladas & Tipo de Embarque */}
                <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Toneladas do Embarque</label>
                      <input 
                        type="number" 
                        value={shipmentTonnage || ''} 
                        onChange={(e) => setShipmentTonnage(parseFloat(e.target.value) || 0)} 
                        placeholder="Ex: 35.5" 
                        className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600" 
                        step="0.01" 
                        required 
                      />
                    </div>

                    {/* Dashed Box for TIPO DE EMBARQUE */}
                    <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                          TIPO DE EMBARQUE <span className="text-red-500">*</span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            {/* PJ Card */}
                            <button
                              type="button"
                              onClick={() => setDriverFreightType('PJ')}
                              className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center ${
                                driverFreightType === 'PJ'
                                  ? 'border-emerald-600 bg-white dark:bg-gray-800 shadow-md ring-2 ring-emerald-500/20'
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                              }`}
                            >
                                <span className="text-xl font-black text-gray-900 dark:text-white">PJ</span>
                                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5">Pessoa Jurídica</span>
                                <span className="text-base font-black text-gray-900 dark:text-white mt-2">
                                  {formatCurrency(ratePj)} <span className="text-xs font-normal text-gray-400">/ton</span>
                                </span>
                            </button>

                            {/* PF Card */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!isPfDisabled) setDriverFreightType('PF');
                              }}
                              disabled={isPfDisabled}
                              className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center ${
                                isPfDisabled
                                  ? 'border-gray-200 bg-gray-100 dark:bg-gray-900/50 opacity-50 cursor-not-allowed'
                                  : driverFreightType === 'PF'
                                  ? 'border-orange-500 bg-white dark:bg-gray-800 shadow-md ring-2 ring-orange-500/20'
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                              }`}
                            >
                                <span className="text-xl font-black text-gray-900 dark:text-white">PF</span>
                                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5">Pessoa Física</span>
                                <span className="text-base font-black text-gray-900 dark:text-white mt-2">
                                  {isPfDisabled ? (
                                    <span className="text-xs text-red-500 italic">Desabilitado</span>
                                  ) : (
                                    <>{formatCurrency(ratePf)} <span className="text-xs font-normal text-gray-400">/ton</span></>
                                  )}
                                </span>
                            </button>
                        </div>

                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1 pt-1">
                          ⚠️ Selecione o tipo antes de solicitar
                        </p>
                    </div>
                </div>

                {/* Right Column: Tag & Referências */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tag do Veículo</label>
                        <input 
                          type="text" 
                          value={vehicleTag} 
                          onChange={(e) => setVehicleTag(e.target.value)} 
                          placeholder="Obrigatório" 
                          className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-600" 
                          required 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Referências do Motorista</label>
                        <textarea
                          value={driverReferences}
                          onChange={(e) => setDriverReferences(e.target.value)}
                          placeholder="Indicações, referências ou observações sobre o motorista..."
                          className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y text-sm"
                          rows={4}
                          required
                        />
                    </div>
                </div>
            </div>

            {/* Footer buttons */}
            <div className="mt-8 flex justify-end space-x-4 border-t dark:border-gray-700 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="py-2.5 px-6 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="py-2.5 px-6 bg-[#0F5132] hover:bg-[#0B3C21] text-white font-bold rounded-xl shadow-lg shadow-emerald-950/20 transition-all active:scale-95"
              >
                Solicitar Embarque
              </button>
            </div>
        </form>
      </div>

      {/* Confirmation Modal: Driver has Active Shipment */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-700/60 relative space-y-5 transform transition-all scale-100">
            
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex-shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Atenção: Motorista com Embarque Ativo
                </h3>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                  Este motorista já possui viagem em andamento no sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Driver & Active Shipments Details */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200/80 dark:border-amber-800/40 space-y-3">
              <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                <strong>Motorista:</strong> {driverName} {driverCpf ? `(CPF: ${driverCpf})` : ''}
              </div>
              
              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                  Embarque(s) ativo(s) localizado(s):
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {activeShipmentsFound.map((s) => (
                    <div 
                      key={s.id} 
                      className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-amber-200 dark:border-gray-700 text-xs flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">{s.id}</span>
                        {s.horsePlate && <span className="ml-2 font-mono text-gray-500 dark:text-gray-400">({s.horsePlate})</span>}
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Data Programada: {s.scheduledDate ? `${s.scheduledDate} ${s.scheduledTime || ''}` : 'N/A'}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Deseja confirmar a criação deste novo embarque mesmo assim?
            </p>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sim, Criar Embarque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewShipmentModal;
