import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AssetPurchaseForm from '@/components/accounting/AssetPurchaseForm';

export default async function AssetPurchasePage({ params: { locale } }: { params: { locale: string } }) {
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
            <div className="max-w-[1400px] mx-auto">
                <AssetPurchaseForm />
            </div>
        </main>
    );
}