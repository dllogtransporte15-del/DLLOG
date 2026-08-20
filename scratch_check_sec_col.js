import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSecondaryCnpjs() {
  const { data, error } = await supabase.from('clients').select('secondary_cnpjs').limit(1);
  console.log('Select secondary_cnpjs result:', { data, error });
}

testSecondaryCnpjs();
