import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from 'lucide-react';

// --- Enterprise Component Imports (Fixed based on Export Types) ---

// 1. Default Imports (For components using 'export default function ...')
import BIAnalyticsDashboard from '@/components/sacco/BIAnalyticsDashboard';
import NotificationManager from '@/components/sacco/NotificationManager';
import SaccoReportsCenter from '@/components/sacco/SaccoReportsCenter';
import ShareLedgerTable from '@/components/sacco/ShareLedgerTable';
import KYCManager from '@/components/sacco/KYCManager';
import AdminBoard from '@/components/sacco/AdminBoard';

// 2. Named Imports (For components using 'export function ...')
import { AgentMobilePortal } from '@/components/sacco/AgentMobilePortal';
import { DividendManager } from '@/components/sacco/DividendManager';


export const metadata = {
  title: "SACCO Operations Dashboard",
  description: "Overview of cooperative performance, member activities, and financial health.",
};

export default async function SaccoDashboardPage() {
    // 1. Server-Side Authentication & Tenant Resolution
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error } = await supabase.auth.getUser();

    // Security Guard: Strict redirect if session is invalid
    if (error || !user) {
        redirect('/auth/login');
    }

    // 2. Securely determine Tenant Context
    // Priority: App Metadata (Admin set) -> User Metadata (Signup set)
    const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

    if (!tenantId) {
        return (
            <div className="p-8 text-center border-l-4 border-red-500 bg-red-50 m-6 rounded shadow-sm">
                <h2 className="text-xl font-bold text-red-800">Organization Context Missing</h2>
                <p className="text-red-700 mt-2">
                    Your account is not linked to a registered SACCO Organization. 
                    Please contact system administration to complete your onboarding.
                </p>
            </div>
        );
    }

    // 3. Render the Full Dashboard
    return (
        <div className="container mx-auto py-6 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">SACCO & Co-operative Dashboard</h1>
                <p className="text-muted-foreground">
                    Real-time overview of active members, share capital, savings balance, and loan portfolio.
                </p>
            </div>

            <Separator />

            {/* 4. Executive BI Dashboard (The KPI Cards) */}
            <section className="w-full">
                <Suspense fallback={
                    <div className="flex h-40 items-center justify-center bg-slate-50 border rounded-lg border-dashed">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading Analytics...</span>
                    </div>
                }>
                    <BIAnalyticsDashboard tenantId={tenantId} />
                </Suspense>
            </section>

            <Separator />

            {/* 5. Operations Command Center */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Main Operations Area (3/4 Width) */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="operations" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-slate-100">
                            <TabsTrigger value="operations">Field Ops</TabsTrigger>
                            <TabsTrigger value="shares">Shares & Dividends</TabsTrigger>
                            <TabsTrigger value="kyc">Member KYC</TabsTrigger>
                            <TabsTrigger value="reports">Reports</TabsTrigger>
                        </TabsList>

                        {/* Tab: Field Operations */}
                        <TabsContent value="operations" className="space-y-4 animate-in fade-in-50 mt-4">
                            <div className="bg-white rounded-lg border shadow-sm p-1">
                                {/* AgentPortal is a Named Export */}
                                <AgentMobilePortal tenantId={tenantId} agentId={user.id} />
                            </div>
                        </TabsContent>

                        {/* Tab: Shares & Dividends */}
                        <TabsContent value="shares" className="space-y-4 animate-in fade-in-50 mt-4">
                            <div className="grid gap-6">
                                {/* DividendManager is a Named Export */}
                                <DividendManager tenantId={tenantId} />
                                
                                <div className="border rounded-lg p-4 bg-white shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4">Share Capital Ledger</h3>
                                    {/* ShareLedgerTable is a Default Export */}
                                    <ShareLedgerTable tenantId={tenantId} />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab: Member KYC */}
                        <TabsContent value="kyc" className="space-y-4 animate-in fade-in-50 mt-4">
                            {/* KYCManager is a Default Export */}
                            <KYCManager tenantId={tenantId} />
                        </TabsContent>

                        {/* Tab: Reports */}
                        <TabsContent value="reports" className="space-y-4 animate-in fade-in-50 mt-4">
                            {/* SaccoReportsCenter is a Default Export */}
                            <SaccoReportsCenter tenantId={tenantId} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar Tools (1/4 Width) */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Communication Widget */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                        {/* NotificationManager is a Default Export */}
                        <NotificationManager tenantId={tenantId} />
                    </div>
                    
                    {/* Admin Actions Widget */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                        {/* AdminBoard is a Default Export */}
                        <AdminBoard tenantId={tenantId} />
                    </div>
                </div>
            </div>
        </div>
    );
}