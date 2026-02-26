import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import PatientRegistry from '@/components/medical/PatientRegistry';

export default async function PatientsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user?.id).single();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <PatientRegistry tenantId={profile?.tenant_id} />
        </div>
    );
}