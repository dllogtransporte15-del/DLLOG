import React, { useState, useEffect, useRef } from 'react';
import { Shipment, ShipmentStatus, User, UserProfile, Cargo, RiskQueryType, RISK_QUERY_COST_MAP, Product, Client } from '../types';
import { PaperclipIcon, ExternalLinkIcon, MapPinIcon, LoaderIcon } from './icons';
import { fetchRouteGeometry, getRouteSuggestions, RouteSuggestion } from '../services/routing';
import { formatWeightPtBr } from '../utils';
import { useToast } from '../hooks/useToast';
import { X, Package, Box, DollarSign, Scale, User as UserIcon, MapPin, Building, Truck, FileText, CreditCard } from 'lucide-react';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
    onSave: (data: { 
    filesToAttach: { [key: string]: File[] }, 
    bankDetails?: string, 
    loadedTonnage?: number, 
    advancePercentage?: number, 
    advanceValue?: number,
    tollValue?: number, 
    balanceToReceiveValue?: number,
    discountValue?: number,
    netBalanceValue?: number,
    unloadedTonnage?: number,
    route?: string,
    riskReleaseCode?: string,
    riskQueryType?: string,
    riskQueryCost?: number,
  }) => Promise<void>;
  shipment: Shipment;
  documentName: string;
  currentUser: User;
  cargo?: Cargo;
  canSave?: boolean;
  /** Quando false, libera fluxo simplificado (apenas documento obrigatório no AG. Seguradora). Default: true */
  requiresRiskManagement?: boolean;
  products?: Product[];
  clients?: Client[];
  users?: User[];
}

declare const L: any;

const fiscalDocTypes = ['Nota Fiscal', 'CT-e', 'MDF-e', 'Carta Frete', 'Outros'];
const allowedDocsForClient = [
    'Ticket de Carregamento',
    'Nota Fiscal',
    'CT-e',
    'Comprovante de Descarga'
];

const FileInput: React.FC<{ label: string; onFileChange: (files: FileList | null) => void; files: File[] }> = ({ label, onFileChange, files }) => {
  const id = `file-upload-${label.replace(/\s/g, '-')}`;
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <label
        htmlFor={id}
        className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
      >
        <span>
          {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : `Selecionar arquivo(s)...`}
        </span>
        <PaperclipIcon className="w-4 h-4" />
      </label>
      <input id={id} type="file" className="hidden" multiple onChange={(e) => onFileChange(e.target.files)} accept=".pdf,.png,.jpg,.jpeg,.gif" />
      {files.length > 0 && (
         <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
           {files.map(file => <li key={file.name}>{file.name}</li>)}
         </ul>
      )}
    </div>
  );
};


