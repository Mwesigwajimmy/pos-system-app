import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ComplianceDrilldown } from '@/components/compliance/ComplianceDrilldown';
import { Activity, ShieldAlert } from 'lucide-react';

export default async function ComplianceDrilldownPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTHENTICATION GUARD
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. SOVEREIGN CONTEXT RESOLUTION
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("active_organization_slug, tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!profile?.active_organization_slug) {
        return <div className="p-8 text-red-500 font-mono underline decoration-red-500/30">ERROR: NO ACTIVE SOVEREIGN CONTEXT DETECTED</div>;
    }

    // 3. FETCH ORGANIZATION METADATA
    const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('slug', profile.active_organization_slug)
        .single();

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Activity className="w-8 h-8 text-blue-600" />
                        Compliance Forensic Drilldown
                    </h1>
                    <p className="text-muted-foreground mt-1 uppercase text-[10px] font-bold tracking-widest leading-none">
                        Active Monitoring for: <span className="text-blue-600">{org?.name || profile.active_organization_slug}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg">
                    <ShieldAlert size={16} className="text-slate-600" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest text-[10px]">
                        Forensic Matrix v10.1
                    </span>
                </div>
            </div>

            {/* Corrected Named Import Component */}
            <ComplianceDrilldown 
                tenantId={profile.tenant_id} 
                user={user.email || 'System'}
            />
        </div>
    );
}