import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { InventoryTrackingManager } from '@/components/inventory/InventoryTrackingManager';
import { SerialNumberManager } from '@/components/inventory/SerialNumberManager';
import { LotNumberManager } from '@/components/inventory/LotNumberManager';
import { ReorderPointManager } from '@/components/inventory/ReorderPointManager';

// Fetches the core details for a single product
async function getProductDetails(supabase: any, productId: string) {
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            sku,
            inventory_tracking_method,
            reorder_point,
            preferred_vendor_id,
            serial_numbers ( id, serial_number, status ),
            lot_numbers ( id, lot_number, expiry_date, quantity )
        `)
        .eq('id', productId)
        .single();
    
    // If there's an error or no product is found, return null
    if (error || !product) {
        console.error("Error fetching product details:", error);
        return null;
    }

    return product;
}

// Fetches vendors for the ReorderPointManager
async function getVendors(supabase: any) {
    const { data } = await supabase.from('vendors').select('id, name');
    return data || [];
}

export default async function ProductDetailsPage({ params }: { params: { productId: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch both product and vendors in parallel for efficiency
    const [product, vendors] = await Promise.all([
        getProductDetails(supabase, params.productId),
        getVendors(supabase)
    ]);

    // --- THIS IS THE FIX ---
    // If the product was not found, stop execution and show the not-found page.
    if (!product) {
        notFound();
    }
    // --- END OF FIX ---

    // From this point onwards, TypeScript knows that 'product' is a valid object and not void/null.
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
                <p className="text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
            </div>
            
            <InventoryTrackingManager productId={product.id} currentMethod={product.inventory_tracking_method} />
            
            <ReorderPointManager product={product} vendors={vendors} />

            {product.inventory_tracking_method === 'SERIAL' && <SerialNumberManager productId={product.id} serialNumbers={product.serial_numbers || []} />}
            {product.inventory_tracking_method === 'LOT' && <LotNumberManager productId={product.id} lots={product.lot_numbers || []} />}
        </div>
    );
}