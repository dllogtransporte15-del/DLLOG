import { Shipment, Cargo, OperationalExpenseItem, RealProfitData, RISK_QUERY_COST_MAP } from '../types';

export interface OperationalExpensesConfig {
  insuranceAcidenteRate: number; // 0.0125% -> 0.000125
  insuranceRouboRate: number;    // 0.0125% -> 0.000125
  insuranceRcvPerLoad: number;   // R$ 5,00 por carga
  patronalPfRate: number;        // 3% sobre frete bruto se PF (CPRB) -> 0.03
  ciotRate: number;              // 0.20% sobre frete do motorista -> 0.0020
}

export const DEFAULT_EXPENSES_CONFIG: OperationalExpensesConfig = {
  insuranceAcidenteRate: 0.000125, // 0.0125%
  insuranceRouboRate: 0.000125,    // 0.0125%
  insuranceRcvPerLoad: 5.00,       // R$ 5,00 por carga
  patronalPfRate: 0.03,            // 3% da CPRB sobre Frete Bruto se PF
  ciotRate: 0.0020,                // 0,20% sobre o Frete Motorista
};

export interface CalculatedOperationalExpenses {
  invoiceValue: number;
  insuranceAcidente: number;
  insuranceRoubo: number;
  insuranceRcv: number;
  totalInsurance: number;
  inssPatronal: number;
  ciot: number;
  riskCost: number;
  expenseItems: OperationalExpenseItem[];
  totalExpenses: number;
}

/**
 * Calcula todas as despesas operacionais e tributárias automáticas para um embarque:
 * 1. Seguro Averbado - Acidente (0,0125% do valor da NF)
 * 2. Seguro Averbado - Roubo (0,0125% do valor da NF)
 * 3. Seguro Averbado - RCV (R$ 5,00 por carga)
 * 4. INSS Patronal / CPRB (3% da CPRB sobre o Frete Bruto da Empresa se for PF)
 * 5. Gerenciadora de Risco (GR conforme consulta)
 * 6. Outras despesas já registradas no OCR / comprovante
 */
