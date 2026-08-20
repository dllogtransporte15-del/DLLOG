import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectAppSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  console.log('app_settings:', { data, error });
}

inspectAppSettings();
