import { supabase } from '../lib/supabase';

async function check() {
  const { data, error } = await supabase.from('alerts').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

check();
