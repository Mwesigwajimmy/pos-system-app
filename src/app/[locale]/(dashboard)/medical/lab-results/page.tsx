import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import LabResultsHub from '@/components/medical/LabResultsHub';

export default async function LabResultsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user?.id).single();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic border-b pb-4">Laboratory Hub</h2>
            <LabResultsHub tenantId={profile?.tenant_id} />
        </div>
    );
}