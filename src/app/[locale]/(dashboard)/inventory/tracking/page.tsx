import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// FIX: Using Named Imports
import { LotNumberManager, LotEntry } from "@/components/inventory/LotNumberManager";
import { SerialNumberManager, SerialNumberEntry } from "@/components/inventory/SerialNumberManager";

export default async function TrackingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const [lotsRes, serialsRes] = await Promise.all([
    supabase.from('lot_numbers').select('*, products(name, sku)').order('expiry_date', { ascending: true }),
    supabase.from('serial_numbers').select('*, products(name, sku)').order('created_at', { ascending: false })
  ]);

  const lots: LotEntry[] = (lotsRes.data || []).map((l: any) => ({
    id: l.id,
    lotCode: l.lot_number, // Ensure this matches your DB column
    productName: l.products?.name,
    expiryDate: l.expiry_date,
    quantity: l.quantity, // Ensure this matches your DB column (quantity or quantity_on_hand)
    status: l.status
  }));

  const serials: SerialNumberEntry[] = (serialsRes.data || []).map((s: any) => ({
    id: s.id,
    serialCode: s.serial_number, // Ensure this matches your DB column
    productName: s.products?.name,
    sku: s.products?.sku,
    location: s.warehouse_location,
    status: s.status
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Global Traceability</h2>
      <Tabs defaultValue="lots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lots">Lots & Batches</TabsTrigger>
          <TabsTrigger value="serials">Serial Numbers</TabsTrigger>
        </TabsList>
        <TabsContent value="lots">
          <LotNumberManager data={lots} />
        </TabsContent>
        <TabsContent value="serials">
          <SerialNumberManager data={serials} />
        </TabsContent>
      </Tabs>
    </div>
  );
}