import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { JobOpeningCard } from '@/components/hr/recruitment/JobOpeningCard';
import { CreateJobModal } from '@/components/hr/recruitment/CreateJobModal';

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

// Define the type for the data coming directly from Supabase
interface JobOpeningFromQuery {
    id: string;
    title: string;
    department: string;
    location: string;
    status: string;
    created_at: string;
    applicants: {
        id: string;
    }[];
}

// --- NEW --- Define the type for the final, reshaped job object
interface JobOpening extends JobOpeningFromQuery {
    applicant_count: number;
}

// --- UPDATED --- Data fetching function now explicitly returns the final type
async function getJobOpenings(supabase: any): Promise<JobOpening[]> {
    const { data, error } = await supabase
        .from('job_openings')
        .select(`
            id,
            title,
            department,
            location,
            status,
            created_at,
            applicants ( id )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching job openings:", error);
        return [];
    }

    // Reshape the data slightly to include an applicant count
    return data.map((job: JobOpeningFromQuery) => ({
        ...job,
        applicant_count: job.applicants.length,
    }));
}


export default async function RecruitmentPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access the recruitment module.</p>
            </div>
        );
    }
    
    const jobOpenings = await getJobOpenings(supabase);
    // --- THIS NOW WORKS --- TypeScript infers the type of 'job' correctly
    const openJobs = jobOpenings.filter(job => job.status === 'OPEN');
    const closedJobs = jobOpenings.filter(job => job.status === 'CLOSED');

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Recruitment Dashboard</h2>
                <CreateJobModal employeeId={currentUser.id} />
            </div>

            {/* Section for Open Positions */}
            <div>
                <h3 className="text-xl font-semibold tracking-tight mb-4">Open Positions ({openJobs.length})</h3>
                {openJobs.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {openJobs.map(job => (
                            <JobOpeningCard key={job.id} job={job} />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center p-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No open positions at the moment.</p>
                    </div>
                )}
            </div>

            {/* Section for Closed Positions */}
            <div>
                <h3 className="text-xl font-semibold tracking-tight mb-4">Closed Positions ({closedJobs.length})</h3>
                 {closedJobs.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {closedJobs.map(job => (
                            <JobOpeningCard key={job.id} job={job} />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center p-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No positions have been closed yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}