import type { Shipment, Cargo, FinancialTransaction, Client } from '../types';
import { ShipmentStatus } from '../types';

export interface FirstLevelFinancialResult {
  totalGrossRevenue: number;     // Faturamento Bruto (Frete Empresa)
  totalTaxes: number;            // Impostos (ICMS + Tributos)
  netRevenue: number;            // Receita Líquida
  totalDriverCosts: number;      // Custos Diretos com Motoristas
  totalTollCosts: number;        // Custos com Pedágio
  contributionMargin: number;    // 1º Resultado: Margem de Contribuição
  contributionMarginPercent: number; // % Margem de Contribuição
  totalTonnage: number;          // Toneladas Embarcadas
  shipmentCount: number;         // Total de Embarques Concluídos/Ativos
}

export interface SecondLevelFinancialResult extends FirstLevelFinancialResult {
  personnelExpenses: number;     // Despesas com Pessoal
  operationalExpenses: number;   // Despesas Operacionais Gerais
  administrativeExpenses: number;// Despesas Administrativas
  totalOperatingExpenses: number;// Total Despesas Fixas / Gerais
  operatingResult: number;       // 2º Resultado: Resultado Operacional
  operatingMarginPercent: number;// % Margem Operacional
}

export interface ThirdLevelFinancialResult extends SecondLevelFinancialResult {
  financialExpenses: number;     // Tarifas bancárias, juros
  financialIncomes: number;      // Rendimentos / Outras receitas
  ebitda: number;                // EBITDA
  netResult: number;             // 3º Resultado: Resultado Líquido Final
  netMarginPercent: number;      // % Margem Líquida
  projectedReceivables30d: number;
  projectedPayables30d: number;
  projectedCashFlow30d: number;
}

export interface ShipmentControlItem {
  shipmentId: string;
  orderId?: string;
  cteNumber?: string;
  scheduledDate: string;
  origin: string;
  destination: string;
  clientName: string;
  driverName: string;
  horsePlate: string;
  tonnage: number;
  companyFreightTotal: number;
  driverFreightTotal: number;
  tollValue: number;
  advanceValue: number;
  balanceValue: number;
  grossMargin: number;
  grossMarginPercent: number;
  status: ShipmentStatus;
}

/**
 * Calcula o 1º Resultado Financeiro a partir dos embarques reais do sistema
 */
export function calculateFirstResult(shipments: Shipment[], cargos: Cargo[]): FirstLevelFinancialResult {
  const cargoMap = new Map(cargos.map(c => [c.id, c]));

  const validShipments = shipments.filter(s => 
    s.status !== ShipmentStatus.Cancelado
  );

  let totalGrossRevenue = 0;
  let totalTaxes = 0;
  let totalDriverCosts = 0;
  let totalTollCosts = 0;
  let totalTonnage = 0;

  for (const s of validShipments) {
    const cargo = cargoMap.get(s.cargoId);
    const ton = s.shipmentTonnage || 0;
    totalTonnage += ton;

    // Frete Empresa
    const companyRate = s.companyFreightRateSnapshot ?? cargo?.companyFreightValuePerTon ?? 0;
    const companyTotal = companyRate > 0 ? (companyRate * ton) : (s.driverFreightValue * 1.15); // Fallback saudável
    totalGrossRevenue += companyTotal;

    // Impostos
    const icms = s.icmsValue ?? (cargo?.icmsPercentage ? (companyTotal * cargo.icmsPercentage / 100) : 0);
    totalTaxes += icms;

    // Frete Motorista
    totalDriverCosts += (s.driverFreightValue || 0);

    // Pedágio
    totalTollCosts += (s.tollValue || 0);
  }

  const netRevenue = Math.max(0, totalGrossRevenue - totalTaxes);
  const contributionMargin = netRevenue - (totalDriverCosts + totalTollCosts);
  const contributionMarginPercent = totalGrossRevenue > 0 ? (contributionMargin / totalGrossRevenue) * 100 : 0;

  return {
    totalGrossRevenue,
    totalTaxes,
    netRevenue,
    totalDriverCosts,
    totalTollCosts,
    contributionMargin,
    contributionMarginPercent,
    totalTonnage,
    shipmentCount: validShipments.length,
  };
}

