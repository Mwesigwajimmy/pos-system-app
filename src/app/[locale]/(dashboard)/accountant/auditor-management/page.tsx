import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuditorManagement } from '@/components/accountant/AuditorManagement';
import { UsersRound, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function AuditorManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION
    // Resolving the physical business context from the 'profiles' table
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Governance Perimeter Breach</AlertTitle>
                    <AlertDescription>
                        Access to auditor management is locked. 
                        No valid business context was resolved for your session.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const businessId = profile.business_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    // 3. FETCH REAL INVITATION DATA (Enterprise Data Fetch)
    // We fetch current invitations for this specific business
    const { data: invitations } = await supabase
        .from('audit_invitations') // Ensure this table exists in your DB
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            
            {/* Professional Governance Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3 text-foreground">
                        <UsersRound className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Auditor Management</h1>
                    </div>
                    <p className="text-muted-foreground mt-2">
                        Manage external access and governance permissions for{" "}
                        <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">
                            {entityName}
                        </span>
                    </p>
                </div>

                {/* Access Level Badge */}
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl shadow-lg">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Security Protocol</span>
                        <span className="text-xs font-bold text-white uppercase mt-1 flex items-center gap-1">
                             <Lock size={12} className="text-emerald-500" />
                             Access Governance v10.1
                        </span>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
            </div>

            {/* Main Management Interface */}
            <div className="grid gap-6">
                <AuditorManagement 
                    // We pass the real fetched data into the component
                    initialInvitations={invitations || []} 
                />
            </div>

            {/* Fiduciary Notice Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium max-w-xl leading-relaxed">
                    Privileged Access: All invited auditors receive read-only permission to the 
                    Forensic Ledger. Every auditor action is recorded in the Immutable Audit Log.
                </p>
                <div className="text-[10px] font-mono whitespace-nowrap">
                   TENANT_ID: {businessId.substring(0,8).toUpperCase()}
                </div>
            </div>
        </div>
    );
}