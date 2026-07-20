import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AgriDashboard from '@/components/dashboard-views/AgriDashboard';

async function getBusinessIdentity(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: employee } = await supabase
        .from('employees')
        .select('business_id')
        .eq('user_id', user.id)
        .single();
        
    return employee?.business_id;
}

export default async function AgribusinessHubPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const businessId = await getBusinessIdentity(supabase);

    if (!businessId) redirect('/onboarding');

    return (
        <div className="flex-1 p-6 md:p-10 bg-[#F8FAFC]">
            <div className="mb-10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Agri-Executive Command</h1>
                    <p className="text-slate-500 text-sm font-medium italic">
                        Forensic oversight of biological assets, land utilization, and yield margins.
                    </p>
                </div>
            </div>

            <AgriDashboard businessId={businessId} />
        </div>
    );
}