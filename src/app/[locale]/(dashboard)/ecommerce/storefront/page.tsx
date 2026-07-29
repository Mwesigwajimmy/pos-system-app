import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { StorefrontSettings } from '@/components/ecommerce/StorefrontSettings';

// ----------------------------------------------------------------------
// 1. AUTH UTILITY
// ----------------------------------------------------------------------
async function getCurrentUser(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }
    return user;
}

// ----------------------------------------------------------------------
// 2. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
export default async function StorefrontSettingsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Auth check — the component loads its own settings client-side
    await getCurrentUser(supabase);

    return (
        <div className="flex-1 bg-slate-50">
            {/*
              Width is owned here and nowhere else.
              max-w-screen-2xl = 1536px. Remove it entirely to go edge-to-edge,
              or lower it to max-w-7xl (1280px) for a narrower column.
            */}
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 sm:py-6">

                {/* Page heading — kept small so the store card below leads the eye */}
                <div className="mb-4">
                    <h1 className="text-base font-semibold tracking-tight text-slate-900">
                        Storefront Configuration
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Manage your public store&apos;s identity, products, delivery, payments and search visibility.
                    </p>
                </div>

                <StorefrontSettings />
            </div>
        </div>
    );
}