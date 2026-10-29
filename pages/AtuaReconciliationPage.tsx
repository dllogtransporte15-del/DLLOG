import React, { useState, useMemo, useRef } from 'react';
import { 
  GitCompare, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  Scale, 
  DollarSign, 
  Layers, 
  Calendar, 
  Sliders, 
  X, 
  Eye, 
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Shipment, Cargo, Client, Driver, Vehicle, User, Branch } from '../types';
import { UserProfile } from '../types';
import { 
  getShipmentCte, 
  getShipmentEffectiveDate, 
  isStayForShipment, 
  normalizeWeightTonnage,
  hasCteAttached
} from '../utils';
import { extractCteNumberFromStay, type StayRecord } from '../utils/toolStorage';
import { calculateShipmentExpenses, DEFAULT_EXPENSES_CONFIG } from '../utils/operationalExpensesCalculator';
import { addPdfLogo } from '../utils/pdfGenerator';
import { 
  parseAtuaPdfFile, 
  parseAtuaExcelFile, 
  parseAtuaTextReport, 
  type AtuaCteRecord, 
  type TranscunhaReportRecord,
  type AtuaReportParseResult,
  normalizePlate 
} from '../utils/atuaReportParser';

interface AtuaReconciliationPageProps {
  currentUser: User;
  shipments: Shipment[];
  cargos: Cargo[];
  clients: Client[];
  drivers: Driver[];
  vehicles: Vehicle[];
  users: User[];
  branches: Branch[];
  stays: StayRecord[];
  companyLogo?: string | null;
  onOpenShipmentDetail?: (shipment: Shipment) => void;
}

export type ReconciliationStatus = 'CONCILIATED' | 'DIVERGENT' | 'ORPHAN_ATUA' | 'PENDING_ATUA';

export interface ReconciliationItem {
  id: string;
  cteNumber: string;
  shipmentId?: string;
  shipment?: Shipment;
  cargo?: Cargo;
  stay?: StayRecord;
  isComplementary: boolean;
  plate: string;
  driverName?: string;
  clientName?: string;
  date?: string;
  origin?: string;
  destination?: string;
  status: ReconciliationStatus;
  divergenceReasons: string[];

  transcunha: {
    weight: number;
    companyFreight: number;
    driverFreight: number;
    toll: number;
    freightDifference: number;
    icms: number;
    federalTax: number;
    totalExpenses: number;
    netProfit: number;
  } | null;

  atua: {
    weight: number;
    companyFreight: number;
    driverFreight: number;
    toll: number;
    freightDifference: number;
    icms: number;
    federalTax: number;
    otherCosts: number;
    netProfit: number;
    isCanceled: boolean;
  } | null;

  delta: {
    weight: number;
    companyFreight: number;
    driverFreight: number;
    toll: number;
    icms: number;
    federalTax: number;
    netProfit: number;
  };
}

