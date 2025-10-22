import { cookies } from 'next/headers'; // <-- STEP 1: Import cookies
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ReviewPayslipTable } from '@/components/payroll/ReviewPayslipTable';
import { ApprovePayrollButton } from '@/components/payroll/ApprovePayrollButton';

export default async function ReviewPayrollPage({ params }: { params: { runId: string } }) {
    const cookieStore = cookies(); // <-- STEP 2: Get the cookie store
    const supabase = createClient(cookieStore); // <-- STEP 3: Pass the store to the client

    const { data: run, error } = await supabase.from('payroll_runs')
        .select(`
            *,
            payslips (
                *,
                employees ( full_name ),
                payslip_details (
                    calculated_amount,
                    payroll_elements ( name, type )
                )
            )
        `)
        .eq('id', params.runId)
        .single();
        
    if (error || !run) {
        notFound();
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">Review Payroll: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}</h1>
                {run.status === 'PENDING_APPROVAL' && <ApprovePayrollButton runId={run.id} />}
            </div>
            <p className="mb-4">Status: <span className="font-semibold">{run.status}</span></p>

            <ReviewPayslipTable payslips={run.payslips || []} />
        </div>
    );
}