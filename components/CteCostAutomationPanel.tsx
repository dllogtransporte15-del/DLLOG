import React from 'react';
import { Shipment, ShipmentStatus, Cargo, RISK_QUERY_COST_MAP, HistoryLog } from '../types';
import { extractDetailedDocData } from '../utils/fiscalDocParser';
import { upsertShipment } from '../lib/db';
import { useToast } from '../hooks/useToast';
import { 
  Calculator, 
  ShieldCheck, 
  TrendingUp, 
  Percent, 
  Truck, 
  Receipt, 
  Info,
  Layers,
  RefreshCw,
  Sparkles,
  Building2,
  Save,
  CheckCircle2
} from 'lucide-react';

interface CteCostAutomationPanelProps {
  shipment: Shipment;
  cargo?: Cargo;
  tollValue?: number | string;
  loadedTonnage?: number | string;
  riskQueryType?: string;
  riskReleaseCode?: string;
  onUpdateShipmentData?: (shipmentId: string, data: Partial<Shipment>) => Promise<void> | void;
}

export const CteCostAutomationPanel: React.FC<CteCostAutomationPanelProps> = ({
  shipment,
  cargo,
  tollValue,
  loadedTonnage,
  riskQueryType,
  riskReleaseCode,
  onUpdateShipmentData,
}) => {
  const { showToast } = useToast();
  const formatBrl = (val: number | undefined | null) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Determinação inicial do enquadramento tributário
  const defaultInitialRegime = shipment.etcTaxRegime || 
    (shipment.documents as any)?.etc_tax_regime || 
    (shipment.driverFreightType === 'PF' || shipment.anttModality === 'TAC' ? 'PF' : 'Lucro Real / Presumido');

  const [selectedRegime, setSelectedRegime] = React.useState<string>(defaultInitialRegime);
  const [savedRegime, setSavedRegime] = React.useState<string>(defaultInitialRegime);
  const [isSavingRegime, setIsSavingRegime] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);

  React.useEffect(() => {
    const reg = shipment.etcTaxRegime || 
      (shipment.documents as any)?.etc_tax_regime || 
      (shipment.driverFreightType === 'PF' || shipment.anttModality === 'TAC' ? 'PF' : 'Lucro Real / Presumido');
    setSelectedRegime(reg);
    setSavedRegime(reg);
  }, [shipment.etcTaxRegime, shipment.documents, shipment.driverFreightType, shipment.anttModality]);

  const handleSaveRegime = async () => {
    setIsSavingRegime(true);
    try {
      const isPf = selectedRegime === 'PF' || selectedRegime === 'TAC';
      const modality = isPf ? 'TAC' : 'ETC';
      const freightType = isPf ? 'PF' : 'PJ';
      const etcRegime = isPf ? undefined : selectedRegime;

      const oldRegimeLabel = savedRegime || shipment.etcTaxRegime || (shipment.driverFreightType === 'PF' ? 'Pessoa Física / TAC' : 'Lucro Real / Presumido');
      const newRegimeLabel = selectedRegime;

      const historyEntry: HistoryLog = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        userId: 'sistema',
        timestamp: new Date().toISOString(),
        description: `Enquadramento fiscal alterado de "${oldRegimeLabel}" para "${newRegimeLabel}". Imposto Federal e custos operacionais recalculados.`
      };

      const updatedHistory = [...(shipment.history || []), historyEntry];

      const updatedShipment: Shipment = {
        ...shipment,
        etcTaxRegime: etcRegime,
        driverFreightType: freightType,
        anttModality: modality as any,
        history: updatedHistory,
        documents: {
          ...(shipment.documents || {}),
          etc_tax_regime: etcRegime,
          antt_modality: modality,
        }
      };

      if (onUpdateShipmentData) {
        await onUpdateShipmentData(shipment.id, {
          etcTaxRegime: etcRegime,
          driverFreightType: freightType,
          anttModality: modality as any,
          history: updatedHistory,
          documents: {
            ...(shipment.documents || {}),
            etc_tax_regime: etcRegime,
            antt_modality: modality,
          }
        });
      } else {
        await upsertShipment(updatedShipment);
      }

      setSavedRegime(selectedRegime);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      showToast(`Enquadramento tributário salvo como "${selectedRegime}" e registrado no histórico!`, 'success');
    } catch (err) {
      console.error('Erro ao salvar regime tributário:', err);
      showToast('Erro ao persistir enquadramento tributário.', 'error');
    } finally {
      setIsSavingRegime(false);
    }
  };

  // 1. CTe Frete Bruto / Frete Empresa
  const companyRate = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
  const parsedPropTonnage = loadedTonnage !== undefined && loadedTonnage !== '' ? Number(loadedTonnage) : undefined;
  const tonnage = (parsedPropTonnage !== undefined && !isNaN(parsedPropTonnage) && parsedPropTonnage > 0)
    ? parsedPropTonnage
    : (shipment.shipmentTonnage || cargo?.totalVolume || 0);

  const cteGrossFreight = shipment.realProfitData?.companyFreight !== undefined && shipment.realProfitData.companyFreight > 0
    ? shipment.realProfitData.companyFreight
    : (companyRate > 0 && tonnage > 0 
        ? Number((companyRate * tonnage).toFixed(2)) 
        : (shipment.driverFreightValue || 0));

  // Estados para capturas automáticas do XML/Documentos
  const [autoToll, setAutoToll] = React.useState<number | undefined>(undefined);
  const [autoInvoiceValue, setAutoInvoiceValue] = React.useState<number | undefined>(undefined);
  const [autoFederalTax, setAutoFederalTax] = React.useState<number | undefined>(undefined);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const syncDocs = React.useCallback(async () => {
    if (!shipment.documents) return;
    const allUrls: string[] = [];
    for (const [key, val] of Object.entries(shipment.documents)) {
      if (Array.isArray(val)) {
        for (const u of val) {
          if (typeof u === 'string' && (u.startsWith('http') || u.startsWith('/'))) {
            allUrls.push(u);
          }
        }
      } else if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'))) {
        allUrls.push(val);
      }
    }

    for (const url of allUrls) {
      try {
        const ext = await extractDetailedDocData(url, 'Documento');
        if (ext.financeiro?.valorPedagio !== undefined && ext.financeiro.valorPedagio > 0) {
          setAutoToll(ext.financeiro.valorPedagio);
        }
        if (ext.carga?.valorMercadoria !== undefined && ext.carga.valorMercadoria > 0) {
          setAutoInvoiceValue(ext.carga.valorMercadoria);
        }
        if (ext.financeiro?.valorPisCofinsFederal !== undefined && ext.financeiro.valorPisCofinsFederal > 0) {
          setAutoFederalTax(ext.financeiro.valorPisCofinsFederal);
        } else if (ext.financeiro?.valorPis !== undefined || ext.financeiro?.valorCofins !== undefined) {
          const sumFed = (ext.financeiro?.valorPis || 0) + (ext.financeiro?.valorCofins || 0);
          if (sumFed > 0) setAutoFederalTax(sumFed);
        }
      } catch {
        // ignore
      }
    }
  }, [shipment.documents]);

  React.useEffect(() => {
    syncDocs();
  }, [syncDocs]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncDocs();
    setTimeout(() => setIsSyncing(false), 500);
  };

  // 2. Verificação de Carga de Exportação (Destino Porto, Terminal Retroportuário, EADI, Armazém Alfandegado, CFOP 6353, CST 40)
  const isExportCargo = cargo?.isExport !== undefined
    ? cargo.isExport
    : ((shipment as any)?.isExport !== undefined
        ? (shipment as any).isExport
        : Boolean(
            (cargo?.observations && /export|cfop\s*6353|cst\s*40/i.test(cargo.observations)) ||
            (cargo?.destination && /(porto|terminal|retroportu[aá]rio|eadi|alfandeg|armaz[eé]m|embarque portu[aá]rio|santos|paranagu[aá]|itaqui|rio grande|barcarena|suape|vit[oó]ria)/i.test(cargo.destination)) ||
            ((shipment as any)?.observations && /export|cfop\s*6353|cst\s*40/i.test((shipment as any).observations)) ||
            ((shipment as any)?.destination && /(porto|terminal|retroportu[aá]rio|eadi|alfandeg|armaz[eé]m|embarque portu[aá]rio|santos|paranagu[aá]|itaqui|rio grande|barcarena|suape|vit[oó]ria)/i.test((shipment as any).destination)) ||
            ((shipment.documents as any)?.cfop === '6353' || (shipment.documents as any)?.cst === '40')
          ));

  const isExportSuspended = isExportCargo;

  // 3. Valor NF (Valor da Mercadoria / Carga informado no CT-e / NF-e)
  const invoiceValue = autoInvoiceValue || shipment.nfeValue || shipment.realProfitData?.invoiceValue || 0;
  // Base de Seguro: Acréscimo de +18% somente em carga de exportação (NF * 1.18); Mercado Interno: Base = Valor da NF
  const insuranceBaseValue = invoiceValue > 0 
    ? Number((invoiceValue * (isExportCargo ? 1.18 : 1.00)).toFixed(2)) 
    : 0;

  // 4. Seguro Acidente (0,0125%) + Roubo (0,0125%) = 0,025% sobre a Base de Seguro
  const taxaSeguroAcidente = 0.000125; // 0,0125%
  const taxaSeguroRoubo = 0.000125;    // 0,0125%
  const taxaSeguroTotal = taxaSeguroAcidente + taxaSeguroRoubo; // 0,025%
  const insuranceTaxes = insuranceBaseValue > 0 ? Number((insuranceBaseValue * taxaSeguroTotal).toFixed(2)) : 0;
  const totalSeguroAcidenteRoubo = insuranceTaxes;

  // 5. Seguro RCV (R$ 5,00 por veículo / viagem)
  const seguroRcv = 5.00;

  // 8. Vale-Pedágio (Informativo da Carta Frete / TAG / Formulário / Embarque)
  const parsedPropToll = tollValue !== undefined && tollValue !== '' ? Number(tollValue) : undefined;
  const toll = (parsedPropToll !== undefined && !isNaN(parsedPropToll) && parsedPropToll > 0)
    ? parsedPropToll
    : (autoToll !== undefined && autoToll > 0
        ? autoToll
        : (shipment.tollValue !== undefined && shipment.tollValue > 0
            ? shipment.tollValue
            : (shipment.realProfitData?.toll || 0)));

  const isExplicitPj = selectedRegime === 'Lucro Real / Presumido' || selectedRegime === 'Lucro Real' || selectedRegime === 'Lucro Presumido' || selectedRegime === 'Simples Nacional' || selectedRegime === 'MEI' || selectedRegime === 'PJ' || selectedRegime === 'ETC' || shipment.driverFreightType === 'PJ' || shipment.anttModality === 'ETC';
  const isShipmentPf = !isExplicitPj && (selectedRegime === 'PF' || selectedRegime === 'TAC' || shipment.driverFreightType === 'PF' || shipment.anttModality === 'TAC');
  const isPjDriver = !isShipmentPf;
  const isPf = isShipmentPf;
  const isSimplesNacional = selectedRegime === 'Simples Nacional' || selectedRegime === 'MEI';
  // REGRA APURAÇÃO CRÉDITO FISCAL EXPORTAÇÃO:
  // 1. Base Efetiva do Frete Tributável (BC Crédito / BC Serviço) = Frete Empresa - Vale-Pedágio
  // 2. Alíquota Efetiva de Crédito:
  //    - PF (TAC / Terceiro PF): 6,52834% (Manutenção de Crédito: ICMS 12% * 54,39%)
  //    - PJ (Lucro Real / Lucro Presumido / Simples Nacional / MEI): 6,5136% (Manutenção de Crédito: ICMS 12% * 54,28%)
  const creditRate = isShipmentPf 
    ? 0.0652834 
    : 0.065136;
  const creditRatePercentLabel = isShipmentPf 
    ? 'PF (6,52834% • Manutenção Crédito)' 
    : 'PJ (6,5136% • Manut. ICMS Exportação)';

  const driverRate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || 0;
  const driverFreight = shipment.realProfitData?.driverFreight !== undefined && shipment.realProfitData.driverFreight > 0
    ? shipment.realProfitData.driverFreight
    : (shipment.driverFreightValue || (driverRate * tonnage));

  // Bases de Frete Líquidas de Pedágio (Conforme regra do ERP)
  const baseFreteEmpresa = Math.max(0, cteGrossFreight - toll);
  const baseFreteMotorista = Math.max(0, driverFreight - toll);

  // 7. ICMS (Valor integral do ICMS destacado no CT-e / vICMS)
  const icmsPercentage = cargo?.icmsPercentage || (cargo?.hasIcms ? 7 : 0);
  const icmsBruto = (cargo?.hasIcms && icmsPercentage > 0)
    ? Number((cteGrossFreight * (icmsPercentage / 100)).toFixed(2))
    : 0;

  // Valor ICMS Completo (Destacado no CT-e)
  const icms = icmsBruto > 0
    ? icmsBruto
    : (shipment.realProfitData?.icmsDifference !== undefined && shipment.realProfitData.icmsDifference > 0
        ? shipment.realProfitData.icmsDifference
        : 0);

  const allDocText = [
    cargo?.observations,
    (shipment as any)?.observations,
    (shipment as any)?.cargoObservations,
    (shipment as any)?.cteFiscalInfo,
    (shipment as any)?.taxObservations,
    (shipment as any)?.fiscalNotes,
    (cargo as any)?.specialInstructions,
    (cargo as any)?.productName,
    Array.isArray(shipment.history) ? JSON.stringify(shipment.history) : '',
    shipment.documents ? JSON.stringify(shipment.documents) : ''
  ].filter(Boolean).join(' ');

  const suspMatch = allDocText.match(/(?:impostos?\s+suspensos?|suspens[aã]o(?:\s+tribut[aá]ria)?)\s*:\s*(\d+(?:[.,]\d+)?)\s*%/i) ||
                    allDocText.match(/suspens[aã]o\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*%/i) ||
                    allDocText.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s*)?suspens[aã]o/i);

  const isSuspendedRoute = Boolean(
    /CEL[-_ ]?(337|338|\d+)/i.test(shipment.id || '') ||
    /CEL[-_ ]?(337|338|\d+)/i.test((shipment as any)?.cargoNumber || '') ||
    /CEL[-_ ]?(337|338|\d+)/i.test(allDocText)
  );

  const suspensionPercentage = isExportCargo 
    ? 100 
    : (suspMatch ? parseFloat(suspMatch[1].replace(',', '.')) : (isSuspendedRoute ? 30 : 0));
  const tributavelRatio = isExportCargo ? 0 : Math.max(0, (100 - suspensionPercentage) / 100);

  // Bases Líquidas de ICMS
  const icmsRate = (cargo?.hasIcms && icmsPercentage > 0) ? (icmsPercentage / 100) : 0;
  const baseFreteEmpresaLiqIcms = Math.max(0, baseFreteEmpresa * (1 - icmsRate));
  const baseFreteMotoristaLiqIcms = Math.max(0, baseFreteMotorista * (1 - icmsRate));
  const spreadLiquidoIcms = Math.max(0, (baseFreteEmpresa - baseFreteMotorista) * (1 - icmsRate));

  // Passo 1: Identificar os Valores de Faturamento da Viagem
  // Frete_Bruto = cteGrossFreight (vTPrest)
  // ICMS_Destacado = icmsBruto (vICMS)
  // Frete_Liquido = Frete_Bruto - ICMS_Destacado
  const freteLiquidoIcms = Math.max(0, cteGrossFreight - icmsBruto);

  // Passo 2: Apurar o Spread Comercial (Diferença de Frete)
  // Diferenca_Frete_RS = Frete_Empresa_Liquido - Frete_Motorista
  const diferencaFreteReais = Number((freteLiquidoIcms - driverFreight).toFixed(2));
  const margemFretePercent = freteLiquidoIcms > 0
    ? Number(((diferencaFreteReais / freteLiquidoIcms) * 100).toFixed(2))
    : 0;

  // 5. Crédito Gerado (Gerado EXCLUSIVAMENTE quando a carga for de exportação)
  // Regra PF: BC_Servico = (cteGrossFreight - toll) * 6,52834% (Manutenção de Crédito de Exportação)
  // Regra PJ: BC_Credito = (cteGrossFreight - toll) * 6,5136% (Manutenção de Crédito de Exportação)
  const autoOrRealCredit = isExportCargo ? shipment.realProfitData?.generatedCredit : 0;
  const calculatedExportCredit = (isExportCargo && baseFreteEmpresa > 0)
    ? Number((baseFreteEmpresa * creditRate).toFixed(2))
    : (isExportCargo && baseFreteMotorista > 0 ? Number((baseFreteMotorista * creditRate).toFixed(2)) : 0);
  const pisCofinsCredit = (autoOrRealCredit !== undefined && autoOrRealCredit > 0)
    ? autoOrRealCredit
    : calculatedExportCredit;

  // 6. Débito PIS COFINS
  const autoOrRealFederalTax = autoFederalTax || shipment.realProfitData?.federalTax;
  const federalPisCofinsDebito = isExportCargo
    ? 0
    : ((autoOrRealFederalTax !== undefined && autoOrRealFederalTax > 0)
        ? autoOrRealFederalTax
        : (baseFreteEmpresaLiqIcms > 0 ? Number((baseFreteEmpresaLiqIcms * (suspensionPercentage > 0 ? tributavelRatio : 1) * 0.0925).toFixed(2)) : 0));

  // Passo 3: Imposto Federal (Simples Nacional 3,40% s/ Frete Bruto | PF: 3,655% s/ Líquido | PJ: 9,25% s/ Spread)
  const simplesFederalRate = 0.0340; // 3,40% (Anexo III - Tributos Federais)
  const impostoFederalSimples = Number((cteGrossFreight * simplesFederalRate).toFixed(2));
  const impostoFederalPf = Number((freteLiquidoIcms * 0.03655).toFixed(2));
  const impostoFederalPjSpread = Number((Math.max(0, diferencaFreteReais) * 0.0925).toFixed(2));

  let impostoFederalMercadoInterno = 0;
  if (isSimplesNacional) {
    impostoFederalMercadoInterno = impostoFederalSimples;
  } else if (isShipmentPf) {
    impostoFederalMercadoInterno = impostoFederalPf;
  } else {
    impostoFederalMercadoInterno = impostoFederalPjSpread;
  }

  // Imposto Federal Líquido Efetivo a Recolher
  const impostoFederalLiquido = isExportCargo
    ? 0
    : ((autoOrRealFederalTax !== undefined && autoOrRealFederalTax > 0) 
        ? autoOrRealFederalTax 
        : impostoFederalMercadoInterno);

  // 9. GR (Gerenciadora de Risco - Modalidade de Consulta Realizada)
  let historyRiskType: string | undefined;
  let historyReleaseCode: string | undefined;
  let historyRiskCost: number | undefined;

  if (Array.isArray(shipment.history)) {
    for (const h of shipment.history) {
      const msg = typeof h === 'string' ? h : ((h as any)?.description || (h as any)?.message || '');
      const matchGr = msg.match(/Libera[çc][ãa]o\s+de\s+Seguradora:\s*(?:C[óo]d\s*)?([^\(\n]+?)\s*\(([^-\)]+?)(?:\s*-\s*R\$\s*([\d.,]+))?\)/i);
      if (matchGr) {
        if (matchGr[1] && matchGr[1].trim()) historyReleaseCode = matchGr[1].trim();
        if (matchGr[2] && matchGr[2].trim()) historyRiskType = matchGr[2].trim();
        if (matchGr[3] && matchGr[3].trim()) {
          const c = parseFloat(matchGr[3].replace('.', '').replace(',', '.'));
          if (!isNaN(c)) historyRiskCost = c;
        }
      }
    }
  }

  const effectiveRiskType = riskQueryType || shipment.riskQueryType || historyRiskType;
  const effectiveReleaseCode = riskReleaseCode || shipment.riskReleaseCode || historyReleaseCode;
  
  const riskCost = (shipment.riskQueryCost !== undefined && shipment.riskQueryCost !== null)
    ? Number(shipment.riskQueryCost)
    : (historyRiskCost !== undefined && historyRiskCost !== null
        ? historyRiskCost
        : (effectiveRiskType 
            ? (RISK_QUERY_COST_MAP[effectiveRiskType] ?? RISK_QUERY_COST_MAP[effectiveRiskType.toLowerCase().trim()] ?? 6.50)
            : (shipment.status === ShipmentStatus.AguardandoSeguradora ? 0 : 6.50)));

  // 10. INSS Patronal / CPRB: PF = 4% sobre (Frete Motorista - Pedágio); PJ = R$ 0,00 (Isento)
  const cprbPfRate = 0.04; // 4%
  const baseInssPatronal = Math.max(0, driverFreight - toll);
  const inssPatronalMotorista = isShipmentPf
    ? Number((baseInssPatronal * cprbPfRate).toFixed(2))
    : 0;

  // 11. CIOT (0,20% s/ Frete do Motorista abatido o Pedágio)
  const baseCiotFreight = Math.max(0, driverFreight - toll);
  const ciotValue = Number((baseCiotFreight * 0.0020).toFixed(2));

  // 13. Custo Fixo (0,35% s/ Frete Bruto)
  const custoFixoValue = Number((cteGrossFreight * 0.0035).toFixed(2));

  // 14. Comissão Vendedor Externo (R$/ton cadastrado na carga)
  const salespersonRate = Number(cargo?.salespersonCommissionPerTon) || 0;
  const salespersonName = cargo?.salespersonName || '';
  const salespersonCommission = (salespersonRate > 0 && tonnage > 0)
    ? Number((salespersonRate * tonnage).toFixed(2))
    : 0;

  // 14.1 Comissão Comercial (0,20% s/ Frete Bruto)
  const comissaoComercialCalculada = Number((cteGrossFreight * 0.0020).toFixed(2));
  const comissaoComercial = shipment.commercialCommission !== undefined && shipment.commercialCommission > 0
    ? shipment.commercialCommission
    : (shipment.realProfitData?.commission !== undefined && shipment.realProfitData.commission > 0
        ? shipment.realProfitData.commission
        : comissaoComercialCalculada);

  // 15. Lucro Líquido Real Calculado (Deduções operacionais efetivas da transportadora)
  const totalDeducoes = Number((
    impostoFederalLiquido +
    icms +
    riskCost +
    seguroRcv +
    totalSeguroAcidenteRoubo +
    ciotValue +
    custoFixoValue +
    inssPatronalMotorista +
    salespersonCommission +
    comissaoComercial +
    driverFreight
  ).toFixed(2));

  // Lucro Líquido Real Calculado (Deduções operacionais efetivas da transportadora - SEM somar o Crédito Gerado, que é mantido como informativo)
  const netProfitCalculated = Number((cteGrossFreight - totalDeducoes).toFixed(2));
  const realProfit = shipment.realProfitData?.netProfit !== undefined
    ? shipment.realProfitData.netProfit
    : netProfitCalculated;

  const marginPercent = cteGrossFreight > 0 ? ((realProfit / cteGrossFreight) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-xs text-slate-800 dark:text-slate-100 font-sans space-y-3.5">
      
      {/* Cabeçalho Principal */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
              <span>Automatização do CT-e</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Custos & Margem
              </span>
              {isExportCargo ? (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                  Exportação
                </span>
              ) : (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Mercado Interno
                </span>
              )}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic flex items-center gap-1 shrink-0">
            <Info className="w-3 h-3" />
            Visualização
          </span>
        </div>
      </div>

      {/* Barra Compacta de Enquadramento Fiscal */}
      <div className="bg-white dark:bg-slate-800/95 rounded-xl border border-slate-200/90 dark:border-slate-700/80 p-2.5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className={`w-3.5 h-3.5 shrink-0 ${
              isSimplesNacional ? 'text-purple-600' : isShipmentPf ? 'text-orange-500' : 'text-blue-600'
            }`} />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">
              Regime Tributário
            </span>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
            isSimplesNacional
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
              : isShipmentPf
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
          }`}>
            {justSaved ? '✔ Salvo!' : selectedRegime}
          </span>
        </div>

        {/* Linha com Select e Botão Salvar perfeitamente dimensionados */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedRegime}
            onChange={(e) => setSelectedRegime(e.target.value)}
            disabled={isSavingRegime}
            className={`flex-1 min-w-0 text-xs font-semibold rounded-lg px-2 py-1.5 border outline-hidden transition-all cursor-pointer truncate ${
              isSimplesNacional
                ? 'bg-purple-50/70 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800'
                : isShipmentPf
                  ? 'bg-orange-50/70 text-orange-900 border-orange-300 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800'
                  : 'bg-blue-50/70 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
            }`}
          >
            <option value="Simples Nacional">🟣 Simples Nacional (3,40% s/ Frete Bruto)</option>
            <option value="Lucro Real / Presumido">🔵 Lucro Real / Presumido (9,25% s/ Spread)</option>
            <option value="PF">🟠 Pessoa Física / TAC (3,655% s/ Líq. + 4% CPRB)</option>
            <option value="MEI">🟢 MEI (Simples Nacional - 3,40%)</option>
          </select>

          <button
            type="button"
            onClick={handleSaveRegime}
            disabled={isSavingRegime}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
            title="Salvar regime tributário no banco de dados e registrar histórico"
          >
            {isSavingRegime ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Salvar</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {isSimplesNacional 
            ? 'Simples Nacional: 3,40% sobre Frete Empresa Bruto' 
            : isShipmentPf 
              ? 'PF / TAC: 3,655% s/ Frete Líquido + 4% CPRB' 
              : 'Regime Normal: 9,25% s/ Spread Comercial'}
        </p>
      </div>

      {/* LINHA 1: Cards Principais de Receita & Bases */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Box 1: CTe Frete Bruto */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-blue-100 dark:border-blue-900/40 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="uppercase tracking-wider">CT-e Frete Bruto</span>
            <Receipt className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatBrl(cteGrossFreight)}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">
            Empresa • {tonnage.toLocaleString('pt-BR')} ton
          </div>
        </div>

        {/* Box 2: Valor NF (Valor da Mercadoria / Carga do CT-e) & Base de Seguro (+18%) */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-2.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              <span className="uppercase tracking-wider">Valor NF</span>
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono leading-tight">
              {formatBrl(invoiceValue)}
            </div>
          </div>
          <div className="mt-1 pt-1 border-t border-indigo-50 dark:border-indigo-950/60" title={`Base de cálculo do seguro averbado: Valor da NF (${formatBrl(invoiceValue)})${isExportCargo ? ' + 18% (Exportação)' : ' (Mercado Interno)'} = ${formatBrl(insuranceBaseValue)}`}>
            <div className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
              Base Seguro {isExportCargo ? '(+18% Exp.)' : '(NF)'}:
            </div>
            <div className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
              {formatBrl(insuranceBaseValue)}
            </div>
          </div>
        </div>

        {/* Box 3: Crédito Gerado (Informativo Fiscal - Gerado apenas se for Exportação) */}
        <div className={`bg-white dark:bg-slate-800/90 rounded-xl border p-2.5 shadow-2xs ${
          isExportCargo 
            ? 'border-emerald-200 dark:border-emerald-900/40' 
            : 'border-slate-200 dark:border-slate-800 opacity-80'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="uppercase tracking-wider">Crédito Gerado</span>
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              Informativo
            </span>
          </div>
          <div className={`text-sm sm:text-base font-bold font-mono ${
            isExportCargo ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}>
            {formatBrl(pisCofinsCredit)}
          </div>
          <div 
            className={`text-[10px] font-medium truncate mt-0.5 ${
              isExportCargo ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
            }`} 
            title={isExportCargo ? `Exportação PJ • Crédito Fiscal PIS/COFINS informativo (${formatBrl(pisCofinsCredit)})` : 'Gera crédito fiscal apenas quando a carga for de exportação'}
          >
            {isExportCargo ? `${creditRatePercentLabel} (Info)` : 'Apenas Exportação'}
          </div>
        </div>
      </div>

      {/* Box de Destaque: Diferença de Frete (Passo 3: Frete_Liquido - Frete_Motorista) */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-blue-200/80 dark:border-blue-800/60 p-2.5 shadow-2xs space-y-2">
        {/* Cabeçalho da Diferença de Frete */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">💡</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Diferença de Frete
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Margem:</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              {margemFretePercent}%
            </span>
          </div>
        </div>

        {/* Grade da Equação: Frete Líquido - Frete Motorista = Diferença */}
        <div className="grid grid-cols-3 gap-1.5 items-center text-center">
          {/* Frete Líquido */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-1.5 border border-slate-100 dark:border-slate-800">
            <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">
              Frete Líquido
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono truncate" title={`Frete Bruto ${formatBrl(cteGrossFreight)} - ICMS ${formatBrl(icmsBruto)}`}>
              {formatBrl(freteLiquidoIcms)}
            </div>
          </div>

          {/* Frete Motorista */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-1.5 border border-slate-100 dark:border-slate-800 relative">
            <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none select-none">−</span>
            <div className="text-[9px] font-semibold text-rose-500 uppercase tracking-tight truncate">
              Frete Motorista
            </div>
            <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono truncate" title="Frete contratado do motorista">
              {formatBrl(driverFreight)}
            </div>
            <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none select-none">=</span>
          </div>

          {/* Diferença R$ */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg p-1.5 border border-emerald-200/80 dark:border-emerald-800/60">
            <div className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-tight truncate">
              Diferença R$
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono truncate">
              {formatBrl(diferencaFreteReais)}
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 2: Composição das Deduções & Custos (Grid 2 Colunas) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-0.5">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-slate-400" />
            Composição das Deduções
          </span>
          <span className="text-[10px] font-normal text-slate-400 lowercase">
            total descontos: <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">{formatBrl(totalDeducoes)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          
          {/* Imposto Federal (Simples Nacional 3,40% / PIS/COFINS / Contribuições Federais) */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Imposto Federal</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                isExportCargo 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                  : isSimplesNacional
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              } shrink-0 max-w-[140px] truncate`} title={
                isExportCargo 
                  ? 'Exportação: Isenção / Alíquota zero de PIS/COFINS na saída' 
                  : isSimplesNacional
                    ? `Simples Nacional (Anexo III): 3,40% sobre Frete Empresa Bruto (${formatBrl(cteGrossFreight)})`
                    : (isShipmentPf ? `PF Mercado Interno: 3,655% sobre Frete Líquido (${formatBrl(freteLiquidoIcms)})` : `PJ Mercado Interno: 9,25% sobre o Spread Comercial / Diferença (${formatBrl(diferencaFreteReais)})`)
              }>
                {isExportCargo ? 'Exportação (Isento)' : (isSimplesNacional ? '3,40% Simples Nac.' : (isShipmentPf ? '3,655% Frete Líq.' : '9,25% s/ Spread'))}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${impostoFederalLiquido > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {impostoFederalLiquido > 0 ? `- ${formatBrl(impostoFederalLiquido)}` : 'R$ 0,00'}
            </div>
            <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={
              isExportCargo 
                ? 'Exportação: Receita desonerada de PIS/COFINS' 
                : isSimplesNacional
                  ? `Simples Nacional: Frete Empresa Bruto ${formatBrl(cteGrossFreight)} • 3,40% = ${formatBrl(impostoFederalSimples)}`
                  : (isShipmentPf ? `PF: Frete Líq. ${formatBrl(freteLiquidoIcms)} • 3,655%` : `PJ: Spread ${formatBrl(diferencaFreteReais)} • 9,25%`)
            }>
              {isExportCargo ? 'Exportação: R$ 0,00' : (isSimplesNacional ? `Simples Nac.: ${formatBrl(cteGrossFreight)} • 3,40%` : (isShipmentPf ? `PF: Frete Líq. ${formatBrl(freteLiquidoIcms)} • 3,655%` : `PJ: Spread ${formatBrl(diferencaFreteReais)} • 9,25%`))}
            </div>
          </div>

          {/* ICMS Destacado Completo */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate" title="Valor integral do ICMS destacado no CT-e">
                ICMS Destacado
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0" title={`Alíquota de ${icmsPercentage}% destacada no CT-e`}>
                {icmsPercentage > 0 ? `${icmsPercentage}% CT-e` : 'Isento'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${icms > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {icms > 0 ? `- ${formatBrl(icms)}` : 'R$ 0,00'}
            </div>
            {icmsBruto > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`Valor integral do ICMS destacado no CT-e (${icmsPercentage}% s/ ${formatBrl(cteGrossFreight)})`}>
                Integral CT-e ({formatBrl(icmsBruto)})
              </div>
            )}
          </div>

          {/* Vale-Pedágio: (Informativo da Carta Frete / TAG) */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Vale-Pedágio:</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                Informativo (TAG)
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatBrl(toll)}
            </div>
          </div>

          {/* Consulta GR (Modalidade de Consulta Realizada) */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Consulta GR:</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0 max-w-[130px] truncate" title={effectiveRiskType || 'Pendente de Definição'}>
                {effectiveRiskType || 'Consulta'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className={`text-xs sm:text-sm font-bold font-mono ${riskCost > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {riskCost > 0 ? `- ${formatBrl(riskCost)}` : 'R$ 0,00'}
              </div>
              {effectiveReleaseCode ? (
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[90px]" title={`Liberação: ${effectiveReleaseCode}`}>
                  {effectiveReleaseCode}
                </span>
              ) : null}
            </div>
          </div>

          {/* Seguro RCV */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Seguro RCV</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                R$ 5/veíc
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              - {formatBrl(seguroRcv)}
            </div>
          </div>

          {/* Seguro Acidente + Roubo */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Acidente + Roubo</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0" title={`0,0125% Acidente + 0,0125% Roubo = 0,025% sobre a Base de Seguro (${formatBrl(insuranceBaseValue)})${isExportCargo ? ' (NF + 18% para Exportação)' : ' (NF Integral)'}`}>
                {isExportCargo ? '0,025% (NF+18%)' : '0,025% (NF)'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${totalSeguroAcidenteRoubo > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {totalSeguroAcidenteRoubo > 0 ? `- ${formatBrl(totalSeguroAcidenteRoubo)}` : 'R$ 0,00'}
            </div>
            {insuranceBaseValue > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`Base de Seguro: ${formatBrl(insuranceBaseValue)}${isExportCargo ? ' (NF + 18%)' : ' (NF)'} x 0,025%`}>
                Base {formatBrl(insuranceBaseValue)} • 0,025%
              </div>
            )}
          </div>

          {/* CIOT (0,20% sobre o Frete Motorista abatido o Pedágio) */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">CIOT</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0" title="0,20% sobre o frete do motorista abatido o valor do pedágio">
                0,20% Mot.{toll > 0 ? ' - Ped.' : ''}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              - {formatBrl(ciotValue)}
            </div>
            {driverFreight > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`0,20% sobre o frete do motorista ${toll > 0 ? `abatido pedágio (${formatBrl(baseCiotFreight)})` : `(${formatBrl(driverFreight)})`}`}>
                {toll > 0 ? `0,20% s/ Mot.-Ped. (${formatBrl(baseCiotFreight)})` : `0,20% s/ Mot. (${formatBrl(driverFreight)})`}
              </div>
            )}
          </div>

          {/* Custo Fixo */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Custo Fixo</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                0,35%
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              - {formatBrl(custoFixoValue)}
            </div>
          </div>

          {/* INSS Patronal / CPRB (4% s/ (Frete Motorista - Pedágio) em embarques PF, Isento para PJ) */}
          <div className={`p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${!isShipmentPf ? 'opacity-90' : ''}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">INSS Patronal / CPRB</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                isShipmentPf 
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                {isShipmentPf ? '4% CPRB (PF)' : 'Isento (PJ)'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${
              isShipmentPf && inssPatronalMotorista > 0
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-emerald-600 dark:text-emerald-400 font-medium'
            }`}>
              {isShipmentPf && inssPatronalMotorista > 0 ? `- ${formatBrl(inssPatronalMotorista)}` : 'R$ 0,00'}
            </div>
            {isShipmentPf && inssPatronalMotorista > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`4,00% do INSS Patronal / CPRB sobre o frete motorista líquido de pedágio (${formatBrl(driverFreight)} - ${formatBrl(toll)} = ${formatBrl(baseInssPatronal)})`}>
                4% s/ Frete Mot. - Pedágio ({formatBrl(baseInssPatronal)})
              </div>
            )}
          </div>

          {/* Comissão Vendedor */}
          <div className={`p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${salespersonCommission === 0 ? 'opacity-90' : ''}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate" title={salespersonName ? `Vendedor: ${salespersonName}` : 'Comissão Vendedor'}>
                Comissão Vendedor
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 max-w-[120px] truncate ${
                salespersonCommission > 0 
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`} title={salespersonCommission > 0 ? (salespersonName ? `${salespersonName} (R$ ${salespersonRate.toFixed(2)}/t)` : `R$ ${salespersonRate.toFixed(2)}/t`) : 'Sem comissão'}>
                {salespersonCommission > 0 ? (salespersonName ? `${salespersonName.slice(0, 8)} • R$ ${salespersonRate.toFixed(2)}/t` : `R$ ${salespersonRate.toFixed(2)}/t`) : 'Isento'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${salespersonCommission > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {salespersonCommission > 0 ? `- ${formatBrl(salespersonCommission)}` : 'R$ 0,00'}
            </div>
            {salespersonCommission > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`${tonnage.toFixed(2)} ton x R$ ${salespersonRate.toFixed(2)}/ton`}>
                {salespersonName ? `${salespersonName} • ` : ''}{tonnage.toFixed(2)}t x {formatBrl(salespersonRate)}/t
              </div>
            )}
          </div>

          {/* Frete Motorista */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1">
                <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                Frete Motorista
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                R$ {driverRate.toLocaleString('pt-BR')}/t
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              - {formatBrl(driverFreight)}
            </div>
          </div>

          {/* Comissão do Comercial (0,20% sobre o Frete Bruto da Empresa) */}
          <div className={`p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${comissaoComercial === 0 ? 'opacity-90' : ''}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                Comissão Comercial
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0" title="0,20% sobre o valor bruto do frete empresa do embarque">
                0,20%
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${comissaoComercial > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {comissaoComercial > 0 ? `- ${formatBrl(comissaoComercial)}` : 'R$ 0,00'}
            </div>
            {cteGrossFreight > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`0,20% sobre Frete Bruto da Empresa (${formatBrl(cteGrossFreight)})`}>
                0,20% s/ Bruto ({formatBrl(cteGrossFreight)})
              </div>
            )}
          </div>

        </div>
      </div>

      {/* LINHA 3: Card de Destaque - LUCRO LÍQUIDO REAL */}
      <div>
        <div className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-300 ${
          realProfit >= 0
            ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/40 shadow-xs'
            : 'bg-gradient-to-r from-rose-500/10 via-red-500/5 to-rose-500/10 border-rose-500/30 dark:border-rose-500/40 shadow-xs'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg shadow-xs shrink-0 ${
                realProfit >= 0 
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500' 
                  : 'bg-rose-600 text-white dark:bg-rose-500'
              }`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Lucro Líquido Real
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                    realProfit >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatBrl(realProfit)}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    realProfit >= 0
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  }`}>
                    {marginPercent}%
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                realProfit >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
              }`}>
                {realProfit >= 0 ? '✓ Lucrativo' : '⚠ Negativo'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CteCostAutomationPanel;
