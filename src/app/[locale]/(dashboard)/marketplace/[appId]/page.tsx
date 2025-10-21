// src/app/(dashboard)/marketplace/[appId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AppConnectionManager from "@/components/migration/AppConnectionManager"; // We will create this

async function getAppData(appId: string) {
    const supabase = createClient(cookies());
    const { data, error } = await supabase.from('app_marketplace').select(`
        *,
        app_installations ( is_connected, settings )
    `).eq('id', appId).single();

    if (error) notFound();
    return data;
}

export default async function AppDetailPage({ params }: { params: { appId: string } }) {
    const appData = await getAppData(params.appId);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground">
                <Link href="/marketplace" className="hover:underline">App Marketplace</Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground" aria-current="page">
                    {appData.name}
                </span>
            </nav>
            <AppConnectionManager app={appData} />
        </div>
    );
}