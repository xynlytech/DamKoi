const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('products').select('id, title, price_changed_at, price_change_delta_pct').order('price_change_delta_pct', { ascending: true, nullsFirst: false }).limit(5);
  console.log(data);
}
run();
