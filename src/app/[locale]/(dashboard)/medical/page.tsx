import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
    Users,
    Activity,
    Stethoscope,
    AlertTriangle,
    FlaskConical,
    Pill,
    FileText,
    ChevronRight,
    Lock,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FACILITY_TIME_ZONE = 'Africa/Kampala';
const FACILITY_UTC_OFFSET = '+03:00';

function facilityDayRange() {
    const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: FACILITY_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

    return {
        label: localDate,
        from: new Date(`${localDate}T00:00:00${FACILITY_UTC_OFFSET}`).toISOString(),
        to: new Date(`${localDate}T24:00:00${FACILITY_UTC_OFFSET}`).toISOString(),
    };
}

const MODULES = [
    { href: '/medical/patients', label: 'Patients', icon: Users },
    { href: '/medical/lab-results', label: 'Laboratory', icon: FlaskConical },
    { href: '/medical/prescriptions', label: 'Pharmacy', icon: Pill },
    { href: '/medical/vitals', label: 'Triage and vitals', icon: Activity },
];

function Metric({
    label,
    value,
    note,
    tone = 'default',
}: {
    label: string;
    value: number;
    note: string;
    tone?: 'default' | 'alert';
}) {
    return (
        <div className="px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p
                className={
                    tone === 'alert' && value > 0
                        ? 'mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-red-600'
                        : 'mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900'
                }
            >
                {value}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{note}</p>
        </div>
    );
}

