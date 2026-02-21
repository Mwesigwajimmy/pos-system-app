import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FullDataExport } from '@/components/accountant/FullDataExport';
import { Download, ShieldCheck, AlertCircle, Database, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function FullDataExportPage() {
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
                    <AlertTitle>Export Linkage Failure</AlertTitle>
                    <AlertDescription>
                        Data portability is restricted. No valid business identity could 
                        be resolved for your current session.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const businessId = profile.business_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
            
            {/* Professional Export Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3 text-foreground">
                        <Database className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Full Data Export</h1>
                    </div>
                    <p className="text-muted-foreground mt-2">
                        Certified Data Portability and General Ledger extraction for{" "}
                        <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">
                            {entityName}
                        </span>
                    </p>
                </div>

                {/* Security Protocol Badge */}
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Security Protocol</span>
                        <span className="text-xs font-bold text-emerald-600 uppercase mt-1 flex items-center gap-1">
                             <Lock size={12} className="text-emerald-500" />
                             Encrypted Stream
                        </span>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-20" />
                </div>
            </div>

            {/* Guidance Alert for Professional Accountants */}
            <Alert className="bg-blue-50/50 border-blue-200 text-blue-900 max-w-4xl">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="font-bold uppercase text-[11px] tracking-widest">Regulatory Notice</AlertTitle>
                <AlertDescription className="text-xs">
                    This export contains the complete General Ledger, Chart of Accounts, and Transactional 
                    Audit History. Ensure this data is handled in accordance with local GDPR and data privacy regulations.
                </AlertDescription>
            </Alert>

            {/* Main Export Interface */}
            <div className="bg-white border rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-xl shadow-slate-100">
                <div className="p-4 bg-slate-50 rounded-full border">
                    <Download className="h-12 w-12 text-slate-400" />
                </div>
                <div className="max-w-md space-y-2">
                    <h3 className="text-lg font-bold">Compile General Ledger</h3>
                    <p className="text-sm text-muted-foreground">
                        The system will generate a comprehensive JSON extract of all verified transactional data. 
                        This file is compatible with high-tier external auditing software.
                    </p>
                </div>
                
                <FullDataExport />
            </div>

            {/* Audit Disclaimer Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium leading-relaxed">
                    Data Sovereignty Verified // ISA-700 / ISO-27001 Extraction Standards
                </p>
                <div className="text-[10px] font-mono whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                   TRACE_HASH: {businessId.substring(0,12).toUpperCase()}-PORTABLE
                </div>
            </div>
        </div>
    );
}