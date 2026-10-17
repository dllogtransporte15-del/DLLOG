import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getShipmentCte(s) {
  const cte = s.cte_number || s.documents?.cte_number || s.documents?.cteNumber;
  return cte && cte !== '-' ? cte : null;
}

function hasCteAttached(s) {
  const cteNumber = s.cte_number || s.documents?.cte_number || s.documents?.cteNumber;
  const hasDoc = Boolean(s.documents?.cte || s.documents?.cte_file_path || s.documents?.cteFilePath);
  const hasHistory = Boolean(s.history?.some(h => (h.action || '').toLowerCase().includes('ct-e anexado') || (h.details || '').toLowerCase().includes('ct-e anexado')));
  return Boolean((cteNumber && cteNumber !== '-' && cteNumber.trim() !== '') || hasDoc || hasHistory);
}

function getEffectiveDate(s) {
  return s.cte_emission_date || s.cte_effective_date || s.scheduled_date || (s.created_at ? s.created_at.split('T')[0] : null);
}

function isShipmentInPeriod(s, startDate, endDate) {
  const inRange = (d) => d >= startDate && d <= endDate;
  if (s.cte_emission_date) {
    return inRange(s.cte_emission_date);
  }
  if (hasCteAttached(s)) {
    const effDate = getEffectiveDate(s);
    return Boolean(effDate && inRange(effDate));
  }
  const effDate = getEffectiveDate(s);
  return Boolean(effDate && inRange(effDate));
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

  const startDate = '2026-10-01';
  const endDate = '2026-10-31';

  // ReportsPage filteredShipments
  const filteredShipments = shipments.filter(s => isShipmentInPeriod(s, startDate, endDate));
  console.log('Filtered shipments in Oct:', filteredShipments.length);

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

  const mauricioUser = users.find(u => u.id === 'USR-294');

  // getDetailedShipmentsForUser for Mauricio
  const modalDetailedShipments = [];
  filteredShipments.forEach(s => {
    if (s.status === 'Cancelado') return;
    const cteVal = getShipmentCte(s);
    if (!cteVal) return;

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
        u.profile === 'agenciador' && 
        u.permissions?.agencyRole !== 'embarque' && 
        u.branch_id === s.branch_id
      );
      if (matchedLeaderByBranch) {
        targetLeaderId = matchedLeaderByBranch.id;
      }
    }

    if (targetLeaderId === mauricioUser.id) {
      belongsToUser = true;
    }

    if (belongsToUser) {
      const exp = calculateShipmentExpenses(s, cargo);
      modalDetailedShipments.push({ s, exp });
    }
  });

  console.log(`\nFound ${modalDetailedShipments.length} shipments for Mauricio in Modal:`);
  let totalGross = 0;
  modalDetailedShipments.forEach(item => {
    totalGross += item.exp.companyFreight;
    console.log(`- ${item.s.id} | Date: ${item.s.scheduled_date} | Freight: ${item.exp.companyFreight} | Status: ${item.s.status} | CargoBranch: ${cargoMap.get(item.s.cargo_id)?.branch_id} | ShipBranch: ${item.s.branch_id} | Embarcador: ${item.s.embarcador_id}`);
  });
  console.log(`TOTAL GROSS: R$ ${totalGross.toFixed(2)}`);
}

main().catch(console.error);
