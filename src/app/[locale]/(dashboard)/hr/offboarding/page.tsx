import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import OffboardingPortal, { OffboardingStep } from '@/components/hr/OffboardingPortal';

export default async function OffboardingPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch offboarding tasks combined with employee data
    // Assumes a table 'offboarding_checklist' exists
    const { data: rawData } = await supabase
        .from('offboarding_checklist')
        .select(`
            id,
            task_name,
            status,
            responsible_role,
            due_date,
            completed_at,
            employees (
                first_name,
                last_name,
                department,
                country_code
            )
        `)
        .order('due_date', { ascending: true });

    const steps: OffboardingStep[] = (rawData || []).map((item: any) => ({
        id: item.id,
        employee: `${item.employees?.first_name} ${item.employees?.last_name}`,
        status: item.status || 'pending',
        step: item.task_name,
        responsible: item.responsible_role || 'HR',
        due: item.due_date,
        completedAt: item.completed_at,
        entity: item.employees?.department || 'N/A',
        country: item.employees?.country_code || 'N/A',
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Offboarding Management</h2>
            <OffboardingPortal initialSteps={steps} />
        </div>
    );
}