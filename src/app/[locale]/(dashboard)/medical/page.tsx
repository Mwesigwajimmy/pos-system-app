import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Activity, Users, Zap, HeartPulse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function MedicalHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from("profiles").select("tenant_id, business_name").eq("id", user.id).single();
    const tenantId = profile?.tenant_id;

    // REAL DATA FETCH: Today's Clinical Volume
    const today = new Date().toISOString().split('T')[0];
    const [patients, encounters, triage] = await Promise.all([
        supabase.from('medical_patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('medical_encounters').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', today),
        supabase.from('medical_triage').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', today)
    ]);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                        <HeartPulse className="text-red-500 w-8 h-8" />
                        Clinical Command Center
                    </h1>
                    <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest">
                        Autonomous Healthcare Guard // {profile?.business_name}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Total Registry</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader>
                    <CardContent><div className="text-2xl font-black">{patients.count}</div><p className="text-[10px] text-muted-foreground">Registered Patients</p></CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Today's Visits</CardTitle><Activity className="h-4 w-4 text-muted-foreground"/></CardHeader>
                    <CardContent><div className="text-2xl font-black text-emerald-600">{encounters.count}</div><p className="text-[10px] text-muted-foreground">Active Encounters</p></CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">In Triage</CardTitle><Zap className="h-4 w-4 text-muted-foreground"/></CardHeader>
                    <CardContent><div className="text-2xl font-black text-orange-600">{triage.count}</div><p className="text-[10px] text-muted-foreground">Awaiting Consultation</p></CardContent>
                </Card>
            </div>

            {/* In a real build, we would add the "Doctor's Queue" component here */}
            <div className="h-96 w-full rounded-2xl bg-slate-50 border-2 border-dashed flex items-center justify-center text-slate-300 font-black uppercase tracking-widest">
                Real-time Clinical Queue Monitor
            </div>
        </div>
    );
}