/**
 * Calcula o 2º Resultado Financeiro cruzando com despesas do Contas a Pagar
 */
export function calculateSecondResult(
  firstResult: FirstLevelFinancialResult, 
  transactions: FinancialTransaction[]
): SecondLevelFinancialResult {
  let personnelExpenses = 0;
  let operationalExpenses = 0;
  let administrativeExpenses = 0;

  for (const t of transactions) {
    if (t.type !== 'payable' || t.status === 'Cancelado') continue;
    const desc = (t.category + ' ' + t.description).toLowerCase();

    if (desc.includes('pessoal') || desc.includes('salário') || desc.includes('folha') || desc.includes('inss') || desc.includes('fgts')) {
      personnelExpenses += t.amount;
    } else if (desc.includes('combustível') || desc.includes('manutenção') || desc.includes('gr') || desc.includes('seguro') || desc.includes('diária')) {
      operationalExpenses += t.amount;
    } else {
      administrativeExpenses += t.amount;
    }
  }

  // Se não houver transações cadastradas, estipula estimativa proporcional gerencial padrão para demonstração inicial
  if (personnelExpenses === 0 && operationalExpenses === 0 && administrativeExpenses === 0 && firstResult.totalGrossRevenue > 0) {
    personnelExpenses = firstResult.totalGrossRevenue * 0.04;
    operationalExpenses = firstResult.totalGrossRevenue * 0.03;
    administrativeExpenses = firstResult.totalGrossRevenue * 0.02;
  }

  const totalOperatingExpenses = personnelExpenses + operationalExpenses + administrativeExpenses;
  const operatingResult = firstResult.contributionMargin - totalOperatingExpenses;
  const operatingMarginPercent = firstResult.totalGrossRevenue > 0 ? (operatingResult / firstResult.totalGrossRevenue) * 100 : 0;

  return {
    ...firstResult,
    personnelExpenses,
    operationalExpenses,
    administrativeExpenses,
    totalOperatingExpenses,
    operatingResult,
    operatingMarginPercent,
  };
}

/**
 * Calcula o 3º Resultado Financeiro e projeções de fluxo
 */
export function calculateThirdResult(
  secondResult: SecondLevelFinancialResult,
  transactions: FinancialTransaction[]
): ThirdLevelFinancialResult {
  let financialExpenses = 0;
  let financialIncomes = 0;
  let projectedReceivables30d = 0;
  let projectedPayables30d = 0;

  const now = new Date();
  const next30d = new Date();
  next30d.setDate(now.getDate() + 30);

  for (const t of transactions) {
    if (t.status === 'Cancelado') continue;

    if (t.type === 'payable') {
      const desc = (t.category + ' ' + t.description).toLowerCase();
      if (desc.includes('tarifa') || desc.includes('banco') || desc.includes('juros') || desc.includes('iof')) {
        financialExpenses += t.amount;
      }
      if (t.status === 'Pendente' || t.status === 'Atrasado') {
        const due = new Date(t.dueDate);
        if (due <= next30d) {
          projectedPayables30d += t.amount;
        }
      }
    } else if (t.type === 'receivable') {
      financialIncomes += t.amount;
      if (t.status === 'Pendente') {
        const due = new Date(t.dueDate);
        if (due <= next30d) {
          projectedReceivables30d += t.amount;
        }
      }
    }
  }

  if (financialExpenses === 0 && secondResult.totalGrossRevenue > 0) {
    financialExpenses = secondResult.totalGrossRevenue * 0.008; // 0.8%
  }

  const ebitda = secondResult.operatingResult;
  const netResult = secondResult.operatingResult - financialExpenses + financialIncomes;
  const netMarginPercent = secondResult.totalGrossRevenue > 0 ? (netResult / secondResult.totalGrossRevenue) * 100 : 0;
  const projectedCashFlow30d = projectedReceivables30d - projectedPayables30d;

  return {
    ...secondResult,
    financialExpenses,
    financialIncomes,
    ebitda,
    netResult,
    netMarginPercent,
    projectedReceivables30d,
    projectedPayables30d,
    projectedCashFlow30d,
  };
}

