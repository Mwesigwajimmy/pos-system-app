import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import RewardsRecognition, { Recognition } from '@/components/hr/RewardsRecognition';

export default async function RewardsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch recognition history joined with employee data
    // Assumes table 'employee_recognition' exists
    const { data: rawData } = await supabase
        .from('employee_recognition')
        .select(`
            id,
            award_name,
            award_type,
            description,
            monetary_value,
            awarded_date,
            employees (
                first_name,
                last_name,
                department,
                country_code
            )
        `)
        .order('awarded_date', { ascending: false });

    // Transform DB data to UI format
    const rewards: Recognition[] = (rawData || []).map((item: any) => ({
        id: item.id,
        employee: `${item.employees?.first_name} ${item.employees?.last_name}`,
        award: item.award_name,
        type: item.award_type || 'Award',
        description: item.description,
        value: item.monetary_value,
        entity: item.employees?.department || 'Company',
        country: item.employees?.country_code || 'Global',
        date: item.awarded_date,
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Rewards & Recognition</h2>
            <RewardsRecognition initialRewards={rewards} />
        </div>
    );
}