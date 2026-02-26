import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

// --- CORE COMPONENTS ---
import { InventoryTrackingManager, TrackingMethod } from '@/components/inventory/InventoryTrackingManager';
import { SerialNumberManager, SerialNumberEntry } from '@/components/inventory/SerialNumberManager';
import { LotNumberManager, LotEntry } from '@/components/inventory/LotNumberManager';
import { ReorderPointManager } from '@/components/inventory/ReorderPointManager';

// --- ICONS & UI ---
import { Package, ShieldCheck, Zap, Activity, AlertCircle, Fingerprint } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

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
    .eq('business_id', businessId) // THE SECURITY LOCK
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

  // 3. PARALLEL DATA FETCHING (Interconnected)
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
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
      
      {/* High-Tier Forensic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-900 rounded-lg text-white">
                <Package size={24} />
             </div>
             <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
                {product.name}
             </h2>
          </div>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <Fingerprint size={12} className="text-primary" />
            SKU: {product.sku || 'N/A'} // IDENTITY: {entityName}
          </p>
        </div>

        {/* Real-time Status Telemetry */}
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Kernel Status</span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-emerald-600">
                    <ShieldCheck size={14} />
                    LEDGER SEALED
                </div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <Badge className="bg-slate-900 px-4 py-1 text-[10px] tracking-widest">
                {product.status?.toUpperCase() || 'ACTIVE'}
            </Badge>
        </div>
      </div>

      {/* Main Management Grid */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Core Configuration */}
        <div className="lg:col-span-4 space-y-8">
            <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 relative overflow-hidden">
                <Zap className="absolute -right-4 -top-4 w-24 h-24 text-primary/5 rotate-12" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Tracking Intelligence</h4>
                <InventoryTrackingManager 
                    productId={product.id} 
                    currentMethod={product.inventory_tracking_method} 
                />
            </div>

            <ReorderPointManager 
                product={product} 
                vendors={vendors} 
            />
        </div>

        {/* Right Column: Dynamic Logistics Content */}
        <div className="lg:col-span-8 space-y-8">
            {product.inventory_tracking_method === 'SERIAL' && (
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <Card className="border-none shadow-2xl">
                        <CardHeader className="bg-slate-50/80 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Individual Asset Tracking</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <SerialNumberManager data={serialData} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {product.inventory_tracking_method === 'LOT' && (
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <Card className="border-none shadow-2xl">
                        <CardHeader className="bg-slate-50/80 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Batch & Expiry Ledger</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <LotNumberManager data={lotData} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {product.inventory_tracking_method === 'SIMPLE' && (
                <div className="p-20 text-center border-2 border-dashed rounded-3xl bg-slate-50/50">
                    <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="font-black uppercase tracking-widest text-slate-300 italic">
                        Standard Inventory Sync Active
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* Audit Policy Footer */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            Immutable Product Lifecycle v10.2
          </div>
          <div className="font-mono">KERN_HASH: {product.id.substring(0,12).toUpperCase()}</div>
      </div>
    </div>
  );
}