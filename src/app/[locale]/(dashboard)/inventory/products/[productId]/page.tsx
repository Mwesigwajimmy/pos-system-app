import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// We will create these components next
import { InventoryTrackingManager } from '@/components/inventory/InventoryTrackingManager';
import { SerialNumberManager } from '@/components/inventory/SerialNumberManager';
import { LotNumberManager } from '@/components/inventory/LotNumberManager';

async function getProductDetails(supabase: any, productId: string) {
    const { data: product, error } = await supabase.from('products')
        .select(`*, serial_numbers(*), lot_numbers(*)`)
        .eq('id', productId).single();
    if (error) notFound();
    return product;
}

export default async function ProductDetailsPage({ params }: { params: { productId: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const product = await getProductDetails(supabase, params.productId);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
                <p className="text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
            </div>
            
            <InventoryTrackingManager productId={product.id} currentMethod={product.inventory_tracking_method} />

            {product.inventory_tracking_method === 'SERIAL' && (
                <SerialNumberManager productId={product.id} serialNumbers={product.serial_numbers} />
            )}
            
            {product.inventory_tracking_method === 'LOT' && (
                <LotNumberManager productId={product.id} lots={product.lot_numbers} />
            )}
        </div>
    );
}