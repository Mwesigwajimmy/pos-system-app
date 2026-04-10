// supabase/functions/forensic-fx-sync/index.ts
import { createClient } from "supabase"

const API_KEY = Deno.env.get('EXCHANGE_RATE_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  // Use Service Role to bypass RLS for internal system sync
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    // 1. DYNAMIC DISCOVERY: Find every currency currently in use by your users
    // This makes the system "Worldwide Ready" automatically.
    const { data: activeInvoices } = await supabase
      .from('invoices')
      .select('currency')
      .neq('balance_due', 0); // Only care about currencies where money is still owed

    const currenciesToSync = [...new Set(activeInvoices?.map(i => i.currency))];
    
    // 2. MULTI-CURRENCY ENGINE
    const syncResults = [];
    for (const baseCcy of currenciesToSync) {
      if (!baseCcy || baseCcy === 'UGX') continue; // Skip local currency

      const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCcy}`);
      const marketData = await response.json();

      if (marketData.result === 'success') {
        // Update both UGX and USD pairs (Enterprise Standard)
        const updates = [
          { base_currency: baseCcy, target_currency: 'UGX', rate: marketData.conversion_rates['UGX'] },
          { base_currency: baseCcy, target_currency: 'USD', rate: marketData.conversion_rates['USD'] }
        ];

        const { error } = await supabase
          .from('exchange_rates')
          .upsert(updates, { onConflict: 'base_currency,target_currency' });

        syncResults.push({ currency: baseCcy, status: error ? 'Error' : 'Synced' });
      }
    }

    return new Response(JSON.stringify({ message: "Forensic Sync Complete", results: syncResults }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})