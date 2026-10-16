import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: list, error } = await supabase
    .from('shipments')
    .select('id, driver_freight_type, driver_freight_value, toll_value, documents');

  if (error) {
    console.error(error);
    return;
  }
  console.log('Total shipments:', list.length);
  let withRealProfitCiot = 0;
  let withoutRealProfitCiot = 0;
  let pjCount = 0;
  let pfCount = 0;



  for (const s of list) {
    const isPj = s.driver_freight_type === 'PJ' || s.documents?.driver_freight_type === 'PJ' || s.documents?.antt_modality === 'ETC';
    if (isPj) pjCount++; else pfCount++;
    const rpd = s.real_profit_data || s.documents?.real_profit_data;
    if (rpd && rpd.ciot !== undefined) {
      withRealProfitCiot++;
      console.log('Shipment', s.id, 'has rpd.ciot =', rpd.ciot, 'isCiotManual:', rpd.isCiotManual);
    } else {
      withoutRealProfitCiot++;
    }
  }
  console.log({ total: list.length, pjCount, pfCount, withRealProfitCiot, withoutRealProfitCiot });
}

check();
