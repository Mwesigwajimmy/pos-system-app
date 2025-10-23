import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// --- Mock Component Placeholder for UI structure ---
const OnlineProductManager = ({ products }: { products: any[] }) => (
    <div className="p-10 border-2 border-dashed rounded-lg">
        <h3 className="text-center font-semibold">OnlineProductManager Component</h3>
        <p className="text-center text-sm text-muted-foreground">This will be a data table for managing online product visibility and details.</p>
        <pre className="mt-4 text-xs bg-muted p-2 rounded">{JSON.stringify(products, null, 2)}</pre>
    </div>
);
// --- End Mock Component ---

// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    return user;
}

// Define the type for the data returned by the Supabase query
interface ProductFromQuery {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock_quantity: number;
    online_products: {
        is_visible: boolean;
        online_title: string;
        slug: string;
    }[];
}

/**
 * Fetches all products from inventory and joins them with their online-specific data.
 * @param supabase - The Supabase client instance.
 * @returns A list of products with their online status.
 */
async function getManagableProducts(supabase: any) {
    const { data, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            sku,
            price,
            stock_quantity,
            online_products (
                id,
                is_visible,
                slug,
                online_title
            )
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching manageable products:", error);
        return [];
    }

    // Reshape the data to be flatter and easier to work with in the data table
    // --- THIS IS THE FIXED LINE ---
    return data.map((p: ProductFromQuery) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stock_quantity: p.stock_quantity,
        is_online: p.online_products.length > 0,
        is_visible: p.online_products[0]?.is_visible || false,
        online_title: p.online_products[0]?.online_title,
        slug: p.online_products[0]?.slug,
    }));
}

export default async function OnlineProductManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await getCurrentUser(supabase); // Just for auth check
    
    const products = await getManagableProducts(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Online Products</h2>
                    <p className="text-muted-foreground">
                        Manage which products are available on your online storefront.
                    </p>
                </div>
            </div>

            <OnlineProductManager products={products} />
        </div>
    );
}