import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import EmployeeDirectory, { Employee } from '@/components/hr/EmployeeDirectory';

export default async function DirectoryPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // RLS ensures we only fetch employees for the current user's tenant
    const { data: rawEmployees } = await supabase
        .from('employees')
        .select(`
            id, 
            first_name, 
            last_name, 
            email, 
            job_title, 
            location_name, 
            country_code,
            department,
            employment_status,
            employment_type,
            joining_date,
            avatar_url
        `)
        .order('first_name');

    // Transform DB data to UI format
    const staff: Employee[] = (rawEmployees || []).map((emp: any) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        job: emp.job_title || 'N/A',
        location: emp.location_name || 'Main Office',
        country: emp.country_code || 'UG',
        entity: emp.department || 'General', // Using department as entity for now
        status: emp.employment_status || 'active',
        contractType: emp.employment_type || 'permanent',
        joined: emp.joining_date,
        avatarUrl: emp.avatar_url,
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Staff Directory</h2>
            <EmployeeDirectory staff={staff} />
        </div>
    );
}