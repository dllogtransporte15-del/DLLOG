import React, { useState, useEffect, useRef } from 'react';
import { Shipment, ShipmentStatus, User, UserProfile, Cargo, RiskQueryType, RISK_QUERY_COST_MAP, Product, Client, RiskQueryOption, DEFAULT_RISK_QUERY_OPTIONS, RealProfitData } from '../types';
import { PaperclipIcon, ExternalLinkIcon, MapPinIcon, LoaderIcon } from './icons';
import { fetchRouteGeometry, getRouteSuggestions, RouteSuggestion } from '../services/routing';
import { formatWeightPtBr, isCteApplicableForStatus } from '../utils';
import { extractFiscalDocNumbers } from '../utils/fiscalDocParser';
import { useToast } from '../hooks/useToast';
import { X, Package, Box, DollarSign, Scale, User as UserIcon, MapPin, Building, Truck, FileText, CreditCard } from 'lucide-react';
import { openDocumentInNewTab } from '../utils/documentViewer';

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
    isBreakageWaived?: boolean,
    netBalanceValue?: number,
    unloadedTonnage?: number,
    route?: string,
    grStatus?: 'aprovado' | 'reprovado' | 'reprovado_restrito',
    riskReleaseCode?: string,
    riskQueryType?: string,
    riskQueryCost?: number,
    realProfitData?: RealProfitData,
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
  riskQueryOptions?: RiskQueryOption[];
}

declare const L: any;

const notaFiscalDocTypes = ['Nota Fiscal'];
const travelDocTypes = ['CT-e', 'MDF-e', 'Carta Frete', 'Outros'];
const allowedDocsForClient = [
    'Ticket de Carregamento',
    'Nota Fiscal',
    'CT-e',
    'Comprovante de Descarga'
];

