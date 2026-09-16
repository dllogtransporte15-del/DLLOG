import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: rows, error } = await supabase.from('shipments').select('*');
  if (error) {
    console.error('Error fetching shipments:', error);
    return;
  }

  let fixedCount = 0;
  for (const row of (rows || [])) {
    const docs = row.documents || {};
    const driverFreightType = row.driver_freight_type || docs.driver_freight_type || 'PJ';
    const anttModality = (row.antt_modality && row.antt_modality !== 'null') ? row.antt_modality : ((docs.antt_modality && docs.antt_modality !== 'null') ? docs.antt_modality : undefined);
    const isPf = (driverFreightType === 'PF' || anttModality === 'TAC');
    
    // We only recalculate for PJ shipments that are not Finalizado or Cancelado
    if (!isPf && row.status !== 'Finalizado' && row.status !== 'Cancelado') {
      const totalFreight = row.driver_freight_value || 0;
      const toll = row.toll_value || 0;
      const advPct = row.advance_percentage !== null ? row.advance_percentage : (docs.advance_percentage !== undefined ? docs.advance_percentage : 70);
      const baseFreight = Math.max(0, totalFreight - toll);
      const expectedBalance = Number((baseFreight * ((100 - advPct) / 100)).toFixed(2));
      
      if (totalFreight > 0 && row.balance_to_receive_value !== null && Math.abs(row.balance_to_receive_value - expectedBalance) > 0.01) {
        console.log(`Fixing ${row.id} (${row.status}): current balance ${row.balance_to_receive_value} -> expected ${expectedBalance}`);
        const { error: updErr } = await supabase
          .from('shipments')
          .update({ balance_to_receive_value: expectedBalance })
          .eq('id', row.id);
        if (updErr) console.error(`Failed to update ${row.id}:`, updErr);
        else fixedCount++;
      }
    }
  }
  console.log(`Done! Fixed ${fixedCount} active PJ shipments.`);
}

run();
