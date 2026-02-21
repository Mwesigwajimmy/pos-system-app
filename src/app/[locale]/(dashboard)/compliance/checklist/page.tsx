import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ComplianceChecklist from '@/components/compliance/ComplianceChecklist';
import { ListChecks, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function ComplianceChecklistPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. ENTERPRISE AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. SOVEREIGN CONTEXT RESOLUTION (Multi-Tenant Logic)
    // We resolve the business_id and the real organization name simultaneously
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            business_id,
            organizations (
                name
            )
        `)
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Governance Perimeter Violation</AlertTitle>
                    <AlertDescription>
                        Your session is not linked to a valid business entity. 
                        Compliance tracking is disabled until an organization is assigned.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore - handling joined organizations table data
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            
            {/* Professional Governance Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <ListChecks className="w-8 h-8 text-blue-600" />
                            Compliance Checklist
                        </h1>
                    </div>
                    <p className="text-muted-foreground mt-2">
                        Global regulatory filing obligations and statutory deadlines for{" "}
                        <span className="font-bold text-foreground underline decoration-blue-600/30 underline-offset-4">
                            {entityName}
                        </span>
                    </p>
                </div>

                {/* Defense Status Badge */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Protection Level</span>
                        <span className="text-xs font-bold text-emerald-600">Regulatory Shield Active</span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                </div>
            </div>

            {/* Main Task Engine */}
            <div className="grid gap-6">
                <ComplianceChecklist 
                    businessId={profile.business_id} 
                />
            </div>

            {/* Regulatory Footer */}
            <div className="mt-12 border-t pt-4 opacity-40">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span>Certified Governance Workflow</span>
                    <span>Entity ID: {profile.business_id.substring(0,8).toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
}