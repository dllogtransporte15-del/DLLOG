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

  const cargoMap = new Map(cargos.map(c => [c.id, c]));

  const shipmentsByCargo = {};

  for (const s of shipments) {
    const c = cargoMap.get(s.cargo_id);
    const cargoHasIcms = Boolean(c?.has_icms || (c?.freight_legs && c.freight_legs[0]?.hasIcms));

    const shipIcmsVal = Number(s.icms_value) || 0;
    const docIcmsVal = Number(s.documents?.icms_value) || 0;
    const valorIcms = Number(s.documents?.valor_icms) || 0;
    const rpdIcmsDiff = Number(s.real_profit_data?.icmsDifference) || 0;
    const rpdIcms = Number(s.real_profit_data?.icms) || 0;
    const docRpdIcmsDiff = Number(s.documents?.real_profit_data?.icmsDifference) || 0;

    const maxIcms = Math.max(shipIcmsVal, docIcmsVal, valorIcms, rpdIcmsDiff, rpdIcms, docRpdIcmsDiff);

    if (!cargoHasIcms && maxIcms > 0) {
      if (!shipmentsByCargo[s.cargo_id]) {
        shipmentsByCargo[s.cargo_id] = {
          cargoId: s.cargo_id,
          cargoNumber: c?.cargo_number || c?.number,
          origin: c?.origin,
          destination: c?.destination,
          has_icms: c?.has_icms,
          shipments: []
        };
      }
      shipmentsByCargo[s.cargo_id].shipments.push({
        id: s.id,
        status: s.status,
        maxIcms,
        shipIcmsVal,
        docIcmsVal,
        valorIcms,
        rpdIcmsDiff,
        docRpdIcmsDiff
      });
    }
  }

  console.log('Total cargos affected:', Object.keys(shipmentsByCargo).length);
  for (const [cid, info] of Object.entries(shipmentsByCargo)) {
    console.log(`\n=== Cargo ${cid} (No.: ${info.cargoNumber}, has_icms: ${info.has_icms}) -> ${info.shipments.length} shipments ===`);
    for (const sh of info.shipments) {
      console.log(`  - Shipment ${sh.id} [${sh.status}]: maxICMS=${sh.maxIcms} (icms_value=${sh.shipIcmsVal}, docs.icms_value=${sh.docIcmsVal}, docs.valor_icms=${sh.valorIcms}, rpd.diff=${sh.rpdIcmsDiff}, docs.rpd.diff=${sh.docRpdIcmsDiff})`);
    }
  }
}

main();
