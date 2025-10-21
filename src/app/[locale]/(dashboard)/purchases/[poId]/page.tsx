// src/app/(dashboard)/purchases/[poId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PurchaseOrderDetailView from "@/components/purchases/PurchaseOrderDetailView"; // We will create this next
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type PageProps = {
  params: { poId: string };
};

// This server component pre-fetches the initial PO data.
export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const poId = Number(params.poId);
  if (isNaN(poId)) {
    notFound();
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Fetch initial data on the server
  const { data: initialData, error } = await supabase
    .rpc('get_purchase_order_details', { p_po_id: poId });

  if (error || !initialData) {
    console.error("Error fetching PO details:", error);
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
        <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <Link href="/purchases" className="hover:underline">Purchases</Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="font-medium text-foreground" aria-current="page">
                Purchase Order #{poId}
            </span>
        </nav>
        
        <PurchaseOrderDetailView initialData={initialData} poId={poId} />
    </div>
  );
}