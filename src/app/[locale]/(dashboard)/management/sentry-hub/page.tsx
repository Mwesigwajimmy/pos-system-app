import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SentryHub from '@/components/management/SentryHub';
import { ShieldAlert, Fingerprint, AlertCircle, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/**
 * Hardware Management Page - Security & Infrastructure
 * Manages device connectivity and monitoring nodes.
 */
export default async function SentryHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTHENTICATION GUARD (Logic Intact)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. IDENTITY RESOLUTION (Logic Intact)
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    // 3. PERIMETER VALIDATION (Refactored for Professional UI)
    if (profileError || !profile?.tenant_id) {
        return (
            <div className="p-10 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
                <Alert variant="destructive" className="rounded-xl border border-red-200 p-8 bg-red-50/30">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-bold uppercase tracking-wider text-sm">Hardware Connection Error</AlertTitle>
                    <AlertDescription className="font-medium text-sm mt-2 leading-relaxed text-red-800/80">
                        The system was unable to resolve a valid organization perimeter. 
                        Hardware monitoring and device connectivity are currently restricted. 
                        Please ensure your account is assigned to an active organization profile.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const tenantId = profile.tenant_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Organization Profile";

    return (
        <div className="flex-1 space-y-8 p-6 md:p-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
            
            {/* TOP BAR: SYSTEM CONTEXT */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 px-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold tracking-widest uppercase">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Account: {entityName}
                    </div>
                    <Badge variant="outline" className="border-slate-200 text-slate-500 bg-white font-bold px-3 py-0.5 text-[9px] uppercase tracking-wider">
                        Secure Environment
                    </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Infrastructure Console v10.5
                    <ShieldCheck size={14} className="text-blue-500" />
                </div>
            </div>

            {/* MAIN COMPONENT: MOUNTED BRAIN */}
            <div className="max-w-[1650px] mx-auto">
                <SentryHub tenantId={tenantId} />
            </div>

            {/* COMPLIANCE FOOTER */}
            <div className="mt-16 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 px-2">
                <div className="flex items-center gap-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center md:text-left">
                        Hardware Management Protocol • Infrastructure Audit Standards • ISO Compliant Data Stream
                    </p>
                </div>
                
                <div className="text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-4 py-1.5 rounded-lg shadow-sm">
                   AUTH_SIGNATURE: {tenantId.substring(0,16).toUpperCase()}
                </div>
            </div>
        </div>
    );
}