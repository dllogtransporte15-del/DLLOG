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

  // Filter exactly by month of October 2026
  console.log('--- SHIPMENTS IN OCT 2026 FOR MAURICIO (LEADER) OR MURILO (OPERATOR) OR FILIAL GO ---');
  let count = 0;
  let totalGross = 0;

  for (const s of shipments) {
    if (s.status === 'Cancelado') continue;
    
    // Check if belongs to Mauricio's agency
    let targetLeaderId = getLeaderIdForUser(s.embarcador_id) || 
                         getLeaderIdForUser(s.created_by_id);

    const cargo = cargoMap.get(s.cargo_id);
    if (!targetLeaderId && cargo?.created_by_id) {
      targetLeaderId = getLeaderIdForUser(cargo.created_by_id);
    }
    if (!targetLeaderId && s.id && s.id.startsWith('MUR-')) {
      targetLeaderId = 'USR-294';
    }
    if (!targetLeaderId && s.id && s.id.startsWith('MAU-')) {
      targetLeaderId = 'USR-294';
    }
    if (!targetLeaderId && (s.branch_id === 'FIL-012' || cargo?.branch_id === 'FIL-012')) {
      targetLeaderId = 'USR-294';
    }

    if (targetLeaderId !== 'USR-294') continue;

    const cte = getShipmentCte(s);
    const date = s.scheduled_date || s.created_at?.split('T')[0];
    const isOct = date >= '2026-10-01' && date <= '2026-10-31';

    const exp = calculateShipmentExpenses(s, cargo);
    console.log({
      id: s.id,
      date,
      status: s.status,
      cte: !!cte,
      cte_num: cte,
      company_freight: exp.companyFreight,
      isOct,
      embarcador_id: s.embarcador_id,
      created_by_id: s.created_by_id,
      branch_id: s.branch_id,
      cargo_branch_id: cargo?.branch_id
    });

    if (isOct) {
      count++;
      totalGross += exp.companyFreight;
    }
  }

  console.log(`\nOCTOBER 2026 TOTAL: ${count} shipments, Total Freight: ${totalGross}`);
}

main().catch(console.error);
