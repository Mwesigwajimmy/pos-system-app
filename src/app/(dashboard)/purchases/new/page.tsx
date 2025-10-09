import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import CreatePOForm from "@/components/purchases/CreatePOForm";

// This is a Server Component that pre-fetches data for the form.
export default async function NewPurchaseOrderPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Fetch suppliers and products on the server for a fast initial load.
  const { data, error } = await supabase.rpc('get_po_form_data');

  if (error) {
    console.error("Error fetching form data:", error);
    // Handle error appropriately
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Create New Purchase Order</h1>
      <CreatePOForm
        suppliers={data?.suppliers || []}
        products={data?.products || []}
      />
    </div>
  );
}