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

// Operational expense calculator logic from codebase
function calculateShipmentExpenses(s, cargo) {
  const ton = s.shipment_tonnage || 0;
  const rateSnap = s.company_freight_rate_snapshot;
  const driverFreight = s.driver_freight_value || 0;
  const companyFreight = s.company_freight || (rateSnap ? rateSnap * ton : driverFreight * 1.15);
  const realProfit = s.documents?.real_profit_data;
  const agencyCommission = realProfit?.agencyCommission || s.documents?.agency_commission_value || 0;
  const netProfit = realProfit?.netProfit || (companyFreight - driverFreight);
  return { companyFreight, agencyCommission, netProfit };
}

async function main() {
  const { data: users } = await supabase.from('app_users').select('*');
  const { data: branches } = await supabase.from('branches').select('*');
  const { data: shipments } = await supabase.from('shipments').select('*');
  const { data: cargos } = await supabase.from('cargos').select('*');

  const cargoMap = new Map(cargos.map(c => [c.id, c]));
  const userMap = new Map(users.map(u => [u.id, u]));

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

  const userBranchMap = new Map(users.map(u => [u.id, u.branch_id]));

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

    // Operator branch has higher priority than cargo branch (agencies can operate matriz cargos)
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

  let fatAgGO = 0;
  let countAgGO = 0;
  let commAgGO = 0;
  let profitAgGO = 0;

  validOct.forEach(s => {
    const cteVal = getShipmentCte(s);
    const hasCte = Boolean(cteVal && cteVal !== '-' && isCteApplicableForStatus(s.status));
    if (!hasCte) return;

    const cargo = cargoMap.get(s.cargo_id);
    const b = classifyBranch(s, cargo);
    if (b === 'ag_go') {
      const exp = calculateShipmentExpenses(s, cargo);
      fatAgGO += exp.companyFreight;
      countAgGO += 1;
      commAgGO += exp.agencyCommission;
      profitAgGO += exp.netProfit;
    }
  });

  console.log(`Results for Ag GO in October with CT-e:`);
  console.log(`Count: ${countAgGO} shipments`);
  console.log(`Faturamento: R$ ${fatAgGO.toFixed(2)}`);
  console.log(`Comissão da Agência: R$ ${commAgGO.toFixed(2)}`);
  console.log(`Lucro Real: R$ ${profitAgGO.toFixed(2)}`);
}

main().catch(console.error);
