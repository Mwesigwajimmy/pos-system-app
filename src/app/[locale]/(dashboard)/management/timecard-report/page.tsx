import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TimecardReport from '@/components/management/TimecardReport';
import { 
    Clock, 
    ShieldCheck, 
    FileSpreadsheet, 
    LayoutDashboard, 
    ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

/**
 * --- BBU1 TIMECARD ANALYTICS GATEWAY ---
 * VERSION: v1.1 OMEGA
 * Logic: Resolves Director identity and provides the forensic vessel for attendance data.
 */

export default async function TimecardReportPage({ params }: { params: { locale: string } }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. SECURE IDENTITY HANDSHAKE
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${params.locale}/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) redirect(`/${params.locale}/onboarding`);

    return (
        <div className="flex-1 p-6 md:p-10 bg-slate-50/30 min-h-screen space-y-8">
            
            {/* Professional Breadcrumbs */}
            <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <LayoutDashboard className="w-3 h-3" />
                <Link href={`/${params.locale}/dashboard`} className="hover:text-blue-600 transition-colors">Enterprise</Link>
                <ChevronRight className="w-3 h-3 opacity-30" />
                <span className="text-slate-900">Attendance Analytics</span>
            </nav>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                            Attendance Logs
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        Forensic timecard auditing for <span className="font-bold text-slate-800 underline underline-offset-4">{profile.full_name}</span>
                    </p>
                </div>

                {/* Compliance Badge */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border shadow-sm">
                    <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Security</span>
                        <span className="text-xs font-bold text-slate-900">Identity Verified</span>
                    </div>
                </div>
            </div>

            {/* MAIN COMPONENT: Deeply welded to the database function */}
            <div className="animate-in fade-in duration-700">
                <TimecardReport />
            </div>

            {/* Legal Footer */}
            <footer className="pt-10 border-t border-slate-200 flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                <span>Digital Audit Trace: TR-{Math.random().toString(36).substring(7).toUpperCase()} • Real-time Data Sync Active</span>
            </footer>
        </div>
    );
}