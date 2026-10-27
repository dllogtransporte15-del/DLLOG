import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: cargos, error: errCargos } = await supabase.from('cargos').select('*');
  const { data: shipments, error: errShip } = await supabase.from('shipments').select('*');

  if (errCargos || errShip) {
    console.error('Error fetching data:', errCargos, errShip);
    return;
  }

  console.log(`Loaded ${cargos.length} cargos and ${shipments.length} shipments.`);

  const cargoMap = new Map();
  for (const c of cargos) {
    const hasIcmsCargo = Boolean(
      c.has_icms === true || 
      (c.icms_percentage && c.icms_percentage > 0) ||
      (c.freight_legs && c.freight_legs[0]?.hasIcms === true) ||
      (c.freight_legs && c.freight_legs[0]?.icmsPercentage > 0) ||
      (c.freight_calculation_type === 'per_ton_plus_icms') ||
      (c.freight_legs && c.freight_legs[0]?.freightCalculationType === 'per_ton_plus_icms')
    );
    cargoMap.set(c.id, {
      ...c,
      hasIcmsCargo
    });
  }

  // Find all shipments where:
  // 1. Cargo has NO ICMS (hasIcmsCargo === false)
  // 2. But the shipment has some ICMS highlighted or non-zero or exempt is false with ICMS
  const problematicShipments = [];

  for (const s of shipments) {
    const c = cargoMap.get(s.cargo_id);
    if (!c) continue;

    const docs = s.documents || {};
    const rpd = s.real_profit_data || docs.real_profit_data || {};

    const docIcmsVal = Number(docs.icms_value) || 0;
    const valorIcms = Number(docs.valor_icms) || 0;
    const shipIcmsVal = Number(s.icms_value) || 0;
    const rpdIcmsDiff = Number(rpd.icmsDifference) || 0;
    const rpdIcms = Number(rpd.icms) || 0;
    const isExempt = docs.is_icms_exempt === true || rpd.isIcmsExempt === true || s.isIcmsExempt === true;

    // Check if shipment has any ICMS highlighted
    const hasIcmsInShipment = docIcmsVal > 0 || valorIcms > 0 || shipIcmsVal > 0 || rpdIcmsDiff > 0 || rpdIcms > 0;

    if (!c.hasIcmsCargo && hasIcmsInShipment) {
      problematicShipments.push({
        shipmentId: s.id,
        cargoId: s.cargo_id,
        cargoOrigin: c.origin,
        cargoDest: c.destination,
        shipmentStatus: s.status,
        docIcmsVal,
        valorIcms,
        shipIcmsVal,
        rpdIcmsDiff,
        rpdIcms,
        isExempt
      });
    }
  }

  console.log(`\nFound ${problematicShipments.length} shipments where cargo has NO ICMS but shipment has ICMS > 0:`);
  
  // Group by cargo
  const byCargo = {};
  for (const p of problematicShipments) {
    if (!byCargo[p.cargoId]) byCargo[p.cargoId] = [];
    byCargo[p.cargoId].push(p);
  }

  for (const [cargoId, list] of Object.entries(byCargo)) {
    console.log(`\nCargo: ${cargoId} (${list[0].cargoOrigin} -> ${list[0].cargoDest}) - ${list.length} shipments:`);
    for (const sh of list) {
      console.log(`  Shipment ${sh.shipmentId} [${sh.shipmentStatus}]: docIcmsVal=${sh.docIcmsVal}, valorIcms=${sh.valorIcms}, shipIcmsVal=${sh.shipIcmsVal}, rpdDiff=${sh.rpdIcmsDiff}, rpdIcms=${sh.rpdIcms}, isExempt=${sh.isExempt}`);
    }
  }
}

main();