/**
 * Converte a lista de embarques na Planilha da Controladoria
 */
export function buildShipmentControlSheet(
  shipments: Shipment[], 
  cargos: Cargo[],
  clientsInput?: Map<string, string> | Client[]
): ShipmentControlItem[] {
  const cargoMap = new Map(cargos.map(c => [c.id, c]));
  const clientsMap: Map<string, string> = 
    clientsInput instanceof Map 
      ? clientsInput 
      : new Map(
          (clientsInput || []).map(c => [c.id, c.razaoSocial || c.nomeFantasia || c.id])
        );

  return shipments
    .filter(s => s.status !== ShipmentStatus.Cancelado)
    .map(s => {
      const cargo = cargoMap.get(s.cargoId);
      const ton = s.shipmentTonnage || 0;
      const companyRate = s.companyFreightRateSnapshot ?? cargo?.companyFreightValuePerTon ?? 0;
      const companyFreightTotal = companyRate > 0 ? (companyRate * ton) : (s.driverFreightValue * 1.15);
      const driverFreightTotal = s.driverFreightValue || 0;
      const tollValue = s.tollValue || 0;
      const advanceValue = s.advanceValue || 0;
      const balanceValue = s.balanceToReceiveValue || Math.max(0, driverFreightTotal - advanceValue);
      const grossMargin = companyFreightTotal - driverFreightTotal - tollValue;
      const grossMarginPercent = companyFreightTotal > 0 ? (grossMargin / companyFreightTotal) * 100 : 0;

      const clientName = cargo?.clientId ? (clientsMap.get(cargo.clientId) || cargo.clientId) : 'Cliente Geral';

      return {
        shipmentId: s.id,
        orderId: s.orderId,
        cteNumber: s.cteNumber || (s.documents as any)?.cte_number || undefined,
        scheduledDate: s.scheduledDate,
        origin: cargo?.origin || 'Origem',
        destination: cargo?.destination || 'Destino',
        clientName,
        driverName: s.driverName || 'Motorista',
        horsePlate: s.horsePlate || '-',
        tonnage: ton,
        companyFreightTotal,
        driverFreightTotal,
        tollValue,
        advanceValue,
        balanceValue,
        grossMargin,
        grossMarginPercent,
        status: s.status,
      };
    })
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
}

/**
 * Converte com robustez strings monetárias no padrão brasileiro (ex: "6.000,00", "6.000", "R$ 6.000", "6000,50")
 * em números válidos sem truncar milhares para números inteiros minúsculos.
 */
export function parseBrazilianCurrency(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  let str = String(value).trim();
  if (!str) return 0;

  // Remove caracteres que não são números, ponto, vírgula ou hífen
  str = str.replace(/[^\d.,-]/g, '');
  if (!str) return 0;

  // Caso 1: Possui ponto e vírgula (ex: 6.000,00 ou 1.250.340,50)
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Padrão Brasil: 6.000,00 -> 6000.00
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão EUA: 6,000.00 -> 6000.00
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Apenas vírgula decimal: 6000,50 -> 6000.50
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Apenas ponto(s)
    const parts = str.split('.');
    if (parts.length > 2) {
      // Vários pontos (ex: 1.000.000 -> 1000000)
      str = str.replace(/\./g, '');
    } else if (parts.length === 2) {
      // Um único ponto: se houver exatamente 3 dígitos após o ponto (ex: "6.000", "25.000"),
      // na digitação de valores no Brasil isso indica milhar! Evita que "6.000" vire 6.
      if (parts[1].length === 3) {
        str = parts[0] + parts[1];
      } else {
        str = parts[0] + '.' + parts[1];
      }
    }
  }

  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
}

export function formatBrl(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

