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

function hasCteAttached(s) {
  const cteNumber = s.cte_number || s.documents?.cte_number || s.documents?.cteNumber;
  const hasDoc = Boolean(s.documents?.cte || s.documents?.cte_file_path || s.documents?.cteFilePath || s.documents?.['CT-e']);
  const hasHistory = Boolean(s.history?.some(h => (h.action || '').toLowerCase().includes('ct-e') || (h.details || '').toLowerCase().includes('ct-e')));
  return Boolean((cteNumber && cteNumber !== '-' && cteNumber.trim() !== '') || hasDoc || hasHistory);
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
  return { companyFreight };
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

  // Improved classifyBranch function
  const classifyBranchImproved = (s, cargo) => {
    // 1. Direct prefix matching
    const sid = (s.id || '').toUpperCase();
    if (sid.startsWith('RAF-')) return 'ag_sp';
    if (sid.startsWith('MAU-') || sid.startsWith('MUR-')) return 'ag_go';

    // 2. Direct user check with agency leader resolution
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

    // 3. User assigned branch (operator/creator)
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

  // October filter
  const validOct = shipments.filter(s => {
    if (s.status === 'Cancelado') return false;
    const d = getShipmentEffectiveDate(s);
    return Boolean(d && d >= '2026-10-01' && d <= '2026-10-31');
  });

  console.log(`Total October shipments: ${validOct.length}`);

  // Scenario A: Without CTE filter (current behavior of FirstResultTab)
  const totalsA = { matriz: 0, ag_sp: 0, ag_go: 0, ag_pr: 0, count_go: 0 };
  validOct.forEach(s => {
    const cargo = cargoMap.get(s.cargo_id);
    const exp = calculateShipmentExpenses(s, cargo);
    const b = classifyBranchImproved(s, cargo);
    totalsA[b] += exp.companyFreight;
    if (b === 'ag_go') totalsA.count_go++;
  });
  console.log('\n--- SCENARIO A: All active shipments (No CTE requirement) ---');
  console.log(`Ag GO: count=${totalsA.count_go}, freight=R$ ${totalsA.ag_go.toFixed(2)}`);
  console.log(`Ag SP: freight=R$ ${totalsA.ag_sp.toFixed(2)}`);
  console.log(`Ag PR: freight=R$ ${totalsA.ag_pr.toFixed(2)}`);
  console.log(`Matriz: freight=R$ ${totalsA.matriz.toFixed(2)}`);

  // Scenario B: With CTE requirement (only CT-e issued / faturado)
  const totalsB = { matriz: 0, ag_sp: 0, ag_go: 0, ag_pr: 0, count_go: 0 };
  validOct.forEach(s => {
    const cteVal = getShipmentCte(s);
    const hasCte = Boolean(cteVal && cteVal !== '-' && isCteApplicableForStatus(s.status));
    if (!hasCte) return;

    const cargo = cargoMap.get(s.cargo_id);
    const exp = calculateShipmentExpenses(s, cargo);
    const b = classifyBranchImproved(s, cargo);
    totalsB[b] += exp.companyFreight;
    if (b === 'ag_go') totalsB.count_go++;
  });
  console.log('\n--- SCENARIO B: Only Shipments with CT-e (Faturamento efetivo) ---');
  console.log(`Ag GO: count=${totalsB.count_go}, freight=R$ ${totalsB.ag_go.toFixed(2)}`);
  console.log(`Ag SP: freight=R$ ${totalsB.ag_sp.toFixed(2)}`);
  console.log(`Ag PR: freight=R$ ${totalsB.ag_pr.toFixed(2)}`);
  console.log(`Matriz: freight=R$ ${totalsB.matriz.toFixed(2)}`);
}

main().catch(console.error);
