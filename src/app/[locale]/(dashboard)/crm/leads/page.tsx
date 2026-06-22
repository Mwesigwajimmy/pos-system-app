import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { SalesPipelineBoard } from '@/components/crm/leads/SalesPipelineBoard';
import { CreateDealModal } from '@/components/crm/leads/CreateDealModal';

async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data: employee } = await supabase.from('employees').select('id, role, business_id').eq('user_id', user.id).single();
    return employee;
}

async function getSalesPipelineData(supabase: any) {
    const dealsPromise = supabase.from('crm_contacts')
        .select(`
            id, title, value, currency_code, stage_id, country_code,
            nature_of_business, target_package_name, subscription_status,
            marketing_agent_id, marketing_team_name, agreed_commission_percentage,
            commission_earned_ugx, created_at,
            customers:full_name,
            employees ( id, full_name )
        `)
        .order('created_at', { ascending: false });
        
    const stagesPromise = supabase.from('pipeline_stages').select('*').order('order', { ascending: true });
    const employeesPromise = supabase.from('employees').select('id, full_name');

    const [dealsResult, stagesResult, employeesResult] = await Promise.all([dealsPromise, stagesPromise, employeesPromise]);

    return {
        deals: dealsResult.data || [],
        stages: stagesResult.data || [],
        employees: employeesResult.data || []
    };
}

export default async function SalesLeadsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) redirect('/login');
    
    const { deals, stages, employees } = await getSalesPipelineData(supabase);

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="flex-shrink-0 p-6 flex items-center justify-between border-b bg-white">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Sales Pipeline</h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage leads through the forensic sales process.
                    </p>
                </div>
                 <CreateDealModal 
                    stages={stages} 
                    employees={employees} 
                    currentBusinessId={currentUser.business_id} 
                 />
            </header>
            
            <main className="flex-grow overflow-hidden">
                <SalesPipelineBoard deals={deals} stages={stages} />
            </main>
        </div>
    );
}