import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from 'next/navigation';

// Import all the UI components we have built for this feature
import { LeaveBalanceCards } from '@/components/hr/leave/LeaveBalanceCards';
import { LeaveHistoryTable } from '@/components/hr/leave/LeaveHistoryTable';
import { TeamLeaveRequestsTable } from '@/components/hr/leave/TeamLeaveRequestsTable';
import { LeaveRequestModal } from '@/components/hr/leave/LeaveRequestModal';

// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login'); // Redirect if no user is found
    }

    // Fetch the employee profile from your 'employees' table
    // It's crucial this table has a `user_id` FK to `auth.users` and a `role` column.
    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
        
    if (error || !employee) {
        // Handle cases where an auth user doesn't have an employee profile
        // Maybe redirect to a profile setup page or show an error
        console.error("Could not find employee profile for user:", user.id);
        return null;
    }
    
    return employee;
}

// Data fetching function to get all necessary data for the page
async function getLeaveData(supabase: any, employeeId: string, isManager: boolean) {
    // Fetch personal leave balances using the RPC function
    const { data: balances } = await supabase.rpc('get_employee_leave_balances', { p_employee_id: employeeId });

    // Fetch personal leave request history
    const { data: requests } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name)')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });
    
    let teamRequests = [];
    if (isManager) {
        // If the user is a manager, fetch their team's pending requests using the new RPC function
        const { data: managerTeamRequests } = await supabase.rpc('get_manager_team_requests', { p_manager_id: employeeId });
        teamRequests = managerTeamRequests || [];
    }
    
    return {
        balances: balances || [],
        requests: requests || [],
        teamRequests,
    };
}


export default async function LeaveManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    // If no employee profile is found, prevent rendering the page
    if (!currentUser) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>No valid employee profile associated with your account. Please contact your administrator.</p>
            </div>
        );
    }

    const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';
    const { balances, requests, teamRequests } = await getLeaveData(supabase, currentUser.id, isManager);
    
    // Fetch all available leave types for the new request form
    const { data: leaveTypes } = await supabase.from('leave_types').select('id, name');

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
                <div className="flex items-center space-x-2">
                   <LeaveRequestModal leaveTypes={leaveTypes || []} employeeId={currentUser.id} />
                </div>
            </div>

            {/* Section for displaying leave balances */}
            <div className="space-y-4">
                <LeaveBalanceCards balances={balances} />
            </div>

            <Tabs defaultValue="my_requests" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="my_requests">My Requests</TabsTrigger>
                    {isManager && (
                        <TabsTrigger value="team_requests">
                            Team Requests
                            {teamRequests.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-red-100 bg-red-600 rounded-full">
                                    {teamRequests.length}
                                </span>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="my_requests" className="space-y-4">
                    <LeaveHistoryTable requests={requests} />
                </TabsContent>
                {isManager && (
                    <TabsContent value="team_requests" className="space-y-4">
                        {/* Render the new TeamLeaveRequestsTable component with the fetched data */}
                        <TeamLeaveRequestsTable requests={teamRequests} managerId={currentUser.id} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}