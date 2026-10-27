import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching cargos...');
  const { data: cargos, error: errCargos } = await supabase.from('cargos').select('*');
  if (errCargos) throw errCargos;

  console.log('Fetching shipments...');
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

  // Map cargoId -> cargo and sequenceId -> cargo
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

  const nonIcmsCargoIds = new Set();
  for (const c of cargos) {
    if (isCargoWithoutIcms(c)) {
      nonIcmsCargoIds.add(c.id);
      if (c.sequence_id) nonIcmsCargoIds.add(`CRG-${c.sequence_id}`);
    }
  }

  console.log(`Total non-ICMS cargos: ${nonIcmsCargoIds.size}`);

  // Find shipments of non-ICMS cargos that need updating
  const toUpdate = [];
  for (const s of allShipments) {
    const c = cargoMap.get(s.cargo_id);
    if (!c || !isCargoWithoutIcms(c)) continue;

    const docs = (s.documents && typeof s.documents === 'object') ? s.documents : {};
    const realProfit = s.real_profit_data || docs.real_profit_data;

    const hasStoredPositiveIcms = (
      (s.icms_value !== null && Number(s.icms_value) > 0) ||
      (docs.icms_value !== undefined && Number(docs.icms_value) > 0) ||
      (docs.valor_icms !== undefined && Number(docs.valor_icms) > 0) ||
      (realProfit?.icmsDifference !== undefined && Number(realProfit.icmsDifference) > 0) ||
      (realProfit?.icms !== undefined && Number(realProfit.icms) > 0)
    );

    const isExemptFlagMissingOrFalse = (
      s.is_icms_exempt !== true ||
      docs.is_icms_exempt !== true ||
      docs.isIcmsExempt !== true ||
      realProfit?.isIcmsExempt !== true
    );

    if (hasStoredPositiveIcms || isExemptFlagMissingOrFalse) {
      toUpdate.push({
        id: s.id,
        cargo_id: s.cargo_id,
        cargoSeq: c.sequence_id,
        hasPositiveIcms: hasStoredPositiveIcms,
        storedIcms: s.icms_value ?? docs.icms_value ?? realProfit?.icmsDifference,
        isExemptMissing: isExemptFlagMissingOrFalse,
        original: s
      });
    }
  }

  console.log(`Shipments of non-ICMS cargos needing normalization: ${toUpdate.length}`);
  const withPositiveIcms = toUpdate.filter(u => u.hasPositiveIcms);
  console.log(`Shipments with positive ICMS stored: ${withPositiveIcms.length}`);
  withPositiveIcms.forEach(u => {
    console.log(`  Shipment: ${u.id} (Cargo: ${u.cargo_id} / CRG-${u.cargoSeq}) -> stored ICMS: ${u.storedIcms}`);
  });

  const crg293 = toUpdate.filter(u => u.cargo_id === 'CRG-293' || u.cargoSeq === 293 || u.cargoSeq === '293');
  console.log(`CRG-293 shipments in update list: ${crg293.length} (${crg293.map(x => x.id).join(', ')})`);

  const crg149 = toUpdate.filter(u => u.cargo_id === 'CRG-149' || u.cargoSeq === 149 || u.cargoSeq === '149');
  console.log(`CRG-149 shipments in update list: ${crg149.length} (${crg149.map(x => x.id).join(', ')})`);
}

run().catch(console.error);
