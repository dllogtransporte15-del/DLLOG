import React from 'react';
import { Shipment, ShipmentStatus, Cargo, RISK_QUERY_COST_MAP } from '../types';
import { extractDetailedDocData } from '../utils/fiscalDocParser';
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
  Sparkles
} from 'lucide-react';

interface CteCostAutomationPanelProps {
  shipment: Shipment;
  cargo?: Cargo;
  tollValue?: number | string;
  loadedTonnage?: number | string;
  riskQueryType?: string;
  riskReleaseCode?: string;
}

export const CteCostAutomationPanel: React.FC<CteCostAutomationPanelProps> = ({
  shipment,
  cargo,
  tollValue,
  loadedTonnage,
  riskQueryType,
  riskReleaseCode,
}) => {
  const formatBrl = (val: number | undefined | null) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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

  // 2. Valor NF (Valor da Mercadoria / Carga informado no CT-e / NF-e)
  const invoiceValue = autoInvoiceValue || shipment.nfeValue || shipment.realProfitData?.invoiceValue || 0;

  // 3. Seguro Acidente (0,0125%) + Roubo (0,0125%) = 0,025% sobre o Valor NF
  const taxaSeguroAcidente = 0.000125; // 0,0125%
  const taxaSeguroRoubo = 0.000125;    // 0,0125%
  const taxaSeguroTotal = taxaSeguroAcidente + taxaSeguroRoubo; // 0,025%
  const insuranceTaxes = invoiceValue > 0 ? Number((invoiceValue * taxaSeguroTotal).toFixed(2)) : 0;
  const totalSeguroAcidenteRoubo = insuranceTaxes;

  // 4. Seguro RCV (R$ 5,00 por veículo / viagem)
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

  // 12. Frete Motorista & Identificação PF (Autônomo/TAC) vs PJ (Empresa/ETC)
  const isShipmentPf = shipment.driverFreightType === 'PF';
  const isPjDriver = !isShipmentPf;
  const isPf = isShipmentPf;
  const creditRate = isPjDriver ? 0.0925 : 0.069375; // PJ: 100% (9,25%) | PF: 75% (6,9375%)
  const creditRatePercentLabel = isPjDriver ? 'PJ (100% • 9,25%)' : 'PF (75% • 6,9375%)';

  const driverRate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || 0;
  const driverFreight = shipment.realProfitData?.driverFreight !== undefined && shipment.realProfitData.driverFreight > 0
    ? shipment.realProfitData.driverFreight
    : (shipment.driverFreightValue || (driverRate * tonnage));

  // Bases de Frete Líquidas de Pedágio (Conforme regra do ERP)
  const baseFreteEmpresa = Math.max(0, cteGrossFreight - toll);
  const baseFreteMotorista = Math.max(0, driverFreight - toll);

  // 7. ICMS (Alíquota interestadual com Crédito Presumido de 20% - Convênio ICMS 106/96 / Anexo VIII RICMS/MG)
  const icmsPercentage = cargo?.icmsPercentage || (cargo?.hasIcms ? 7 : 0);
  const icmsBruto = (cargo?.hasIcms && icmsPercentage > 0)
    ? Number((cteGrossFreight * (icmsPercentage / 100)).toFixed(2))
    : 0;
  const creditoPresumidoIcms = Number((icmsBruto * 0.20).toFixed(2));
  const icmsLiquidoCalculado = Number((icmsBruto - creditoPresumidoIcms).toFixed(2));

  const icms = shipment.realProfitData?.icmsDifference !== undefined && shipment.realProfitData.icmsDifference > 0
    ? shipment.realProfitData.icmsDifference
    : icmsLiquidoCalculado;

  // 6. Imposto Federal PIS COFINS (Leitura do XML, Suspensão Tributária ou Apuração Lucro Real Não Cumulativo)
  const isExportSuspended = Boolean(
    cargo?.isExport ||
    (cargo?.observations && /export/i.test(cargo.observations)) ||
    (cargo?.destination && /(porto|terminal|embarque portu[aá]rio|santos|paranagu[aá]|itaqui|rio grande|barcarena|suape|vit[oó]ria)/i.test(cargo.destination))
  );

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

  const suspensionPercentage = isExportSuspended 
    ? 100 
    : (suspMatch ? parseFloat(suspMatch[1].replace(',', '.')) : (isSuspendedRoute ? 30 : 0));
  const tributavelRatio = isExportSuspended ? 0 : Math.max(0, (100 - suspensionPercentage) / 100);

  // Bases Líquidas de ICMS
  const icmsRate = (cargo?.hasIcms && icmsPercentage > 0) ? (icmsPercentage / 100) : 0;
  const baseFreteEmpresaLiqIcms = Math.max(0, baseFreteEmpresa * (1 - icmsRate));
  const baseFreteMotoristaLiqIcms = Math.max(0, baseFreteMotorista * (1 - icmsRate));
  const spreadLiquidoIcms = Math.max(0, (baseFreteEmpresa - baseFreteMotorista) * (1 - icmsRate));

  // 5. Crédito PIS COFINS
  const autoOrRealCredit = shipment.realProfitData?.generatedCredit;
  const pisCofinsCredit = (autoOrRealCredit !== undefined && autoOrRealCredit > 0)
    ? autoOrRealCredit
    : (baseFreteMotoristaLiqIcms > 0 ? Number((baseFreteMotoristaLiqIcms * (suspensionPercentage > 0 ? tributavelRatio : 1) * creditRate).toFixed(2)) : 0);

  // 6. Débito PIS COFINS
  const autoOrRealFederalTax = autoFederalTax || shipment.realProfitData?.federalTax;
  const federalPisCofinsDebito = isExportSuspended
    ? 0
    : ((autoOrRealFederalTax !== undefined && autoOrRealFederalTax > 0)
        ? autoOrRealFederalTax
        : (baseFreteEmpresaLiqIcms > 0 ? Number((baseFreteEmpresaLiqIcms * (suspensionPercentage > 0 ? tributavelRatio : 1) * 0.0925).toFixed(2)) : 0));

  // Imposto Federal Líquido Efetivo a Recolher
  const impostoFederalLiquido = isExportSuspended
    ? 0
    : (suspensionPercentage > 0
        ? Number((spreadLiquidoIcms * 0.070065).toFixed(2))
        : Number(Math.max(0, federalPisCofinsDebito - pisCofinsCredit).toFixed(2)));

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

  const effectiveRiskType = (riskQueryType && riskQueryType.trim() !== '')
    ? riskQueryType.trim()
    : (shipment.riskQueryType && String(shipment.riskQueryType).trim() !== ''
        ? String(shipment.riskQueryType).trim()
        : (shipment.documents?.risk_query_type && String(shipment.documents.risk_query_type).trim() !== ''
            ? String(shipment.documents.risk_query_type).trim()
            : (historyRiskType || (shipment.status === ShipmentStatus.AguardandoSeguradora ? 'Pendente' : 'Consulta'))));

  const effectiveReleaseCode = (riskReleaseCode && riskReleaseCode.trim() !== '')
    ? riskReleaseCode.trim()
    : (shipment.riskReleaseCode || (shipment.documents as any)?.risk_release_code || historyReleaseCode || '');

  const matchedCost = effectiveRiskType && effectiveRiskType !== 'Pendente'
    ? (RISK_QUERY_COST_MAP[effectiveRiskType] ?? RISK_QUERY_COST_MAP[effectiveRiskType.toLowerCase().trim()] ?? 6.50)
    : undefined;

  const riskCost = shipment.riskQueryCost !== undefined && shipment.riskQueryCost > 0
    ? shipment.riskQueryCost
    : (historyRiskCost !== undefined && historyRiskCost > 0
        ? historyRiskCost
        : (matchedCost !== undefined ? matchedCost : (effectiveRiskType === 'Pendente' ? 0 : 6.50)));

  // 10. CIOT (0,20% sobre CTe Frete Bruto)
  const ciotTaxa = 0.0020; // 0,20%
  const ciotValue = Number((cteGrossFreight * ciotTaxa).toFixed(2));

  // 11. Custo Fixo (0,35% sobre o valor bruto da empresa = CT-e Frete Bruto)
  const custoFixoTaxa = 0.0035; // 0,35%
  const custoFixoValue = shipment.realProfitData?.otherCosts !== undefined && shipment.realProfitData.otherCosts > 0
    ? shipment.realProfitData.otherCosts
    : (cteGrossFreight > 0 ? Number((cteGrossFreight * custoFixoTaxa).toFixed(2)) : 0);

  // 12. INSS Patronal (Abatido apenas em embarques do tipo "PF", Isento para PJ)
  const patronalPfRate = 0.04; // 4%
  const inssPatronalMotorista = isShipmentPf ? Number((driverFreight * patronalPfRate).toFixed(2)) : 0;

  // 13. Comissão de Vendedor Externo (Caso informada na carga)
  const salespersonRate = Number(cargo?.salespersonCommissionPerTon) || 0;
  const salespersonName = cargo?.salespersonName || '';
  const salespersonCommission = (salespersonRate > 0 && tonnage > 0)
    ? Number((salespersonRate * tonnage).toFixed(2))
    : 0;

  // 14. Lucro Líquido Real Calculado (Deduções operacionais efetivas da transportadora)
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
    driverFreight
  ).toFixed(2));

  const netProfitCalculated = Number((cteGrossFreight - totalDeducoes).toFixed(2));
  const realProfit = shipment.realProfitData?.netProfit !== undefined
    ? shipment.realProfitData.netProfit
    : netProfitCalculated;

  const marginPercent = cteGrossFreight > 0 ? ((realProfit / cteGrossFreight) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-xs text-slate-800 dark:text-slate-100 font-sans space-y-3.5">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
              <span>Automatização do CT-e</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                Custos & Margem
              </span>
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

        {/* Box 2: Valor NF (Valor da Mercadoria / Carga do CT-e) */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="uppercase tracking-wider">Valor NF</span>
            <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatBrl(invoiceValue)}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
            Mercadoria / Carga
          </div>
        </div>

        {/* Box 3: Crédito PIS COFINS */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-emerald-100 dark:border-emerald-900/40 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="uppercase tracking-wider">Crédito PIS / COFINS</span>
            <Percent className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
            {formatBrl(pisCofinsCredit)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5" title={creditRatePercentLabel}>
            {creditRatePercentLabel}
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
          
          {/* Imposto Federal (PIS/COFINS Líquido: Débito - Crédito) */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Imposto Federal</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isExportSuspended ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'} shrink-0 max-w-[140px] truncate`} title={suspensionPercentage > 0 ? `Suspensão Tributária de ${suspensionPercentage}% • Alíquota efetiva 7,0065% s/ Spread Líquido de ICMS` : `Débito PIS/COFINS: ${formatBrl(federalPisCofinsDebito)} (-) Crédito: ${formatBrl(pisCofinsCredit)}`}>
                {isExportSuspended ? 'Exportação (Suspenso)' : (suspensionPercentage > 0 ? `${suspensionPercentage}% Susp.` : 'Líquido')}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${impostoFederalLiquido > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {impostoFederalLiquido > 0 ? `- ${formatBrl(impostoFederalLiquido)}` : 'R$ 0,00'}
            </div>
            <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={suspensionPercentage > 0 ? `Spread Líq. ICMS: ${formatBrl(spreadLiquidoIcms)} x 7,0065%` : `Débito: ${formatBrl(federalPisCofinsDebito)} - Crédito: ${formatBrl(pisCofinsCredit)}`}>
              {suspensionPercentage > 0 ? `Spread Líq. ${formatBrl(spreadLiquidoIcms)} • 7,0065%` : `Déb. ${formatBrl(federalPisCofinsDebito)} - Créd. ${formatBrl(pisCofinsCredit)}`}
            </div>
          </div>

          {/* Diferença de ICMS (Com Crédito Presumido de 20%) */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Diferença de ICMS</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0" title="Alíquota interestadual com 20% de Crédito Presumido (Anexo VIII RICMS/MG)">
                {icmsPercentage > 0 ? `${icmsPercentage}% (Créd. 20%)` : 'Isento'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${icms > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {icms > 0 ? `- ${formatBrl(icms)}` : 'R$ 0,00'}
            </div>
            {icmsBruto > 0 && (
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={`ICMS Bruto: ${formatBrl(icmsBruto)} (-) Créd. Presumido (20%): ${formatBrl(creditoPresumidoIcms)}`}>
                Bruto {formatBrl(icmsBruto)} - Créd. {formatBrl(creditoPresumidoIcms)}
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
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                0,0125%
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${totalSeguroAcidenteRoubo > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {totalSeguroAcidenteRoubo > 0 ? `- ${formatBrl(totalSeguroAcidenteRoubo)}` : 'R$ 0,00'}
            </div>
          </div>

          {/* CIOT */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">CIOT</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                0,20%
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              - {formatBrl(ciotValue)}
            </div>
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

          {/* INSS Patronal (Abatido apenas em embarques PF, Isento para PJ) */}
          <div className={`p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between ${!isShipmentPf ? 'opacity-90' : ''}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">INSS Patronal</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                isShipmentPf 
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                {isShipmentPf ? '4% PF' : 'Isento (PJ)'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold font-mono ${
              isShipmentPf && inssPatronalMotorista > 0
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-emerald-600 dark:text-emerald-400 font-medium'
            }`}>
              {isShipmentPf && inssPatronalMotorista > 0 ? `- ${formatBrl(inssPatronalMotorista)}` : 'R$ 0,00'}
            </div>
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
