import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { SalesPipelineBoard } from '@/components/crm/leads/SalesPipelineBoard';
import { CreateDealModal } from '@/components/crm/leads/CreateDealModal';

/**
 * 🛡️ IDENTITY RESOLUTION
 * Fetches the authenticated user and their specific employee/business context.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: employee } = await supabase
        .from('employees')
        .select('id, role, business_id')
        .eq('user_id', user.id)
        .single();
        
    return employee;
}

/**
 * 🧠 FORENSIC DATA ORCHESTRATION
 * Fetches leads, stages, and employees restricted to the active business node.
 */
async function getSalesPipelineData(supabase: any, bizId: string) {
    // 1. Fetch Deals (from the master crm_contacts ledger)
    const dealsPromise = supabase.from('crm_contacts')
        .select(`
            id, title, value, currency_code, stage_id, country_code,
            nature_of_business, target_package_name, subscription_status,
            marketing_agent_id, marketing_team_name, agreed_commission_percentage,
            commission_earned_ugx, created_at,
            customers:full_name,
            employees:marketing_agent_id ( id, full_name )
        `)
        .eq('business_id', bizId) // Security isolation
        .not('stage_id', 'is', null) // Only show items in the pipeline
        .order('created_at', { ascending: false });
        
    // 2. Fetch Pipeline Stages
    const stagesPromise = supabase.from('pipeline_stages')
        .select('*')
        .eq('tenant_id', bizId) // Security isolation
        .order('order', { ascending: true });

    // 3. Fetch Employees (Marketing Agents) for the assignment dropdown
    const employeesPromise = supabase.from('employees')
        .select('id, full_name')
        .eq('business_id', bizId);

    const [dealsResult, stagesResult, employeesResult] = await Promise.all([
        dealsPromise, 
        stagesPromise, 
        employeesResult
    ]);

    // Forensic Log for debugging (remove in production)
    if (dealsResult.error) console.error("Forensic Deal Fetch Error:", dealsResult.error);

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
    
    // Pass the user's business_id to ensure the fetcher only sees THEIR data
    const { deals, stages, employees } = await getSalesPipelineData(supabase, currentUser.business_id);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* SOVEREIGN ENTERPRISE HEADER */}
            <header className="flex-shrink-0 p-6 flex items-center justify-between border-b bg-white">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sales Pipeline</h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Forensic tracking of field leads, conversions, and agent performance.
                    </p>
                </div>
                 
                 {/* Passing employees list to the modal for the Marketing Agent dropdown */}
                 <CreateDealModal 
                    stages={stages} 
                    employees={employees} 
                    currentBusinessId={currentUser.business_id} 
                 />
            </header>
            
            <main className="flex-grow overflow-hidden">
                {/* Passing the forensic dataset to the Kanban Board */}
                <SalesPipelineBoard deals={deals} stages={stages} />
            </main>
        </div>
    );
}