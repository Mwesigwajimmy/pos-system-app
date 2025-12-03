import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// Named Imports
import { InventoryTrackingManager, TrackingMethod } from '@/components/inventory/InventoryTrackingManager';
import { SerialNumberManager, SerialNumberEntry } from '@/components/inventory/SerialNumberManager';
import { LotNumberManager, LotEntry } from '@/components/inventory/LotNumberManager';
import { ReorderPointManager } from '@/components/inventory/ReorderPointManager';

// Type matching the Database Schema exactly
interface ProductDB {
  id: string;
  name: string;
  sku: string;
  // This union type MUST match what InventoryTrackingManager expects
  inventory_tracking_method: TrackingMethod; 
  reorder_point: number;
  reorder_quantity: number;
  preferred_vendor_id: string;
  serial_numbers: { id: string; serial_number: string; status: string; warehouse_location?: string }[];
  lot_numbers: { id: string; lot_number: string; expiry_date: string; quantity: number; status: string }[];
}

async function getProductDetails(supabase: any, productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, sku, inventory_tracking_method, reorder_point, preferred_vendor_id, reorder_quantity,
      serial_numbers ( id, serial_number, status, warehouse_location ),
      lot_numbers ( id, lot_number, expiry_date, quantity, status )
    `)
    .eq('id', productId)
    .single();

  if (error || !data) return null;
  return data as ProductDB;
}

async function getVendors(supabase: any) {
  const { data } = await supabase.from('vendors').select('id, name');
  return data || [];
}

export default async function ProductDetailsPage({ params }: { params: { productId: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const [product, vendors] = await Promise.all([
    getProductDetails(supabase, params.productId),
    getVendors(supabase)
  ]);

  if (!product) {
    notFound();
  }

  // Map Data for Sub-Components
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

  const reorderConfig = {
    id: product.id,
    name: product.name,
    reorder_point: product.reorder_point,
    reorder_quantity: product.reorder_quantity,
    preferred_vendor_id: product.preferred_vendor_id
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
        <p className="text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
      </div>

      {/* 
        This will now work because 'inventory_tracking_method' in 'ProductDB'
        exactly matches 'TrackingMethod' in the component props.
      */}
      <InventoryTrackingManager 
        productId={product.id} 
        currentMethod={product.inventory_tracking_method} 
      />

      <ReorderPointManager 
        product={reorderConfig} 
        vendors={vendors} 
      />

      {product.inventory_tracking_method === 'SERIAL' && (
        <div className="space-y-4">
           <h3 className="text-lg font-medium">Serial Numbers</h3>
           <SerialNumberManager data={serialData} />
        </div>
      )}

      {product.inventory_tracking_method === 'LOT' && (
        <div className="space-y-4">
           <h3 className="text-lg font-medium">Batch / Lot Numbers</h3>
           <LotNumberManager data={lotData} />
        </div>
      )}
    </div>
  );
}