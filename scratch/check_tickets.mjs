import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://smolfvbunrgqsgaazbpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sxTjQU5-isEN5iunM7VfOg_3LS8Vfa5';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTickets() {
  const { data: tickets, error } = await supabase.from('tickets').select('*');
  if (error) {
    console.error('Error fetching tickets:', error);
    return;
  }
  console.log(`Total tickets in Supabase: ${tickets?.length}`);
  console.log('Tickets:', JSON.stringify(tickets, null, 2));

  const { data: users } = await supabase.from('app_users').select('id, name, email');
  const dione = users?.filter(u => u.name?.toLowerCase().includes('dione') || u.email?.toLowerCase().includes('dione'));
  console.log('Users matching Dione:', dione);
}

checkTickets();
