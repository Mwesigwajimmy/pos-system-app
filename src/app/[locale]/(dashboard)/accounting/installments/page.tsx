import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import InstallmentPlanManager from '@/components/accounting/InstallmentPlanManager';

export default async function InstallmentPlanPage({ params: { locale } }: { params: { locale: string } }) {
    const supabase = await createClient(await cookies());
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return null;

    return (
        <main className="flex-1 bg-slate-50/20 min-h-screen p-6 md:p-10 animate-in fade-in duration-700">
            <div className="max-w-[1500px] mx-auto">
                <InstallmentPlanManager />
            </div>
        </main>
    );
}