export default async function MedicalHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, business_id, business_name, currency')
        .eq('id', user.id)
        .single();

    const tenantId = profile?.tenant_id || profile?.business_id;
    if (!tenantId) redirect('/login');

    const businessCurrency = profile?.currency || 'UGX';
    const day = facilityDayRange();

    const [patients, encounters, triage, criticalAlerts, activeQueue, todayRevenue] = await Promise.all([
        supabase
            .from('medical_patients')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId),

        supabase
            .from('medical_encounters')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', day.from)
            .lt('created_at', day.to),

        supabase
            .from('medical_triage')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', day.from)
            .lt('created_at', day.to),

        supabase
            .from('medical_lab_results')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_critical', true)
            .gte('created_at', day.from)
            .lt('created_at', day.to),

        supabase
            .from('medical_lab_orders')
            .select('*, medical_patients(full_name, patient_uid)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(10),

        supabase
            .from('medical_lab_orders')
            .select('total_amount, cost')
            .eq('tenant_id', tenantId)
            .eq('payment_status', 'paid')
            .gte('created_at', day.from)
            .lt('created_at', day.to),
    ]);

    const loadFailed = [patients, encounters, triage, criticalAlerts, activeQueue, todayRevenue]
        .some(result => (result as any).error);

    const revenueSum = (todayRevenue.data || []).reduce(
        (acc, curr: any) => acc + Number(curr.total_amount ?? curr.cost ?? 0),
        0
    );

    const queue = activeQueue.data || [];

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-16 pt-6 sm:space-y-6 xl:px-8">

            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Medical</h1>
                    <p className="mt-1 text-sm text-slate-500">{profile?.business_name || ''}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                        variant="outline"
                        className="h-10 rounded-lg border-slate-200 px-4 text-sm font-medium"
                        asChild
                    >
                        <Link href="/medical/reports">
                            <FileText size={15} className="mr-2 text-slate-400" />
                            Reports
                        </Link>
                    </Button>

                    <Button
                        className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                        asChild
                    >
                        <Link href="/medical/encounters">
                            <Stethoscope size={15} className="mr-2" />
                            New consultation
                        </Link>
                    </Button>
                </div>
            </div>

            {loadFailed ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                    <p className="text-sm text-amber-900">
                        Some figures on this page could not be loaded, so the numbers below may be incomplete. Refresh the page.
                    </p>
                </div>
            ) : null}

            <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(n+3)]:border-t lg:grid-cols-4 lg:[&>*:nth-child(n+3)]:border-t-0 sm:divide-x">
                <Metric
                    label="Patients"
                    value={patients.count || 0}
                    note="On the register"
                />
                <Metric
                    label="Consultations"
                    value={encounters.count || 0}
                    note="Recorded today"
                />
                <Metric
                    label="Triaged"
                    value={triage.count || 0}
                    note="Vitals taken today"
                />
                <Metric
                    label="Critical results"
                    value={criticalAlerts.count || 0}
                    note="Flagged today"
                    tone="alert"
                />
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">

                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-8">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Recent lab requisitions</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Last 10 requests</p>
                    </div>

                    {queue.length === 0 ? (
                        <p className="py-20 text-center text-sm text-slate-400">Nothing in the queue</p>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto lg:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                                            <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                Requisition
                                            </TableHead>
                                            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                Patient
                                            </TableHead>
                                            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                Test
                                            </TableHead>
                                            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                Payment
                                            </TableHead>
                                            <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {queue.map((order: any) => (
                                            <TableRow key={order.id} className="border-b border-slate-100 last:border-0">
                                                <TableCell className="px-5 py-3.5">
                                                    <p className="font-mono text-sm text-slate-900">
                                                        {order.lab_number
                                                            || (typeof order.id === 'string' ? order.id.substring(0, 6) : '')}
                                                    </p>
                                                    {order.anonymous_code ? (
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                                            <Lock size={10} />
                                                            Confidential
                                                        </p>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="py-3.5 text-sm text-slate-900">
                                                    {order.anonymous_code
                                                        ? 'Confidential'
                                                        : order.medical_patients?.full_name || 'Walk-in'}
                                                </TableCell>
                                                <TableCell className="max-w-[260px] py-3.5">
                                                    <p className="truncate text-sm text-slate-600">{order.test_name}</p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {order.department_name || 'General'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="py-3.5">
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            order.payment_status === 'paid'
                                                                ? 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700'
                                                                : 'rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium capitalize text-amber-800'
                                                        }
                                                    >
                                                        {order.payment_status || 'pending'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-5 py-3.5 text-right">
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            order.status === 'completed'
                                                                ? 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700'
                                                                : 'rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600'
                                                        }
                                                    >
                                                        {order.status || 'pending'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="divide-y divide-slate-100 lg:hidden">
                                {queue.map((order: any) => (
                                    <div key={order.id} className="space-y-2.5 px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-900">
                                                    {order.anonymous_code
                                                        ? 'Confidential'
                                                        : order.medical_patients?.full_name || 'Walk-in'}
                                                </p>
                                                <p className="mt-0.5 font-mono text-xs text-slate-400">
                                                    {order.lab_number
                                                        || (typeof order.id === 'string' ? order.id.substring(0, 6) : '')}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    order.status === 'completed'
                                                        ? 'shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700'
                                                        : 'shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600'
                                                }
                                            >
                                                {order.status || 'pending'}
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-slate-600">{order.test_name}</p>

                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    order.payment_status === 'paid'
                                                        ? 'rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700'
                                                        : 'rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium capitalize text-amber-800'
                                                }
                                            >
                                                {order.payment_status || 'pending'}
                                            </Badge>
                                            <span className="text-xs text-slate-400">
                                                {order.department_name || 'General'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>

                <div className="space-y-4 sm:space-y-6 lg:col-span-4">
                    <Card className="rounded-xl border-slate-200 p-5 shadow-none">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                            Laboratory income today
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                            {businessCurrency} {revenueSum.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Requisitions marked paid on {day.label}
                        </p>
                    </Card>

                    <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-sm font-semibold text-slate-900">Go to</h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {MODULES.map(module => {
                                const Icon = module.icon;
                                return (
                                    <Link
                                        key={module.href}
                                        href={module.href}
                                        className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon size={16} className="text-slate-400" />
                                            <span className="text-sm text-slate-900">{module.label}</span>
                                        </span>
                                        <ChevronRight size={15} className="text-slate-300" />
                                    </Link>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}