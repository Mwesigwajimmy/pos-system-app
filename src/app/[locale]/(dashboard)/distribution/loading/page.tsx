import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VanLoadingForm from "@/components/distribution/VanLoadingForm";

export default async function LoadingPage({ params: { locale } }: { params: { locale: string } }) {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    return (
        <main className="flex-1 bg-slate-50/20 min-h-screen p-6 lg:p-10">
            <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
                <VanLoadingForm />
            </div>
        </main>
    );
}