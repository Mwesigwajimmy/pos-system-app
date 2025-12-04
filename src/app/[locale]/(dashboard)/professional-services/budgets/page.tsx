import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// FIX: Default import
import BudgetManager from '@/components/professional-services/budgets/BudgetManager';

export default async function BudgetsPage({ params: { locale } }: { params: { locale: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return <div className="p-8">Unauthorized: No Business Linked.</div>;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Project Budgets</h2>
                    <p className="text-muted-foreground">Track estimated vs actual costs and profitability.</p>
                </div>
            </div>
            <BudgetManager tenantId={profile.business_id} />
        </div>
    );
}