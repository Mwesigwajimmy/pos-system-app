// src/app/(dashboard)/marketplace/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { memo } from 'react';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, LayoutGrid } from "lucide-react";

// --- 1. Type Definitions ---

// Define the shape of our data for type safety and clarity.
type AppInstallation = { is_connected: boolean };
type MarketplaceApp = {
    id: string;
    name: string;
    category: string;
    description: string;
    logo_url: string | null;
    app_installations: AppInstallation[] | AppInstallation | null; // Supabase can return an array or a single object
};

// --- 2. Data Fetching Logic ---

/**
 * Server-side function to fetch all marketplace apps and their installation status for the current user.
 * Throws an error that will be caught by the nearest `error.js` boundary.
 */
async function getMarketplaceData(): Promise<MarketplaceApp[]> {
    const supabase = createClient(cookies());
    const { data, error } = await supabase.from('app_marketplace').select(`
        id, name, category, description, logo_url,
        app_installations ( is_connected )
    `);
    
    if (error) {
        console.error("Marketplace fetch error:", error.message);
        throw new Error("Failed to load marketplace apps. Please try again later.");
    }

    return data || [];
}

// --- 3. UI Sub-components (for Clarity and Reusability) ---

const MarketplaceHeader = memo(() => (
    <header>
        <h1 className="text-3xl font-bold tracking-tight">App Marketplace</h1>
        <p className="text-muted-foreground mt-1">
            Extend the power of your business by connecting with the tools you love.
        </p>
    </header>
));
MarketplaceHeader.displayName = 'MarketplaceHeader';

const AppCard = memo(({ app }: { app: MarketplaceApp }) => {
    // Supabase returns a one-to-many relationship as an array. We only care if there is at least one connected installation.
    const installation = Array.isArray(app.app_installations) ? app.app_installations[0] : app.app_installations;
    const isConnected = installation?.is_connected ?? false;

    return (
        <Card key={app.id} className="flex flex-col transition-transform transform hover:-translate-y-1">
            <CardHeader className="flex-row items-start gap-4">
                {app.logo_url ? (
                    <Image src={app.logo_url} alt={`${app.name} Logo`} width={48} height={48} className="rounded-lg border" />
                ) : (
                    <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center">
                        <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
                <div>
                    <CardTitle>{app.name}</CardTitle>
                    <CardDescription>{app.category}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{app.description}</p>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/marketplace/${app.id}`}>
                        {isConnected ? 'Manage Integration' : 'View Details'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
});
AppCard.displayName = 'AppCard';

const EmptyState = memo(() => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-20">
        <LayoutGrid className="h-16 w-16 mb-4 text-gray-400" />
        <h3 className="text-2xl font-semibold text-foreground">Marketplace is Empty</h3>
        <p className="mt-2 max-w-md">There are currently no apps available in the marketplace. Please check back later as we are always adding new integrations.</p>
    </div>
));
EmptyState.displayName = 'EmptyState';


// --- 4. Main Page Component ---

export default async function MarketplacePage() {
    const apps = await getMarketplaceData();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <MarketplaceHeader />
            
            {apps.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map(app => <AppCard key={app.id} app={app} />)}
                </div>
            )}
        </div>
    );
}