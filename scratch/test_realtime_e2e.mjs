import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';
const CHANNEL_NAME = 'transcunha_operations_hub';

console.log('[E2E Test] Starting Realtime Hub test between two simulated user sessions...');

const clientUserA = createClient(SUPABASE_URL, SUPABASE_KEY);
const clientUserB = createClient(SUPABASE_URL, SUPABASE_KEY);

let broadcastReceived = false;

const chB = clientUserB.channel(CHANNEL_NAME, {
  config: { broadcast: { ack: false, self: false } }
});

chB.on('broadcast', { event: 'shipment_changed' }, ({ payload }) => {
  console.log('[User B Screen] ⚡ Received Realtime shipment update:', payload);
  if (payload.shipmentId === 'SHP-TEST-999' && payload.status === 'Ag. Carregamento') {
    broadcastReceived = true;
  }
});

chB.subscribe((statusB) => {
  console.log('[User B] Channel status:', statusB);
  if (statusB === 'SUBSCRIBED') {
    const chA = clientUserA.channel(CHANNEL_NAME, {
      config: { broadcast: { ack: false, self: false } }
    });

    chA.subscribe(async (statusA) => {
      console.log('[User A] Channel status:', statusA);
      if (statusA === 'SUBSCRIBED') {
        console.log('[User A] User A changes shipment status from "Ag. Seguradora" to "Ag. Carregamento"...');
        await chA.send({
          type: 'broadcast',
          event: 'shipment_changed',
          payload: {
            action: 'update',
            shipmentId: 'SHP-TEST-999',
            status: 'Ag. Carregamento',
            timestamp: Date.now()
          }
        });
        console.log('[User A] Broadcast sent successfully!');

        setTimeout(() => {
          if (broadcastReceived) {
            console.log('[E2E Test] ✅ SUCCESS: User B received status update in real time!');
            process.exit(0);
          } else {
            console.error('[E2E Test] ❌ FAILED: User B did not receive the update!');
            process.exit(1);
          }
        }, 1500);
      }
    });
  }
});