const AttachmentModal: React.FC<AttachmentModalProps> = ({ isOpen, onClose, onSave, shipment, documentName, currentUser, cargo, canSave = true, requiresRiskManagement = true, products = [], clients = [], users = [] }) => {
  const [singleFiles, setSingleFiles] = useState<File[]>([]);
  const [multiFiles, setMultiFiles] = useState<{ [key: string]: File[] }>({});
  const [bankDetails, setBankDetails] = useState('');
  const [loadedTonnage, setLoadedTonnage] = useState<number | ''>('');
  const [advancePercentage, setAdvancePercentage] = useState<number | ''>('');
  const [advanceValue, setAdvanceValue] = useState<number | ''>('');
  const [tollValue, setTollValue] = useState<number | ''>('');
  const [balanceToReceiveValue, setBalanceToReceiveValue] = useState<number | ''>('');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [netBalanceValue, setNetBalanceValue] = useState<number | ''>('');
  const [unloadedTonnage, setUnloadedTonnage] = useState<number | ''>('');
  const [route, setRoute] = useState('');
  const [riskReleaseCode, setRiskReleaseCode] = useState('');
  const [riskQueryType, setRiskQueryType] = useState<RiskQueryType | ''>('');
  const [suggestions, setSuggestions] = useState<RouteSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const { showToast } = useToast();
  
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<any>(null);
  
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSingleFiles([]);
      setMultiFiles({});
      setBankDetails(shipment.bankDetails || '');
      setLoadedTonnage(shipment.shipmentTonnage || '');
      setAdvancePercentage(shipment.advancePercentage !== undefined ? shipment.advancePercentage : 70);
      setAdvanceValue(shipment.advanceValue || '');
      setTollValue(shipment.tollValue || '');
      
      // Default Balance to Receive = 20% of total Driver Freight
      const estimatedBalance = (shipment.driverFreightValue || 0) * 0.2;
      setBalanceToReceiveValue(shipment.balanceToReceiveValue || (estimatedBalance > 0 ? Number(estimatedBalance.toFixed(2)) : ''));
      setDiscountValue(shipment.discountValue || '');
      setNetBalanceValue(shipment.netBalanceValue || '');
      setUnloadedTonnage(shipment.unloadedTonnage || '');
      
      setRoute(shipment.route || '');
      setRiskReleaseCode(shipment.riskReleaseCode || '');
      setRiskQueryType((shipment.riskQueryType as RiskQueryType) || '');
    }
  }, [isOpen, shipment]);

  // AUTO-CALCULATION: Valor pago na conta = ((Frete / Ton) * (ton efetivado) * (%) do adiantamento) - (Valor pago no tag)
  useEffect(() => {
    if (shipment.status === ShipmentStatus.AguardandoAdiantamento) {
        const driverFreightRate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || 0;
        const loadedTonnageValue = shipment.shipmentTonnage || 0;
        const totalFreight = driverFreightRate * loadedTonnageValue;
        
        const advPercent = Number(advancePercentage || 0);
        const tagVal = Number(tollValue || 0);
        
        const calculatedValue = (totalFreight * (advPercent / 100)) - tagVal;
        
        // Use a threshold to avoid unnecessary updates/floats issues
        if (Math.abs(Number(calculatedValue.toFixed(2)) - Number(advanceValue)) > 0.001) {
            setAdvanceValue(calculatedValue > 0 ? Number(calculatedValue.toFixed(2)) : 0);
        }
    }
  }, [advancePercentage, tollValue, shipment.status, shipment.driverFreightRateSnapshot, shipment.shipmentTonnage, cargo?.driverFreightValuePerTon]);
  
  // AUTO-CALCULATION: Valor Liquido de Saldo = Valor de Saldo a Receber - Valor a Descontar
  useEffect(() => {
     if (shipment.status === ShipmentStatus.AguardandoPagamentoSaldo) {
         const balance = Number(balanceToReceiveValue || 0);
         const discount = Number(discountValue || 0);
         const calculatedNet = balance - discount;
         
         if (Math.abs(Number(calculatedNet.toFixed(2)) - Number(netBalanceValue)) > 0.001) {
             setNetBalanceValue(calculatedNet > 0 ? Number(calculatedNet.toFixed(2)) : 0);
         }
     }
  }, [balanceToReceiveValue, discountValue, shipment.status]);

  const showRouteField = shipment.status === ShipmentStatus.AguardandoCarregamento;
  const isReadOnlyRoute = [
    ShipmentStatus.AguardandoNota,
    ShipmentStatus.AguardandoAdiantamento, 
    ShipmentStatus.AguardandoAgendamento, 
    ShipmentStatus.AguardandoDescarga, 
    ShipmentStatus.AguardandoPagamentoSaldo, 
    ShipmentStatus.Finalizado
  ].includes(shipment.status);

  const handleFetchSuggestions = async () => {
    if (!cargo?.originCoords || !cargo?.destinationCoords) {
        setError('Não foi possível carregar as coordenadas para sugestão.');
        return;
    }
    
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    
    try {
        const results = await getRouteSuggestions(cargo.originCoords, cargo.destinationCoords);
        setSuggestions(results);
    } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError('Falha ao obter sugestões. Tente informar manualmente.');
    } finally {
        setIsLoadingSuggestions(false);
    }
  };

  const drawRouteOnMap = async () => {
    if (!mapRef.current || !cargo?.originCoords || !cargo?.destinationCoords) {
        console.warn('Map or coordinates missing for drawing route');
        return;
    }
    
    const map = mapRef.current;
    
    // Clear existing markers/layers to avoid duplicates
    map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    const origin: [number, number] = [cargo.originCoords.lat, cargo.originCoords.lng];
    const dest: [number, number] = [cargo.destinationCoords.lat, cargo.destinationCoords.lng];

    const originIcon = L.divIcon({
        html: `<div class="w-8 h-8 flex items-center justify-center bg-emerald-500 rounded-full border-2 border-white shadow-xl text-white transform -translate-y-1 transition-transform hover:scale-110">
                 <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
               </div>`,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    const destIcon = L.divIcon({
        html: `<div class="w-8 h-8 flex items-center justify-center bg-red-500 rounded-full border-2 border-white shadow-xl text-white transform -translate-y-1 transition-transform hover:scale-110">
                 <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
               </div>`,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    L.marker(origin, { icon: originIcon }).addTo(map).bindPopup(`<b>Origem:</b> ${cargo.origin}`);
    L.marker(dest, { icon: destIcon }).addTo(map).bindPopup(`<b>Destino:</b> ${cargo.destination}`);

    // Add a temporary dashed line immediately for instant feedback
    const tempLine = L.polyline([origin, dest], { 
        color: '#94a3b8', 
        weight: 2, 
        opacity: 0.5, 
        dashArray: '5, 10' 
    }).addTo(map);
    
    // Initial fit bounds so user sees both markers
    map.fitBounds(tempLine.getBounds(), { padding: [40, 40] });

    try {
        const roadGeometry = await fetchRouteGeometry(cargo.originCoords, cargo.destinationCoords);
        
        // Remove temp line if it exists
        if (map.hasLayer(tempLine)) map.removeLayer(tempLine);

        if (roadGeometry && roadGeometry.coordinates.length > 0) {
            if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
            
            routeLayerRef.current = L.polyline(roadGeometry.coordinates, { 
                color: '#2563EB', 
                weight: 6, 
                opacity: 0.8,
                lineJoin: 'round'
            }).addTo(map);
            
            map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
        } else {
            // If OSRM fails, keep the dashed line but make it more prominent
            tempLine.setStyle({ color: '#2563EB', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);
            console.log('Falling back to straight dashed line');
        }
    } catch (err) {
        console.error('Error in drawRouteOnMap:', err);
        // Fallback already handled by keeping/restyling tempLine
    }
  };

  useEffect(() => {
    if (isOpen && (showRouteField || isReadOnlyRoute) && mapContainerRef.current && !mapRef.current) {
        const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-15.78, -47.92], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OSM'
        }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);
        mapRef.current = map;

        drawRouteOnMap();
        
        setTimeout(() => { map.invalidateSize(); }, 350);
    }

    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, [isOpen, showRouteField, isReadOnlyRoute, cargo]);

  const handleTraceRoute = async () => {
    if (!cargo?.originCoords || !cargo?.destinationCoords) {
        showToast("Coordenadas de origem ou destino não disponíveis.", 'warning');
        return;
    }
    drawRouteOnMap();
  };

  const handleSave = async () => {
    let filesToAttach: { [key: string]: File[] } = {};
    if (shipment.status === ShipmentStatus.AguardandoNota) {
      const someFiles = Object.values(multiFiles).some(arr => Array.isArray(arr) && arr.length > 0);
      if (!someFiles) {
        setError('Anexe pelo menos um documento para avançar.');
        return;
      }
      if (!shipment.bankDetails && !bankDetails) {
        setError('Dados bancários são obrigatórios.');
        return;
      }
      filesToAttach = multiFiles;
    } else {
      const existingDocs = shipment.documents?.[documentName];
      const hasExistingDoc = Array.isArray(existingDocs) && existingDocs.length > 0;
      
      if (singleFiles.length === 0 && !hasExistingDoc) {
        setError('Selecione ao menos um arquivo para anexar.');
        return;
      }
      if (shipment.status === ShipmentStatus.AguardandoCarregamento) {
        if (!route.trim()) {
          setError('A rota do motorista é obrigatória para avançar.');
          return;
        }
        if (!loadedTonnage || Number(loadedTonnage) <= 0) {
          setError('O peso carregado é obrigatório para avançar.');
          return;
        }
        if (!window.confirm(`Confirma o peso carregado de ${loadedTonnage} ton (${formatWeightPtBr(Number(loadedTonnage))}) para este embarque?`)) {
          return;
        }
      }
      if (shipment.status === ShipmentStatus.AguardandoSeguradora && requiresRiskManagement) {
        if (!riskReleaseCode.trim()) {
          setError('O Código de Liberação da Seguradora / Gerenciadora é obrigatório para avançar.');
          return;
        }
        if (!riskQueryType) {
          setError('A Modalidade / Tipo de Consulta Realizada é obrigatória para avançar.');
          return;
        }
      }
      filesToAttach = { [documentName]: singleFiles };
    }
    
    if (shipment.status === ShipmentStatus.AguardandoDescarga && (!unloadedTonnage || Number(unloadedTonnage) <= 0)) {
        showToast('O peso descarregado é obrigatório para informar a entrega.', 'warning');
        return;
    }

    if (shipment.status === ShipmentStatus.AguardandoPagamentoSaldo) {
        const hasQuebra = shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001;
        if (hasQuebra && (!discountValue || Number(discountValue) <= 0)) {
            showToast('Atenção: Quebra de carga detectada. É obrigatório informar o valor do desconto para prosseguir.', 'warning');
            return;
        }
    }

    const calculatedRiskCost = riskQueryType ? (RISK_QUERY_COST_MAP[riskQueryType as RiskQueryType] || 0) : undefined;

    setError('');
    setIsSaving(true);
    try {
      await onSave({ 
        filesToAttach, 
        bankDetails: bankDetails || undefined,
        loadedTonnage: shipment.status === ShipmentStatus.AguardandoCarregamento ? Number(loadedTonnage) : undefined,
        advancePercentage: shipment.status === ShipmentStatus.AguardandoAdiantamento ? Number(advancePercentage) : undefined,
        advanceValue: shipment.status === ShipmentStatus.AguardandoAdiantamento ? Number(advanceValue) : undefined,
        tollValue: shipment.status === ShipmentStatus.AguardandoAdiantamento ? Number(tollValue || 0) : undefined,
        balanceToReceiveValue: shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? Number(balanceToReceiveValue) : undefined,
        discountValue: shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? Number(discountValue) : undefined,
        netBalanceValue: shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? Number(netBalanceValue) : undefined,
        unloadedTonnage: shipment.status === ShipmentStatus.AguardandoDescarga ? Number(unloadedTonnage) : undefined,
        route: (showRouteField || isReadOnlyRoute) ? route : undefined,
        riskReleaseCode: shipment.status === ShipmentStatus.AguardandoSeguradora ? riskReleaseCode : undefined,
        riskQueryType: shipment.status === ShipmentStatus.AguardandoSeguradora ? riskQueryType : undefined,
        riskQueryCost: shipment.status === ShipmentStatus.AguardandoSeguradora ? calculatedRiskCost : undefined,
      });
    } catch (err: any) {
      console.error('Error in handleSave:', err);
      setError(err?.message || 'Ocorreu um erro ao salvar o embarque. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleClose = () => { onClose(); }

  if (!isOpen) return null;

  const isClientUser = currentUser.profile === UserProfile.Cliente;
  const documentsToShow = isClientUser
    ? Object.entries(shipment.documents || {}).filter(([docType]) => allowedDocsForClient.includes(docType))
    : Object.entries(shipment.documents || {});

  const requiresBankDetails = shipment.status === ShipmentStatus.AguardandoNota && !shipment.bankDetails;
  const creationDocuments = documentsToShow.filter(([docType]) => docType === 'Arquivos Iniciais');
  const statusDocuments = documentsToShow.filter(([docType]) => docType !== 'Arquivos Iniciais');

  const renderDocumentList = (docs: [string, any][]) => (
    <ul className="space-y-4">
      {docs.map(([docType, files]) => (
        <li key={docType}>
          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{docType}:</p>
          <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
            {Array.isArray(files) && files.map((file, index) => {
              const downloadUrl = file.startsWith('http') 
                ? (file.includes('?') ? `${file}&download=` : `${file}?download=`)
                : file;
              return (
              <li key={index}>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download className="text-blue-600 dark:text-blue-400 hover:underline">
                  {file.split('_').pop() || 'Acessar Anexo'}
                </a>
              </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const productName = products?.find(p => p.id === cargo?.productId)?.name || cargo?.productId || 'Não especificado';
  const clientName = clients?.find(c => c.id === cargo?.clientId)?.razaoSocial || clients?.find(c => c.id === cargo?.clientId)?.nomeFantasia || cargo?.clientId || 'Não especificado';
  const embarcadorUser = users?.find(u => u.id === shipment.embarcadorId);
  const embarcadorName = embarcadorUser?.name || shipment.embarcadorId || 'Não especificado';

  const driverRate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || (shipment.shipmentTonnage ? shipment.driverFreightValue / shipment.shipmentTonnage : 0);
  const companyRate = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
  const totalDriverFreight = shipment.driverFreightValue || (driverRate * (shipment.shipmentTonnage || 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-5xl w-full max-h-[92vh] overflow-y-auto text-gray-800 dark:text-gray-200 relative border border-gray-100 dark:border-gray-700">
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            title="Fechar"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Dashboard de Informações Otimizadas do Embarque */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl mb-6 border border-slate-700/80 relative overflow-hidden">
          {/* Cabecalho Principal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-700/80">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Gerenciar Anexos
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50">
                    {shipment.id}
                  </span>
                  {cargo?.sequenceId && (
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      Carga #{cargo.sequenceId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pr-8">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm">
                {shipment.status}
              </span>
            </div>
          </div>

          {/* Grid de Informacoes Chave */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
            {/* Produto */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Box className="w-3.5 h-3.5 text-amber-400" /> Produto
              </div>
              <div className="font-bold text-white text-xs truncate" title={productName}>
                {productName}
              </div>
            </div>

            {/* Frete Motorista / ton */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Frete Mtr / ton
              </div>
              <div className="font-black text-emerald-400 text-xs">
                {formatCurrency(driverRate)}
              </div>
            </div>

            {/* Total Frete Motorista */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Frete Mtr
              </div>
              <div className="font-black text-white text-xs">
                {formatCurrency(totalDriverFreight)}
              </div>
            </div>

            {/* Frete Empresa / ton */}
            {!isClientUser && currentUser.profile !== UserProfile.Motorista && (
              <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" /> Frete Emp / ton
                </div>
                <div className="font-bold text-blue-300 text-xs">
                  {formatCurrency(companyRate)}
                </div>
              </div>
            )}

            {/* Tonelagem */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Scale className="w-3.5 h-3.5 text-cyan-400" /> Peso (Ton)
              </div>
              <div className="font-bold text-white text-xs">
                {shipment.shipmentTonnage ? `${shipment.shipmentTonnage} t` : 'Aguardando'}
                {shipment.unloadedTonnage ? ` (${shipment.unloadedTonnage} t desc.)` : ''}
              </div>
            </div>

            {/* Motorista & Placa */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <UserIcon className="w-3.5 h-3.5 text-purple-400" /> Motorista / Placa
              </div>
              <div className="font-bold text-white text-xs truncate" title={shipment.driverName}>
                {shipment.driverName}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {shipment.horsePlate}
              </div>
            </div>

            {/* Rota (Origem → Destino) */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70 col-span-2 sm:col-span-3 lg:col-span-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Rota (Origem → Destino)
              </div>
              <div className="font-medium text-white text-xs truncate" title={`${cargo?.origin || 'N/I'} → ${cargo?.destination || 'N/I'}`}>
                <span className="font-bold text-slate-200">{cargo?.origin || 'N/I'}</span>
                <span className="mx-1.5 text-slate-500">→</span>
                <span className="font-bold text-slate-200">{cargo?.destination || 'N/I'}</span>
              </div>
            </div>

            {/* Solicitante / Cliente */}
            <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/70 col-span-2 sm:col-span-3 lg:col-span-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Building className="w-3.5 h-3.5 text-indigo-400" /> Solicitante / Cliente
              </div>
              <div className="font-bold text-white text-xs truncate" title={`Sol.: ${embarcadorName} | Cliente: ${clientName}`}>
                <span className="text-slate-300">Sol.:</span> {embarcadorName} | <span className="text-slate-300">Cli.:</span> {clientName}
              </div>
            </div>
          </div>
        </div>

        {/* Card de Informações Financeiras & Pagamento */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
                <span className="text-gray-500 dark:text-gray-400 font-medium block mb-0.5">Forma de Pagamento:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                    {shipment.paymentMethod || 'PIX - E-FRETE'}
                </span>
            </div>
            <div>
                <span className="text-gray-500 dark:text-gray-400 font-medium block mb-0.5">Porcentagem de Adiantamento:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {shipment.advancePercentage !== undefined ? shipment.advancePercentage : 70}%
                </span>
            </div>
            <div>
                <span className="text-gray-500 dark:text-gray-400 font-medium block mb-0.5">
                    {shipment.paymentMethod === 'DEPOSITO EM CONTA' ? 'Dados Bancários:' : 'Chave Pix / Dados:'}
                </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                    {shipment.paymentMethod === 'DEPOSITO EM CONTA' ? (shipment.bankDetails || 'Não informados') : (shipment.pixKey || shipment.bankDetails || 'Não informada')}
                </span>
            </div>
        </div>
        
        {documentsToShow.length > 0 && (
          <div className="mb-6 border rounded-md dark:border-gray-600 overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b dark:border-gray-600 font-semibold">Documentos Anexados</div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x dark:divide-gray-600">
                <div className="p-4">
                    <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2 border-b">Troca de Status</h4>
                    {statusDocuments.length > 0 ? renderDocumentList(statusDocuments) : <p className="text-sm italic">Nenhum.</p>}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2 border-b">Cadastro Inicial</h4>
                    {creationDocuments.length > 0 ? renderDocumentList(creationDocuments) : <p className="text-sm italic">Nenhum.</p>}
                </div>
            </div>
          </div>
        )}

        {/* Números de Documentos Fiscais Extraídos */ }
        {(shipment.cteNumber || shipment.nfeNumber || shipment.mdfeNumber) && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">📄 Números de Documentos Fiscais</p>
            <div className="flex flex-wrap gap-2">
              {shipment.cteNumber && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  CT-e nº {shipment.cteNumber}
                </span>
              )}
              {shipment.nfeNumber && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  NF-e nº {shipment.nfeNumber}
                </span>
              )}
              {shipment.mdfeNumber && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-100 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-200 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
                  MDF-e nº {shipment.mdfeNumber}
                </span>
              )}
            </div>
          </div>
        )}

        {!isClientUser ? (
            <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-4 text-primary">Próximo Passo: {documentName}</h3>
                      {shipment.status === ShipmentStatus.AguardandoNota ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                            {fiscalDocTypes.map(docType => (
                                <FileInput key={docType} label={docType} files={multiFiles[docType] || []} onFileChange={(f) => setMultiFiles((prev: { [key: string]: File[] }) => ({...prev, [docType]: f ? Array.from(f) : []}))} />
                            ))}
                        </div>
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoCarregamento ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />
                            <div>
                                <label className="block text-sm font-medium mb-1">Toneladas Carregadas</label>
                                <input type="number" step="0.01" value={loadedTonnage} onChange={(e) => setLoadedTonnage(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                        </div>
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoSeguradora ? (
                    <div className="space-y-4">
                        <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Código de Liberação da Seguradora <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={riskReleaseCode} 
                                    onChange={(e) => setRiskReleaseCode(e.target.value)} 
                                    placeholder="Ex: LIB-984721" 
                                    className="p-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Modalidade de Consulta Realizada <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    value={riskQueryType} 
                                    onChange={(e) => setRiskQueryType(e.target.value as RiskQueryType)} 
                                    className="p-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                                    required
                                >
                                    <option value="" disabled>Selecione a modalidade de consulta...</option>
                                    <option value={RiskQueryType.Siga}>1 - SIGA (Valor: R$ 7,00)</option>
                                    <option value={RiskQueryType.ConsultaBiometria}>2 - Consulta + Biometria (Valor: R$ 15,00)</option>
                                    <option value={RiskQueryType.CadastroConsultaGeral}>3 - Cadastro + Consulta Geral (Valor: R$ 33,00)</option>
                                    <option value={RiskQueryType.Vitimologia}>4 - Vitimologia (Valor: R$ 70,00)</option>
                                    <option value={RiskQueryType.LiberacaoSimplificada}>5 - Liberação Simplificada (Valor: R$ 0,00)</option>
                                </select>
                            </div>
                        </div>

                        {riskQueryType && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Custo Registrado de Gerenciamento de Risco:</span>
                                <span className="text-sm font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-emerald-900 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                    R$ {(RISK_QUERY_COST_MAP[riskQueryType as RiskQueryType] || 0).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        )}
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoAdiantamento ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />
                        <div>
                            <label className="block text-sm font-medium mb-1">Valor pago no tag</label>
                            <input 
                                type="number" 
                                value={tollValue} 
                                onChange={(e) => setTollValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                className={`w-full p-2 border rounded dark:bg-gray-700 ${!canSave ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400' : ''}`}
                                disabled={!canSave}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">(%) do adiantamento</label>
                            <input 
                                type="number" 
                                value={advancePercentage} 
                                onChange={(e) => setAdvancePercentage(e.target.value === '' ? '' : Number(e.target.value))} 
                                className={`w-full p-2 border rounded dark:bg-gray-700 ${!canSave ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400' : ''}`} 
                                disabled={!canSave}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Valor pago na conta</label>
                            <input 
                                type="number" 
                                value={advanceValue} 
                                onChange={(e) => setAdvanceValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                className={`w-full p-2 border rounded dark:bg-gray-700 ${!canSave ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400' : ''}`} 
                                disabled={!canSave}
                            />
                        </div>
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoDescarga ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />
                        <div>
                            <label className="block text-sm font-medium mb-1">Peso Descarregado (Ton)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={unloadedTonnage} 
                                onChange={(e) => setUnloadedTonnage(e.target.value === '' ? '' : Number(e.target.value))} 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                placeholder="Informe o peso conforme ticket"
                            />
                        </div>
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? (
                    <div className="space-y-6">
                        {/* Resumo de Pesos para conferência */}
                        {(shipment.unloadedTonnage !== undefined || shipment.shipmentTonnage !== undefined) && (
                            <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Peso Carregado (A)</p>
                                    <p className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{shipment.shipmentTonnage?.toLocaleString('pt-BR')} ton</p>
                                </div>
                                <div className="text-center border-x dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Peso Descarregado (B)</p>
                                    <p className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{shipment.unloadedTonnage?.toLocaleString('pt-BR') || '---'} ton</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Diferença (B - A)</p>
                                    {shipment.unloadedTonnage && shipment.shipmentTonnage ? (
                                        <p className={`text-sm font-mono font-bold ${(shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {(shipment.unloadedTonnage - shipment.shipmentTonnage).toLocaleString('pt-BR')} ton
                                        </p>
                                    ) : <p className="text-sm font-mono font-bold text-gray-400">---</p>}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />
                            <div>
                                <label className="block text-sm font-medium mb-1">Saldo estimado</label>
                                <input 
                                    type="number" 
                                    value={balanceToReceiveValue} 
                                    onChange={(e) => setBalanceToReceiveValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Valor a Descontar</label>
                                <input 
                                    type="number" 
                                    value={discountValue} 
                                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                    className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 ${(shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001 && !discountValue) ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Valor Líquido de Saldo</label>
                                <input 
                                    type="number" 
                                    value={netBalanceValue} 
                                    onChange={(e) => setNetBalanceValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-bold text-primary"
                                />
                            </div>
                        </div>

                        {/* Alerta de Quebra */}
                        {shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001 && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3">
                                <div className="text-red-600 dark:text-red-400 mt-0.5">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-red-800 dark:text-red-300">Quebra de Carga Detectada</h5>
                                    <p className="text-xs text-red-700 dark:text-red-400 mt-1 lowercase">
                                        FOI CONSTATADO PESO DESCARREGADO MENOR QUE O PESO CARREGADO. <br/>
                                        <span className="font-bold uppercase underline">PARA PROSSEGUIR, É OBRIGATÓRIO INFORMAR O VALOR DO DESCONERTO REFERENTE À QUEBRA.</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />
                )}




                {(showRouteField || isReadOnlyRoute) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 border-t dark:border-gray-700 pt-8">
                        {/* Coluna Esquerda: Texto e Sugestões */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {isReadOnlyRoute ? 'Rota do Motorista' : 'Informar Rota do Motorista'}
                                </label>
                                {!isReadOnlyRoute && (
                                    <button 
                                        type="button"
                                        onClick={handleFetchSuggestions}
                                        disabled={isLoadingSuggestions}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800 text-xs font-bold transition-all hover:bg-blue-100 active:scale-95 disabled:opacity-50"
                                    >
                                        {isLoadingSuggestions ? (
                                            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                                        )}
                                        Sugerir Rotas
                                    </button>
                                )}
                            </div>

                            <textarea 
                                value={route}
                                onChange={(e) => setRoute(e.target.value)}
                                readOnly={isReadOnlyRoute}
                                placeholder={isReadOnlyRoute ? "" : "Ex: Seguir pela BR-050 até Uberlândia, depois BR-365 sentido Patos de Minas..."}
                                className={`w-full p-4 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary dark:bg-gray-800 transition-all font-mono text-sm min-h-[120px] shadow-sm ${isReadOnlyRoute ? 'bg-gray-50/50 dark:bg-gray-900/50 cursor-default shadow-none' : ''}`}
                            />

                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                <div className={`w-2 h-2 ${isReadOnlyRoute ? 'bg-emerald-500' : 'bg-blue-600'} rounded-full`} />
                                {isReadOnlyRoute ? (
                                    <span>Trajeto validado via <span className="font-bold">OSRM Engine</span></span>
                                ) : (
                                    <span>Baseado na rota: <span className="font-bold text-gray-700 dark:text-gray-300">{cargo?.origin} → {cargo?.destination}</span></span>
                                )}
                            </div>

                            {/* Box de Sugestões Encontradas - Somente modo edição */}
                            {!isReadOnlyRoute && (
                                <div className="bg-blue-50/30 dark:bg-blue-900/5 rounded-2xl border border-blue-100 dark:border-blue-800/50 overflow-hidden">
                                    <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800">
                                        <h4 className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                                            Sugestões Encontradas (Clique para usar)
                                        </h4>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {isLoadingSuggestions ? (
                                            <div className="flex items-center justify-center py-4 text-blue-500">
                                                <LoaderIcon className="w-5 h-5 animate-spin" />
                                                <span className="ml-2 text-xs font-semibold animate-pulse">Buscando...</span>
                                            </div>
                                        ) : suggestions.length > 0 ? (
                                            suggestions.map((s: RouteSuggestion, idx: number) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setRoute(s.formatted)}
                                                    className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-blue-50 dark:border-blue-900 rounded-xl text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
                                                >
                                                    {s.formatted}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-center py-2 text-[11px] text-gray-400 italic">Clique em Sugerir Rotas para ver sugestões</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Coluna Direita: Mapa */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    Visualização do Trajeto
                                </label>
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                    Rodovias Ativas
                                </span>
                            </div>
                            
                            <div className="relative group flex-grow">
                                <div 
                                    ref={mapContainerRef} 
                                    className="w-full h-[320px] bg-gray-100 dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 overflow-hidden shadow-xl" 
                                    id="route-map-modal" 
                                />
                                
                                {!isReadOnlyRoute && (
                                    <button 
                                        type="button"
                                        onClick={handleTraceRoute}
                                        className="absolute bottom-4 right-4 z-[1000] p-3 bg-primary text-white rounded-xl shadow-lg hover:bg-primary-dark transition-all transform hover:scale-105 active:scale-95"
                                        title="Atualizar Mapa"
                                    >
                                        <MapPinIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {requiresBankDetails && (
                    <div className="mt-6 border-t pt-4">
                        <label className="block font-semibold mb-2">Dados Bancários</label>
                        <textarea value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600" rows={3} placeholder="Banco, Ag, Conta..." />
                    </div>
                )}

                {error && <p className="mt-4 text-sm text-red-500 font-bold">{error}</p>}

                <div className="mt-8 flex justify-between items-center">
                    <div>
                        {shipment.status === ShipmentStatus.AguardandoNota && (
                            <button onClick={() => window.open('https://transcunha.atua.com.br/adm/fil_ctrc_emissao.php', '_blank')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-bold shadow-md shadow-emerald-200 dark:shadow-none">
                                <ExternalLinkIcon className="w-4 h-4" /> Emitir Documentos
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-bold transition-colors">Cancelar</button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving || (shipment.status === ShipmentStatus.AguardandoAdiantamento && !canSave)}
                            className={`px-8 py-2 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                                (isSaving || (shipment.status === ShipmentStatus.AguardandoAdiantamento && !canSave))
                                ? 'bg-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <LoaderIcon className="w-4 h-4 animate-spin" /> Salvando...
                                </>
                            ) : 'Salvar e Avançar'}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="mt-8 flex justify-end border-t dark:border-gray-700 pt-4">
                <button onClick={onClose} className="px-8 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    Fechar
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentModal;