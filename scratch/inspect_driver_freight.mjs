import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: list, error } = await supabase
    .from('shipments')
    .select('id, driver_freight_value, toll_value, advance_value, advance_percentage, balance_to_receive_value, net_balance_value, driver_name')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  for (const s of list) {
    console.log({
      id: s.id,
      driverName: s.driver_name,
      driverFreight: s.driver_freight_value,
      toll: s.toll_value,
      freightMinusToll: (s.driver_freight_value || 0) - (s.toll_value || 0),
      advance: s.advance_value,
      advancePct: s.advance_percentage,
      balance: s.balance_to_receive_value,
      netBalance: s.net_balance_value
    });
  }
}

run();
