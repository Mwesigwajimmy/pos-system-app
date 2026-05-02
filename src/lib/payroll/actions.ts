'use server';

import { cookies } from 'next/headers';
import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { calculateUgandaPayroll } from '../localization/ug/calculator';
import { EmployeeWithContract, PayrollElement } from '@/types/payroll';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - SOVEREIGN PAYROLL ENGINE
 * 
 * UPGRADE: Authoritative Schema Sync.
 * Redirects the data pipe to the 'hr_' prefixed enterprise tables.
 */
export async function runPayrollCalculation(tenantId: string, periodStart: string, periodEnd: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHORITATIVE CONTEXT FETCHING
  // Switched to 'hr_' prefixes and the 'hr_employee_salaries' ledger.
  const [
    { data: tenant, error: tenantError },
    { data: employees, error: employeesError },
    { data: elements, error: elementsError },
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    supabase.from('employees').select(`
      *,
      salaries:hr_employee_salaries (
        base_amount,
        currency_code
      )
    `).eq('business_id', tenantId).eq('is_active', true),
    supabase.from('hr_payroll_elements').select('*').eq('business_id', tenantId).eq('is_active', true),
  ]);

  if (tenantError || employeesError || elementsError) {
    console.error("FINANCIAL_FETCH_FAILURE:", { tenantError, employeesError, elementsError });
    return { error: 'Failed to fetch initial payroll data. Connection to hr_ tables refused.' };
  }

  // 2. DATA TRANSLATION
  // Maps the compensation ledger to the 'contracts' structure expected by your math engine
  const typedEmployees = employees.map(emp => ({
      ...emp,
      contracts: (emp as any).salaries?.map((s: any) => ({
          amount: s.base_amount,
          currency_code: s.currency_code
      })) || []
  })) as unknown as EmployeeWithContract[];

  if (!tenant || !typedEmployees || !elements) {
    return { error: 'Infrastructure Mismatch: Critical payroll elements missing.' };
  }

  const systemElements = elements.reduce((acc, el) => {
    acc[el.name] = el as PayrollElement;
    return acc;
  }, {} as Record<string, PayrollElement>);

  // 3. JURISDICTIONAL CALCULATION (Uganda/URA Standard)
  let calculationResults;
  switch (tenant.country_code) {
    case 'UG':
      calculationResults = calculateUgandaPayroll(typedEmployees, systemElements);
      break;
    default:
      return { error: `Sovereign Alert: Jurisdiction ${tenant.country_code} is not yet birthed.` };
  }
  
  // 4. ATOMIC LEDGER GENERATION
  const { data: run, error: runError } = await supabase.from('hr_payroll_runs').insert({
    business_id: tenantId,
    period_name: `${periodStart} to ${periodEnd}`,
    status: 'PENDING_APPROVAL',
    total_net_pay: calculationResults.reduce((sum, res) => sum + res.netPay, 0),
    total_tax_paye: calculationResults.reduce((sum, res) => sum + res.totalDeductions, 0) // Simplified mapping
  }).select().single();
  
  if (runError) {
      console.error("PAYROLL_RUN_INSERT_ERROR:", runError);
      return { error: 'Failed to initialize payroll run in the ledger.' };
  }

  const payslipInserts = calculationResults.map(res => ({
    payroll_run_id: run.id,
    employee_id: res.employeeId,
    business_id: tenantId,
    currency_code: tenant.currency_code,
    gross_earnings: res.grossEarnings,
    net_pay: res.netPay,
    total_deductions: res.totalDeductions,
    status: 'DRAFT'
  }));
  
  const { data: payslips, error: payslipsError } = await supabase.from('hr_payslips').insert(payslipInserts).select();

  if(payslipsError || !payslips) {
      await supabase.from('hr_payroll_runs').delete().eq('id', run.id);
      return { error: 'Identity Collision: Failed to seal employee payslips.' };
  }
  
  revalidatePath('/payroll');
  return { success: true, runId: run.id };
}

export async function approvePayrollRun(runId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Updates status to 'PAID' in the authoritative registry
    const { error } = await supabase.from('hr_payroll_runs').update({ status: 'PAID' }).eq('id', runId);

    if (error) {
        console.error("APPROVAL_ERROR:", error);
        return { error: 'Ledger authorization failed.' };
    }
    
    revalidatePath(`/payroll/${runId}`);
    return { success: true };
}