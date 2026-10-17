import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getShipmentCte(s) {
  const cte = s.cte_number || s.documents?.cte_number || s.documents?.cteNumber;
  return cte && cte !== '-' ? cte : null;
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

  // All shipments where targetLeaderId === 'USR-294'
  const allMauricio = [];
  for (const s of shipments) {
    if (s.status === 'Cancelado') continue;
    const cteVal = getShipmentCte(s);
    if (!cteVal) continue;

    const cargo = cargoMap.get(s.cargo_id);
    let targetLeaderId = getLeaderIdForUser(s.embarcador_id) || 
                         getLeaderIdForUser(s.created_by_id);
    if (!targetLeaderId && cargo?.created_by_id) {
      targetLeaderId = getLeaderIdForUser(cargo.created_by_id);
    }
    if (!targetLeaderId && s.id && (s.id.startsWith('MUR-') || s.id.startsWith('MAU-'))) {
      targetLeaderId = 'USR-294';
    }
    if (!targetLeaderId && (s.branch_id === 'FIL-012' || cargo?.branch_id === 'FIL-012')) {
      targetLeaderId = 'USR-294';
    }

    if (targetLeaderId === 'USR-294') {
      const exp = calculateShipmentExpenses(s, cargo);
      allMauricio.push({ s, exp });
    }
  }

  // Find the exact 12 shipments whose sum is 105268.50
  console.log('Total with CTE for Mauricio:', allMauricio.length);
  // Let's print those that are scheduled in Sep/Oct
  for (const item of allMauricio) {
    console.log(`${item.s.id} | Date: ${item.s.scheduled_date} | CteDate: ${item.s.cte_emission_date} | Freight: ${item.exp.companyFreight} | Status: ${item.s.status}`);
  }
}

main().catch(console.error);
