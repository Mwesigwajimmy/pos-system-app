import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real components we just built
import { PerformanceCyclesTable } from '@/components/hr/performance/PerformanceCyclesTable';
import { CreateCycleModal } from '@/components/hr/performance/CreateCycleModal';

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

// Define the type for the data returned by the Supabase query
interface PerformanceCycleFromQuery {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    performance_reviews: {
        id: string;
    }[];
}

// Data fetching function for performance review cycles
async function getPerformanceCycles(supabase: any) {
    const { data, error } = await supabase
        .from('performance_cycles')
        .select(`
            id,
            name,
            start_date,
            end_date,
            status,
            performance_reviews ( id )
        `)
        .order('start_date', { ascending: false });

    if (error) {
        console.error("Error fetching performance cycles:", error);
        return [];
    }

    // Reshape the data slightly to include a participant count
    // --- THIS IS THE FIXED BLOCK ---
    return data.map((cycle: PerformanceCycleFromQuery) => ({
        ...cycle,
        participant_count: cycle.performance_reviews.length,
    }));
}


export default async function PerformanceManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access the performance management module.</p>
            </div>
        );
    }
    
    const performanceCycles = await getPerformanceCycles(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Performance Management</h2>
                    <p className="text-muted-foreground">
                        Create and manage performance review cycles for your organization.
                    </p>
                </div>
                {/* Use the real CreateCycleModal component */}
                <CreateCycleModal />
            </div>

            {/* Use the real PerformanceCyclesTable component */}
            <PerformanceCyclesTable cycles={performanceCycles} />
        </div>
    );
}