const FileInput: React.FC<{ 
  label: string; 
  onFileChange: (files: FileList | File[] | null) => void; 
  files: File[];
  allowPaste?: boolean;
}> = ({ label, onFileChange, files, allowPaste = true }) => {
  const id = `file-upload-${label.replace(/\s/g, '-')}`;
  const [isDragging, setIsDragging] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const ext = file.type.split('/')[1] || 'png';
          const namedFile = new File([file], `imagem_colada_${Date.now()}.${ext}`, { type: file.type });
          pastedFiles.push(namedFile);
        }
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      onFileChange(pastedFiles);
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 3000);
    }
  };

  const handleClipboardButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        const pastedFiles: File[] = [];
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const namedFile = new File([blob], `imagem_colada_${Date.now()}.${ext}`, { type: imageType });
            pastedFiles.push(namedFile);
          }
        }
        if (pastedFiles.length > 0) {
          onFileChange(pastedFiles);
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 3000);
          return;
        }
      }
      alert('Dica: Para colar, você também pode pressionar Ctrl+V no teclado!');
    } catch {
      alert('Pressione Ctrl+V no teclado para colar a imagem copiada.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className="mb-4"
      onPaste={allowPaste ? handlePaste : undefined}
    >
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
        <button
          type="button"
          onClick={handleClipboardButtonClick}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all shadow-xs cursor-pointer"
          title="Colar imagem copiada da área de transferência (ou aperte Ctrl+V)"
        >
          <span>📋 Colar Imagem (Ctrl+V)</span>
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-3 transition-all ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.01]' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/60 hover:border-indigo-400'
        }`}
      >
        <label
          htmlFor={id}
          className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-300 cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <PaperclipIcon className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="truncate font-medium">
              {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : `Clique para selecionar, arraste ou aperte Ctrl+V`}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 px-2.5 py-1 rounded-md shrink-0 ml-2 border border-indigo-100 dark:border-indigo-800">
            Procurar
          </span>
        </label>
        <input 
          id={id} 
          type="file" 
          className="hidden" 
          multiple 
          onChange={(e) => onFileChange(e.target.files)} 
          accept=".pdf,.png,.jpg,.jpeg,.gif" 
        />
      </div>

      {pasteSuccess && (
        <p className="mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
          ✓ Imagem colada da área de transferência com sucesso!
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{file.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const AttachmentModal: React.FC<AttachmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  shipment, 
  documentName, 
  currentUser, 
  cargo, 
  canSave = true, 
  requiresRiskManagement = true, 
  products = [], 
  clients = [], 
  users = [],
  riskQueryOptions: propRiskQueryOptions 
}) => {
  const riskQueryOptions = React.useMemo<RiskQueryOption[]>(() => {
    if (propRiskQueryOptions && propRiskQueryOptions.length > 0) {
      return propRiskQueryOptions;
    }
    try {
      const saved = localStorage.getItem('transcunha_risk_query_options');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_RISK_QUERY_OPTIONS;
  }, [propRiskQueryOptions]);

  const [singleFiles, setSingleFiles] = useState<File[]>([]);
  const [multiFiles, setMultiFiles] = useState<{ [key: string]: File[] }>({});
  const [bankDetails, setBankDetails] = useState('');
  const [loadedTonnage, setLoadedTonnage] = useState<number | ''>('');
  const [advancePercentage, setAdvancePercentage] = useState<number | ''>('');
  const [advanceValue, setAdvanceValue] = useState<number | ''>('');
  const [tollValue, setTollValue] = useState<number | ''>('');
  const [balanceToReceiveValue, setBalanceToReceiveValue] = useState<number | ''>('');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [isBreakageWaived, setIsBreakageWaived] = useState<boolean>(false);
  const [netBalanceValue, setNetBalanceValue] = useState<number | ''>('');
  const [unloadedTonnage, setUnloadedTonnage] = useState<number | ''>('');
  const [route, setRoute] = useState('');
  const [riskReleaseCode, setRiskReleaseCode] = useState('');
  const [riskQueryType, setRiskQueryType] = useState<string>('');
  const [grStatus, setGrStatus] = useState<'aprovado' | 'reprovado' | 'reprovado_restrito'>('aprovado');
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
      const hasQuebra = shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001;
      const isWaived = shipment.isBreakageWaived ?? (shipment.discountValue === 0 && hasQuebra);
      setIsBreakageWaived(Boolean(isWaived));
      setNetBalanceValue(shipment.netBalanceValue || '');
      setUnloadedTonnage(shipment.unloadedTonnage || '');
      
      setRoute(shipment.route || '');
      setRiskReleaseCode(shipment.riskReleaseCode || '');
      setRiskQueryType((shipment.riskQueryType as RiskQueryType) || '');
      setGrStatus('aprovado');
    }
  }, [isOpen, shipment]);

  // Captura global de colagem de imagem (Ctrl+V) dentro do modal
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && (target as HTMLInputElement).type === 'text') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split('/')[1] || 'png';
            const namedFile = new File([file], `comprovante_colado_${Date.now()}.${ext}`, { type: file.type });
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        setSingleFiles(pastedFiles);
        showToast('Imagem colada da área de transferência com sucesso!', 'success');
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isOpen]);

  // AUTO-PARSING: Extração de informações do Contrato de Frete (Pedágio, Adiantamento, % Adiantamento)
  useEffect(() => {
    const autoParseFreightDoc = async () => {
      const filesToProcess: { [key: string]: File[] } = {};
      if (Object.keys(multiFiles).length > 0) {
        Object.assign(filesToProcess, multiFiles);
      }
      if (singleFiles.length > 0) {
        filesToProcess[documentName || 'Documento'] = singleFiles;
      }
      if (Object.keys(filesToProcess).length > 0) {
        try {
          const parsed = await extractFiscalDocNumbers(filesToProcess);
          let extractedAny = false;
          if (parsed.tollValue !== undefined) {
            setTollValue(parsed.tollValue);
            extractedAny = true;
          }
          if (parsed.advanceValue !== undefined) {
            setAdvanceValue(parsed.advanceValue);
            extractedAny = true;
          }
          if (parsed.advancePercentage !== undefined) {
            setAdvancePercentage(parsed.advancePercentage);
            extractedAny = true;
          }
          if (extractedAny) {
            showToast('Informações de frete extraídas do documento com sucesso!', 'success');
          }
        } catch (err) {
          console.warn('[AttachmentModal] Erro ao extrair dados do contrato:', err);
        }
      }
    };
    autoParseFreightDoc();
  }, [singleFiles, multiFiles, documentName]);

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
         const discount = isBreakageWaived ? 0 : Number(discountValue || 0);
         const calculatedNet = balance - discount;
         
         if (Math.abs(Number(calculatedNet.toFixed(2)) - Number(netBalanceValue)) > 0.001) {
             setNetBalanceValue(calculatedNet > 0 ? Number(calculatedNet.toFixed(2)) : 0);
         }
     }
  }, [balanceToReceiveValue, discountValue, isBreakageWaived, shipment.status]);

  const showRouteField = shipment.status === ShipmentStatus.AguardandoCarregamento;
  const isReadOnlyRoute = [
    ShipmentStatus.AguardandoNota,
    ShipmentStatus.AguardandoFiscal,
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
    if (shipment.status === ShipmentStatus.AguardandoNota || shipment.status === ShipmentStatus.AguardandoFiscal) {
      const someFiles = Object.values(multiFiles).some(arr => Array.isArray(arr) && arr.length > 0);
      if (!someFiles) {
        setError('Anexe pelo menos um documento para avançar.');
        return;
      }
      if (shipment.status === ShipmentStatus.AguardandoNota && !shipment.bankDetails && !bankDetails) {
        setError('Dados bancários são obrigatórios.');
        return;
      }
      filesToAttach = multiFiles;
    } else {
      const existingDocs = shipment.documents?.[documentName];
      const hasExistingDoc = Array.isArray(existingDocs) && existingDocs.length > 0;
      const isRiskModal = shipment.status === ShipmentStatus.AguardandoSeguradora;
      const isReprovedGr = isRiskModal && grStatus !== 'aprovado';
      
      if (shipment.status === ShipmentStatus.Finalizado) {
        filesToAttach = singleFiles.length > 0 ? { [documentName || 'Comprovante de Pagamento de Saldo']: singleFiles } : {};
      } else {
        if (!isReprovedGr && singleFiles.length === 0 && !hasExistingDoc) {
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
        if (isRiskModal && requiresRiskManagement && grStatus === 'aprovado') {
          if (!riskReleaseCode.trim()) {
            setError('O Código de Liberação da Seguradora / Gerenciadora é obrigatório para avançar.');
            return;
          }
          if (!riskQueryType) {
            setError('A Modalidade / Tipo de Consulta Realizada é obrigatória para avançar.');
            return;
          }
        }
        filesToAttach = isReprovedGr ? {} : { [documentName]: singleFiles };
      }
    }
    
    if (shipment.status === ShipmentStatus.AguardandoDescarga && (!unloadedTonnage || Number(unloadedTonnage) <= 0)) {
        showToast('O peso descarregado é obrigatório para informar a entrega.', 'warning');
        return;
    }

    if (shipment.status === ShipmentStatus.AguardandoPagamentoSaldo) {
        const hasQuebra = shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001;
        if (hasQuebra && !isBreakageWaived && (!discountValue || Number(discountValue) <= 0)) {
            showToast('Atenção: Quebra de carga detectada. É obrigatório informar o valor do desconto ou marcar a opção de Abonar a Quebra para prosseguir.', 'warning');
            return;
        }
    }

    const matchedOption = riskQueryOptions.find(o => o.name === riskQueryType || o.name.toLowerCase().trim() === riskQueryType?.toLowerCase().trim());
    const calculatedRiskCost = matchedOption ? matchedOption.cost : (riskQueryType ? (RISK_QUERY_COST_MAP[riskQueryType] ?? RISK_QUERY_COST_MAP[riskQueryType.toLowerCase().trim()] ?? 0) : undefined);
    const isRiskModal = shipment.status === ShipmentStatus.AguardandoSeguradora;

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
        discountValue: shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? (isBreakageWaived ? 0 : (discountValue === '' ? undefined : Number(discountValue))) : undefined,
        isBreakageWaived: shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? isBreakageWaived : undefined,
        netBalanceValue: shipment.status === ShipmentStatus.AguardandoPagamentoSaldo ? Number(netBalanceValue) : undefined,
        unloadedTonnage: shipment.status === ShipmentStatus.AguardandoDescarga ? Number(unloadedTonnage) : undefined,
        route: route ? route : undefined,
        grStatus: isRiskModal ? grStatus : undefined,
        riskReleaseCode: (isRiskModal && grStatus === 'aprovado') ? riskReleaseCode : undefined,
        riskQueryType: (isRiskModal && grStatus === 'aprovado') ? riskQueryType : undefined,
        riskQueryCost: (isRiskModal && grStatus === 'aprovado') ? calculatedRiskCost : undefined,
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
  
  const ignoredDocKeys = new Set([
    'pix_key',
    'cte_number',
    'payment_method',
    'risk_query_cost',
    'risk_query_type',
    'cte_emission_date',
    'risk_release_code',
    'advance_percentage',
    'toll_value',
    'advance_value',
    'balance_value',
    'balance_to_receive_value',
    'discount_value',
    'net_balance_value',
    'unloaded_tonnage',
    'loaded_tonnage',
  ]);

  const isValidDocumentEntry = (key: string, value: any): boolean => {
    if (!key || ignoredDocKeys.has(key.toLowerCase().trim())) return false;
    if (key.startsWith('_')) return false;
    if (Array.isArray(value)) {
      return value.length > 0 && value.some(v => typeof v === 'string' && v.trim() !== '' && (v.startsWith('http') || v.startsWith('/') || v.includes('.')));
    }
    if (typeof value === 'string') {
      return value.trim() !== '' && (value.startsWith('http') || value.startsWith('/') || (value.includes('.') && value.length > 4));
    }
    return false;
  };

  const rawDocEntries = Object.entries(shipment.documents || {}).filter(([key, val]) => isValidDocumentEntry(key, val));

  const documentsToShow = isClientUser
    ? rawDocEntries.filter(([docType]) => allowedDocsForClient.includes(docType))
    : rawDocEntries;

  const requiresBankDetails = shipment.status === ShipmentStatus.AguardandoNota && !shipment.bankDetails;
  const creationDocuments = documentsToShow.filter(([docType]) => docType === 'Arquivos Iniciais');
  const statusDocuments = documentsToShow.filter(([docType]) => docType !== 'Arquivos Iniciais');

  const renderDocumentList = (docs: [string, any][]) => {
    const validDocs = docs.filter(([key, files]) => {
      if (!isValidDocumentEntry(key, files)) return false;
      const fileList = Array.isArray(files) ? files : (typeof files === 'string' ? [files] : []);
      return fileList.length > 0;
    });

    if (validDocs.length === 0) {
      return (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">Nenhum documento anexado nesta seção.</p>
      );
    }

    return (
      <ul className="space-y-4">
        {validDocs.map(([docType, files]) => {
          const fileList = (Array.isArray(files) ? files : (typeof files === 'string' ? [files] : [])).filter(f => typeof f === 'string' && f.trim() !== '');
          if (fileList.length === 0) return null;

          return (
            <li key={docType}>
              <p className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">{docType}:</p>
              <div className="flex flex-wrap gap-2">
                {fileList.map((file, index) => {
                  const fileName = typeof file === 'string' ? (file.split('/').pop()?.split('?')[0] || '') : '';
                  const rawDecoded = decodeURIComponent(fileName);
                  const cleanFileName = rawDecoded.includes('_') ? rawDecoded.split('_').slice(2).join('_') || rawDecoded : (rawDecoded || `Anexo ${index + 1}`);
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => openDocumentInNewTab(file, `${docType} - ${cleanFileName}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/50"
                      title="Visualizar documento em nova janela (com opções de Baixar e Imprimir)"
                    >
                      <PaperclipIcon className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{cleanFileName || 'Visualizar Anexo'}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

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
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50">
                    {shipment.id}
                  </span>
                  {cargo?.sequenceId && (
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      Carga #{cargo.sequenceId}
                    </span>
                  )}
                  {cargo?.tmsLoteNumber && (
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/60 flex items-center gap-1" title={`Lote TMS: ${cargo.tmsLoteNumber}`}>
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-emerald-600 text-white font-bold text-[9px]">✓</span>
                      Lote TMS: {cargo.tmsLoteNumber}
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
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Frete Mtr / ton
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                  shipment.driverFreightType === 'PF'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}>
                  {shipment.driverFreightType || 'PJ'}
                </span>
              </div>
              <div className="font-black text-emerald-400 text-xs flex items-baseline gap-1.5">
                <span>{formatCurrency(driverRate)}</span>
                <span className={`text-[10px] font-bold ${
                  shipment.driverFreightType === 'PF' ? 'text-amber-400' : 'text-indigo-300'
                }`}>
                  ({shipment.driverFreightType || 'PJ'})
                </span>
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
              {(shipment.cteNumber && isCteApplicableForStatus(shipment.status)) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  CT-e nº {shipment.cteNumber} {shipment.cteEmissionDate ? `(${shipment.cteEmissionDate})` : ''}
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
                <h3 className="text-lg font-semibold mb-4 text-primary">
                    {shipment.status === ShipmentStatus.Finalizado ? 'Demonstrativo Financeiro / Lucro Real da Operação' : `Próximo Passo: ${documentName}`}
                </h3>
                      {shipment.status === ShipmentStatus.AguardandoNota ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                            {notaFiscalDocTypes.map(docType => (
                                <FileInput key={docType} label={docType} files={multiFiles[docType] || []} onFileChange={(f) => setMultiFiles((prev: { [key: string]: File[] }) => ({...prev, [docType]: f ? Array.from(f) : []}))} />
                            ))}
                        </div>
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoFiscal ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                            {travelDocTypes.map(docType => (
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
                        {/* Campo de Status/Resultado da Gerenciadora de Risco */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Resultado da Gerenciadora de Risco (GR) <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={grStatus} 
                                onChange={(e) => setGrStatus(e.target.value as 'aprovado' | 'reprovado' | 'reprovado_restrito')} 
                                className="p-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 font-medium"
                            >
                                <option value="aprovado">🟢 Liberado / Aprovado no GR</option>
                                <option value="reprovado">🔴 Reprovado no GR (Cancelar Embarque)</option>
                                <option value="reprovado_restrito">⛔ Reprovado no GR e Restrito (Cancelar Embarque e Restringir Motorista)</option>
                            </select>
                        </div>

                        {grStatus === 'aprovado' ? (
                            <>
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
                                            onChange={(e) => setRiskQueryType(e.target.value)} 
                                            className="p-2.5 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                                            required
                                        >
                                            <option value="" disabled>Selecione a modalidade de consulta...</option>
                                            {riskQueryOptions
                                              .filter(opt => opt.active || opt.name === riskQueryType)
                                              .sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999))
                                              .map((opt, idx) => (
                                                <option key={opt.id || idx} value={opt.name}>
                                                  {(opt.orderIndex ?? (idx + 1))} - {opt.name} (Valor: R$ {opt.cost.toFixed(2).replace('.', ',')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {riskQueryType && (
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Custo Registrado de Gerenciamento de Risco:</span>
                                        <span className="text-sm font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-emerald-900 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                            R$ {(riskQueryOptions.find(o => o.name === riskQueryType || o.name.toLowerCase().trim() === riskQueryType?.toLowerCase().trim())?.cost ?? (RISK_QUERY_COST_MAP[riskQueryType] ?? RISK_QUERY_COST_MAP[riskQueryType.toLowerCase().trim()] ?? 0)).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : grStatus === 'reprovado' ? (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 space-y-1">
                                <div className="font-bold flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                                    ⚠️ Ação ao clicar em "Salvar e Avançar":
                                </div>
                                <p className="text-xs">
                                    Ao salvar com a opção <strong>Reprovado no GR</strong>, este embarque será automaticamente <strong>cancelado</strong> no sistema com o motivo <em>"Reprovado no GR"</em>.
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-900 dark:text-red-200 space-y-1">
                                <div className="font-bold flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
                                    ⛔ Ação ao clicar em "Salvar e Avançar":
                                </div>
                                <p className="text-xs">
                                    Ao salvar com a opção <strong>Reprovado no GR e Restrito</strong>, este embarque será <strong>cancelado</strong> e o motorista <strong>{shipment.driverName}</strong> terá seu cadastro alterado para o status <strong>RESTRITO</strong> (impedindo novos agendamentos).
                                </p>
                            </div>
                        )}
                    </div>
                ) : shipment.status === ShipmentStatus.AguardandoAdiantamento ? (
                    <div className="space-y-4">
                        {/* File upload input */}
                        <FileInput label={documentName} files={singleFiles} onFileChange={(f) => setSingleFiles(f ? Array.from(f) : [])} />

                        {/* Financial calculation & summary box */}
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                <span>Detalhamento de Pagamento do Frete</span>
                                <span className="text-gray-500 dark:text-gray-400 font-medium normal-case">
                                    Frete Total: <strong className="text-gray-900 dark:text-white font-bold">{formatCurrency(totalDriverFreight)}</strong>
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        Valor pago no Tag
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                                        <input 
                                            type="number" 
                                            value={tollValue} 
                                            onChange={(e) => setTollValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                            className={`w-full pl-8 pr-2.5 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 ${!canSave ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400' : 'bg-white'}`}
                                            disabled={!canSave}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        % Adiantamento
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={advancePercentage} 
                                            onChange={(e) => setAdvancePercentage(e.target.value === '' ? '' : Number(e.target.value))} 
                                            className={`w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 ${!canSave ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400' : 'bg-white'}`} 
                                            disabled={!canSave}
                                            placeholder="Ex: 80"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">%</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        Valor pago na Conta
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                                        <input 
                                            type="number" 
                                            value={advanceValue} 
                                            onChange={(e) => setAdvanceValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                            className={`w-full pl-8 pr-2.5 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 ${!canSave ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed text-gray-400' : 'bg-white'}`} 
                                            disabled={!canSave}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>

                                <div className="bg-blue-50/80 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col justify-between shadow-2xs">
                                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-tight">
                                        Total Adiantamento
                                    </span>
                                    <span className="text-base font-black text-blue-900 dark:text-blue-100 mt-1">
                                        {formatCurrency((Number(tollValue) || 0) + (Number(advanceValue) || 0))}
                                    </span>
                                </div>

                                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between shadow-2xs">
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-tight">
                                        Valor do Saldo
                                    </span>
                                    <span className="text-base font-black text-emerald-900 dark:text-emerald-100 mt-1">
                                        {formatCurrency(Math.max(0, totalDriverFreight - ((Number(tollValue) || 0) + (Number(advanceValue) || 0))))}
                                    </span>
                                </div>
                            </div>
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
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium">Valor a Descontar</label>
                                    {(shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001) && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isBreakageWaived ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                                            {isBreakageWaived ? 'Abonado' : 'Quebra'}
                                        </span>
                                    )}
                                </div>
                                <input 
                                    type="number" 
                                    value={isBreakageWaived ? 0 : discountValue} 
                                    disabled={isBreakageWaived}
                                    placeholder={isBreakageWaived ? 'R$ 0,00 (Abonado)' : '0,00'}
                                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} 
                                    className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 ${isBreakageWaived ? 'bg-gray-100 dark:bg-gray-800/60 opacity-80 cursor-not-allowed text-emerald-600 dark:text-emerald-400 font-bold' : ((shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001 && !discountValue) ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : '')}`}
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

                        {/* Alerta / Ação de Quebra */}
                        {shipment.unloadedTonnage !== undefined && shipment.shipmentTonnage !== undefined && (shipment.unloadedTonnage - shipment.shipmentTonnage) < -0.001 && (
                            !isBreakageWaived ? (
                                <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-red-800 dark:text-red-300">Quebra de Carga Detectada</h5>
                                            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                                                Constatado peso descarregado menor que o peso carregado (Diferença: <strong className="font-mono">{(shipment.unloadedTonnage - shipment.shipmentTonnage).toFixed(2)} ton</strong>).<br/>
                                                Informe o valor do desconto referente à quebra ou <strong>abone a quebra</strong> para isentar o motorista de desconto.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsBreakageWaived(true);
                                            setDiscountValue(0);
                                        }}
                                        className="flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border-2 border-emerald-500 hover:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg text-xs font-bold transition-all shadow-sm"
                                    >
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                        Abonar Quebra (Sem Desconto)
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                                Quebra de Carga Abonada
                                                <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">Desconto Isento</span>
                                            </h5>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                                                A quebra de <strong className="font-mono">{(shipment.unloadedTonnage - shipment.shipmentTonnage).toFixed(2)} ton</strong> foi abonada. O saldo será pago integralmente sem desconto de quebra.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsBreakageWaived(false);
                                            setDiscountValue('');
                                        }}
                                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                    >
                                        Desfazer Abono (Aplicar Desconto)
                                    </button>
                                </div>
                            )
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
                        {(shipment.status === ShipmentStatus.AguardandoNota || shipment.status === ShipmentStatus.AguardandoFiscal) && (
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