import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { SalesPipelineBoard } from '@/components/crm/leads/SalesPipelineBoard';
import { CreateDealModal } from '@/components/crm/leads/CreateDealModal';

/**
 * 🛡️ IDENTITY RESOLUTION ENGINE
 * Resolved the operator context and business node affinity.
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
 * 🧠 GLOBAL DATA ORCHESTRATION
 * Synchronizes Leads, Stages, Employees, and Subscription Packages for the node.
 */
async function getSalesPipelineData(supabase: any, bizId: string) {
    // 1. Fetch CRM Leads (Master Forensic Ledger)
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
        
    // 2. Fetch Pipeline Logic Stages
    const stagesPromise = supabase.from('pipeline_stages')
        .select('*')
        .eq('tenant_id', bizId)
        .order('order', { ascending: true });

    // 3. Fetch Authorized Agents
    const employeesPromise = supabase.from('employees')
        .select('id, full_name')
        .eq('business_id', bizId);

    // 4. 🧠 FETCH LIVE SUBSCRIPTION CATALOG (New Weld)
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
    // ✅ Next.js 15 Requirement: Await cookies
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);

    // Security Perimeter: Validate business context
    if (!currentUser || !currentUser.business_id) {
         return (
             <div className="flex-1 space-y-4 p-10 pt-8">
                <h2 className="text-3xl font-black tracking-tighter text-red-600 uppercase">Forensic Access Denied</h2>
                <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Operator node not recognized in secure ledger.</p>
            </div>
        );
    }
    
    const { deals, stages, employees, packages } = await getSalesPipelineData(supabase, currentUser.business_id);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* SOVEREIGN ARCHITECTURE HEADER */}
            <header className="flex-shrink-0 p-8 flex flex-wrap items-center justify-between border-b bg-white gap-6">
                 <div className="space-y-1.5">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Sales Pipeline</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">
                        Forensic tracking of field leads, conversions, and agent performance monitoring.
                    </p>
                </div>
                 
                 {/* 🧠 Passing Live Catalog & Employees to the Entry Form */}
                 <CreateDealModal 
                    stages={stages} 
                    employees={employees} 
                    packages={packages}
                    currentBusinessId={currentUser.business_id} 
                 />
            </header>
            
            <main className="flex-grow overflow-hidden bg-slate-50/20">
                {/* 🛡️ Synchronizing the dataset to the board */}
                <SalesPipelineBoard deals={deals} stages={stages} />
            </main>
        </div>
    );
}