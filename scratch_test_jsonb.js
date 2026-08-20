import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testJsonbStorage() {
  const { data: current, error: fetchErr } = await supabase.from('profile_permissions').select('permissions').eq('id', 1).single();
  if (fetchErr) {
    console.error('Fetch err:', fetchErr);
    return;
  }

  const updated = {
    ...current.permissions,
    client_branches: {
      'CLI-TEST': [
        { id: 'branch-1', cnpj: '11.222.333/0002-44', nomeFantasia: 'Filial Teste', city: 'Goiânia', state: 'GO' }
      ]
    }
  };

  const { error: saveErr } = await supabase.from('profile_permissions').upsert({ id: 1, permissions: updated });
  console.log('Save result error:', saveErr);

  const { data: verify, error: vErr } = await supabase.from('profile_permissions').select('permissions').eq('id', 1).single();
  console.log('Verify client_branches:', verify.permissions.client_branches);

  // Clean up test
  delete updated.client_branches['CLI-TEST'];
  await supabase.from('profile_permissions').upsert({ id: 1, permissions: updated });
  console.log('Cleaned up test successfully');
}

testJsonbStorage();
