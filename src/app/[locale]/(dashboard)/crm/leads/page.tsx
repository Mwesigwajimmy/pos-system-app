import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { SalesPipelineBoard } from '@/components/crm/leads/SalesPipelineBoard';
import { CreateDealModal } from '@/components/crm/leads/CreateDealModal';

/**
 * Retrieves the current authenticated user and their associated employee record.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, role, business_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
    if (error || !employee) {
        return null;
    }
    return employee;
}

/**
 * Fetches all necessary data for the Sales Pipeline including deals, stages, and agent lists.
 */
async function getSalesPipelineData(supabase: any, bizId: string) {
    // 1. Fetch CRM Deals
    const dealsPromise = supabase.from('crm_contacts')
        .select(`
            id, 
            title, 
            value, 
            currency_code, 
            stage_id, 
            country_code,
            nature_of_business, 
            target_package_name, 
            subscription_status,
            marketing_agent_id, 
            marketing_team_name, 
            agreed_commission_percentage,
            commission_earned_ugx, 
            created_at,
            customers:full_name,
            employees!marketing_agent_id ( id, full_name )
        `)
        .eq('business_id', bizId)
        .not('stage_id', 'is', null) 
        .order('created_at', { ascending: false });
        
    // 2. Fetch Pipeline Stages
    const stagesPromise = supabase.from('pipeline_stages')
        .select('*')
        .eq('tenant_id', bizId)
        .order('order', { ascending: true });

    // 3. Fetch Authorized Marketing Agents
    const employeesPromise = supabase.from('employees')
        .select('id, full_name')
        .eq('business_id', bizId);

    // 4. Fetch Available Subscription Packages
    const packagesPromise = supabase.from('crm_subscription_packages')
        .select('id, name')
        .eq('business_id', bizId)
        .order('name', { ascending: true });

    const [dealsResult, stagesResult, employeesResult, packagesResult] = await Promise.all([
        dealsPromise, 
        stagesPromise, 
        employeesPromise,
        packagesPromise
    ]);

    return {
        deals: dealsResult.data || [],
        stages: stagesResult.data || [],
        employees: employeesResult.data || [],
        packages: packagesResult.data || []
    };
}

export default async function SalesLeadsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);

    // Access Control: Validate that the user belongs to a business
    if (!currentUser || !currentUser.business_id) {
         return (
             <div className="flex flex-col items-center justify-center flex-1 h-full p-10 bg-slate-50">
                <div className="max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Your account is not currently associated with an active business profile. 
                        Please contact your administrator to resolve this issue.
                    </p>
                </div>
            </div>
        );
    }
    
    const { deals, stages, employees, packages } = await getSalesPipelineData(supabase, currentUser.business_id);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* PAGE HEADER */}
            <header className="flex-shrink-0 px-8 py-7 flex flex-wrap items-center justify-between border-b border-slate-100 bg-white gap-6">
                 <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Pipeline</h1>
                    <p className="text-sm font-medium text-slate-500">
                        Track leads, monitor conversions, and manage agent performance.
                    </p>
                </div>
                 
                 <div className="flex items-center">
                    <CreateDealModal 
                        stages={stages} 
                        employees={employees} 
                        packages={packages}
                        currentBusinessId={currentUser.business_id} 
                    />
                 </div>
            </header>
            
            {/* PIPELINE BOARD AREA */}
            <main className="flex-grow overflow-hidden bg-slate-50/30">
                <SalesPipelineBoard deals={deals} stages={stages} />
            </main>
        </div>
    );
}