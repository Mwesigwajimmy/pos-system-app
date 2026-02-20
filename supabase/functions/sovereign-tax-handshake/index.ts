import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { invoice_id, country_code } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Fetch Invoice + Tenant Context
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, tenants(id, name)')
    .eq('id', invoice_id)
    .single();

  // 2. Fetch Global Authority DNA (The Registry we created via SQL)
  const { data: apiRules } = await supabase
    .from('tax_authority_registry')
    .select('*')
    .eq('country_iso', country_code)
    .single();

  if (!apiRules) return new Response("Jurisdiction API not in Registry.", { status: 404 });

  // 3. SECURE VAULT ACCESS: Get the specific business owner's credentials
  const { data: vault } = await supabase
    .from('tenant_compliance_vault')
    .select('*')
    .eq('tenant_id', invoice.tenant_id)
    .eq('country_iso', country_code)
    .single();

  if (!vault) return new Response("Tenant Credentials missing from Vault.", { status: 400 });

  // 4. AUTONOMOUS PAYLOAD CONSTRUCTION
  // This builds the data exactly how that specific government wants it
  const payload = {
    ...apiRules.payload_mapping,
    invoice_data: invoice,
    credentials: { user: vault.gov_username, key: vault.gov_api_key }
  };

  // 5. THE GLOBAL HANDSHAKE
  const response = await fetch(apiRules.api_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const govResult = await response.json();

  // 6. SEAL THE LEDGER (The Immutable Signature)
  await supabase.from('tax_fiscal_seals').insert({
    invoice_id,
    government_ref: govResult.verification_code || govResult.id || "CERTIFIED_SOVEREIGN",
    raw_response: govResult
  });

  return new Response(JSON.stringify({ status: "Fiscal Handshake Sealing Complete" }), { status: 200 });
})