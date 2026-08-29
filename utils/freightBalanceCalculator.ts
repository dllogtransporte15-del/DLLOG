export interface FreightBalanceCalculation {
  tipoPessoa: 'PF' | 'PJ';
  freteBruto: number;
  adiantamento: number;
  saldoOriginal: number; // 3.5.1
  inssRetido: number; // 3.5.2 (11% de 20% do frete para PF, 0 para PJ)
  sestSenat: number; // 3.5.3 (2.5% de 20% do frete para PF, 0 para PJ)
  irrf: number; // 3.5.4
  outrosDescontos: number; // 3.5.5
  seguroCarga: number; // 3.5.6
  outrosAcrescimos: number; // 3.5.7
  diferencaPedagio: number; // 3.5.8
  taxaAdm: number; // 3.5.9
  subtotal: number; // 3.5.10
  
  // Pesos e quebras (3.5.11 a 3.5.13)
  pesoSaidaKg?: number; // 3.5.11
  pesoChegadaKg?: number; // 3.5.11
  diferencaPesoKg?: number; // 3.5.11
  valorKgQuebra?: number; // 3.5.12 (ex: R$ 0,1170 para PF ou R$ 0,3736 para PJ)
  descontoQuebra?: number; // 3.5.12
  valorKgFreteFaltante?: number; // 3.5.13 (ex: R$ 0,130 para PF ou R$ 0,114 para PJ)
  descontoFreteFaltante?: number; // 3.5.13
  saldoFinalLiquido: number;
}

/**
 * Calcula a base de cálculo e saldo de frete conforme a cláusula 3.5 para PF ou PJ.
 */
export function calculateFreightBalance(params: {
  tipoPessoa?: 'PF' | 'PJ';
  freteBruto?: number;
  adiantamento?: number;
  saldoOriginal?: number;
  inssRetido?: number;
  sestSenat?: number;
  irrf?: number;
  outrosDescontos?: number;
  seguroCarga?: number;
  outrosAcrescimos?: number;
  diferencaPedagio?: number;
  taxaAdm?: number;
  pesoSaidaKg?: number;
  pesoChegadaKg?: number;
  valorKgQuebra?: number;
  valorKgFreteFaltante?: number;
}): FreightBalanceCalculation {
  const tipoPessoa = params.tipoPessoa || 'PF';
  const freteBruto = params.freteBruto || 0;
  const adiantamento = params.adiantamento || 0;

  // 3.5.1 Saldo Original
  const saldoOriginal = params.saldoOriginal !== undefined 
    ? params.saldoOriginal 
    : Math.max(0, freteBruto - adiantamento);

  let inssRetido = 0;
  let sestSenat = 0;
  let irrf = params.irrf || 0;

  if (tipoPessoa === 'PF') {
    // Para PF (Transportador Autônomo / TAC):
    // Base de cálculo tributável previdenciária = 20% do frete bruto
    // INSS = 11% sobre os 20% do frete
    // SEST/SENAT = 2,5% sobre os 20% do frete
    if (params.inssRetido !== undefined) {
      inssRetido = params.inssRetido;
    } else if (freteBruto > 0) {
      const baseInss = freteBruto * 0.20;
      inssRetido = Number((baseInss * 0.11).toFixed(2));
    }

    if (params.sestSenat !== undefined) {
      sestSenat = params.sestSenat;
    } else if (freteBruto > 0) {
      const baseSest = freteBruto * 0.20;
      sestSenat = Number((baseSest * 0.025).toFixed(2));
    }
  } else {
    // Para PJ (Empresa / ETC): Isento de INSS e SEST/SENAT de autônomo na carta frete
    inssRetido = 0;
    sestSenat = 0;
    irrf = 0;
  }

  const outrosDescontos = params.outrosDescontos || 0;
  const seguroCarga = params.seguroCarga || 0;
  const outrosAcrescimos = params.outrosAcrescimos || 0;
  const diferencaPedagio = params.diferencaPedagio || 0;
  const taxaAdm = params.taxaAdm || 0;

  // 3.5.10 Subtotal
  const subtotal = Number((
    saldoOriginal - 
    inssRetido - 
    sestSenat - 
    irrf - 
    outrosDescontos - 
    seguroCarga + 
    outrosAcrescimos + 
    diferencaPedagio - 
    taxaAdm
  ).toFixed(2));

  // 3.5.11 Diferença de Peso
  const pesoSaidaKg = params.pesoSaidaKg || 0;
  const pesoChegadaKg = params.pesoChegadaKg || 0;
  const diferencaPesoKg = (pesoSaidaKg > 0 && pesoChegadaKg > 0) 
    ? Math.max(0, pesoSaidaKg - pesoChegadaKg) 
    : 0;

  // 3.5.12 Quebra / Avaria
  const valorKgQuebra = params.valorKgQuebra !== undefined 
    ? params.valorKgQuebra 
    : (tipoPessoa === 'PF' ? 0.1170 : 0.3736);
  const descontoQuebra = diferencaPesoKg > 0 
    ? Number((diferencaPesoKg * valorKgQuebra).toFixed(2)) 
    : 0;

  // 3.5.13 Diferença do Frete Motorista
  const valorKgFreteFaltante = params.valorKgFreteFaltante !== undefined 
    ? params.valorKgFreteFaltante 
    : (tipoPessoa === 'PF' ? 0.130 : 0.114);
  const descontoFreteFaltante = diferencaPesoKg > 0 
    ? Number((diferencaPesoKg * valorKgFreteFaltante).toFixed(2)) 
    : 0;

  const saldoFinalLiquido = Number((subtotal - descontoQuebra - descontoFreteFaltante).toFixed(2));

  return {
    tipoPessoa,
    freteBruto,
    adiantamento,
    saldoOriginal,
    inssRetido,
    sestSenat,
    irrf,
    outrosDescontos,
    seguroCarga,
    outrosAcrescimos,
    diferencaPedagio,
    taxaAdm,
    subtotal,
    pesoSaidaKg,
    pesoChegadaKg,
    diferencaPesoKg,
    valorKgQuebra,
    descontoQuebra,
    valorKgFreteFaltante,
    descontoFreteFaltante,
    saldoFinalLiquido,
  };
}
