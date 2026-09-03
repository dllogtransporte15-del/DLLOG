import { Shipment, Cargo, OperationalExpenseItem, RealProfitData, RISK_QUERY_COST_MAP } from '../types';

export interface OperationalExpensesConfig {
  insuranceAcidenteRate: number; // 0.0125% -> 0.000125
  insuranceRouboRate: number;    // 0.0125% -> 0.000125
  insuranceRcvPerLoad: number;   // R$ 5,00 por carga
  patronalPfRate: number;        // 4% sobre (Frete Motorista - Pedágio) se PF (CPRB) -> 0.04
  ciotRate: number;              // 0.20% sobre frete do motorista -> 0.0020
  custoFixoRate: number;         // 0.35% sobre frete bruto -> 0.0035
  comissaoComercialRate: number; // 0.20% sobre frete bruto -> 0.0020
  simplesNacionalFederalRate: number; // 3.40% sobre Frete Empresa Bruto (Anexo III) -> 0.0340
}

export const DEFAULT_EXPENSES_CONFIG: OperationalExpensesConfig = {
  insuranceAcidenteRate: 0.000125, // 0.0125%
  insuranceRouboRate: 0.000125,    // 0.0125%
  insuranceRcvPerLoad: 5.00,       // R$ 5,00 por carga
  patronalPfRate: 0.04,            // 4% de INSS Patronal / CPRB sobre (Frete Motorista - Pedágio) se PF
  ciotRate: 0.0020,                // 0,20% sobre o Frete Motorista
  custoFixoRate: 0.0035,           // 0,35% sobre Frete Bruto
  comissaoComercialRate: 0.0020,   // 0,20% sobre Frete Bruto
  simplesNacionalFederalRate: 0.0340, // 3,40% sobre Frete Empresa Bruto (Anexo III)
};

export interface CalculatedOperationalExpenses {
  companyFreight: number;
  driverFreight: number;
  invoiceValue: number;
  insuranceBaseValue: number;
  insuranceAcidente: number;
  insuranceRoubo: number;
  insuranceRcv: number;
  totalInsurance: number;
  icmsPercentage: number;
  icmsBruto: number;
  icms: number;
  freteLiquidoIcms: number;
  freightDifference: number;
  freightDifferenceMarginPercent: number;
  impostoFederal: number;
  inssPatronal: number;
  ciot: number;
  custoFixo: number;
  comissaoComercial: number;
  salespersonCommission: number;
  riskCost: number;
  generatedCredit: number;
  expenseItems: OperationalExpenseItem[];
  totalExpenses: number; // Total deduções sem frete motorista
  totalDeducoesComFrete: number; // Total deduções com frete motorista
  netProfit: number;
  profitMarginPercent: number;
}

/**
 * Calcula todas as despesas operacionais e tributárias com a lógica exata da "Automatização do CT-e":
 * 1. Frete Empresa Bruto e Frete Motorista
 * 2. ICMS Destacado Integral
 * 3. Frete Empresa Líquido (Frete Bruto - ICMS Destacado)
 * 4. Diferença de Frete / Spread Comercial (Frete Líquido - Frete Motorista)
 * 5. Imposto Federal (Exportação: R$ 0 | Mercado Interno PF: 3,655% s/ Líquido | PJ: 9,25% s/ Spread)
 * 6. INSS Patronal / CPRB (PF: 3% s/ Bruto | PJ: R$ 0 Isento)
 * 7. Seguros Averbados (RCV R$ 5,00 + Acidente e Roubo 0,025% s/ NF+18%)
 * 8. CIOT (0,20% s/ Frete Motorista)
 * 9. Custo Fixo (0,35% s/ Frete Bruto)
 * 10. Comissão Comercial (0,20% s/ Frete Bruto)
 * 11. Comissão Vendedor Externo (se informada)
 * 12. Gerenciadora de Risco (GR)
 * 13. Fechamento do Lucro Líquido Real e Margem %
 */
