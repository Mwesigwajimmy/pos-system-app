// src/app/(dashboard)/settings/migration/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, UploadCloud, Users, ShoppingBag, Truck } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ImportWizard from '@/components/migration/ImportWizard'; // We will create this component

export const metadata: Metadata = {
  title: 'Data Migration Center',
  description: 'Import your existing business data from spreadsheets, QuickBooks, Xero, and other systems.',
};

export default function MigrationHubPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground">
                <Link href="/settings" className="hover:underline">Settings</Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground" aria-current="page">Data Migration</span>
            </nav>
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Data Migration Center</h1>
                <p className="text-muted-foreground mt-1">
                    Seamlessly import your existing business data to get up and running in minutes.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary"/>Products & Inventory</CardTitle>
                        <CardDescription>Bulk-upload or update your entire product catalog, including variants, pricing, and initial stock levels.</CardDescription>
                    </CardHeader>
                    <ImportWizard
                        dataType="products"
                        rpcName="bulk_upsert_products"
                        templateUrl="/templates/products_template.csv"
                        requiredColumns={['sku', 'product_name', 'variant_name', 'price', 'stock']}
                    />
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Customers</CardTitle>
                        <CardDescription>Import your customer list with names, contact details, and other relevant information.</CardDescription>
                    </CardHeader>
                    <ImportWizard
                        dataType="customers"
                        rpcName="bulk_upsert_customers"
                        templateUrl="/templates/customers_template.csv"
                        requiredColumns={['name', 'email', 'phone_number']}
                    />
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary"/>Suppliers</CardTitle>
                        <CardDescription>Import your list of suppliers, including contact information and addresses.</CardDescription>
                    </CardHeader>
                    <ImportWizard
                        dataType="suppliers"
                        rpcName="bulk_upsert_suppliers"
                        templateUrl="/templates/suppliers_template.csv"
                        requiredColumns={['name', 'email', 'phone_number']}
                    />
                </Card>
            </div>
        </div>
    );
}