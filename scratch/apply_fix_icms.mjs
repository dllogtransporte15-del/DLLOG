import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('--- STARTING ICMS CORRECTION ON SHIPMENTS ---');

  console.log('1. Fetching cargos...');
  const { data: cargos, error: errCargos } = await supabase.from('cargos').select('*');
  if (errCargos) throw errCargos;

  console.log('2. Fetching shipments...');
  let allShipments = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data: batch, error: errShip } = await supabase
      .from('shipments')
      .select('*')
      .range(from, from + batchSize - 1);
    if (errShip) throw errShip;
    if (!batch || batch.length === 0) break;
    allShipments.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Loaded ${cargos.length} cargos and ${allShipments.length} shipments.`);

  const cargoMap = new Map();
  for (const c of cargos) {
    cargoMap.set(c.id, c);
    if (c.sequence_id) {
      cargoMap.set(`CRG-${c.sequence_id}`, c);
    }
  }

  const isCargoWithoutIcms = (c) => {
    if (!c) return false;
    const hasIcms = Boolean(c.has_icms);
    const pct = Number(c.icms_percentage || 0);
    const legs = Array.isArray(c.freight_legs) ? c.freight_legs : [];
    const legsHasIcms = legs.some(l => l.hasIcms === true || Number(l.icmsPercentage || 0) > 0 || l.freightCalculationType === 'per_ton_plus_icms');
    const calcType = c.freight_calculation_type;
    return !hasIcms && pct <= 0 && !legsHasIcms && calcType !== 'per_ton_plus_icms';
  };

  const toUpdate = [];
  for (const s of allShipments) {
    const c = cargoMap.get(s.cargo_id);
    if (!c || !isCargoWithoutIcms(c)) continue;

    const docs = (s.documents && typeof s.documents === 'object') ? s.documents : {};
    const realProfit = docs.real_profit_data || s.real_profit_data;

    const hasStoredPositiveIcms = (
      (docs.icms_value !== undefined && Number(docs.icms_value) > 0) ||
      (docs.valor_icms !== undefined && Number(docs.valor_icms) > 0) ||
      (realProfit?.icmsDifference !== undefined && Number(realProfit.icmsDifference) > 0) ||
      (realProfit?.icms !== undefined && Number(realProfit.icms) > 0)
    );

    const isExemptFlagMissingOrFalse = (
      docs.is_icms_exempt !== true ||
      docs.isIcmsExempt !== true ||
      realProfit?.isIcmsExempt !== true
    );

    if (hasStoredPositiveIcms || isExemptFlagMissingOrFalse) {
      toUpdate.push({
        id: s.id,
        cargo_id: s.cargo_id,
        cargoSeq: c.sequence_id,
        original: s
      });
    }
  }

  console.log(`Shipments to update: ${toUpdate.length}`);

  let successCount = 0;
  let failCount = 0;

  // Process updates in chunks of 20
  const CHUNK_SIZE = 20;
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (item) => {
      const s = item.original;
      const docs = (s.documents && typeof s.documents === 'object') ? { ...s.documents } : {};
      
      docs.is_icms_exempt = true;
      docs.isIcmsExempt = true;
      docs.icms_value = 0;
      docs.valor_icms = 0;

      if (docs.real_profit_data && typeof docs.real_profit_data === 'object') {
        docs.real_profit_data = {
          ...docs.real_profit_data,
          isIcmsExempt: true,
          icmsDifference: 0,
          icms: 0,
        };
      } else {
        docs.real_profit_data = {
          isIcmsExempt: true,
          icmsDifference: 0,
          icms: 0,
        };
      }

      const { error } = await supabase
        .from('shipments')
        .update({ documents: docs })
        .eq('id', s.id);

      if (error) {
        console.error(`Error updating shipment ${s.id}:`, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }));

    if ((i + CHUNK_SIZE) % 50 === 0 || i + CHUNK_SIZE >= toUpdate.length) {
      console.log(`Progress: ${Math.min(i + CHUNK_SIZE, toUpdate.length)}/${toUpdate.length} (Success: ${successCount}, Fail: ${failCount})`);
    }
  }

  console.log(`\nFinished updates. Success: ${successCount}, Fail: ${failCount}`);

  // Verification pass
  console.log('\n--- VERIFICATION PASS ---');
  let verifyShipments = [];
  from = 0;
  while (true) {
    const { data: batch, error: errShip } = await supabase
      .from('shipments')
      .select('*')
      .range(from, from + batchSize - 1);
    if (errShip) throw errShip;
    if (!batch || batch.length === 0) break;
    verifyShipments.push(...batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  let stillWithPositiveIcms = 0;
  let stillWithoutExempt = 0;

  for (const s of verifyShipments) {
    const c = cargoMap.get(s.cargo_id);
    if (!c || !isCargoWithoutIcms(c)) continue;

    const docs = (s.documents && typeof s.documents === 'object') ? s.documents : {};
    const realProfit = docs.real_profit_data || s.real_profit_data;

    const hasStoredPositiveIcms = (
      (docs.icms_value !== undefined && Number(docs.icms_value) > 0) ||
      (docs.valor_icms !== undefined && Number(docs.valor_icms) > 0) ||
      (realProfit?.icmsDifference !== undefined && Number(realProfit.icmsDifference) > 0) ||
      (realProfit?.icms !== undefined && Number(realProfit.icms) > 0)
    );

    if (hasStoredPositiveIcms) {
      stillWithPositiveIcms++;
      console.log(`  STILL POSITIVE: ${s.id} (Cargo: ${s.cargo_id})`);
    }

    if (docs.is_icms_exempt !== true || docs.isIcmsExempt !== true) {
      stillWithoutExempt++;
      console.log(`  STILL NOT EXEMPT: ${s.id} (Cargo: ${s.cargo_id})`);
    }
  }

  console.log(`\nVerification result for non-ICMS cargos:`);
  console.log(`  Total shipments checked on non-ICMS cargos: ${verifyShipments.filter(s => cargoMap.get(s.cargo_id) && isCargoWithoutIcms(cargoMap.get(s.cargo_id))).length}`);
  console.log(`  Remaining shipments with positive ICMS: ${stillWithPositiveIcms}`);
  console.log(`  Remaining shipments without is_icms_exempt: ${stillWithoutExempt}`);

  // Check specifically CRG-293
  const verifyCrg293 = verifyShipments.filter(s => s.cargo_id === 'CRG-293' || cargoMap.get(s.cargo_id)?.sequence_id === 293 || cargoMap.get(s.cargo_id)?.sequence_id === '293');
  console.log(`\nCRG-293 status (${verifyCrg293.length} shipments):`);
  verifyCrg293.forEach(s => {
    const docs = s.documents || {};
    const rp = docs.real_profit_data || {};
    console.log(`  ${s.id}: docs.is_icms_exempt=${docs.is_icms_exempt}, docs.icms_value=${docs.icms_value}, rp.icmsDifference=${rp.icmsDifference}, rp.isIcmsExempt=${rp.isIcmsExempt}`);
  });

  // Check specifically CRG-149
  const verifyCrg149 = verifyShipments.filter(s => s.cargo_id === 'CRG-149' || cargoMap.get(s.cargo_id)?.sequence_id === 149 || cargoMap.get(s.cargo_id)?.sequence_id === '149');
  console.log(`\nCRG-149 sample status (${verifyCrg149.length} shipments total, showing 6 specific mentioned):`);
  const crg149Sample = ['FEL-810', 'FEL-815', 'FEL-827', 'FEL-829', 'FEL-836', 'CEL-830'];
  verifyCrg149.filter(s => crg149Sample.includes(s.id)).forEach(s => {
    const docs = s.documents || {};
    const rp = docs.real_profit_data || {};
    console.log(`  ${s.id}: docs.is_icms_exempt=${docs.is_icms_exempt}, docs.icms_value=${docs.icms_value}, rp.icmsDifference=${rp.icmsDifference}, rp.isIcmsExempt=${rp.isIcmsExempt}`);
  });
}

run().catch(console.error);
