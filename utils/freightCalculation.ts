import { Shipment, Cargo, ShipmentStatus } from '../types';

export interface TacTaxDeductions {
  fiscalBase: number;       // 20% do Frete Bruto
  inss: number;             // 11% sobre Fiscal Base (respeitando o teto previdenciário)
  sestSenat: number;        // 2,5% sobre Fiscal Base (1,5% SEST + 1,0% SENAT)
  irrfBase: number;         // Base Fiscal - INSS
  irrf: number;             // IRRF tabela progressiva mensal
  totalDeductions: number;  // INSS + SEST/SENAT + IRRF
}

export interface AdvanceAndBalanceResult {
  totalFreight: number;
  baseFreight: number;
  tollValue: number;
  advancePercentage: number;
  advanceInAccountValue: number;
  totalAdvanceValue: number;
  originalBalanceValue: number;      // Saldo Original antes dos impostos
  balanceToReceiveValue: number;      // Subtotal Líquido Pré-Descarga (deduzido de impostos se PF)
  driverFreightType?: 'PF' | 'PJ';
  tacTaxes?: TacTaxDeductions;
}

export const ADVANCE_ELIGIBLE_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.PreCadastro,            // "Ag. Cadastro"
  ShipmentStatus.AguardandoSeguradora,   // "Ag. Seguradora"
  ShipmentStatus.AguardandoCarregamento, // "Ag. Carregamento"
  ShipmentStatus.AguardandoNota,         // "Ag. Nota"
  ShipmentStatus.AguardandoFiscal,       // "Ag. Fiscal"
  ShipmentStatus.AguardandoAdiantamento, // "Ag. Adiantamento"
];

/**
 * 3. Retenções Previdenciárias e Fiscais (Regra TAC Autônomo - Pessoa Física):
 * - Base de Cálculo Fiscal = 20% do Frete Bruto total
 * - INSS = 11% sobre a Base Fiscal (limitado ao teto)
 * - SEST/SENAT = 2,5% sobre a Base Fiscal (1,5% SEST + 1,0% SENAT)
 * - IRRF = Tabela progressiva mensal sobre (Base Fiscal - INSS)
 */
export function calculateTacTaxDeductions(freteBruto: number): TacTaxDeductions {
  if (!freteBruto || freteBruto <= 0) {
    return {
      fiscalBase: 0,
      inss: 0,
      sestSenat: 0,
      irrfBase: 0,
      irrf: 0,
      totalDeductions: 0,
    };
  }

  // 1. Base de Cálculo Fiscal: 20% do Frete Bruto total
  const fiscalBase = Number((freteBruto * 0.20).toFixed(2));

  // 2. INSS: 11% sobre a Base Fiscal (teto da base previdenciária ~R$ 8.157,41 => teto contribuição R$ 897,32)
  const inssTetoMax = 897.32;
  const inssCalculado = Number((fiscalBase * 0.11).toFixed(2));
  const inss = Math.min(inssCalculado, inssTetoMax);

  // 3. SEST/SENAT: 2,5% sobre a Base Fiscal (1,5% SEST + 1,0% SENAT)
  const sestSenat = Number((fiscalBase * 0.025).toFixed(2));

  // 4. IRRF: Tabela progressiva mensal sobre (Base Fiscal - INSS)
  const irrfBaseLegal = Math.max(0, fiscalBase - inss);
  
  let irrfTradicional = 0;
  if (irrfBaseLegal <= 2259.20) {
    irrfTradicional = 0;
  } else if (irrfBaseLegal <= 2826.65) {
    irrfTradicional = (irrfBaseLegal * 0.075) - 169.44;
  } else if (irrfBaseLegal <= 3751.05) {
    irrfTradicional = (irrfBaseLegal * 0.15) - 381.44;
  } else if (irrfBaseLegal <= 4664.68) {
    irrfTradicional = (irrfBaseLegal * 0.225) - 662.77;
  } else {
    irrfTradicional = (irrfBaseLegal * 0.275) - 896.00;
  }

  // Desconto simplificado opcional (R$ 564,80)
  const irrfBaseSimplificada = Math.max(0, fiscalBase - 564.80);
  let irrfSimplificado = 0;
  if (irrfBaseSimplificada <= 2259.20) {
    irrfSimplificado = 0;
  } else if (irrfBaseSimplificada <= 2826.65) {
    irrfSimplificado = (irrfBaseSimplificada * 0.075) - 169.44;
  } else if (irrfBaseSimplificada <= 3751.05) {
    irrfSimplificado = (irrfBaseSimplificada * 0.15) - 381.44;
  } else if (irrfBaseSimplificada <= 4664.68) {
    irrfSimplificado = (irrfBaseSimplificada * 0.225) - 662.77;
  } else {
    irrfSimplificado = (irrfBaseSimplificada * 0.275) - 896.00;
  }

  const irrfBruto = Math.min(Math.max(0, irrfTradicional), Math.max(0, irrfSimplificado));
  const irrf = Number(irrfBruto.toFixed(2));

  const totalDeductions = Number((inss + sestSenat + irrf).toFixed(2));

  return {
    fiscalBase,
    inss,
    sestSenat,
    irrfBase: Number(irrfBaseLegal.toFixed(2)),
    irrf,
    totalDeductions,
  };
}