export function calculateShipmentExpenses(
  shipment: Shipment,
  cargo?: Cargo,
  config: OperationalExpensesConfig = DEFAULT_EXPENSES_CONFIG
): CalculatedOperationalExpenses {
  const companyFreightRate = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
  const tonnage = shipment.shipmentTonnage || cargo?.totalVolume || 0;
  const companyFreight = shipment.realProfitData?.companyFreight !== undefined && shipment.realProfitData.companyFreight > 0
    ? shipment.realProfitData.companyFreight
    : (companyFreightRate > 0 && tonnage > 0 ? Number((companyFreightRate * tonnage).toFixed(2)) : (shipment.driverFreightValue || 0));

  const driverFreight = shipment.realProfitData?.driverFreight !== undefined 
    ? shipment.realProfitData.driverFreight 
    : (shipment.driverFreightValue || 0);

  // Valor da NF (procura no embarque, realProfitData ou nos documentos da carga)
  const invoiceValue = shipment.nfeValue || 
                       shipment.realProfitData?.invoiceValue || 
                       0;

  // Base de Seguro (Valor da NF + 18%)
  const insuranceBaseValue = invoiceValue > 0 ? Number((invoiceValue * 1.18).toFixed(2)) : 0;

  // 1. Seguro Acidente (0,0125% da Base de Seguro NF+18%)
  const insuranceAcidente = insuranceBaseValue > 0 
    ? Number((insuranceBaseValue * config.insuranceAcidenteRate).toFixed(2)) 
    : 0;

  // 2. Seguro Roubo (0,0125% da Base de Seguro NF+18%)
  const insuranceRoubo = insuranceBaseValue > 0 
    ? Number((insuranceBaseValue * config.insuranceRouboRate).toFixed(2)) 
    : 0;

  // 3. Seguro RCV (R$ 5,00 por carga)
  const insuranceRcv = config.insuranceRcvPerLoad;

  const totalInsurance = Number((insuranceAcidente + insuranceRoubo + insuranceRcv).toFixed(2));

  // 4. INSS Patronal / CPRB (3% sobre frete bruto da empresa se PF)
  const isPf = shipment.driverFreightType === 'PF';
  const inssPatronal = isPf && companyFreight > 0 
    ? Number((companyFreight * config.patronalPfRate).toFixed(2)) 
    : 0;

  // 5. CIOT (0,20% sobre o frete do motorista)
  const ciot = driverFreight > 0 ? Number((driverFreight * config.ciotRate).toFixed(2)) : 0;

  // 6. Custo de Gerenciadora de Risco (GR)
  const riskCost = shipment.riskQueryCost !== undefined && shipment.riskQueryCost > 0
    ? shipment.riskQueryCost
    : (shipment.riskQueryType 
        ? (RISK_QUERY_COST_MAP[shipment.riskQueryType] ?? RISK_QUERY_COST_MAP[shipment.riskQueryType.toLowerCase().trim()] ?? 0) 
        : 0);

  // 7. Montagem dos Itens de Despesa discriminados
  const expenseItems: OperationalExpenseItem[] = [];

  // Itens vindos do OCR ou já existentes no realProfitData
  const existingItems = shipment.realProfitData?.expenseItems || [];

  // Flags para evitar duplicação
  let hasAcidente = false;
  let hasRoubo = false;
  let hasRcv = false;
  let hasPatronal = false;
  let hasCiot = false;
  let hasGr = false;

  for (const item of existingItems) {
    const lower = item.name.toLowerCase();
    if (lower.includes('acidente')) hasAcidente = true;
    if (lower.includes('roubo')) hasRoubo = true;
    if (lower.includes('rcv')) hasRcv = true;
    if (lower.includes('patronal') || lower.includes('inss patronal') || lower.includes('cprb')) hasPatronal = true;
    if (lower.includes('ciot')) hasCiot = true;
    if (lower.includes('gr') || lower.includes('gerenciadora') || lower.includes('consulta de risco')) hasGr = true;
    expenseItems.push(item);
  }

  // Adiciona Seguro Acidente
  if (!hasAcidente && insuranceAcidente > 0) {
    expenseItems.push({
      name: `Seguro Averbado - Acidente (0,0125% NF)`,
      value: insuranceAcidente,
      type: 'negative'
    });
  }

  // Adiciona Seguro Roubo
  if (!hasRoubo && insuranceRoubo > 0) {
    expenseItems.push({
      name: `Seguro Averbado - Roubo (0,0125% NF)`,
      value: insuranceRoubo,
      type: 'negative'
    });
  }

  // Adiciona Seguro RCV
  if (!hasRcv && insuranceRcv > 0) {
    expenseItems.push({
      name: `Seguro Averbado - RCV (R$ 5,00 / carga)`,
      value: insuranceRcv,
      type: 'negative'
    });
  }

  // Adiciona INSS Patronal / CPRB se for PF
  if (!hasPatronal && inssPatronal > 0) {
    expenseItems.push({
      name: `INSS Patronal / CPRB (3% Frete Bruto PF)`,
      value: inssPatronal,
      type: 'negative'
    });
  }

  // Adiciona CIOT (0,20% s/ Frete Motorista)
  if (!hasCiot && ciot > 0) {
    expenseItems.push({
      name: `CIOT (0,20% Frete Motorista)`,
      value: ciot,
      type: 'negative'
    });
  }

  // Adiciona Gerenciadora de Risco (GR)
  if (!hasGr && riskCost > 0) {
    expenseItems.push({
      name: `Gerenciadora de Risco (GR${shipment.riskQueryType ? ` - ${shipment.riskQueryType}` : ''})`,
      value: riskCost,
      type: 'negative'
    });
  }

  const totalExpenses = Number(
    expenseItems.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0).toFixed(2)
  );

  return {
    invoiceValue,
    insuranceAcidente,
    insuranceRoubo,
    insuranceRcv,
    totalInsurance,
    inssPatronal,
    ciot,
    riskCost,
    expenseItems,
    totalExpenses,
  };
}
