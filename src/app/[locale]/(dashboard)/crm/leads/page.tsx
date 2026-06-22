import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { SalesPipelineBoard } from '@/components/crm/leads/SalesPipelineBoard';
import { CreateDealModal } from '@/components/crm/leads/CreateDealModal';

/**
 * 🛡️ IDENTITY RESOLUTION
 * In Next.js 15, cookies() must be awaited.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, role, business_id')
        .eq('user_id', user.id)
        .maybeSingle(); // maybeSingle prevents crash if record is missing
        
    if (error || !employee) {
        console.error("Identity Error: User has no linked employee record.");
        return null;
    }
    return employee;
}

/**
 * 🧠 FORENSIC DATA ORCHESTRATION
 */
async function getSalesPipelineData(supabase: any, bizId: string) {
    // 🛡️ REFINED JOIN: Using explicit table hint (!) to map agent ID to employee table
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
        
    const stagesPromise = supabase.from('pipeline_stages')
        .select('*')
        .eq('tenant_id', bizId)
        .order('order', { ascending: true });

    const employeesPromise = supabase.from('employees')
        .select('id, full_name')
        .eq('business_id', bizId);

    const [dealsResult, stagesResult, employeesResult] = await Promise.all([
        dealsPromise, 
        stagesPromise, 
        employeesPromise
    ]);

    if (dealsResult.error) console.error("Pipeline Fetch Error:", dealsResult.error);

    return {
        deals: dealsResult.data || [],
        stages: stagesResult.data || [],
        employees: employeesResult.data || []
    };
}

export default async function SalesLeadsPage() {
    // ✅ CRITICAL FIX: Awaiting cookies for Next.js 15
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);

    // Security Gate: Ensure user exists and has a business context
    if (!currentUser || !currentUser.business_id) {
         return (
             <div className="flex-1 space-y-4 p-8 pt-6">
                <h2 className="text-3xl font-black tracking-tight text-red-600 uppercase">Forensic Access Denied</h2>
                <p className="font-bold text-slate-500">Your operator profile is not linked to an active business node.</p>
            </div>
        );
    }
    
    const { deals, stages, employees } = await getSalesPipelineData(supabase, currentUser.business_id);

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="flex-shrink-0 p-6 flex flex-wrap items-center justify-between border-b bg-white gap-4">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sales Pipeline</h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Forensic tracking of field leads, conversions, and agent performance.
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