import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InviteAuditorForm } from '@/components/accountant/InviteAuditorForm';
import { UserPlus, ShieldCheck, AlertCircle, Sparkles, MailCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function InviteAuditorPage() {
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
                    <AlertTitle>Fiduciary Isolation Breach</AlertTitle>
                    <AlertDescription>
                        External onboarding is restricted. No valid business identity 
                        was resolved for your current session.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const businessId = profile.business_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-1000">
            
            {/* Professional Onboarding Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3 text-foreground">
                        <UserPlus className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Invite External Auditor</h1>
                    </div>
                    <p className="text-muted-foreground mt-2">
                        Grant secure, time-limited read access for <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">{entityName}</span>
                    </p>
                </div>

                {/* Secure Invite Badge */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Invitation Seal</span>
                        <span className="text-xs font-bold text-blue-600 uppercase mt-1 flex items-center gap-1">
                             <MailCheck size={12} />
                             Certified Link
                        </span>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-blue-500 opacity-20" />
                </div>
            </div>

            {/* AI Guidance Section */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl mb-8">
                <Sparkles className="absolute right-4 top-4 h-12 w-12 text-primary opacity-20 animate-pulse" />
                <div className="max-w-2xl">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Smart Onboarding Enabled
                    </h3>
                    <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                        The invitation process utilizes <strong>Time-Based Access Control (TBAC)</strong>. 
                        You can grant specific permissions and use the AI engine to generate 
                        personalized, professional welcome messages for the auditing firm.
                    </p>
                </div>
            </div>

            {/* Main Form Interface */}
            <div className="bg-white border rounded-2xl p-8 shadow-sm max-w-4xl">
                <InviteAuditorForm />
            </div>

            {/* Security Protocol Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium leading-relaxed">
                    Sovereign Onboarding Protocol v10.1 // SSL/SHA-256 Encrypted Invitations
                </p>
                <div className="text-[10px] font-mono whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                   INVITE_PERIMETER: {businessId.substring(0,12).toUpperCase()}
                </div>
            </div>
        </div>
    );
}