import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOne() {
  const { data: s, error } = await supabase.from('shipments').select('*').eq('id', 'FEL-823').single();
  console.log('Keys on shipments row:', Object.keys(s));
  console.log('FEL-823 current:', {
    documents_icms: s.documents?.icms_value,
    documents_is_icms_exempt: s.documents?.is_icms_exempt,
    real_profit_data: s.real_profit_data,
    real_profit_in_docs: s.documents?.real_profit_data
  });

  const res = await supabase.from('shipments').update({
    documents: {
      ...s.documents,
      is_icms_exempt: true,
      isIcmsExempt: true,
      icms_value: 0,
      valor_icms: 0,
      real_profit_data: {
        ...(s.documents?.real_profit_data || {}),
        isIcmsExempt: true,
        icmsDifference: 0
      }
    }
  }).eq('id', 'FEL-823').select();

  console.log('Update result:', res.error ? res.error : 'Success!');
  if (res.data) {
    console.log('Updated FEL-823:', res.data[0].documents?.is_icms_exempt, res.data[0].documents?.icms_value);
  }
}

testOne().catch(console.error);
