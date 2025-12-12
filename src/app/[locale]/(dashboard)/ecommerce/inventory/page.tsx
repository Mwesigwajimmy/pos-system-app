import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import Real Component
import { MultiWarehouseInventory, WarehouseStock } from '@/components/ecommerce/MultiWarehouseInventory';

// ----------------------------------------------------------------------
// 1. AUTH UTILITY
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// ----------------------------------------------------------------------
// 2. DATA FETCHING SERVICE
// ----------------------------------------------------------------------
async function getInventoryData(supabase: any): Promise<WarehouseStock[]> {
    /* 
       ENTERPRISE QUERY:
       We fetch the pivot table 'inventory_levels' and join related entities.
       We specifically calculate 'available' logic if not present in DB.
    */
    const { data, error } = await supabase
        .from('inventory_levels')
        .select(`
            id,
            total_quantity,
            reserved_quantity,
            reorder_point,
            tenant_id,
            products (
                name,
                sku
            ),
            warehouses (
                name,
                region,
                country_code
            )
        `)
        .order('total_quantity', { ascending: false }) // Show highest stock first
        .limit(500); // Performance limit

    if (error) {
        console.error("Inventory Fetch Error:", error.message);
        return [];
    }

    // ------------------------------------------------------------------
    // 3. DATA TRANSFORMATION
    // ------------------------------------------------------------------
    // Map complex nested objects to a flat, type-safe structure for the UI
    return data.map((item: any) => {
        // Safe access to joined relations
        const product = item.products || { name: 'Unknown Product', sku: 'UNK' };
        const warehouse = item.warehouses || { name: 'Unknown Warehouse', region: 'N/A', country_code: 'XX' };
        
        // Logic: Available = Total - Reserved
        const available = (item.total_quantity || 0) - (item.reserved_quantity || 0);

        return {
            id: item.id,
            warehouseName: warehouse.name,
            region: warehouse.region,
            countryCode: warehouse.country_code,
            sku: product.sku,
            productName: product.name,
            totalQuantity: item.total_quantity || 0,
            reservedQuantity: item.reserved_quantity || 0,
            availableQuantity: available,
            reorderPoint: item.reorder_point || 10,
            tenantId: item.tenant_id
        };
    });
}

// ----------------------------------------------------------------------
// 4. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function InventoryPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Auth Check
    await getCurrentUser(supabase);
    
    // 2. Fetch Data
    const inventoryData = await getInventoryData(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
                    <p className="text-muted-foreground">
                        Track stock levels, reservations, and reorder points across all warehouses.
                    </p>
                </div>
            </div>

            <MultiWarehouseInventory initialStock={inventoryData} />
        </div>
    );
}