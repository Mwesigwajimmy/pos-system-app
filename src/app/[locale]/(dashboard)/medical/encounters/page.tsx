import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EncounterPortal from '@/components/medical/EncounterPortal'; // Component to be built next

export default async function EncountersPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <header className="border-b pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Clinical Consultation Room</h2>
                <p className="text-muted-foreground text-sm">Write clinical notes, log diagnoses, and trigger lab orders.</p>
            </header>
            
            <EncounterPortal tenantId={profile?.tenant_id} practitionerId={user.id} />
        </div>
    );
}