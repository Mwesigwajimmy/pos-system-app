import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UniversalReceiptRegistry from '@/components/accounting/UniversalReceiptRegistry';

export default async function ReceiptRegistryPage({ params: { locale } }: { params: { locale: string } }) {
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
            <div className="max-w-[1600px] mx-auto">
                {/* 
                   The component handles its own professional title 
                   and audit status, ensuring no duplicate headings.
                */}
                <UniversalReceiptRegistry />
            </div>
        </main>
    );
}