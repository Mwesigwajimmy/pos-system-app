import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RegulationsRegister from '@/components/compliance/RegulationsRegister';
import { ScrollText, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function RegulationsPage() {
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
                    <AlertTitle>Access Restricted</AlertTitle>
                    <AlertDescription>You must be linked to an active business to view the legal framework register.</AlertDescription>
                </Alert>
            </div>
        );
    }

    // @ts-ignore
    const entityName = profile.organizations?.name || "Sovereign Entity";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <ScrollText className="w-8 h-8 text-blue-600" />
                        Regulations Register
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono tracking-tighter uppercase">
                        Legal framework monitoring for: <span className="text-blue-600">{entityName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Regulatory Feed Active</span>
                </div>
            </div>

            <RegulationsRegister businessId={profile.business_id} />
        </div>
    );
}