const AtuaReconciliationPage: React.FC<AtuaReconciliationPageProps> = ({
  currentUser,
  shipments,
  cargos,
  clients,
  drivers,
  vehicles,
  users,
  branches,
  stays,
  companyLogo,
  onOpenShipmentDetail
}) => {
  const [atuaResult, setAtuaResult] = useState<AtuaReportParseResult | null>(null);
  const [uploadedTranscunhaRecords, setUploadedTranscunhaRecords] = useState<TranscunhaReportRecord[] | null>(null);
  const [transcunhaFileName, setTranscunhaFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Filtros
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tolerance, setTolerance] = useState<number>(0.50); // Tolerância de centavos padrão R$ 0,50
  const [weightTolerance, setWeightTolerance] = useState<number>(0.05); // Tolerância de peso padrão 0.05 t
  const [filterStatus, setFilterStatus] = useState<ReconciliationStatus | 'ALL'>('ALL');
  const [filterDivergenceType, setFilterDivergenceType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'compact' | 'side-by-side'>('side-by-side');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Modal de colar texto
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcunhaFileInputRef = useRef<HTMLInputElement>(null);

  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.nomeFantasia || c.razaoSocial || ''])), [clients]);

  // Handler de upload do arquivo Atua TMS (com detecção inteligente caso o usuário envie o arquivo Transcunha)
  const handleFileUpload = async (file: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      let result: AtuaReportParseResult;
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        result = await parseAtuaPdfFile(file);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
        result = await parseAtuaExcelFile(file);
      } else {
        throw new Error('Formato não suportado. Por favor, envie um arquivo PDF, Excel (.xlsx, .xls) ou CSV.');
      }

      // Se o usuário acidentalmente enviou o relatório de Lucro Real da Transcunha no slot do Atua
      if (result.detectedFileType === 'TRANSCUNHA_PROFIT') {
        const tRecords = result.transcunhaRecords || [];
        setUploadedTranscunhaRecords(tRecords);
        setTranscunhaFileName(file.name);
        setUploadedFileName('');
        if (result.startDate && !startDate) setStartDate(result.startDate);
        if (result.endDate && !endDate) setEndDate(result.endDate);

        setParseError(
          `Arquivo identificado: "Relatório: Lucro Real da Operação de Embarque" da Transcunha (${tRecords.length} embarques importados com sucesso). Para realizar o confronto, selecione agora o "Relatório Detalhado do CTRC" gerado no Atua TMS.`
        );
        return;
      }

      if (result.records.length === 0) {
        throw new Error('Nenhum registro de CT-e pôde ser extraído deste arquivo. Verifique se o relatório é o "Relatório Detalhado do CTRC" do Atua TMS.');
      }

      setAtuaResult(result);
      setUploadedFileName(file.name);

      // Auto-preenche o período se detectado no arquivo
      if (result.startDate && !startDate) {
        setStartDate(result.startDate);
      }
      if (result.endDate && !endDate) {
        setEndDate(result.endDate);
      }
    } catch (err: any) {
      setParseError(err?.message || 'Falha ao processar arquivo.');
      setAtuaResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Handler de upload opcional do arquivo de Lucro Real da Transcunha
  const handleTranscunhaFileUpload = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setTranscunhaFileName(file.name);

    try {
      let result: AtuaReportParseResult;
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        result = await parseAtuaPdfFile(file);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
        result = await parseAtuaExcelFile(file);
      } else {
        throw new Error('Formato não suportado. Por favor, envie um arquivo PDF, Excel (.xlsx, .xls) ou CSV.');
      }

      if (result.transcunhaRecords && result.transcunhaRecords.length > 0) {
        setUploadedTranscunhaRecords(result.transcunhaRecords);
      } else if (result.records.length > 0) {
        const converted: TranscunhaReportRecord[] = result.records.map(r => ({
          shipmentId: r.cteNumber,
          cteNumber: r.cteNumber,
          date: r.emissionDate,
          clientName: r.payer || r.recipient || '---',
          plate: r.plate,
          weight: r.weight,
          companyFreight: r.companyFreight,
          driverFreight: r.driverFreight,
          toll: r.toll,
          icms: r.icmsIssqn,
          federalTax: r.federalTax,
          netProfit: r.result,
          rawLine: r.rawLine
        }));
        setUploadedTranscunhaRecords(converted);
      } else {
        throw new Error('Nenhum registro de embarque identificado neste arquivo.');
      }

      if (result.startDate && !startDate) setStartDate(result.startDate);
      if (result.endDate && !endDate) setEndDate(result.endDate);
    } catch (err: any) {
      setParseError(err?.message || 'Falha ao processar arquivo da Transcunha.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const result = parseAtuaTextReport(pasteText);
      if (result.detectedFileType === 'TRANSCUNHA_PROFIT') {
        const tRecords = result.transcunhaRecords || [];
        setUploadedTranscunhaRecords(tRecords);
        setTranscunhaFileName('Texto Lucro Real');
        setIsPasteModalOpen(false);
        setPasteText('');
        if (result.startDate && !startDate) setStartDate(result.startDate);
        if (result.endDate && !endDate) setEndDate(result.endDate);
        setParseError(`Identificado como Relatório de Lucro Real Transcunha (${tRecords.length} embarques). Agora envie o CTRC do Atua TMS.`);
        return;
      }

      if (result.records.length === 0) {
        throw new Error('Nenhum CT-e encontrado no texto colado.');
      }
      setAtuaResult(result);
      setUploadedFileName('Texto Colado Manualmente');
      setIsPasteModalOpen(false);
      setPasteText('');

      if (result.startDate && !startDate) setStartDate(result.startDate);
      if (result.endDate && !endDate) setEndDate(result.endDate);
    } catch (err: any) {
      setParseError(err?.message || 'Falha ao processar texto.');
    } finally {
      setIsParsing(false);
    }
  };

  // 1. Enriquecimento dos Embarques do Transcunha no Período Selecionado
  const enrichedTranscunhaData = useMemo(() => {
    // Filtra embarques que possuem CT-e emitido e respeitam o período
    const validShipments = shipments.filter(s => {
      const cteVal = s.cteNumber || getShipmentCte(s);
      const hasCte = Boolean(cteVal && cteVal !== '-' && cteVal !== '---' && cteVal.trim() !== '') || hasCteAttached(s);
      if (!hasCte) return false;

      const dateStr = s.scheduledDate || getShipmentEffectiveDate(s);
      if (startDate && dateStr && dateStr < startDate) return false;
      if (endDate && dateStr && dateStr > endDate) return false;
      return true;
    });

    const items: Array<{
      key: string;
      cteNumber: string;
      shipment: Shipment;
      cargo?: Cargo;
      isComplementary: boolean;
      weight: number;
      companyFreight: number;
      driverFreight: number;
      toll: number;
      freightDifference: number;
      icms: number;
      federalTax: number;
      totalExpenses: number;
      netProfit: number;
      plate: string;
      date: string;
      clientName: string;
      origin: string;
      destination: string;
      driverName: string;
    }> = [];

    validShipments.forEach(s => {
      const cargo = s.cargoId ? cargoMap.get(s.cargoId) : undefined;
      const clientName = (cargo?.clientId ? clientMap.get(cargo.clientId) : '') || '---';
      const cte = getShipmentCte(s);
      const calculatedExpenses = calculateShipmentExpenses(s, cargo, DEFAULT_EXPENSES_CONFIG, stays);
      const toll = (s.tollValue !== undefined && s.tollValue !== null) ? Number(s.tollValue) || 0 : (s.realProfitData?.toll || 0);

      // Estadias vinculadas
      const shipmentStays = stays.filter(stay => isStayForShipment(stay, s));
      const demurrageRevenue = shipmentStays.reduce((sum, stay) => sum + (stay.approvedValue || 0), 0);
      const demurrageDriverPaid = shipmentStays.reduce((sum, stay) => sum + (stay.driverPaidValue || 0), 0);
      const demurrageProfit = demurrageRevenue - demurrageDriverPaid;
      const hasComplement = Boolean((demurrageRevenue > 0 || demurrageDriverPaid > 0) || shipmentStays.length > 0);

      // Valores base do Frete Original
      const baseCompanyFreight = (s.realProfitData?.companyFreight !== undefined && s.realProfitData?.companyFreight !== null)
        ? Number(s.realProfitData.companyFreight)
        : calculatedExpenses.companyFreight;
      const baseDriverFreight = (s.realProfitData?.driverFreight !== undefined && s.realProfitData?.driverFreight !== null)
        ? Number(s.realProfitData.driverFreight)
        : calculatedExpenses.driverFreight;
      const baseFreightDifference = baseCompanyFreight - baseDriverFreight;
      const baseNetProfit = Number(calculatedExpenses.netProfit.toFixed(2));

      const icms = (() => {
        const isCargoWithoutIcms = Boolean(
          cargo &&
          !cargo.hasIcms &&
          !(cargo.icmsPercentage && Number(cargo.icmsPercentage) > 0) &&
          !(cargo.freightLegs && cargo.freightLegs[0]?.hasIcms === true) &&
          !(cargo.freightLegs && Number(cargo.freightLegs[0]?.icmsPercentage) > 0) &&
          !(s as any)?.hasIcms
        );
        if (
          isCargoWithoutIcms ||
          (s as any)?.isIcmsExempt ||
          (s.documents as any)?.is_icms_exempt ||
          s.realProfitData?.isIcmsExempt ||
          s.icmsValue === 0 ||
          (s.documents as any)?.icms_value === 0
        ) {
          return 0;
        }
        return Number((calculatedExpenses.icms || (s.documents as any)?.icms_value || s.icmsValue || s.realProfitData?.icmsDifference || 0).toFixed(2));
      })();

      const federalTax = (s.realProfitData?.federalTax !== undefined && s.realProfitData.federalTax !== null)
        ? Number(s.realProfitData.federalTax)
        : Number(calculatedExpenses.impostoFederal || 0);

      const weight = normalizeWeightTonnage(s.unloadedTonnage || s.loadedTonnage || s.shipmentTonnage || cargo?.totalVolume || 0);

      // Linha Principal
      if (cte) {
        items.push({
          key: `${s.id}-base`,
          cteNumber: cte.replace(/[^0-9]/g, ''),
          shipment: s,
          cargo,
          isComplementary: false,
          weight,
          companyFreight: baseCompanyFreight,
          driverFreight: baseDriverFreight,
          toll,
          freightDifference: baseFreightDifference,
          icms,
          federalTax,
          totalExpenses: calculatedExpenses.totalExpenses,
          netProfit: baseNetProfit,
          plate: normalizePlate(s.horsePlate),
          date: s.scheduledDate || '',
          clientName,
          origin: cargo?.origin || '',
          destination: cargo?.destination || '',
          driverName: s.driverName || '---'
        });
      }

      // Sub-linha de CT-e Complementar de Estadia (se houver)
      if (hasComplement) {
        shipmentStays.forEach((stay, idx) => {
          const compCte = stay.cteNumber || extractCteNumberFromStay(stay);
          const stayRev = stay.approvedValue || 0;
          const stayDriver = stay.driverPaidValue || 0;
          const stayDiff = stayRev - stayDriver;

          items.push({
            key: `${s.id}-comp-${idx}`,
            cteNumber: compCte ? compCte.replace(/[^0-9]/g, '') : '',
            shipment: s,
            cargo,
            isComplementary: true,
            weight: 0,
            companyFreight: stayRev,
            driverFreight: stayDriver,
            toll: 0,
            freightDifference: stayDiff,
            icms: 0,
            federalTax: 0,
            totalExpenses: 0,
            netProfit: stayDiff,
            plate: normalizePlate(s.horsePlate),
            date: s.scheduledDate || '',
            clientName,
            origin: cargo?.origin || '',
            destination: cargo?.destination || '',
            driverName: s.driverName || '---'
          });
        });
      }
    });

    // Mescla embarques do relatório Lucro Real em arquivo (se fornecido)
    if (uploadedTranscunhaRecords && uploadedTranscunhaRecords.length > 0) {
      uploadedTranscunhaRecords.forEach((tr, idx) => {
        const cteClean = tr.cteNumber ? tr.cteNumber.replace(/[^0-9]/g, '') : '';
        if (!cteClean) return;

        // Se já está nos itens pelo banco de dados, não duplica
        const exists = items.some(it => it.cteNumber === cteClean);
        if (!exists) {
          const fakeShipment: Shipment = {
            id: tr.shipmentId || `transcunha-file-${idx}`,
            horsePlate: tr.plate,
            scheduledDate: tr.date,
            client: tr.clientName,
            status: 'concluded'
          } as any;

          items.push({
            key: `trans-file-${tr.shipmentId || cteClean}-${idx}`,
            cteNumber: cteClean,
            shipment: fakeShipment,
            cargo: undefined,
            isComplementary: (tr.weight === 0 && tr.companyFreight > 0),
            weight: tr.weight,
            companyFreight: tr.companyFreight,
            driverFreight: tr.driverFreight,
            toll: tr.toll,
            freightDifference: tr.companyFreight - tr.driverFreight,
            icms: tr.icms,
            federalTax: tr.federalTax,
            totalExpenses: 0,
            netProfit: tr.netProfit,
            plate: normalizePlate(tr.plate),
            date: tr.date,
            clientName: tr.clientName,
            origin: '',
            destination: '',
            driverName: '---'
          });
        }
      });
    }

    return items;
  }, [shipments, cargos, cargoMap, clientMap, stays, startDate, endDate, uploadedTranscunhaRecords]);

  // 2. Motor de Reconciliação / Auditoria Cruzada
  const reconciliationItems: ReconciliationItem[] = useMemo(() => {
    if (!atuaResult && enrichedTranscunhaData.length === 0) return [];

    const atuaRecords = atuaResult?.records || [];
    const matchedTranscunhaKeys = new Set<string>();
    const matchedAtuaIndexes = new Set<number>();
    const results: ReconciliationItem[] = [];

    // Passo 1: Cruzar registros do Atua com o Transcunha
    atuaRecords.forEach((atuaRec, atuaIdx) => {
      const atuaCteClean = atuaRec.cteNumber.replace(/[^0-9]/g, '');
      const atuaPlateClean = normalizePlate(atuaRec.plate);

      // Procura primeiro pelo número exato do CT-e
      let match = enrichedTranscunhaData.find(t => t.cteNumber && t.cteNumber === atuaCteClean && !matchedTranscunhaKeys.has(t.key));

      // Fallback: se não achar por CT-e e o peso/frete for compatível, tenta por placa e data próxima (+/- 3 dias)
      if (!match && atuaPlateClean) {
        match = enrichedTranscunhaData.find(t => {
          if (matchedTranscunhaKeys.has(t.key)) return false;
          if (t.plate !== atuaPlateClean) return false;
          if (!atuaRec.emissionDate || !t.date) return false;
          const diffDays = Math.abs((new Date(atuaRec.emissionDate).getTime() - new Date(t.date).getTime()) / (1000 * 3600 * 24));
          return diffDays <= 3;
        });
      }

      if (match) {
        matchedTranscunhaKeys.add(match.key);
        matchedAtuaIndexes.add(atuaIdx);

        // Calcula diferenças
        const deltaWeight = Number((match.weight - atuaRec.weight).toFixed(2));
        const deltaCompanyFreight = Number((match.companyFreight - atuaRec.companyFreight).toFixed(2));
        const deltaDriverFreight = Number((match.driverFreight - atuaRec.driverFreight).toFixed(2));
        const deltaToll = Number((match.toll - atuaRec.toll).toFixed(2));
        const deltaIcms = Number((match.icms - atuaRec.icmsIssqn).toFixed(2));
        const deltaFederalTax = Number((match.federalTax - atuaRec.federalTax).toFixed(2));
        const deltaNetProfit = Number((match.netProfit - atuaRec.result).toFixed(2));

        const reasons: string[] = [];
        if (Math.abs(deltaCompanyFreight) > tolerance) {
          reasons.push(`Frete Empresa diverge em R$ ${Math.abs(deltaCompanyFreight).toFixed(2)}`);
        }
        if (Math.abs(deltaDriverFreight) > tolerance) {
          reasons.push(`Frete Motorista diverge em R$ ${Math.abs(deltaDriverFreight).toFixed(2)}`);
        }
        if (Math.abs(deltaToll) > tolerance) {
          reasons.push(`Pedágio diverge em R$ ${Math.abs(deltaToll).toFixed(2)}`);
        }
        if (Math.abs(deltaIcms) > tolerance) {
          reasons.push(`ICMS diverge em R$ ${Math.abs(deltaIcms).toFixed(2)}`);
        }
        if (Math.abs(deltaFederalTax) > tolerance) {
          reasons.push(`Imposto Federal diverge em R$ ${Math.abs(deltaFederalTax).toFixed(2)}`);
        }
        if (Math.abs(deltaWeight) > weightTolerance) {
          reasons.push(`Peso diverge em ${Math.abs(deltaWeight).toFixed(2)} t`);
        }
        if (Math.abs(deltaNetProfit) > tolerance) {
          reasons.push(`Resultado diverge em R$ ${Math.abs(deltaNetProfit).toFixed(2)}`);
        }

        const isDivergent = reasons.length > 0;

        results.push({
          id: `match-${atuaRec.cteNumber}-${match.key}`,
          cteNumber: atuaRec.cteNumber || match.cteNumber,
          shipmentId: match.shipment.id,
          shipment: match.shipment,
          cargo: match.cargo,
          isComplementary: match.isComplementary || atuaRec.isComplementary,
          plate: match.plate || atuaRec.plate,
          driverName: match.driverName,
          clientName: match.clientName,
          date: atuaRec.emissionDate || match.date,
          origin: match.origin || atuaRec.originCity,
          destination: match.destination || atuaRec.destinationCity,
          status: isDivergent ? 'DIVERGENT' : 'CONCILIATED',
          divergenceReasons: reasons,
          transcunha: {
            weight: match.weight,
            companyFreight: match.companyFreight,
            driverFreight: match.driverFreight,
            toll: match.toll,
            freightDifference: match.freightDifference,
            icms: match.icms,
            federalTax: match.federalTax,
            totalExpenses: match.totalExpenses,
            netProfit: match.netProfit,
          },
          atua: {
            weight: atuaRec.weight,
            companyFreight: atuaRec.companyFreight,
            driverFreight: atuaRec.driverFreight,
            toll: atuaRec.toll,
            freightDifference: atuaRec.companyFreight - atuaRec.driverFreight,
            icms: atuaRec.icmsIssqn,
            federalTax: atuaRec.federalTax,
            otherCosts: atuaRec.otherCosts,
            netProfit: atuaRec.result,
            isCanceled: atuaRec.isCanceled,
          },
          delta: {
            weight: deltaWeight,
            companyFreight: deltaCompanyFreight,
            driverFreight: deltaDriverFreight,
            toll: deltaToll,
            icms: deltaIcms,
            federalTax: deltaFederalTax,
            netProfit: deltaNetProfit,
          }
        });
      } else {
        // Órfão no Atua (Consta no Atua mas não foi encontrado no Transcunha)
        results.push({
          id: `atua-orphan-${atuaRec.cteNumber}-${atuaIdx}`,
          cteNumber: atuaRec.cteNumber,
          isComplementary: atuaRec.isComplementary,
          plate: atuaRec.plate,
          date: atuaRec.emissionDate,
          origin: atuaRec.originCity,
          destination: atuaRec.destinationCity,
          status: 'ORPHAN_ATUA',
          divergenceReasons: ['Consta no relatório do Atua TMS, mas não foi localizado no Transcunha'],
          transcunha: null,
          atua: {
            weight: atuaRec.weight,
            companyFreight: atuaRec.companyFreight,
            driverFreight: atuaRec.driverFreight,
            toll: atuaRec.toll,
            freightDifference: atuaRec.companyFreight - atuaRec.driverFreight,
            icms: atuaRec.icmsIssqn,
            federalTax: atuaRec.federalTax,
            otherCosts: atuaRec.otherCosts,
            netProfit: atuaRec.result,
            isCanceled: atuaRec.isCanceled,
          },
          delta: {
            weight: -atuaRec.weight,
            companyFreight: -atuaRec.companyFreight,
            driverFreight: -atuaRec.driverFreight,
            toll: -atuaRec.toll,
            icms: -atuaRec.icmsIssqn,
            federalTax: -atuaRec.federalTax,
            netProfit: -atuaRec.result,
          }
        });
      }
    });

    // Passo 2: Pendentes no Atua (Constam no Transcunha mas não foram achados no Atua)
    enrichedTranscunhaData.forEach(t => {
      if (!matchedTranscunhaKeys.has(t.key)) {
        results.push({
          id: `transcunha-pending-${t.key}`,
          cteNumber: t.cteNumber,
          shipmentId: t.shipment.id,
          shipment: t.shipment,
          cargo: t.cargo,
          isComplementary: t.isComplementary,
          plate: t.plate,
          driverName: t.driverName,
          clientName: t.clientName,
          date: t.date,
          origin: t.origin,
          destination: t.destination,
          status: 'PENDING_ATUA',
          divergenceReasons: ['Cadastrado no Transcunha, mas não localizado no relatório do Atua TMS'],
          transcunha: {
            weight: t.weight,
            companyFreight: t.companyFreight,
            driverFreight: t.driverFreight,
            toll: t.toll,
            freightDifference: t.freightDifference,
            icms: t.icms,
            federalTax: t.federalTax,
            totalExpenses: t.totalExpenses,
            netProfit: t.netProfit,
          },
          atua: null,
          delta: {
            weight: t.weight,
            companyFreight: t.companyFreight,
            driverFreight: t.driverFreight,
            toll: t.toll,
            icms: t.icms,
            federalTax: t.federalTax,
            netProfit: t.netProfit,
          }
        });
      }
    });

    return results;
  }, [atuaResult, enrichedTranscunhaData, tolerance, weightTolerance]);

  // Totais e KPIs da Conciliação
  const kpis = useMemo(() => {
    const total = reconciliationItems.length;
    const conciliated = reconciliationItems.filter(i => i.status === 'CONCILIATED').length;
    const divergent = reconciliationItems.filter(i => i.status === 'DIVERGENT').length;
    const orphanAtua = reconciliationItems.filter(i => i.status === 'ORPHAN_ATUA').length;
    const pendingAtua = reconciliationItems.filter(i => i.status === 'PENDING_ATUA').length;

    const sumDeltaCompany = reconciliationItems.reduce((acc, i) => acc + (i.delta.companyFreight || 0), 0);
    const sumDeltaDriver = reconciliationItems.reduce((acc, i) => acc + (i.delta.driverFreight || 0), 0);
    const sumDeltaResult = reconciliationItems.reduce((acc, i) => acc + (i.delta.netProfit || 0), 0);
    const sumDeltaToll = reconciliationItems.reduce((acc, i) => acc + (i.delta.toll || 0), 0);

    return {
      total,
      conciliated,
      divergent,
      orphanAtua,
      pendingAtua,
      conciliatedPercent: total > 0 ? (conciliated / total) * 100 : 0,
      sumDeltaCompany,
      sumDeltaDriver,
      sumDeltaResult,
      sumDeltaToll
    };
  }, [reconciliationItems]);

  // Itens Filtrados
  const filteredItems = useMemo(() => {
    return reconciliationItems.filter(item => {
      // Filtro de Status
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;

      // Filtro por tipo de divergência
      if (filterDivergenceType !== 'ALL') {
        if (filterDivergenceType === 'FREIGHT_COMPANY' && Math.abs(item.delta.companyFreight) <= tolerance) return false;
        if (filterDivergenceType === 'FREIGHT_DRIVER' && Math.abs(item.delta.driverFreight) <= tolerance) return false;
        if (filterDivergenceType === 'TOLL' && Math.abs(item.delta.toll) <= tolerance) return false;
        if (filterDivergenceType === 'ICMS' && Math.abs(item.delta.icms) <= tolerance) return false;
        if (filterDivergenceType === 'FEDERAL_TAX' && Math.abs(item.delta.federalTax) <= tolerance) return false;
        if (filterDivergenceType === 'WEIGHT' && Math.abs(item.delta.weight) <= weightTolerance) return false;
        if (filterDivergenceType === 'RESULT' && Math.abs(item.delta.netProfit) <= tolerance) return false;
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesCte = item.cteNumber.toLowerCase().includes(term);
        const matchesPlate = item.plate.toLowerCase().includes(term);
        const matchesShipment = item.shipmentId?.toLowerCase().includes(term);
        const matchesDriver = item.driverName?.toLowerCase().includes(term);
        const matchesClient = item.clientName?.toLowerCase().includes(term);
        if (!matchesCte && !matchesPlate && !matchesShipment && !matchesDriver && !matchesClient) {
          return false;
        }
      }

      return true;
    });
  }, [reconciliationItems, filterStatus, filterDivergenceType, searchTerm, tolerance, weightTolerance]);

  // Exportação em PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addPdfLogo(doc, companyLogo, { align: 'right', y: 5, width: 35, height: 14 });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Conciliação e Auditoria: Atua TMS vs. Transcunha', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const periodStr = startDate && endDate ? `${startDate} a ${endDate}` : 'Todos os períodos';
    doc.text(`Período: ${periodStr} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 21);

    const headRow = [
      'CT-e',
      'ID Emb.',
      'Placa',
      'Status Auditoria',
      'Frete Empr. (Trans)',
      'Frete Empr. (Atua)',
      'Δ Frete Empr.',
      'Frete Mot. (Trans)',
      'Frete Mot. (Atua)',
      'Δ Frete Mot.',
      'Pedágio (Trans)',
      'Pedágio (Atua)',
      'ICMS (Trans)',
      'ICMS (Atua)',
      'Peso Trans (t)',
      'Peso Atua (t)',
      'Δ Peso (t)'
    ];

    const tableData = filteredItems.map(item => {
      const statusText = item.status === 'CONCILIATED' ? 'Conciliado (OK)' :
                         item.status === 'DIVERGENT' ? 'Divergente' :
                         item.status === 'ORPHAN_ATUA' ? 'Órfão no Atua' : 'Pendente Atua';

      return [
        item.isComplementary ? `↳ ${item.cteNumber}-COMP` : item.cteNumber,
        item.shipmentId || '---',
        item.plate || '---',
        statusText,
        item.transcunha ? `R$ ${item.transcunha.companyFreight.toFixed(2)}` : '---',
        item.atua ? `R$ ${item.atua.companyFreight.toFixed(2)}` : '---',
        item.delta.companyFreight !== 0 ? `R$ ${item.delta.companyFreight.toFixed(2)}` : 'R$ 0,00',
        item.transcunha ? `R$ ${item.transcunha.driverFreight.toFixed(2)}` : '---',
        item.atua ? `R$ ${item.atua.driverFreight.toFixed(2)}` : '---',
        item.delta.driverFreight !== 0 ? `R$ ${item.delta.driverFreight.toFixed(2)}` : 'R$ 0,00',
        item.transcunha ? `R$ ${item.transcunha.toll.toFixed(2)}` : '---',
        item.atua ? `R$ ${item.atua.toll.toFixed(2)}` : '---',
        item.transcunha ? `R$ ${item.transcunha.icms.toFixed(2)}` : '---',
        item.atua ? `R$ ${item.atua.icms.toFixed(2)}` : '---',
        item.transcunha ? `${item.transcunha.weight.toFixed(2)} t` : '---',
        item.atua ? `${item.atua.weight.toFixed(2)} t` : '---',
        Math.abs(item.delta.weight) > weightTolerance ? `${item.delta.weight > 0 ? '+' : ''}${item.delta.weight.toFixed(2)} t` : '0,00 t',
      ];
    });

    autoTable(doc, {
      head: [headRow],
      body: tableData,
      startY: 26,
      margin: { left: 8, right: 8 },
      styles: { fontSize: 5.5, cellPadding: 1.2, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rawRow = Array.isArray(data.row.raw) ? data.row.raw : [];
          const statusVal = String(rawRow[3] || '');
          if (statusVal.includes('Divergente')) {
            data.cell.styles.textColor = [185, 28, 28]; // red
          } else if (statusVal.includes('Conciliado')) {
            data.cell.styles.textColor = [21, 128, 61]; // green
          } else if (statusVal.includes('Órfão')) {
            data.cell.styles.textColor = [126, 34, 206]; // purple
          }
        }
      }
    });

    doc.save(`auditoria_atua_transcunha_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Exportação em CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      'CT-e',
      'ID Embarque Transcunha',
      'Tipo Conhecimento',
      'Status Auditoria',
      'Placa',
      'Data Emissao',
      'Cliente',
      'Motorista',
      'Origem',
      'Destino',
      'Peso Transcunha (t)',
      'Peso Atua (t)',
      'Delta Peso (t)',
      'Frete Empresa Transcunha (R$)',
      'Frete Empresa Atua (R$)',
      'Delta Frete Empresa (R$)',
      'Frete Motorista Transcunha (R$)',
      'Frete Motorista Atua (R$)',
      'Delta Frete Motorista (R$)',
      'Pedagio Transcunha (R$)',
      'Pedagio Atua (R$)',
      'Delta Pedagio (R$)',
      'ICMS Transcunha (R$)',
      'ICMS Atua (R$)',
      'Delta ICMS (R$)',
      'Imposto Federal Transcunha (R$)',
      'Imposto Federal Atua (R$)',
      'Delta Imposto Federal (R$)',
      'Lucro Real Transcunha (R$)',
      'Resultado Atua (R$)',
      'Delta Lucro Real vs Resultado (R$)',
      'Motivos Divergencia'
    ];

    const rows = filteredItems.map(item => {
      const row = [
        item.cteNumber,
        item.shipmentId || '',
        item.isComplementary ? 'Complementar (Estadia)' : 'Original (Normal)',
        item.status,
        item.plate,
        item.date || '',
        `"${(item.clientName || '').replace(/"/g, '""')}"`,
        `"${(item.driverName || '').replace(/"/g, '""')}"`,
        `"${(item.origin || '').replace(/"/g, '""')}"`,
        `"${(item.destination || '').replace(/"/g, '""')}"`,
        (item.transcunha?.weight || 0).toFixed(2),
        (item.atua?.weight || 0).toFixed(2),
        item.delta.weight.toFixed(2),
        (item.transcunha?.companyFreight || 0).toFixed(2),
        (item.atua?.companyFreight || 0).toFixed(2),
        item.delta.companyFreight.toFixed(2),
        (item.transcunha?.driverFreight || 0).toFixed(2),
        (item.atua?.driverFreight || 0).toFixed(2),
        item.delta.driverFreight.toFixed(2),
        (item.transcunha?.toll || 0).toFixed(2),
        (item.atua?.toll || 0).toFixed(2),
        item.delta.toll.toFixed(2),
        (item.transcunha?.icms || 0).toFixed(2),
        (item.atua?.icms || 0).toFixed(2),
        item.delta.icms.toFixed(2),
        (item.transcunha?.federalTax || 0).toFixed(2),
        (item.atua?.federalTax || 0).toFixed(2),
        item.delta.federalTax.toFixed(2),
        (item.transcunha?.netProfit || 0).toFixed(2),
        (item.atua?.netProfit || 0).toFixed(2),
        item.delta.netProfit.toFixed(2),
        `"${item.divergenceReasons.join(' | ').replace(/"/g, '""')}"`
      ];
      return row.join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_atua_transcunha_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-900 dark:text-slate-100">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Auditoria e Conciliação Atua TMS
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  MaisFrete / CTRC
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Confronto automatizado entre o Relatório Detalhado do CTRC (Atua) e o Lucro Real (Transcunha).
              </p>
            </div>
          </div>
        </div>

        {/* Ações Primárias */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Arquivo Atua (PDF / Excel)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => transcunhaFileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Importar Relatório de Lucro Real da Transcunha em PDF/Excel (Opcional)"
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {uploadedTranscunhaRecords ? `Lucro Real Carregado (${uploadedTranscunhaRecords.length})` : 'Importar Lucro Real Transcunha (Opcional)'}
            </span>
          </button>
          <input
            ref={transcunhaFileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleTranscunhaFileUpload(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            title="Colar texto do relatório do Atua"
          >
            <FileText className="w-4 h-4" />
            <span>Colar Texto</span>
          </button>

          {reconciliationItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors"
                title="Exportar auditoria em PDF"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors"
                title="Exportar planilha Excel (CSV)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel (CSV)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEEDBACK DE CARREGAMENTO OU ERRO */}
      {isParsing && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">Processando arquivo e decodificando linhas do CTRC do Atua...</span>
        </div>
      )}

      {parseError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{parseError}</span>
          </div>
          <button
            type="button"
            onClick={() => setParseError(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATUS DAS FONTES DE DADOS */}
      {(atuaResult || uploadedTranscunhaRecords) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {atuaResult && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Atua TMS: <strong>{uploadedFileName || 'Relatório Detalhado do CTRC'}</strong> ({atuaResult.records.length} CT-es extraídos)</span>
            </span>
          )}
          {uploadedTranscunhaRecords ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Base Transcunha: <strong>{transcunhaFileName}</strong> ({uploadedTranscunhaRecords.length} embarques importados)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Base Transcunha: Embarques Online ({enrichedTranscunhaData.length} registros no período)</span>
            </span>
          )}
        </div>
      )}

      {/* CARD DE INSTRUÇÃO INICIAL SE NÃO HOUVER DADOS DO ATUA */}
      {!atuaResult && !isParsing && (
        <div className="p-8 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <GitCompare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
            Nenhum relatório do Atua importado ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
            Envie o arquivo PDF ou Excel do <strong>"Relatório Detalhado do CTRC"</strong> emitido no Atua TMS (MaisFrete) para cruzar automaticamente com os embarques da Transcunha.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Selecionar Arquivo Atua (.pdf / .xlsx / .csv)
            </button>
            <button
              type="button"
              onClick={() => transcunhaFileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              Importar Lucro Real Transcunha (Opcional)
            </button>
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700"
            >
              <FileText className="w-4 h-4" />
              Colar Texto Manualmente
            </button>
          </div>
        </div>
      )}

      {/* PAINEL DE KPIS DA AUDITORIA */}
      {reconciliationItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Analisado</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {kpis.total}
              <span className="text-[10px] font-normal text-slate-400 ml-1">conhecimentos</span>
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Conciliados */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Conciliados (100% OK)
            </p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {kpis.conciliated}
              <span className="text-[10px] font-semibold text-emerald-500/80 ml-1">
                ({kpis.conciliatedPercent.toFixed(1)}%)
              </span>
            </p>
            <div className="w-full bg-emerald-100 dark:bg-emerald-950/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.conciliatedPercent}%` }} />
            </div>
          </div>

          {/* Divergentes */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Divergentes
            </p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {kpis.divergent}
              <span className="text-[10px] font-semibold text-rose-500/80 ml-1">
                ({kpis.total > 0 ? ((kpis.divergent / kpis.total) * 100).toFixed(1) : 0}%)
              </span>
            </p>
            <div className="w-full bg-rose-100 dark:bg-rose-950/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${kpis.total > 0 ? (kpis.divergent / kpis.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Órfãos Atua */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1" title="Consta no relatório do Atua mas não foi achado no Transcunha">
              <AlertCircle className="w-3 h-3" /> Órfãos no Atua
            </p>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {kpis.orphanAtua}
              <span className="text-[10px] font-normal text-slate-400 ml-1">não cadastrados</span>
            </p>
            <p className="text-[9px] text-purple-500 dark:text-purple-400 mt-1 truncate">Ausentes no Transcunha</p>
          </div>

          {/* Pendentes Atua */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1" title="Cadastrado no Transcunha mas ausente no Atua">
              <HelpCircle className="w-3 h-3" /> Pendentes Atua
            </p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {kpis.pendingAtua}
              <span className="text-[10px] font-normal text-slate-400 ml-1">sem retorno</span>
            </p>
            <p className="text-[9px] text-amber-500 dark:text-amber-400 mt-1 truncate">Não constam no Atua</p>
          </div>

          {/* Impacto Financeiro Líquido */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Δ Lucro / Resultado
            </p>
            <p className={`text-base font-black mt-1 ${
              kpis.sumDeltaResult > 0 ? 'text-emerald-600 dark:text-emerald-400' :
              kpis.sumDeltaResult < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {kpis.sumDeltaResult >= 0 ? '+' : ''}R$ {kpis.sumDeltaResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 mt-1" title="Diferença total de Frete Empresa">
              Δ Frete: R$ {kpis.sumDeltaCompany.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS E CONTROLES */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Busca Rápida */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por CT-e, Placa, Motorista, Cliente ou ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtro por Período */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Período:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Tolerância de Centavos */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tolerância:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={tolerance}
                onChange={(e) => setTolerance(parseFloat(e.target.value) || 0)}
                className="w-20 pl-7 pr-2 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Lado a Lado
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Diferenças (Δ)
            </button>
          </div>
        </div>

        {/* Linha 2 de Filtros Rápidos de Status */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span className="text-xs text-slate-400 font-bold mr-1">Filtrar por:</span>
          
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Todos ({reconciliationItems.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('DIVERGENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterStatus === 'DIVERGENT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Divergentes ({kpis.divergent})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('CONCILIATED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterStatus === 'CONCILIATED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Conciliados ({kpis.conciliated})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('ORPHAN_ATUA')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterStatus === 'ORPHAN_ATUA'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200/50'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            Órfãos Atua ({kpis.orphanAtua})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('PENDING_ATUA')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterStatus === 'PENDING_ATUA'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/50'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            Pendentes Atua ({kpis.pendingAtua})
          </button>

          {/* Filtro por Tipo de Divergência específica */}
          {kpis.divergent > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Motivo:</span>
              <select
                value={filterDivergenceType}
                onChange={(e) => setFilterDivergenceType(e.target.value)}
                className="px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
              >
                <option value="ALL">Todas as Divergências</option>
                <option value="FREIGHT_COMPANY">Divergência Frete Empresa</option>
                <option value="FREIGHT_DRIVER">Divergência Frete Motorista</option>
                <option value="TOLL">Divergência Pedágio</option>
                <option value="ICMS">Divergência ICMS</option>
                <option value="FEDERAL_TAX">Divergência Imp. Federal</option>
                <option value="WEIGHT">Divergência Peso (t)</option>
                <option value="RESULT">Divergência Resultado Final</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TABELA DE AUDITORIA COMPARATIVA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">CT-e / ID</th>
                <th className="py-2.5 px-2">Data / Placa</th>
                <th className="py-2.5 px-2">Cliente / Trajeto</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                {viewMode === 'side-by-side' ? (
                  <>
                    <th className="py-2.5 px-2 text-right">Frete Empr. (Trans)</th>
                    <th className="py-2.5 px-2 text-right">Frete Empr. (Atua)</th>
                    <th className="py-2.5 px-2 text-right">Frete Mot. (Trans)</th>
                    <th className="py-2.5 px-2 text-right">Frete Mot. (Atua)</th>
                    <th className="py-2.5 px-2 text-right">Pedágio</th>
                    <th className="py-2.5 px-2 text-right">ICMS</th>
                    <th className="py-2.5 px-2 text-right font-bold">Peso Trans (t)</th>
                    <th className="py-2.5 px-2 text-right font-bold">Peso Atua (t)</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-2 text-right">Frete Empresa</th>
                    <th className="py-2.5 px-2 text-right">Frete Motorista</th>
                    <th className="py-2.5 px-2 text-right">Pedágio</th>
                    <th className="py-2.5 px-2 text-right">ICMS</th>
                    <th className="py-2.5 px-2 text-right">Imp. Federal</th>
                    <th className="py-2.5 px-2 text-right font-bold">Peso Efetivado (t)</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isExpanded = expandedItemId === item.id;
                  const hasDivergence = item.status === 'DIVERGENT';

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`transition-colors ${
                        item.status === 'DIVERGENT' ? 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 dark:hover:bg-rose-950/20' :
                        item.status === 'CONCILIATED' ? 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30' :
                        item.status === 'ORPHAN_ATUA' ? 'bg-purple-50/30 dark:bg-purple-950/15 hover:bg-purple-50/50' :
                        'bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/50'
                      }`}>
                        {/* CT-e / ID */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {item.isComplementary ? (
                              <span className="text-purple-600 font-bold select-none text-xs">↳</span>
                            ) : null}
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {item.cteNumber ? `CT-e ${item.cteNumber}` : 'S/ CT-e'}
                            </span>
                          </div>
                          {item.shipmentId && (
                            <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                              {item.shipmentId}
                            </p>
                          )}
                          {item.isComplementary && (
                            <span className="inline-block mt-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                              Estadia / Comp.
                            </span>
                          )}
                        </td>

                        {/* Data / Placa */}
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                            {item.plate || '---'}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR') : '---'}
                          </p>
                        </td>

                        {/* Cliente / Trajeto */}
                        <td className="py-2.5 px-2 max-w-[140px] xl:max-w-[200px]">
                          <p className="font-semibold text-slate-900 dark:text-white truncate" title={item.clientName}>
                            {item.clientName || '---'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={`${item.origin} → ${item.destination}`}>
                            {item.origin || '---'} → {item.destination || '---'}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {item.status === 'CONCILIATED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100% OK
                            </span>
                          ) : item.status === 'DIVERGENT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertTriangle className="w-2.5 h-2.5" /> Divergente
                            </span>
                          ) : item.status === 'ORPHAN_ATUA' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Consta no Atua mas não foi encontrado no Transcunha">
                              <AlertCircle className="w-2.5 h-2.5" /> Órfão Atua
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Cadastrado no Transcunha mas ausente no Atua">
                              <HelpCircle className="w-2.5 h-2.5" /> Pendente Atua
                            </span>
                          )}
                        </td>

                        {/* COLUNAS: LADO A LADO */}
                        {viewMode === 'side-by-side' ? (
                          <>
                            {/* Frete Empr. Trans */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              {item.transcunha ? (
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  R$ {item.transcunha.companyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-400">---</span>
                              )}
                            </td>

                            {/* Frete Empr. Atua */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              {item.atua ? (
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    R$ {item.atua.companyFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  {Math.abs(item.delta.companyFreight) > tolerance && (
                                    <p className={`text-[9px] font-bold ${item.delta.companyFreight > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      Δ {item.delta.companyFreight > 0 ? '+' : ''}{item.delta.companyFreight.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">---</span>
                              )}
                            </td>

                            {/* Frete Mot. Trans */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              {item.transcunha ? (
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  R$ {item.transcunha.driverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-400">---</span>
                              )}
                            </td>

                            {/* Frete Mot. Atua */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              {item.atua ? (
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    R$ {item.atua.driverFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  {Math.abs(item.delta.driverFreight) > tolerance && (
                                    <p className={`text-[9px] font-bold ${item.delta.driverFreight > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      Δ {item.delta.driverFreight > 0 ? '+' : ''}{item.delta.driverFreight.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">---</span>
                              )}
                            </td>

                            {/* Pedágio */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  R$ {(item.transcunha?.toll ?? item.atua?.toll ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {Math.abs(item.delta.toll) > tolerance && (
                                  <p className="text-[9px] font-bold text-rose-600">
                                    Δ {item.delta.toll > 0 ? '+' : ''}{item.delta.toll.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* ICMS */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  R$ {(item.transcunha?.icms ?? item.atua?.icms ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {Math.abs(item.delta.icms) > tolerance && (
                                  <p className="text-[9px] font-bold text-rose-600">
                                    Δ {item.delta.icms > 0 ? '+' : ''}{item.delta.icms.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Peso Trans */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              {item.transcunha ? (
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.transcunha.weight.toFixed(2)} t
                                </span>
                              ) : (
                                <span className="text-slate-400">---</span>
                              )}
                            </td>

                            {/* Peso Atua */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              {item.atua ? (
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {item.atua.weight.toFixed(2)} t
                                  </span>
                                  {Math.abs(item.delta.weight) > weightTolerance && (
                                    <p className="text-[9px] font-bold text-rose-600">
                                      Δ {item.delta.weight > 0 ? '+' : ''}{item.delta.weight.toFixed(2)} t
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">---</span>
                              )}
                            </td>
                          </>
                        ) : (
                          /* COLUNAS: VISÃO COMPACTA COM DELTAS */
                          <>
                            {/* Frete Empresa */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                R$ {(item.transcunha?.companyFreight ?? item.atua?.companyFreight ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {Math.abs(item.delta.companyFreight) > tolerance && (
                                <p className={`text-[9px] font-bold ${item.delta.companyFreight > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  Δ {item.delta.companyFreight > 0 ? '+' : ''}{item.delta.companyFreight.toFixed(2)}
                                </p>
                              )}
                            </td>

                            {/* Frete Motorista */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                R$ {(item.transcunha?.driverFreight ?? item.atua?.driverFreight ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {Math.abs(item.delta.driverFreight) > tolerance && (
                                <p className={`text-[9px] font-bold ${item.delta.driverFreight > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  Δ {item.delta.driverFreight > 0 ? '+' : ''}{item.delta.driverFreight.toFixed(2)}
                                </p>
                              )}
                            </td>

                            {/* Pedágio */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <span className="text-slate-700 dark:text-slate-300">
                                R$ {(item.transcunha?.toll ?? item.atua?.toll ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* ICMS */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <span className="text-slate-700 dark:text-slate-300">
                                R$ {(item.transcunha?.icms ?? item.atua?.icms ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {Math.abs(item.delta.icms) > tolerance && (
                                <p className="text-[9px] font-bold text-rose-600">
                                  Δ {item.delta.icms > 0 ? '+' : ''}{item.delta.icms.toFixed(2)}
                                </p>
                              )}
                            </td>

                            {/* Imp. Federal */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <span className="text-slate-700 dark:text-slate-300">
                                R$ {(item.transcunha?.federalTax ?? item.atua?.federalTax ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Peso Efetivado */}
                            <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {(item.transcunha?.weight ?? item.atua?.weight ?? 0).toFixed(2)} t
                              </span>
                              {Math.abs(item.delta.weight) > weightTolerance && (
                                <p className="text-[9px] font-bold text-rose-600">
                                  Δ {item.delta.weight > 0 ? '+' : ''}{item.delta.weight.toFixed(2)} t
                                </p>
                              )}
                            </td>
                          </>
                        )}

                        {/* Ações */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 transition-colors"
                              title="Expandir detalhes"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {item.shipment && onOpenShipmentDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenShipmentDetail(item.shipment!)}
                                className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                title="Abrir dados do embarque no Transcunha"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* LINHA EXPANDIDA COM AUDITORIA DETALHADA */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-xs">
                          <td colSpan={viewMode === 'side-by-side' ? 13 : 11} className="p-4 border-l-4 border-l-indigo-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Painel 1: Identificação */}
                              <div className="space-y-1.5">
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                  Identificação do Conhecimento
                                </p>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                                  <p><span className="font-semibold">CT-e:</span> {item.cteNumber} {item.isComplementary ? '(Complementar)' : '(Normal)'}</p>
                                  <p><span className="font-semibold">ID Transcunha:</span> {item.shipmentId || 'Não vinculado'}</p>
                                  <p><span className="font-semibold">Placa:</span> {item.plate} | <span className="font-semibold">Data:</span> {item.date}</p>
                                  <p><span className="font-semibold">Cliente:</span> {item.clientName || '---'}</p>
                                  <p><span className="font-semibold">Motorista:</span> {item.driverName || '---'}</p>
                                  <p><span className="font-semibold">Origem → Destino:</span> {item.origin} → {item.destination}</p>
                                </div>
                              </div>

                              {/* Painel 2: Confronto Numérico */}
                              <div className="space-y-1.5">
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                  <Scale className="w-3.5 h-3.5 text-indigo-500" />
                                  Confronto Direto (Transcunha vs. Atua)
                                </p>
                                <div className="text-[11px] font-mono space-y-0.5">
                                  <p className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Peso:</span>
                                    <span>{item.transcunha?.weight?.toFixed(2) || '0.00'} t vs {item.atua?.weight?.toFixed(2) || '0.00'} t</span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Frete Empresa:</span>
                                    <span>R$ {item.transcunha?.companyFreight?.toFixed(2) || '0.00'} vs R$ {item.atua?.companyFreight?.toFixed(2) || '0.00'}</span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Frete Motorista:</span>
                                    <span>R$ {item.transcunha?.driverFreight?.toFixed(2) || '0.00'} vs R$ {item.atua?.driverFreight?.toFixed(2) || '0.00'}</span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500 font-sans">Pedágio:</span>
                                    <span>R$ {item.transcunha?.toll?.toFixed(2) || '0.00'} vs R$ {item.atua?.toll?.toFixed(2) || '0.00'}</span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500 font-sans">ICMS:</span>
                                    <span>R$ {item.transcunha?.icms?.toFixed(2) || '0.00'} vs R$ {item.atua?.icms?.toFixed(2) || '0.00'}</span>
                                  </p>
                                  <p className="flex justify-between font-bold border-t dark:border-slate-700 pt-0.5">
                                    <span className="text-slate-700 dark:text-slate-300 font-sans">Lucro Real / Result:</span>
                                    <span>R$ {item.transcunha?.netProfit?.toFixed(2) || '0.00'} vs R$ {item.atua?.netProfit?.toFixed(2) || '0.00'}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Painel 3: Diagnóstico da Auditoria */}
                              <div className="space-y-1.5">
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                                  Diagnóstico e Apontamentos
                                </p>
                                {item.divergenceReasons.length > 0 ? (
                                  <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-400 space-y-1 font-medium">
                                    {item.divergenceReasons.map((reason, rIdx) => (
                                      <li key={rIdx}>{reason}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    Todos os valores coincidem perfeitamente dentro da margem de tolerância.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={viewMode === 'side-by-side' ? 13 : 11} className="py-12 text-center text-slate-400">
                    <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA COLAR TEXTO MANUALMENTE */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Colar Texto do Relatório do Atua TMS
              </h3>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copie as linhas do <strong>"Relatório Detalhado do CTRC"</strong> diretamente do leitor de PDF ou página web e cole no campo abaixo. O leitor decodificará automaticamente o número do CT-e, placa, frete empresa, frete motorista, pedágio e impostos.
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Cole aqui o texto copiado do relatório..."
              className="w-full p-3 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessPaste}
                disabled={!pasteText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                Processar Texto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtuaReconciliationPage;
