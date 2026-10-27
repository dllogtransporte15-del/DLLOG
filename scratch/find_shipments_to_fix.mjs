import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectAll() {
  const { data: cargos } = await supabase.from('cargos').select('*');
  const { data: shipments } = await supabase.from('shipments').select('*');

  console.log(`Total cargos: ${cargos.length}, Total shipments: ${shipments.length}`);

  const cargoMap = new Map();
  for (const c of cargos) {
    const hasIcms = Boolean(
      c.has_icms === true || 
      (c.icms_percentage && Number(c.icms_percentage) > 0) ||
      (c.freight_legs && c.freight_legs[0]?.hasIcms === true) ||
      (c.freight_legs && Number(c.freight_legs[0]?.icmsPercentage) > 0) ||
      (c.freight_calculation_type === 'per_ton_plus_icms') ||
      (c.freight_legs && c.freight_legs[0]?.freightCalculationType === 'per_ton_plus_icms')
    );
    cargoMap.set(c.id, {
      ...c,
      cargoHasIcms: hasIcms
    });
  }

  const cargosWithoutIcms = cargos.filter(c => !cargoMap.get(c.id).cargoHasIcms);
  console.log(`Cargos WITHOUT ICMS: ${cargosWithoutIcms.length} of ${cargos.length}`);

  // Let's check CRG-293 and CRG-149 specifically
  const c293 = cargoMap.get('CRG-293');
  const c149 = cargoMap.get('CRG-149');
  console.log('CRG-293 hasIcms:', c293?.cargoHasIcms);
  console.log('CRG-149 hasIcms:', c149?.cargoHasIcms);

  // Group shipments by cargo
  const shipmentsToFix = [];

  for (const s of shipments) {
    const c = cargoMap.get(s.cargo_id);
    if (!c) continue;

    if (!c.cargoHasIcms) {
      const docs = s.documents || {};
      const rpd = s.real_profit_data || docs.real_profit_data || {};

      const docIcmsVal = Number(docs.icms_value) || 0;
      const docValorIcms = Number(docs.valor_icms) || 0;
      const shipIcmsVal = Number(s.icms_value) || 0;
      const rpdIcmsDiff = Number(rpd.icmsDifference) || 0;
      const rpdIcms = Number(rpd.icms) || 0;
      const docRpdIcmsDiff = Number(docs.real_profit_data?.icmsDifference) || 0;
      const docRpdIcms = Number(docs.real_profit_data?.icms) || 0;

      const hasPositiveIcms = docIcmsVal > 0 || docValorIcms > 0 || shipIcmsVal > 0 || rpdIcmsDiff > 0 || rpdIcms > 0 || docRpdIcmsDiff > 0 || docRpdIcms > 0;
      const isExplicitlyFalseExempt = docs.is_icms_exempt === false || rpd.isIcmsExempt === false || s.isIcmsExempt === false;
      const isNotExempt = docs.is_icms_exempt !== true || rpd.isIcmsExempt !== true;

      if (hasPositiveIcms || isExplicitlyFalseExempt) {
        shipmentsToFix.push({
          shipmentId: s.id,
          cargoId: s.cargo_id,
          status: s.status,
          hasPositiveIcms,
          isExplicitlyFalseExempt,
          docIcmsVal,
          docValorIcms,
          shipIcmsVal,
          rpdIcmsDiff,
          docRpdIcmsDiff,
          docsIsIcmsExempt: docs.is_icms_exempt,
          rpdIsIcmsExempt: rpd.isIcmsExempt
        });
      }
    }
  }

  console.log(`\nShipments needing correction (cargo has no ICMS, but shipment has ICMS > 0 or is_icms_exempt === false): ${shipmentsToFix.length}`);

  const byCargo = {};
  for (const item of shipmentsToFix) {
    if (!byCargo[item.cargoId]) byCargo[item.cargoId] = [];
    byCargo[item.cargoId].push(item);
  }

  for (const [cid, items] of Object.entries(byCargo)) {
    console.log(`\nCargo ${cid} (${items.length} shipments):`);
    for (const sh of items) {
      console.log(`  - ${sh.shipmentId} [${sh.status}]: posICMS=${sh.hasPositiveIcms} (doc: ${sh.docIcmsVal}, rpdDiff: ${sh.rpdIcmsDiff}, docRpd: ${sh.docRpdIcmsDiff}), is_exempt: doc=${sh.docsIsIcmsExempt}, rpd=${sh.rpdIsIcmsExempt}`);
    }
  }
}

inspectAll();
