import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const clientA = createClient(SUPABASE_URL, SUPABASE_KEY);
const clientB = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHANNEL_NAME = 'test_broadcast_hub';

let received = false;

const chB = clientB.channel(CHANNEL_NAME);
chB.on('broadcast', { event: 'shipment_status_changed' }, (payload) => {
  console.log('[Client B] Broadcast received:', payload);
  received = true;
});

chB.subscribe((statusB) => {
  console.log('Client B status:', statusB);
  if (statusB === 'SUBSCRIBED') {
    const chA = clientA.channel(CHANNEL_NAME);
    chA.subscribe(async (statusA) => {
      console.log('Client A status:', statusA);
      if (statusA === 'SUBSCRIBED') {
        console.log('Sending broadcast from Client A...');
        await chA.send({
          type: 'broadcast',
          event: 'shipment_status_changed',
          payload: { shipmentId: 'FEL-487', newStatus: 'Ag. Adiantamento', timestamp: Date.now() }
        });
        console.log('Broadcast sent!');

        setTimeout(() => {
          console.log('Result received?:', received);
          process.exit(received ? 0 : 1);
        }, 3000);
      }
    });
  }
});
