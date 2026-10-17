import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Testing Supabase Realtime channel...');

const highPriorityTables = [
  'shipments', 'cargos', 'tickets', 'freight_offers', 
  'shipment_locks', 'app_users', 'clients', 'drivers', 
  'vehicles', 'owners', 'products', 'branches', 
  'profile_permissions', 'app_settings', 'risk_query_options'
];

let ch = supabase.channel('test_rt_' + Date.now());

for (const t of highPriorityTables) {
  ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload) => {
    console.log(`[Event ${t}]`, payload.eventType, payload.new?.id || payload.old?.id);
  });
}

ch = ch.on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
  console.log('[Event generic]', payload.table, payload.eventType);
});

ch.subscribe((status, err) => {
  console.log('Channel subscription status:', status, err || '');
  if (status === 'SUBSCRIBED') {
    console.log('Successfully subscribed! Waiting 5s then exiting...');
    setTimeout(() => {
      supabase.removeChannel(ch);
      process.exit(0);
    }, 5000);
  } else if (status === 'CHANNEL_ERROR') {
    console.error('Channel error details:', err);
    process.exit(1);
  }
});