/**
 * Realiza o cálculo padronizado de adiantamento e saldo do frete motorista:
 * 
 * Regra:
 * 1. Frete Bruto = (Frete Motorista / Ton) * Tonelagem (ou valor fixado do frete motorista)
 * 2. Partição Contratual:
 *    - Adiantamento = Frete Líquido de Tag * (% Adiantamento / 100)
 *    - Saldo Original = Frete Líquido de Tag * ((100 - % Adiantamento) / 100)
 * 3. Retenções Fiscais (se PF / TAC):
 *    - INSS (11% de 20%), SEST/SENAT (2,5% de 20%), IRRF progressivo
 * 4. Subtotal Líquido Pré-Descarga = Saldo Original - Retenções
 */
export function calculateAdvanceAndBalance({
  driverFreightValue,
  driverFreightRate,
  tonnage,
  tollValue = 0,
  advancePercentage = 70,
  driverFreightType,
}: {
  driverFreightValue?: number;
  driverFreightRate?: number;
  tonnage?: number;
  tollValue?: number;
  advancePercentage?: number;
  driverFreightType?: 'PF' | 'PJ';
}): AdvanceAndBalanceResult {
  const totalFreight = driverFreightValue !== undefined && driverFreightValue > 0
    ? driverFreightValue
    : (driverFreightRate && tonnage ? driverFreightRate * tonnage : 0);

  const tagVal = Number(tollValue || 0);
  const advPct = advancePercentage !== undefined && !isNaN(advancePercentage) ? Number(advancePercentage) : 70;

  // Base do frete líquido de pedágio
  const baseFreight = Math.max(0, totalFreight - tagVal);

  // Valor pago na conta (Adiantamento)
  const advanceInAccountValue = Number((baseFreight * (advPct / 100)).toFixed(2));

  // Total do adiantamento (Conta + Tag)
  const totalAdvanceValue = Number((advanceInAccountValue + tagVal).toFixed(2));

  // Saldo Original Contratual
  const originalBalanceValue = Number((baseFreight * ((100 - advPct) / 100)).toFixed(2));

  // Deduções fiscais se for PF (TAC)
  const isPf = driverFreightType === 'PF';
  const tacTaxes = isPf ? calculateTacTaxDeductions(totalFreight) : undefined;
  const taxDeductions = tacTaxes ? tacTaxes.totalDeductions : 0;

  // Subtotal Líquido Pré-Descarga (Saldo Original deduzido das retenções)
  const balanceToReceiveValue = Number((originalBalanceValue - taxDeductions).toFixed(2));

  return {
    totalFreight: Number(totalFreight.toFixed(2)),
    baseFreight: Number(baseFreight.toFixed(2)),
    tollValue: tagVal,
    advancePercentage: advPct,
    advanceInAccountValue,
    totalAdvanceValue,
    originalBalanceValue,
    balanceToReceiveValue,
    driverFreightType,
    tacTaxes,
  };
}

/**
 * Aplica o cálculo padronizado de adiantamento e saldo a um embarque
 */
export function applyAdvanceCalculationToShipment(shipment: Shipment, cargo?: Cargo): Shipment {
  const rate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || 0;
  const tonnage = shipment.shipmentTonnage || cargo?.totalVolume || 0;
  const totalFreight = shipment.driverFreightValue || (rate * tonnage);
  const advPct = shipment.advancePercentage !== undefined ? shipment.advancePercentage : 70;
  const toll = shipment.tollValue || 0;
  const freightType = shipment.driverFreightType || (shipment.anttModality === 'TAC' ? 'PF' : 'PJ');

  const result = calculateAdvanceAndBalance({
    driverFreightValue: totalFreight,
    driverFreightRate: rate,
    tonnage,
    tollValue: toll,
    advancePercentage: advPct,
    driverFreightType: freightType,
  });

  return {
    ...shipment,
    advancePercentage: result.advancePercentage,
    advanceValue: result.advanceInAccountValue,
    tollValue: result.tollValue,
    balanceToReceiveValue: result.balanceToReceiveValue,
  };
}
