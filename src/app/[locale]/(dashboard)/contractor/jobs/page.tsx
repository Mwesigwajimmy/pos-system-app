import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real components
import { JobList } from '@/components/contractor/jobs/JobList';
import { CreateJobModal } from '@/components/contractor/jobs/CreateJobModal';

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

// Data fetching function for all jobs
async function getAllJobs(supabase: any) {
    const { data, error } = await supabase
        .from('projects')
        .select(`
            id,
            project_uid,
            name,
            status,
            start_date,
            end_date,
            estimated_budget,
            actual_cost,
            customers ( id, name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
        return [];
    }

    return data;
}

export default async function ContractorJobsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
         return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }
    
    const jobs = await getAllJobs(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Job Management</h2>
                    <p className="text-muted-foreground">
                        View all your projects and create new ones.
                    </p>
                </div>
                {/* We pass the current user's employeeId to the modal if needed,
                    but the server action will get the user from cookies anyway.
                    For consistency, we'll keep the prop. */}
                <CreateJobModal />
            </div>

            {/* The main data table displaying all jobs */}
            <JobList jobs={jobs} />
        </div>
    );
}