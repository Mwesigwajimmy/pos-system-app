import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RevolutionaryComplianceDashboard } from '@/components/compliance/RevolutionaryComplianceDashboard';
import { Zap, ShieldCheck } from 'lucide-react';

export default async function RevolutionaryCompliancePage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("active_organization_slug")
        .eq("user_id", user.id)
        .single();

    const activeSlug = profile?.active_organization_slug;

    // Fetch Tasks for the Dashboard
    const { data: tasks } = await supabase
        .from('compliance_tasks')
        .select('*')
        .order('due_date', { ascending: true })
        .limit(20);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 italic">
                        <Zap className="h-6 w-6 text-emerald-500 fill-current" />
                        Revolutionary Intelligence
                    </h2>
                    <p className="text-muted-foreground text-sm font-mono italic">
                        Autonomous Compliance Tracking // {activeSlug?.toUpperCase()}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">System Integrity Sealed</span>
                </div>
            </div>
            
            <RevolutionaryComplianceDashboard tasks={tasks || []} />
        </div>
    );
}