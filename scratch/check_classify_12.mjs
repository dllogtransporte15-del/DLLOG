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

  // Current FirstResultTab classifyBranch logic
  const classifyBranchCurrent = (s, cargo) => {
    const effectiveBranchId = s.branch_id || 
                              cargo?.branch_id || 
                              userBranchMap.get(s.embarcador_id) || 
                              userBranchMap.get(s.created_by_id) || 
                              (cargo ? userBranchMap.get(cargo.created_by_id) : undefined);

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

    const checkUser = (userId) => {
      if (!userId) return null;
      const u = userMap.get(userId);
      const name = (u?.name || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const email = (u?.email || '').toUpperCase();
      const id = userId.toUpperCase();

      if (id === 'USR-294' || name.includes('MAURICIO') || email.includes('MAURICIO')) {
        return 'ag_go';
      }
      if (id === 'USR-106' || id === 'USR-107' || name.includes('RAFAEL PINHEIRO') || name.includes('RAFAEL TARANTELLI') || email.includes('PINHEIRO') || email.includes('TARANTELLI')) {
        return 'ag_sp';
      }
      return null;
    };

    const byEmbarcador = checkUser(s.embarcador_id);
    if (byEmbarcador) return byEmbarcador;

    const byCreator = checkUser(s.created_by_id);
    if (byCreator) return byCreator;

    if (s.id && s.id.toUpperCase().startsWith('RAF-')) return 'ag_sp';
    if (s.id && s.id.toUpperCase().startsWith('MAU-')) return 'ag_go';

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

  // Find all 12 shipments for Mauricio in October
  const octMauricioShipments = shipments.filter(s => {
    if (s.status === 'Cancelado') return false;
    const d = getShipmentEffectiveDate(s);
    if (!d || d < '2026-10-01' || d > '2026-10-31') return false;
    // Check if belongs to Mauricio
    const cargo = cargoMap.get(s.cargo_id);
    const op = userMap.get(s.embarcador_id) || userMap.get(s.created_by_id);
    const isMauricioOp = op?.id === 'USR-294' || op?.id === 'USR-1007' || op?.permissions?.agencyLeaderId === 'USR-294';
    return isMauricioOp || s.id.startsWith('MUR-') || s.id.startsWith('MAU-');
  });

  console.log(`October Mauricio Shipments found: ${octMauricioShipments.length}`);
  let sumAgGo = 0;
  let countAgGo = 0;
  let sumMatriz = 0;
  let countMatriz = 0;

  octMauricioShipments.forEach(s => {
    const cargo = cargoMap.get(s.cargo_id);
    const branch = classifyBranchCurrent(s, cargo);
    const exp = calculateShipmentExpenses(s, cargo);
    console.log(`- ${s.id}: freight=${exp.companyFreight}, classified as: ${branch}, cargoBranch=${cargo?.branch_id}, route=${s.route}`);
    if (branch === 'ag_go') {
      sumAgGo += exp.companyFreight;
      countAgGo++;
    } else {
      sumMatriz += exp.companyFreight;
      countMatriz++;
    }
  });

  console.log(`\nCurrent Ag GO: count=${countAgGo}, sum=R$ ${sumAgGo.toFixed(2)}`);
  console.log(`Current Matriz (should have been Ag GO): count=${countMatriz}, sum=R$ ${sumMatriz.toFixed(2)}`);
  console.log(`Total: count=${countAgGo + countMatriz}, sum=R$ ${(sumAgGo + sumMatriz).toFixed(2)}`);
}

main().catch(console.error);
