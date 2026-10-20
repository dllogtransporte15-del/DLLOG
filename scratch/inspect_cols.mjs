import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectColumns() {
  const { data, error } = await supabase.from('tickets').select('*').limit(1);
  if (data && data[0]) {
    console.log('Existing columns on tickets table:', Object.keys(data[0]));
  } else {
    console.log('Error or no rows:', error);
  }
}

inspectColumns();
