import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getShipmentCte(s) {
  const cte = s.cte_number || s.documents?.cte_number || s.documents?.cteNumber;
  return cte && cte !== '-' ? cte : null;
}

function hasCteAttached(s) {
  const docs = s.documents;
  return Boolean(
    docs?.cte_url || docs?.cteUrl || docs?.cte || docs?.cte_number || docs?.cteNumber || s.cte_number
  );
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

  const mauricio = users.find(u => u.id === 'USR-294');

  function getLeaderIdForUser(userId) {
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
  }

  // Exactly as in SupervisorReport.tsx getDetailedShipmentsForUser(mauricio)
  const modalList = [];
  for (const s of shipments) {
    if (s.status === 'Cancelado') continue;
    const cteVal = getShipmentCte(s);
    if (!cteVal) continue;

    const cargo = cargoMap.get(s.cargo_id);

    let belongsToUser = false;
    let targetLeaderId = getLeaderIdForUser(s.embarcador_id) || 
                         getLeaderIdForUser(s.created_by_id) || 
                         (cargo?.created_by_id ? getLeaderIdForUser(cargo.created_by_id) : undefined);

    if (!targetLeaderId && s.agency_commission_agency_name) {
      const matchedUser = users.find(u => 
        u.name?.toLowerCase() === s.agency_commission_agency_name?.toLowerCase() ||
        s.agency_commission_agency_name?.toLowerCase().includes(u.name?.toLowerCase()) ||
        u.email?.toLowerCase() === s.agency_commission_agency_name?.toLowerCase()
      );
      if (matchedUser) {
        targetLeaderId = getLeaderIdForUser(matchedUser.id);
      }
    }

    if (!targetLeaderId && s.branch_id) {
      const matchedLeaderByBranch = users.find(u => 
        u.profile === 'Agenciador' && 
        u.permissions?.agencyRole !== 'embarque' && 
        u.branch_id === s.branch_id
      );
      if (matchedLeaderByBranch) {
        targetLeaderId = matchedLeaderByBranch.id;
      }
    }

    if (targetLeaderId === mauricio.id) {
      belongsToUser = true;
    }

    if (belongsToUser) {
      const exp = calculateShipmentExpenses(s, cargo);
      modalList.push({
        id: s.id,
        status: s.status,
        scheduled_date: s.scheduled_date,
        cte_emission_date: s.cte_emission_date,
        company_freight: exp.companyFreight,
        cargo_id: s.cargo_id,
        branch_id: s.branch_id,
        cargo_branch_id: cargo?.branch_id,
        embarcador_id: s.embarcador_id,
        created_by_id: s.created_by_id,
        agency_commission_agency_name: s.agency_commission_agency_name
      });
    }
  }

  console.log(`SupervisorReport found ${modalList.length} shipments for Mauricio:`);
  let totalBilled = 0;
  for (const item of modalList) {
    totalBilled += item.company_freight;
    console.log(item);
  }
  console.log('TOTAL BILLED IN MODAL:', totalBilled);
}

main().catch(console.error);
