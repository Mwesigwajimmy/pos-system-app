import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// IMPORT THE VOICE SETTINGS COMPONENT
import AuraVoiceSettings from '@/components/crm/settings/AuraVoiceSettings';

/**
 * --- BBU1 VOICE SOVEREIGNTY GATEWAY ---
 * Logic: Resolves the physical business node to allow management of Telephony and Voice DNA.
 */
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    // Forensic link to employee registry to anchor the voice configuration to a business
    const { data: employee } = await supabase
        .from('employees')
        .select('id, business_id')
        .eq('user_id', user.id)
        .single();
        
    return employee;
}

export default async function AuraVoiceSettingsPage() {
    // Next.js 15 Requirement: Await the cookie store handshake
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const currentUser = await getCurrentUser(supabase);

    // Validate business context before allowing telephony changes
    if (!currentUser || !currentUser.business_id) {
         return (
             <div className="flex flex-col items-center justify-center h-full p-20 bg-[#F8FAFC]">
                <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 border border-amber-100">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Identity Anchor Missing</h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">We cannot resolve a business node for your profile. Telephony management is disabled.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 md:p-10 bg-[#F8FAFC]">
            {/* --- EXECUTIVE HEADER --- */}
            <div className="mb-8 max-w-5xl mx-auto">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Platform Voice Settings</h1>
                    <p className="text-slate-500 text-sm font-medium italic">
                        Control Aura's vocal presence, verify company phone lines, and manage receptionist logic for your business.
                    </p>
                </div>
            </div>

            {/* --- MAIN CONFIGURATION CONTENT --- */}
            <AuraVoiceSettings 
                businessId={currentUser.business_id} 
            />
        </div>
    );
}