import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseDateToYmd(d) {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
  const parts = d.split(/[\/\s]/);
  if (parts.length >= 3) {
    const [day, month, year] = parts;
    if (year.length === 4) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function getShipmentCteEmissionDate(s) {
  return s.cte_emission_date || s.documents?.cte_emission_date || s.documents?.cteEmissionDate || null;
}

function getShipmentEffectiveDate(s) {
  const cteEmission = getShipmentCteEmissionDate(s);
  if (cteEmission) {
    const ymd = parseDateToYmd(cteEmission);
    if (ymd) return ymd;
  }
  const effectiveEntry = s.status_history?.find(h => 
    h.status === 'AguardandoNota' || h.status === 'Ag. Nota' || h.status === 'Aguardando Nota'
  );
  if (effectiveEntry?.timestamp) {
    return effectiveEntry.timestamp.substring(0, 10);
  }
  if (s.scheduled_date) {
    const ymd = parseDateToYmd(s.scheduled_date);
    if (ymd) return ymd;
    return s.scheduled_date.substring(0, 10);
  }
  return s.created_at?.substring(0, 10) || null;
}

function getShipmentCte(s) {
  const cte = s.cte_number || s.documents?.cte_number || s.documents?.cteNumber;
  return cte && cte !== '-' ? cte : null;
}

function isCteApplicableForStatus(status) {
  return ![
    'Cancelado',
    'Ag. Cadastro',
    'Ag. Seguradora',
    'Ag. Carregamento'
  ].includes(status);
}

function calculateShipmentExpenses(s, cargo) {
  const ton = s.shipment_tonnage || 0;
  const rateSnap = s.company_freight_rate_snapshot;
  const driverFreight = s.driver_freight_value || 0;
  const companyFreight = s.company_freight || (rateSnap ? rateSnap * ton : driverFreight * 1.15);
  const realProfit = s.documents?.real_profit_data;
  const agencyCommission = realProfit?.agencyCommission || s.documents?.agency_commission_value || 0;
  const netProfit = realProfit?.netProfit || (companyFreight - driverFreight);
  return { 
    companyFreight, 
    agencyCommission, 
    netProfit, 
    driverFreight,
    icms: realProfit?.icmsDifference || s.documents?.icms_value || 0,
    impostoFederal: realProfit?.federalTax || s.documents?.federal_tax || 0,
    insuranceRcv: realProfit?.insuranceRcv || 5.0,
    insuranceAcidente: realProfit?.insuranceAcidente || 1.66,
    insuranceRoubo: realProfit?.insuranceRoubo || 1.66,
    riskCost: 0,
    ciot: realProfit?.ciot || 11.4
  };
}

async function main() {
  const { data: users } = await supabase.from('app_users').select('*');
  const { data: branches } = await supabase.from('branches').select('*');
  const { data: shipments } = await supabase.from('shipments').select('*');
  const { data: cargos } = await supabase.from('cargos').select('*');

  const cargoMap = new Map(cargos.map(c => [c.id, c]));
  const userMap = new Map(users.map(u => [u.id, u]));
  const userBranchMap = new Map(users.map(u => [u.id, u.branch_id]));

  const getLeaderIdForUser = (userId) => {
    if (!userId) return undefined;
    const user = userMap.get(userId);
    if (!user) return undefined;
    if (user.permissions?.agencyRole === 'embarque' && user.permissions?.agencyLeaderId) {
      return user.permissions.agencyLeaderId;
    }
    if (user.permissions?.agencyLeaderId) {
      return user.permissions.agencyLeaderId;
    }
    return user.id;
  };

  const classifyBranch = (s, cargo) => {
    const sid = (s.id || '').toUpperCase();
    if (sid.startsWith('RAF-')) return 'ag_sp';
    if (sid.startsWith('MAU-') || sid.startsWith('MUR-')) return 'ag_go';

    const checkUser = (userId) => {
      if (!userId) return null;
      const leaderId = getLeaderIdForUser(userId);
      const u = userMap.get(userId);
      const leader = leaderId ? userMap.get(leaderId) : null;
      const name = ((u?.name || '') + ' ' + (leader?.name || '')).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const email = ((u?.email || '') + ' ' + (leader?.email || '')).toUpperCase();
      const id = (userId || '').toUpperCase();
      const lid = (leaderId || '').toUpperCase();

      if (id === 'USR-294' || lid === 'USR-294' || id === 'USR-1007' || name.includes('MAURICIO') || name.includes('MURILO')) {
        return 'ag_go';
      }
      if (id === 'USR-106' || id === 'USR-107' || lid === 'USR-106' || lid === 'USR-107' || name.includes('RAFAEL PINHEIRO') || name.includes('RAFAEL TARANTELLI') || email.includes('PINHEIRO') || email.includes('TARANTELLI')) {
        return 'ag_sp';
      }
      return null;
    };

    const byEmbarcador = checkUser(s.embarcador_id);
    if (byEmbarcador) return byEmbarcador;

    const byCreator = checkUser(s.created_by_id);
    if (byCreator) return byCreator;

    const operatorBranchId = userBranchMap.get(s.embarcador_id) || userBranchMap.get(s.created_by_id);
    const effectiveBranchId = s.branch_id || operatorBranchId || cargo?.branch_id || (cargo ? userBranchMap.get(cargo.created_by_id) : undefined);

    if (effectiveBranchId) {
      const bObj = branches.find(b => b.id === effectiveBranchId);
      if (bObj) {
        const bName = (bObj.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const bCity = (bObj.city || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const bState = (bObj.state || '').toLowerCase();

        if (bName.includes('go') || bName.includes('goias') || bCity.includes('catalao') || bState === 'go') {
          return 'ag_go';
        }
        if (bName.includes('sp') || bName.includes('sao paulo') || bState === 'sp') {
          return 'ag_sp';
        }
        if (bName.includes('pr') || bName.includes('parana') || bName.includes('cambara') || bCity.includes('maringa') || bCity.includes('londrina') || bState === 'pr') {
          return 'ag_pr';
        }
      }
    }

    if (cargo?.created_by_id) {
      const byCargoCreator = checkUser(cargo.created_by_id);
      if (byCargoCreator) return byCargoCreator;
    }

    const route = ((s.route || '') + ' ' + (cargo?.origin || '') + ' ' + (cargo?.destination || '')).toUpperCase();
    if (route.includes('/GO') || route.includes('- GO') || route.includes('GOIAS') || route.includes('GOIÁS') || route.includes('CATALAO') || route.includes('CATALÃO')) {
      return 'ag_go';
    }
    if (route.includes('/PR') || route.includes('- PR') || route.includes('PARANA') || route.includes('PARANÁ') || route.includes('CAMBARA') || route.includes('CAMBARÁ')) {
      return 'ag_pr';
    }
    if (route.includes('/SP') || route.includes('- SP') || route.includes('SAO PAULO') || route.includes('SÃO PAULO')) {
      return 'ag_sp';
    }

    return 'matriz';
  };

  const validOct = shipments.filter(s => {
    if (s.status === 'Cancelado') return false;
    const d = getShipmentEffectiveDate(s);
    return Boolean(d && d >= '2026-10-01' && d <= '2026-10-31');
  });

  let fatMatriz = 0;
  let fatAgSP = 0;
  let fatAgGO = 0;
  let fatAgPR = 0;

  let loadedVehiclesMatriz = 0;
  let loadedVehiclesAgSP = 0;
  let loadedVehiclesAgGO = 0;
  let loadedVehiclesAgPR = 0;

  let totalDriverFreights = 0;
  let pedagioTotal = 0;

  for (const s of validOct) {
    const cargo = cargoMap.get(s.cargo_id);
    const exp = calculateShipmentExpenses(s, cargo);
    const branchKey = classifyBranch(s, cargo);
    const freightBruto = exp.companyFreight;

    const cteVal = getShipmentCte(s);
    const hasCte = Boolean(cteVal && cteVal !== '-' && isCteApplicableForStatus(s.status));

    if (hasCte) {
      if (branchKey === 'ag_sp') {
        fatAgSP += freightBruto;
        loadedVehiclesAgSP += 1;
      } else if (branchKey === 'ag_go') {
        fatAgGO += freightBruto;
        loadedVehiclesAgGO += 1;
      } else if (branchKey === 'ag_pr') {
        fatAgPR += freightBruto;
        loadedVehiclesAgPR += 1;
      } else {
        fatMatriz += freightBruto;
        loadedVehiclesMatriz += 1;
      }

      totalDriverFreights += exp.driverFreight;
      const rawToll = Number(s.toll_value);
      const safeToll = (!isNaN(rawToll) && rawToll >= 0 && rawToll <= 25000) ? rawToll : 0;
      pedagioTotal += safeToll;
    }
  }

  const somaFaturamento = fatMatriz + fatAgSP + fatAgGO + fatAgPR;
  const margemBrutaValor = somaFaturamento - totalDriverFreights - pedagioTotal;
  const margemBrutaPercent = somaFaturamento > 0 ? (margemBrutaValor / somaFaturamento) * 100 : 0;

  console.log('=== CARD FATURAMENTO (1º RESULTADO) ===');
  console.log(`Matriz: R$ ${fatMatriz.toFixed(2)} (${loadedVehiclesMatriz} veículos carregados)`);
  console.log(`Ag. SP: R$ ${fatAgSP.toFixed(2)} (${loadedVehiclesAgSP} veículos carregados)`);
  console.log(`Ag. GO (Maurício): R$ ${fatAgGO.toFixed(2)} (${loadedVehiclesAgGO} veículos carregados)`);
  console.log(`Ag. PR: R$ ${fatAgPR.toFixed(2)} (${loadedVehiclesAgPR} veículos carregados)`);
  console.log(`TOTAL: R$ ${somaFaturamento.toFixed(2)} (${loadedVehiclesMatriz + loadedVehiclesAgSP + loadedVehiclesAgGO + loadedVehiclesAgPR} veículos carregados)`);
  console.log(`\nMargem Bruta: R$ ${margemBrutaValor.toFixed(2)} (${margemBrutaPercent.toFixed(1)}%)`);
}

main().catch(console.error);
