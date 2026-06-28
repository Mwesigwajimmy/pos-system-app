import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DispatchWorkbench from "@/components/distribution/DispatchWorkbench";

export default async function DispatchPage({ params: { locale } }: { params: { locale: string } }) {
    const supabase = await createClient(await cookies());
    
    // Security and Identity Handshake
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) return <div className="p-10 text-slate-500">Business context not found.</div>;

    return (
        <main className="flex-1 bg-slate-50/20 min-h-screen p-6 lg:p-10 animate-in fade-in duration-700">
            <div className="max-w-[1600px] mx-auto">
                {/* 
                   The component handles its own professional heading.
                   We only provide the enterprise-grade shell here.
                */}
                <DispatchWorkbench businessId={profile.business_id} />
            </div>
        </main>
    );
}