import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testTicketColumns() {
  // Try inserting with new fields
  const testObj = {
    id: 'TCK-TEST-COLS',
    title: 'Test Cols',
    description: 'Test',
    status: 'Aberto',
    priority: 'Média',
    created_by_id: 'USR-001',
    assigned_to_id: 'USR-001',
    created_at: new Date().toISOString(),
    history: [],
    started_at: new Date().toISOString(),
    resolved_at: new Date().toISOString()
  };

  const { error } = await supabase.from('tickets').insert(testObj);
  if (error) {
    console.log('Columns started_at / resolved_at error:', error.message);
  } else {
    console.log('Columns started_at / resolved_at exist and accepted!');
    await supabase.from('tickets').delete().eq('id', 'TCK-TEST-COLS');
  }
}

testTicketColumns();
