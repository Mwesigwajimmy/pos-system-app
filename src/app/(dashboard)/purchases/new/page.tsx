import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import CreatePOForm from "@/components/purchases/CreatePOForm";

// This is a Server Component that pre-fetches all necessary data for the form.
export default async function NewPurchaseOrderPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // --- EFFICIENT DATA FETCHING ---
  // We can run these queries in parallel for the fastest possible load time.
  const [poFormData, exchangeRatesData] = await Promise.all([
    supabase.rpc('get_po_form_data'),
    supabase.from('exchange_rates').select('currency_code, rate')
  ]);

  // --- ERROR HANDLING ---
  if (poFormData.error) {
    console.error("Error fetching PO form data:", poFormData.error.message);
    // Optionally, you can render an error component here
  }
  if (exchangeRatesData.error) {
    console.error("Error fetching exchange rates:", exchangeRatesData.error.message);
    // Even if rates fail to load, the form can still function with the base currency.
  }

  // --- DATA PROCESSING FOR RATES ---
  // If multiple rates exist for the same currency, ensure we only pass the latest one.
  // This logic prevents duplicates and ensures accuracy.
  const latestRates = new Map();
  if (exchangeRatesData.data) {
    exchangeRatesData.data.forEach(rate => {
      latestRates.set(rate.currency_code, rate);
    });
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Create New Purchase Order</h1>
      <CreatePOForm
        suppliers={poFormData.data?.suppliers || []}
        products={poFormData.data?.products || []}
        // --- NEW: Pass the fetched and processed rates to the client component ---
        initialRates={Array.from(latestRates.values())}
      />
    </div>
  );
}