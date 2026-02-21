import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ComplianceRiskDashboard from '@/components/compliance/ComplianceRiskDashboard';
import { AlertTriangle, ShieldAlert, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function RiskDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. CONTEXT RESOLUTION
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations ( name )
        `)
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Context Missing</AlertTitle>
                    <AlertDescription>No active organization resolved for risk monitoring.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                        Compliance Risk Matrix
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        High-level regulatory risk monitoring for: <span className="font-bold text-foreground underline decoration-orange-500/30 underline-offset-4">{entityName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg shadow-sm">
                    <ShieldAlert size={16} className="text-orange-600 animate-pulse" />
                    <span className="text-[10px] font-black text-orange-800 uppercase tracking-widest leading-none">Risk Guard v10.1</span>
                </div>
            </div>

            <ComplianceRiskDashboard />
        </div>
    );
}