import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// We will create these components in the upcoming steps
import { SalesPipelineBoard } from '@/components/crm/leads/SalesPipelineBoard';
// import { CreateDealModal } from '@/components/crm/leads/CreateDealModal';

// --- Mock Component Placeholders for UI structure ---
const CreateDealModal = ({ stages, employeeId }: { stages: any[], employeeId: string }) => (
    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">Create New Deal</button>
);
// --- End Mock Components ---


// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const { data: employee } = await supabase
        .from('employees')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
    return employee;
}

// Data fetching function for all deals and pipeline stages
async function getSalesPipelineData(supabase: any) {
    const dealsPromise = supabase
        .from('deals')
        .select(`
            id,
            title,
            value,
            currency_code,
            stage_id,
            customers ( id, name ),
            employees ( id, full_name )
        `)
        .order('created_at', { ascending: false });
        
    const stagesPromise = supabase
        .from('pipeline_stages')
        .select('*')
        .order('order', { ascending: true });

    const [dealsResult, stagesResult] = await Promise.all([dealsPromise, stagesPromise]);

    if (dealsResult.error) {
        console.error("Error fetching deals:", dealsResult.error);
    }
     if (stagesResult.error) {
        console.error("Error fetching pipeline stages:", stagesResult.error);
    }

    return {
        deals: dealsResult.data || [],
        stages: stagesResult.data || [],
    };
}


export default async function SalesLeadsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
         return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access the CRM module.</p>
            </div>
        );
    }
    
    const { deals, stages } = await getSalesPipelineData(supabase);

    return (
        // The main container needs to have a fixed height and prevent overflow
        // to allow the Kanban board to scroll internally.
        <div className="flex flex-col h-[calc(100vh-57px)]">
            <header className="flex-shrink-0 p-4 md:p-6 flex items-center justify-between border-b">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Sales Pipeline</h2>
                    <p className="text-muted-foreground">
                        Manage your leads and deals through the sales process.
                    </p>
                </div>
                 <CreateDealModal stages={stages} employeeId={currentUser.id} />
            </header>
            
            <main className="flex-grow overflow-x-auto overflow-y-hidden">
                <SalesPipelineBoard deals={deals} stages={stages} />
            </main>
        </div>
    );
}