export function calculateShipmentExpenses(
  shipment: Shipment,
  cargo?: Cargo,
  config: OperationalExpensesConfig = DEFAULT_EXPENSES_CONFIG
): CalculatedOperationalExpenses {
  const companyFreightRate = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
  const tonnage = shipment.shipmentTonnage || cargo?.totalVolume || 0;

  // 1. Frete Empresa Bruto
  const companyFreight = shipment.realProfitData?.companyFreight !== undefined && shipment.realProfitData.companyFreight > 0
    ? shipment.realProfitData.companyFreight
    : (companyFreightRate > 0 && tonnage > 0 ? Number((companyFreightRate * tonnage).toFixed(2)) : (shipment.driverFreightValue || 0));

  // 2. Frete Motorista
  const driverRate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || 0;
  const driverFreight = shipment.realProfitData?.driverFreight !== undefined && shipment.realProfitData.driverFreight > 0
    ? shipment.realProfitData.driverFreight 
    : (shipment.driverFreightValue || (driverRate > 0 && tonnage > 0 ? Number((driverRate * tonnage).toFixed(2)) : 0));

  // Perfil PF vs PJ
  const isShipmentPf = shipment.driverFreightType === 'PF';

  // Verificação de Carga Exportação
  const isExportCargo = cargo?.isExport !== undefined
    ? cargo.isExport
    : (shipment.isExport !== undefined
        ? shipment.isExport
        : Boolean(
            (cargo?.observations && /export/i.test(cargo.observations)) ||
            (cargo?.destination && /(porto|terminal|embarque portu[aá]rio|santos|paranagu[aá]|itaqui|rio grande|barcarena|suape|vit[oó]ria)/i.test(cargo.destination)) ||
            ((shipment as any)?.observations && /export/i.test((shipment as any).observations)) ||
            ((shipment as any)?.destination && /(porto|terminal|embarque portu[aá]rio|santos|paranagu[aá]|itaqui|rio grande|barcarena|suape|vit[oó]ria)/i.test((shipment as any).destination))
          ));

  // 3. ICMS Destacado Completo
  const icmsPercentage = cargo?.icmsPercentage || (cargo?.hasIcms ? 7 : 0);
  const icmsBruto = (cargo?.hasIcms && icmsPercentage > 0)
    ? Number((companyFreight * (icmsPercentage / 100)).toFixed(2))
    : 0;
  const icms = icmsBruto > 0 ? icmsBruto : (shipment.realProfitData?.icmsDifference || 0);

  // 4. Frete Empresa Líquido de ICMS
  const freteLiquidoIcms = Math.max(0, companyFreight - icmsBruto);

  // 5. Diferença de Frete / Spread Comercial
  const freightDifference = Number((freteLiquidoIcms - driverFreight).toFixed(2));
  const freightDifferenceMarginPercent = freteLiquidoIcms > 0
    ? Number(((freightDifference / freteLiquidoIcms) * 100).toFixed(2))
    : 0;

  // 6. Imposto Federal (Simples Nacional 3,40% s/ Frete Bruto | PF: 3,655% s/ Líquido | PJ Normal: 9,25% s/ Spread)
  const isSimplesNacional = Boolean(
    shipment.etcTaxRegime === 'Simples Nacional' ||
    shipment.etcTaxRegime === 'MEI' ||
    (shipment as any)?.isSimplesNacional ||
    (cargo as any)?.isSimplesNacional ||
    (shipment.documents as any)?.etc_tax_regime === 'Simples Nacional' ||
    (shipment.documents as any)?.etc_tax_regime === 'MEI' ||
    (shipment.documents as any)?.crt === '1' ||
    (shipment.documents as any)?.crt === '2'
  );

  const simplesFederalRate = config.simplesNacionalFederalRate ?? 0.0340;
  const impostoFederalSimples = Number((companyFreight * simplesFederalRate).toFixed(2));
  const impostoFederalPf = Number((freteLiquidoIcms * 0.03655).toFixed(2));
  const impostoFederalPjSpread = Number((Math.max(0, freightDifference) * 0.0925).toFixed(2));

  let impostoFederalMercadoInterno = 0;
  if (isSimplesNacional) {
    impostoFederalMercadoInterno = impostoFederalSimples;
  } else if (isShipmentPf) {
    impostoFederalMercadoInterno = impostoFederalPf;
  } else {
    impostoFederalMercadoInterno = impostoFederalPjSpread;
  }

  const impostoFederal = isExportCargo
    ? 0
    : (shipment.realProfitData?.federalTax !== undefined && shipment.realProfitData.federalTax > 0
        ? shipment.realProfitData.federalTax
        : impostoFederalMercadoInterno);

  // 7. INSS Patronal / CPRB (4% sobre Frete Motorista - Pedágio se PF, Isento se PJ)
  const toll = shipment.tollValue || shipment.realProfitData?.toll || 0;
  const baseInssPatronal = Math.max(0, driverFreight - toll);
  const inssPatronal = isShipmentPf && baseInssPatronal > 0 
    ? Number((baseInssPatronal * config.patronalPfRate).toFixed(2)) 
    : 0;

  // 8. Valor da NF e Base de Seguro (+18% somente em carga de exportação)
  const invoiceValue = shipment.nfeValue || 
                       shipment.realProfitData?.invoiceValue || 
                       0;
  const insuranceBaseValue = invoiceValue > 0 
    ? Number((invoiceValue * (isExportCargo ? 1.18 : 1.00)).toFixed(2)) 
    : 0;

  // 9. Seguros Averbados
  const insuranceAcidente = insuranceBaseValue > 0 
    ? Number((insuranceBaseValue * config.insuranceAcidenteRate).toFixed(2)) 
    : 0;
  const insuranceRoubo = insuranceBaseValue > 0 
    ? Number((insuranceBaseValue * config.insuranceRouboRate).toFixed(2)) 
    : 0;
  const insuranceRcv = config.insuranceRcvPerLoad;
  const totalInsurance = Number((insuranceAcidente + insuranceRoubo + insuranceRcv).toFixed(2));

  // 10. CIOT (0,20% s/ Frete Motorista)
  const ciot = driverFreight > 0 ? Number((driverFreight * config.ciotRate).toFixed(2)) : 0;

  // 11. Custo Fixo (0,35% s/ Frete Bruto)
  const custoFixo = companyFreight > 0 
    ? (shipment.realProfitData?.otherCosts !== undefined && shipment.realProfitData.otherCosts > 0 
        ? shipment.realProfitData.otherCosts 
        : Number((companyFreight * config.custoFixoRate).toFixed(2)))
    : 0;

  // 12. Comissão Comercial (0,20% s/ Frete Bruto)
  const comissaoComercial = shipment.commercialCommission !== undefined && shipment.commercialCommission > 0
    ? shipment.commercialCommission
    : (shipment.realProfitData?.commission !== undefined && shipment.realProfitData.commission > 0
        ? shipment.realProfitData.commission
        : (companyFreight > 0 ? Number((companyFreight * config.comissaoComercialRate).toFixed(2)) : 0));

  // 13. Comissão Vendedor Externo (se houver na carga)
  const salespersonRate = Number(cargo?.salespersonCommissionPerTon) || 0;
  const salespersonCommission = (salespersonRate > 0 && tonnage > 0)
    ? Number((salespersonRate * tonnage).toFixed(2))
    : 0;

  // 14. Gerenciadora de Risco (GR)
  const riskCost = shipment.riskQueryCost !== undefined && shipment.riskQueryCost > 0
    ? shipment.riskQueryCost
    : (shipment.riskQueryType 
        ? (RISK_QUERY_COST_MAP[shipment.riskQueryType] ?? RISK_QUERY_COST_MAP[shipment.riskQueryType.toLowerCase().trim()] ?? 0) 
        : 0);

  // 14.1 Crédito Gerado (Exportação PJ: 6,5975% s/ Frete Tributável da Empresa | PF: 6,9375%)
  // REGRA EXATA: Base Tributável = Frete Empresa - Pedágio (ex: R$ 6.952,75 - R$ 468,63 = R$ 6.484,12) * 0,065975059 -> R$ 427,79
  const baseCompanyFreightNoToll = Math.max(0, companyFreight - toll);
  const baseDriverFreightNoToll = Math.max(0, driverFreight - toll);
  const autoCredit = isExportCargo ? shipment.realProfitData?.generatedCredit : 0;
  const calculatedCredit = (isExportCargo && baseCompanyFreightNoToll > 0)
    ? Number((baseCompanyFreightNoToll * (isShipmentPf ? 0.069375 : 0.065975059)).toFixed(2))
    : (isExportCargo && baseDriverFreightNoToll > 0 ? Number((baseDriverFreightNoToll * 0.0693519).toFixed(2)) : 0);
  const generatedCredit = (autoCredit !== undefined && autoCredit > 0) ? autoCredit : calculatedCredit;

  // 15. Montagem discriminada dos itens de despesa operacionais
  const expenseItems: OperationalExpenseItem[] = [];

  if (icms > 0) {
    expenseItems.push({
      name: `ICMS Destacado (${icmsPercentage}% CT-e)`,
      value: icms,
      type: 'negative'
    });
  }

  if (impostoFederal > 0) {
    const federalLabel = isSimplesNacional
      ? `Imposto Federal (${(simplesFederalRate * 100).toFixed(2).replace('.', ',')}% Simples Nacional Anexo III)`
      : isShipmentPf
        ? 'Imposto Federal (3,655% s/ Líq.)'
        : 'Imposto Federal (9,25% s/ Spread)';

    expenseItems.push({
      name: federalLabel,
      value: impostoFederal,
      type: 'negative'
    });
  }

  if (inssPatronal > 0) {
    expenseItems.push({
      name: `INSS Patronal / CPRB (4% s/ Frete Mot. - Pedágio)`,
      value: inssPatronal,
      type: 'negative'
    });
  }

  if (insuranceAcidente > 0) {
    expenseItems.push({
      name: `Seguro Averbado - Acidente (0,0125% s/ ${isExportCargo ? 'NF+18%' : 'NF'})`,
      value: insuranceAcidente,
      type: 'negative'
    });
  }

  if (insuranceRoubo > 0) {
    expenseItems.push({
      name: `Seguro Averbado - Roubo (0,0125% s/ ${isExportCargo ? 'NF+18%' : 'NF'})`,
      value: insuranceRoubo,
      type: 'negative'
    });
  }

  if (insuranceRcv > 0) {
    expenseItems.push({
      name: `Seguro Averbado - RCV (R$ 5,00 / carga)`,
      value: insuranceRcv,
      type: 'negative'
    });
  }

  if (ciot > 0) {
    expenseItems.push({
      name: `CIOT (0,20% s/ Frete Motorista)`,
      value: ciot,
      type: 'negative'
    });
  }

  if (custoFixo > 0) {
    expenseItems.push({
      name: `Custo Fixo (0,35% s/ Frete Bruto)`,
      value: custoFixo,
      type: 'negative'
    });
  }

  if (comissaoComercial > 0) {
    expenseItems.push({
      name: `Comissão Comercial (0,20% s/ Frete Bruto)`,
      value: comissaoComercial,
      type: 'negative'
    });
  }

  if (salespersonCommission > 0) {
    expenseItems.push({
      name: `Comissão Vendedor (${cargo?.salespersonName || 'Externo'})`,
      value: salespersonCommission,
      type: 'negative'
    });
  }

  if (riskCost > 0) {
    expenseItems.push({
      name: `Gerenciadora de Risco (GR${shipment.riskQueryType ? ` - ${shipment.riskQueryType}` : ''})`,
      value: riskCost,
      type: 'negative'
    });
  }

  // Despesas adicionais que já estavam no realProfitData
  const existingItems = shipment.realProfitData?.expenseItems || [];
  for (const item of existingItems) {
    const lower = item.name.toLowerCase();
    const isDuplicate = 
      lower.includes('icms') ||
      lower.includes('imposto federal') ||
      lower.includes('inss patronal') ||
      lower.includes('cprb') ||
      lower.includes('acidente') ||
      lower.includes('roubo') ||
      lower.includes('rcv') ||
      lower.includes('ciot') ||
      lower.includes('custo fixo') ||
      lower.includes('comissão comercial') ||
      lower.includes('comissao comercial') ||
      lower.includes('gr') ||
      lower.includes('gerenciadora');

    if (!isDuplicate && Number(item.value) > 0) {
      expenseItems.push(item);
    }
  }

  // Total das deduções operacionais (sem frete motorista)
  const totalExpenses = Number(
    expenseItems.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0).toFixed(2)
  );

  // Total com frete motorista
  const totalDeducoesComFrete = Number((totalExpenses + driverFreight).toFixed(2));

  // Resultado / Lucro Líquido Real da Operação (incluindo Crédito Fiscal Gerado em Exportação)
  const netProfitCalculated = Number((companyFreight - totalDeducoesComFrete + (isExportCargo ? generatedCredit : 0)).toFixed(2));
  const netProfit = shipment.realProfitData?.netProfit !== undefined
    ? shipment.realProfitData.netProfit
    : netProfitCalculated;

  // Margem Efetiva sobre Frete Bruto
  const profitMarginPercent = companyFreight > 0 
    ? Number(((netProfit / companyFreight) * 100).toFixed(2)) 
    : 0;

  return {
    companyFreight,
    driverFreight,
    invoiceValue,
    insuranceBaseValue,
    insuranceAcidente,
    insuranceRoubo,
    insuranceRcv,
    totalInsurance,
    icmsPercentage,
    icmsBruto,
    icms,
    freteLiquidoIcms,
    freightDifference,
    freightDifferenceMarginPercent,
    impostoFederal,
    inssPatronal,
    ciot,
    custoFixo,
    comissaoComercial,
    salespersonCommission,
    riskCost,
    generatedCredit,
    expenseItems,
    totalExpenses,
    totalDeducoesComFrete,
    netProfit,
    profitMarginPercent,
  };
}
