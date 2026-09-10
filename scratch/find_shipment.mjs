import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: s } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', 'FEL-323')
    .single();

  const { data: c } = await supabase
    .from('cargos')
    .select('*')
    .eq('id', s.cargo_id)
    .single();

  console.log('=== SHIPMENT DETAILS ===');
  console.log('ID:', s.id);
  console.log('CT-e:', s.documents?.cte_number);
  console.log('Toll (Pedágio):', s.toll_value);
  console.log('Freight (Frete Motorista):', s.driver_freight_value);
  console.log('Tonnage:', s.shipment_tonnage);
  console.log('Advance (Adiantamento):', s.advance_value);
  console.log('Balance (Saldo):', s.balance_to_receive_value);

  // CIOT calculation check:
  const baseCiot = Math.max(0, (s.driver_freight_value || 0) - (s.toll_value || 0));
  const ciot = Number((baseCiot * 0.002).toFixed(2));

  console.log('\n=== CIOT CALCULATION ===');
  console.log('Base CIOT (Frete - Pedágio):', baseCiot);
  console.log('CIOT (0,20%):', ciot);
}

run();
