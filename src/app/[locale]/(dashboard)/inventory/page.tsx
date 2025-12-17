import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { Boxes, Tags, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
// --- CORRECTION IS HERE ---
import CategoriesView from '@/components/inventory/CategoriesView';
import CompositesView from '@/components/inventory/CompositesView';
import { columns } from "@/components/inventory/columns";

/**
 * The main server component for the Inventory section.
 * It serves as a layout for different inventory-related views (Products, Categories, etc.)
 * and pre-fetches the initial data required for the primary products table to enable a
 * fast initial page load.
 */
export default async function InventoryPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Concurrently fetch initial data for the products table and the list of all categories.
  // This is more efficient than fetching them sequentially.
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.rpc('get_paginated_products', {
      p_page: 1,
      p_page_size: 15, // A reasonable default page size for initial load.
      p_search_text: null,
      p_business_entity_id: null,
    }),
    // FIX: Must select 'description' to match Category interface!
    supabase.from('categories').select('id, name, description'),
  ]);

  // Gracefully handle potential errors during data fetching.
  if (productsResult.error) {
    console.error("Error fetching initial products:", productsResult.error.message);
  }
  if (categoriesResult.error) {
    console.error("Error fetching categories:", categoriesResult.error.message);
  }

  const initialData = productsResult.data?.products ?? [];
  const totalCount = productsResult.data?.total_count ?? 0;
  const categories = categoriesResult.data ?? [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Command Center</h1>
        <Button variant="secondary" asChild>
          <Link href="/inventory/adjustments">New Stock Adjustment</Link>
        </Button>
      </div>

      <Tabs defaultValue="products" className="w-full">
        {/* The tab triggers provide clear, icon-led navigation. */}
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-3">
          <TabsTrigger value="products">
            <Boxes className="mr-2 h-4 w-4" /> All Products
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tags className="mr-2 h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="composites">
            <BookOpen className="mr-2 h-4 w-4" /> Composite Products
          </TabsTrigger>
        </TabsList>

        {/* Tab panel for the main Products data table */}
        <TabsContent value="products" className="mt-6">
          <InventoryDataTable
            columns={columns}
            initialData={initialData}
            totalCount={totalCount}
            categories={categories}
          />
        </TabsContent>

        {/* --- CORRECTION IS HERE --- */}
        {/* Tab panel for managing Categories */}
        <TabsContent value="categories" className="mt-6">
          <CategoriesView />
        </TabsContent>

        {/* --- CORRECTION IS HERE --- */}
        {/* Tab panel for managing Composite Products */}
        <TabsContent value="composites" className="mt-6">
          <CompositesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}