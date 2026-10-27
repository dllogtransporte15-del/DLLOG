import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function testCalc(shipment, cargo) {
  const ton = Number(shipment.loadedTonnage || shipment.shipmentTonnage || 0);
  const companyRate = shipment.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
  const companyFreight = Number((ton * companyRate).toFixed(2));
  const driverRate = shipment.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || 0;
  const driverFreight = shipment.driverFreightValue || Number((ton * driverRate).toFixed(2));

  // 3. ICMS Destacado Completo
  // Prioridade 1: Isenção explícita ou ICMS zerado
  const isIcmsExemptExplicit = Boolean(
    shipment.isIcmsExempt ||
    shipment.documents?.is_icms_exempt ||
    shipment.documents?.isIcmsExempt ||
    shipment.realProfitData?.isIcmsExempt ||
    shipment.documents?.real_profit_data?.isIcmsExempt ||
    shipment.icmsValue === 0 ||
    shipment.documents?.icms_value === 0 ||
    shipment.documents?.icms_value === '0' ||
    shipment.documents?.valor_icms === 0 ||
    shipment.realProfitData?.icmsDifference === 0 ||
    shipment.documents?.real_profit_data?.icmsDifference === 0
  );

  const rpdDiff = shipment.realProfitData?.icmsDifference ?? shipment.documents?.real_profit_data?.icmsDifference;

  const icmsDocExplicit = !isIcmsExemptExplicit && (rpdDiff !== undefined && rpdDiff !== null && Number(rpdDiff) > 0)
    ? Number(rpdDiff)
    : (!isIcmsExemptExplicit ? (Number(shipment.documents?.icms_value) || Number(shipment.icmsValue) || 0) : 0);

  const icmsPercentage = isIcmsExemptExplicit ? 0 : (cargo?.icmsPercentage || (cargo?.hasIcms ? 7 : (shipment.icmsPercentage || 0)));
  const icmsCalculado = (!isIcmsExemptExplicit && cargo?.hasIcms && icmsPercentage > 0)
    ? Number((companyFreight * (icmsPercentage / 100)).toFixed(2))
    : 0;

  const icms = isIcmsExemptExplicit ? 0 : (icmsDocExplicit > 0 ? icmsDocExplicit : icmsCalculado);

  // Tab 1 ICMS logic:
  const tab1IcmsDoc = Number(shipment.documents?.icms_value) || 
                      Number(shipment.documents?.vICMS) || 
                      Number(shipment.documents?.valor_icms) || 
                      Number(shipment.documents?.icms_destacado) || 
                      Number(shipment.icmsValue) || 
                      0;
  const tab1Icms = isIcmsExemptExplicit 
    ? 0 
    : (rpdDiff !== undefined && Number(rpdDiff) > 0 
        ? Number(rpdDiff) 
        : (tab1IcmsDoc > 0 ? tab1IcmsDoc : icms));

  // CteCostAutomationPanel logic:
  // if autoCteIcms is extracted from CT-e...
  return {
    companyFreight,
    driverFreight,
    isIcmsExemptExplicit,
    icmsDocExplicit,
    icmsCalculado,
    icms,
    tab1Icms,
    cargoHasIcms: cargo?.has_icms,
    docsIcmsValue: shipment.documents?.icms_value,
    docsIsIcmsExempt: shipment.documents?.is_icms_exempt,
    rpdIsIcmsExempt: shipment.documents?.real_profit_data?.isIcmsExempt
  };
}

async function main() {
  const { data: cargos } = await supabase.from('cargos').select('*').in('id', ['CRG-293', 'CRG-149']);
  const { data: shipments } = await supabase.from('shipments').select('*').in('cargo_id', ['CRG-293', 'CRG-149']);

  const cargoMap = new Map(cargos.map(c => [c.id, c]));

  console.log('Testing all shipments of CRG-293 and CRG-149:');
  for (const s of shipments) {
    const c = cargoMap.get(s.cargo_id);
    const res = testCalc(s, c);
    console.log(`${s.id} (${s.cargo_id}) [${s.status}]:`, res);
  }
}

main();
