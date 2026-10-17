import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Fetching a shipment to test...');
const { data: shipments, error: fetchErr } = await supabase.from('shipments').select('id, status').limit(1);
if (fetchErr || !shipments || shipments.length === 0) {
  console.error('Could not fetch shipment:', fetchErr);
  process.exit(1);
}

const testShipment = shipments[0];
console.log('Testing with shipment:', testShipment.id, 'current status:', testShipment.status);

let eventReceived = false;

let ch = supabase.channel('test_shipment_rt_' + Date.now());

ch.on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, (payload) => {
  console.log('RECEIVED postgres_changes EVENT!', payload.eventType, payload.new?.id, 'new status:', payload.new?.status);
  if (payload.new?.id === testShipment.id) {
    eventReceived = true;
  }
});

ch.subscribe(async (status) => {
  console.log('Subscription status:', status);
  if (status === 'SUBSCRIBED') {
    console.log('Channel subscribed! Updating shipment in 1s...');
    setTimeout(async () => {
      console.log('Executing update on shipment...');
      const { data, error } = await supabase
        .from('shipments')
        .update({ status: testShipment.status }) // harmless update same status to trigger WAL
        .eq('id', testShipment.id);

      console.log('Update executed, error:', error);

      // Wait 10 seconds to see if Realtime event arrives
      setTimeout(() => {
        if (eventReceived) {
          console.log('SUCCESS: Realtime postgres_changes event was received!');
        } else {
          console.warn('FAILURE: Realtime postgres_changes event was NOT received within 10s!');
        }
        supabase.removeChannel(ch);
        process.exit(eventReceived ? 0 : 2);
      }, 10000);
    }, 1000);
  }
});
