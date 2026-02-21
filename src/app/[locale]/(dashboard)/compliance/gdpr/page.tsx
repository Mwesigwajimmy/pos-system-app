import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GDPRDataRequestsTable from '@/components/compliance/GDPRDataRequestsTable';
import { FileLock2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function GdprPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTHENTICATION & SESSION VERIFICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. SOVEREIGN CONTEXT RESOLUTION
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations ( name )
        `)
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Privacy Perimeter Access Denied</AlertTitle>
                    <AlertDescription>No active business context resolved for DSAR processing.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            {/* Regulatory Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <FileLock2 className="w-8 h-8 text-slate-700" />
                        GDPR Data Requests (DSAR)
                    </h1>
                    <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-widest leading-none italic">
                        Data Sovereignty Management for: <span className="text-primary">{entityName}</span>
                    </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter">Zero-Knowledge Encrypted</span>
                </div>
            </div>

            {/* Main DSAR Interface */}
            <GDPRDataRequestsTable businessId={profile.business_id} />

            {/* Privacy Standards Footer */}
            <div className="mt-12 flex justify-between items-center border-t pt-4 opacity-40 grayscale">
                <p className="text-[9px] font-bold uppercase tracking-widest">GDPR / CCPA / LGPD Compliant Workflow</p>
                <div className="text-[10px] font-mono">TRACE-ID: {profile.business_id.substring(0,8).toUpperCase()}</div>
            </div>
        </div>
    );
}