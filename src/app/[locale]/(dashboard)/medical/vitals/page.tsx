import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// IMPORT NOTE: Points to your exact file name on disk (TitalsTriagePortal.tsx)
import VitalsTriagePortal from '@/components/medical/TitalsTriagePortal';

export default async function VitalsTriagePage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Authentication Guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. Resolve Master Tenant Profile Context
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, business_id, business_name")
        .eq("id", user.id)
        .single();

    if (!profile?.tenant_id && !profile?.business_id) {
        redirect('/login');
    }

    const tenantId = profile?.tenant_id || profile?.business_id;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <header className="border-b pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Patient Triage & Vital Signs Operations
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Real-time physiological measurements, automated BMI computation, and emergency priority triage for <span className="font-bold text-slate-900">{profile.business_name}</span>.
                    </p>
                </div>
            </header>
            
            {/* CORE TRIAGE & VITALS PORTAL COMPONENT */}
            <VitalsTriagePortal tenantId={tenantId} />
        </div>
    );
}