import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRpc() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS secondary_cnpjs JSONB;' });
  console.log('rpc result:', { data, error });
}

testRpc();
