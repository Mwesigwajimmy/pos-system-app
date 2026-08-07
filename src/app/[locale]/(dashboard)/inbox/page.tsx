import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuraInbox } from '@/components/copilot/AuraInbox';

export default async function InboxPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Secure Server Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authentication & Secure Identity Resolution
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Multi-Tenant Security Context
    // We resolve the business_id from the 'profiles' table (The Ledger Truth),
    // same as PurchasesPage — AuraInbox is entirely client-side from here on
    // (it fetches, drafts and sends via aura-inbox itself through react-query),
    // so the only job of this page is auth + handing it a businessId.
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) {
        redirect(`/${locale}/onboarding`);
    }

    const businessId = profile.business_id;

    return (
        <div className="flex h-full flex-col p-4 md:p-8 bg-slate-50/30 min-h-screen">
            <AuraInbox businessId={businessId} />
        </div>
    );
}