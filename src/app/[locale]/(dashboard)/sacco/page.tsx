import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// --- Enterprise Components (These contain the logic you sent previously) ---
import { BIAnalyticsDashboard } from '@/components/sacco/BIAnalyticsDashboard';
import { AgentMobilePortal } from '@/components/sacco/AgentMobilePortal';
import { DividendManager } from '@/components/sacco/DividendManager';
import { NotificationManager } from '@/components/sacco/NotificationManager';
import { SaccoReportsCenter } from '@/components/sacco/SaccoReportsCenter';
import { ShareLedgerTable } from '@/components/sacco/ShareLedgerTable';
import { KYCManager } from '@/components/sacco/KYCManager';
import { AdminBoard } from '@/components/sacco/AdminBoard';

export const metadata = {
  title: "SACCO Operations Dashboard",
  description: "Overview of cooperative performance, member activities, and financial health.",
};

export default async function SaccoDashboardPage() {
    // 1. Server-Side Authentication & Tenant Resolution
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/auth/login');
    }

    // Securely determine context
    const tenantId = user.user_metadata?.tenant_id || user.id;

    // 2. Render the Full Dashboard
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

            {/* 3. Executive BI Dashboard (The KPI Cards) */}
            {/* This component handles the 'fetchDashboardKPIs' logic internally now for better performance */}
            <div className="w-full">
                <BIAnalyticsDashboard tenantId={tenantId} />
            </div>

            <Separator />

            {/* 4. Operations Command Center */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Main Operations Area (3/4 Width) */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="operations" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                            <TabsTrigger value="operations">Field Ops</TabsTrigger>
                            <TabsTrigger value="shares">Shares & Dividends</TabsTrigger>
                            <TabsTrigger value="kyc">Member KYC</TabsTrigger>
                            <TabsTrigger value="reports">Reports</TabsTrigger>
                        </TabsList>

                        {/* Tab: Field Operations */}
                        <TabsContent value="operations" className="space-y-4 animate-in fade-in-50">
                            <AgentMobilePortal tenantId={tenantId} agentId={user.id} />
                        </TabsContent>

                        {/* Tab: Shares & Dividends */}
                        <TabsContent value="shares" className="space-y-4 animate-in fade-in-50">
                            <div className="grid gap-6">
                                <DividendManager tenantId={tenantId} />
                                <ShareLedgerTable tenantId={tenantId} />
                            </div>
                        </TabsContent>

                        {/* Tab: Member KYC */}
                        <TabsContent value="kyc" className="space-y-4 animate-in fade-in-50">
                            <KYCManager tenantId={tenantId} />
                        </TabsContent>

                        {/* Tab: Reports */}
                        <TabsContent value="reports" className="space-y-4 animate-in fade-in-50">
                            <SaccoReportsCenter tenantId={tenantId} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar Tools (1/4 Width) */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Communication Widget */}
                    <NotificationManager tenantId={tenantId} />
                    
                    {/* Admin Actions Widget */}
                    <AdminBoard tenantId={tenantId} />
                </div>
            </div>
        </div>
    );
}