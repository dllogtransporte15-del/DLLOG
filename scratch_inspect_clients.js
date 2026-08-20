import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectClients() {
  const { data: clients, error } = await supabase.from('clients').select('*').limit(5);
  console.log('Error:', error);
  console.log('Sample clients:', clients);
}

inspectClients();
