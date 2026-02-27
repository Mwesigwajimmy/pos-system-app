import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

// --- CORE LOGIC COMPONENTS ---
import { InventoryTrackingManager, TrackingMethod } from '@/components/inventory/InventoryTrackingManager';
import { SerialNumberManager, SerialNumberEntry } from '@/components/inventory/SerialNumberManager';
import { LotNumberManager, LotEntry } from '@/components/inventory/LotNumberManager';
import { ReorderPointManager } from '@/components/inventory/ReorderPointManager';

// --- UI COMPONENTS ---
import { 
  Package, 
  ShieldCheck, 
  Zap, 
  Activity, 
  AlertCircle, 
  Fingerprint 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

// --- INTERFACES ---
interface ProductDB {
  id: string;
  name: string;
  sku: string;
  inventory_tracking_method: TrackingMethod; 
  reorder_point: number;
  reorder_quantity: number;
  preferred_vendor_id: string;
  status: string;
  serial_numbers: { id: string; serial_number: string; status: string; warehouse_location?: string }[];
  lot_numbers: { id: string; lot_number: string; expiry_date: string; quantity: number; status: string }[];
}

// 1. DATA ACCESS: Scoped to Business ID for Security
async function getProductDetails(supabase: any, productId: string, businessId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, sku, inventory_tracking_method, reorder_point, preferred_vendor_id, reorder_quantity, status,
      serial_numbers ( id, serial_number, status, warehouse_location ),
      lot_numbers ( id, lot_number, expiry_date, quantity, status )
    `)
    .eq('id', productId)
    .eq('business_id', businessId)
    .single();

  if (error || !data) return null;
  return data as ProductDB;
}

async function getVendors(supabase: any, businessId: string) {
  const { data } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('business_id', businessId);
  return data || [];
}

export default async function ProductDetailsPage({ params }: { params: { productId: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. HARD SECURITY AUTH GUARD
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // 2. MASTER IDENTITY RESOLUTION
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name, active_organization_slug")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return (
        <div className="p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Context Missing</AlertTitle>
                <AlertDescription>Your account is not linked to a valid business entity.</AlertDescription>
            </Alert>
        </div>
    );
  }

  const businessId = profile.business_id;
  const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

  // 3. PARALLEL DATA FETCHING
  const [product, vendors] = await Promise.all([
    getProductDetails(supabase, params.productId, businessId),
    getVendors(supabase, businessId)
  ]);

  if (!product) {
    notFound();
  }

  // 4. NEURAL DATA MAPPING
  const serialData: SerialNumberEntry[] = (product.serial_numbers || []).map(s => ({
    id: s.id,
    serialCode: s.serial_number,
    productName: product.name,
    sku: product.sku,
    location: s.warehouse_location || "N/A",
    status: s.status
  }));

  const lotData: LotEntry[] = (product.lot_numbers || []).map(l => ({
    id: l.id,
    lotCode: l.lot_number,
    productName: product.name,
    expiryDate: l.expiry_date,
    quantity: l.quantity,
    status: l.status || 'active'
  }));

  return (
    <div className="flex-1 space-y-6 p-6 md:p-10 pt-6 animate-in fade-in duration-500 bg-slate-50/30">
      
      {/* --- Header Section (Cleaned like your screenshot) --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-900 rounded-lg text-white">
                <Package size={20} />
             </div>
             <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {product.name}
             </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Fingerprint size={14} className="text-slate-400" />
            SKU: {product.sku || 'N/A'} • {entityName}
          </p>
        </div>

        {/* Status Badges (Cleaned and professional) */}
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                <ShieldCheck size={14} />
                Live System Sync
            </div>
            <Badge className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 text-xs rounded-md">
                {product.status || 'ACTIVE'}
            </Badge>
        </div>
      </div>

      {/* --- Main Management Grid --- */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Core Configuration */}
        <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <h4 className="text-sm font-semibold text-slate-900 mb-4">Tracking Method</h4>
                <InventoryTrackingManager 
                    productId={product.id} 
                    currentMethod={product.inventory_tracking_method} 
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <ReorderPointManager 
                    product={product} 
                    vendors={vendors} 
                />
            </div>
        </div>

        {/* Right Column: Logistics Content */}
        <div className="lg:col-span-8 space-y-6">
            {product.inventory_tracking_method === 'SERIAL' && (
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b py-4">
                            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Fingerprint size={16} /> Individual Asset Tracking
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <SerialNumberManager data={serialData} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {product.inventory_tracking_method === 'LOT' && (
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b py-4">
                            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Activity size={16} /> Batch & Expiry Ledger
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <LotNumberManager data={lotData} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {product.inventory_tracking_method === 'SIMPLE' && (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
                    <Activity size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-600">
                        Standard Inventory Sync Active
                    </p>
                    <p className="text-xs text-slate-400 mt-1">No serialized or batch tracking required for this asset.</p>
                </div>
            )}
        </div>
      </div>

      {/* --- Footer (Simple and clean) --- */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-slate-300" />
            Product Lifecycle Security v10.2
          </div>
          <div className="font-mono bg-slate-100 px-2 py-0.5 rounded">ID_HASH: {product.id.substring(0,12).toUpperCase()}</div>
      </div>
    </div>
  );
}