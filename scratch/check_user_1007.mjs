import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: users } = await supabase.from('app_users').select('*');
  const u1007 = users.find(u => u.id === 'USR-1007');
  console.log('User USR-1007:', u1007);
}

main().catch(console.error);
