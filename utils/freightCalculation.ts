import { Shipment, Cargo, ShipmentStatus } from '../types';

export interface AdvanceAndBalanceResult {
  totalFreight: number;
  baseFreight: number;
  tollValue: number;
  advancePercentage: number;
  advanceInAccountValue: number;
  totalAdvanceValue: number;
  balanceToReceiveValue: number;
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
 * Realiza o cálculo padronizado de adiantamento e saldo do frete motorista:
 * 
 * Regra:
 * 1. Frete Total = (Frete Motorista / Ton) * Tonelagem (ou valor fixado do frete motorista)
 * 2. Base do Frete (sem pedágio) = Frete Total - Valor pago no Tag (Pedágio)
 * 3. Valor pago na Conta = Base do Frete * (% Adiantamento / 100) (padrão 70%)
 * 4. Total do Adiantamento pago = Valor pago na Conta + Pedágio (Tag)
 * 5. Saldo Original / Saldo a Receber = Base do Frete * ((100 - % Adiantamento) / 100)
 */
export function calculateAdvanceAndBalance({
  driverFreightValue,
  driverFreightRate,
  tonnage,
  tollValue = 0,
  advancePercentage = 70,
}: {
  driverFreightValue?: number;
  driverFreightRate?: number;
  tonnage?: number;
  tollValue?: number;
  advancePercentage?: number;
}): AdvanceAndBalanceResult {
  const totalFreight = driverFreightValue !== undefined && driverFreightValue > 0
    ? driverFreightValue
    : (driverFreightRate && tonnage ? driverFreightRate * tonnage : 0);

  const tagVal = Number(tollValue || 0);
  const advPct = advancePercentage !== undefined && !isNaN(advancePercentage) ? Number(advancePercentage) : 70;

  // Base do frete líquido de pedágio
  const baseFreight = Math.max(0, totalFreight - tagVal);

  // Valor pago na conta
  const advanceInAccountValue = Number((baseFreight * (advPct / 100)).toFixed(2));

  // Total do adiantamento (Conta + Tag)
  const totalAdvanceValue = Number((advanceInAccountValue + tagVal).toFixed(2));

  // Saldo Original / Saldo a Receber
  const balanceToReceiveValue = Number((baseFreight * ((100 - advPct) / 100)).toFixed(2));

  return {
    totalFreight: Number(totalFreight.toFixed(2)),
    baseFreight: Number(baseFreight.toFixed(2)),
    tollValue: tagVal,
    advancePercentage: advPct,
    advanceInAccountValue,
    totalAdvanceValue,
    balanceToReceiveValue,
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

  const result = calculateAdvanceAndBalance({
    driverFreightValue: totalFreight,
    driverFreightRate: rate,
    tonnage,
    tollValue: toll,
    advancePercentage: advPct,
  });

  return {
    ...shipment,
    advancePercentage: result.advancePercentage,
    advanceValue: result.advanceInAccountValue,
    tollValue: result.tollValue,
    balanceToReceiveValue: result.balanceToReceiveValue,
  };
}
