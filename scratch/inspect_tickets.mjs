import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTicketsTable() {
  // Let's test a dry run or inspect columns and constraints
  const { data: testFetch, error: fetchErr } = await supabase.from('tickets').select('*').limit(1);
  console.log('Sample row from tickets:', testFetch?.[0]);

  // Try creating a test ticket with Dione's user ID (USR-101)
  const testTicket = {
    id: 'TCK-TEST-999',
    title: 'Teste Investigação',
    description: 'Teste',
    status: 'Aberto',
    priority: 'Média',
    created_by_id: 'USR-101',
    assigned_to_id: 'USR-001',
    created_at: new Date().toISOString(),
    history: []
  };

  const { data: insertData, error: insertErr } = await supabase.from('tickets').insert(testTicket).select();
  if (insertErr) {
    console.error('Insert error with USR-101:', insertErr);
  } else {
    console.log('Insert success with USR-101! Cleaning up test ticket...');
    await supabase.from('tickets').delete().eq('id', 'TCK-TEST-999');
  }

  // Also check if assigned_to_id can be null or empty string
  const testEmptyAssignee = {
    id: 'TCK-TEST-998',
    title: 'Teste Assignee Vazio',
    description: 'Teste',
    status: 'Aberto',
    priority: 'Média',
    created_by_id: 'USR-101',
    assigned_to_id: '',
    created_at: new Date().toISOString(),
    history: []
  };
  const { error: emptyErr } = await supabase.from('tickets').insert(testEmptyAssignee);
  if (emptyErr) {
    console.error('Insert error with empty assigned_to_id:', emptyErr);
  } else {
    console.log('Insert success with empty assigned_to_id! Cleaning up...');
    await supabase.from('tickets').delete().eq('id', 'TCK-TEST-998');
  }
}

inspectTicketsTable();
