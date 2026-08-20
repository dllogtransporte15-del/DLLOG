import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectProfilePerms() {
  const { data, error } = await supabase.from('profile_permissions').select('*');
  console.log('profile_permissions:', JSON.stringify(data, null, 2));
}

inspectProfilePerms();
