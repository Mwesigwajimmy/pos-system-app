'use server';

import { cookies } from 'next/headers';
import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { calculateUgandaPayroll } from '../localization/ug/calculator';
import { EmployeeWithContract, PayrollElement } from '@/types/payroll';

export async function runPayrollCalculation(tenantId: string, periodStart: string, periodEnd: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: tenant, error: tenantError },
    { data: employees, error: employeesError },
    { data: elements, error: elementsError },
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    // V-- FIX: The incorrect type assertion `as Promise<...>` has been removed from this line --V
    supabase.from('employees').select(`
      *,
      contracts (
        *,
        contract_elements (
          amount,
          currency_code,
          payroll_elements (*)
        )
      )
    `).eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('payroll_elements').select('*').eq('is_system_defined', true),
  ]);

  if (tenantError || employeesError || elementsError) {
    console.error({ tenantError, employeesError, elementsError });
    return { error: 'Failed to fetch initial payroll data.' };
  }

  // It's good practice to ensure the data has the correct type after fetching
  const typedEmployees = employees as EmployeeWithContract[];

  if (!tenant || !typedEmployees || !elements) {
    return { error: 'Missing critical data for payroll calculation.' };
  }

  const systemElements = elements.reduce((acc, el) => {
    acc[el.name] = el as PayrollElement;
    return acc;
  }, {} as Record<string, PayrollElement>);

  let calculationResults;
  switch (tenant.country_code) {
    case 'UG':
      calculationResults = calculateUgandaPayroll(typedEmployees, systemElements);
      break;
    default:
      return { error: `Payroll for country ${tenant.country_code} is not supported.` };
  }
  
  const { data: run, error: runError } = await supabase.from('payroll_runs').insert({
    tenant_id: tenantId,
    period_start: periodStart,
    period_end: periodEnd,
    status: 'PENDING_APPROVAL'
  }).select().single();
  
  if (runError) {
      console.error(runError);
      return { error: 'Failed to create payroll run.' };
  }

  const payslipInserts = calculationResults.map(res => ({
    payroll_run_id: run.id,
    employee_id: res.employeeId,
    currency_code: tenant.default_currency_code,
    gross_earnings: res.grossEarnings,
    net_pay: res.netPay,
    total_deductions: res.totalDeductions,
    total_employer_contributions: res.totalEmployerContributions,
  }));
  
  const { data: payslips, error: payslipsError } = await supabase.from('payslips').insert(payslipInserts).select();

  if(payslipsError || !payslips) {
      await supabase.from('payroll_runs').delete().eq('id', run.id);
      console.error(payslipsError);
      return { error: 'Failed to save payslips.' };
  }

  const detailInserts = payslips.flatMap(p => {
    const result = calculationResults.find(res => res.employeeId === p.employee_id);
    if (!result) return [];
    return result.details.map(d => ({
        payslip_id: p.id,
        element_id: d.elementId,
        calculated_amount: d.amount
    }));
  });

  const { error: detailsError } = await supabase.from('payslip_details').insert(detailInserts);
  
  if(detailsError) {
      await supabase.from('payroll_runs').delete().eq('id', run.id);
      console.error(detailsError);
      return { error: 'Failed to save payslip details.' };
  }
  
  revalidatePath('/payroll');
  return { success: true, runId: run.id };
}

export async function approvePayrollRun(runId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { error } = await supabase.from('payroll_runs').update({ status: 'APPROVED' }).eq('id', runId);

    if (error) {
        console.error(error);
        return { error: 'Failed to approve payroll run.' };
    }
    
    const { error: invokeError } = await supabase.functions.invoke('payroll-processor', {
        body: { runId },
    });
    
    if (invokeError) {
        // Attempt to roll back the status update
        await supabase.from('payroll_runs').update({ status: 'PENDING_APPROVAL' }).eq('id', runId);
        console.error(invokeError);
        return { error: 'Failed to start payroll processing.' };
    }

    revalidatePath(`/payroll/${runId}`);
    return { success: true };
}