'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { calculateUgandaPayroll } from '../localization/ug/calculator';
import { EmployeeWithContract, PayrollElement } from '@/types/payroll';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - SOVEREIGN PAYROLL ENGINE
 * 
 * VERSION: 10.9 | AUTHORITATIVE MULTI-TENANT WELD
 * This engine dynamically resolves business context and executes 
 * jurisdictional labor calculations across the global BBU1 network.
 */

// Authoritative client factory for server actions
const getSovereignClient = (cookieStore: ReturnType<typeof cookies>) => {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: '', ...options })
                },
            },
        }
    );
};

export async function runPayrollCalculation(
    tenantId: string, 
    periodStart: string, 
    periodEnd: string,
    dynamicElements?: any[] // Support for user-defined tax/earning rates
) {
  const cookieStore = cookies();
  const supabase = getSovereignClient(cookieStore);

  // 1. FORENSIC INFRASTRUCTURE FETCH
  // Physically targeting the 'hr_' prefixed tables establishing in the DB seal.
  const [
    { data: tenant, error: tenantError },
    { data: employees, error: employeesError },
    { data: elements, error: elementsError },
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    // Joins the employee record with the compensation ledger
    supabase.from('employees').select(`
      *,
      salaries:hr_employee_salaries (
        base_amount,
        currency_code
      )
    `).eq('business_id', tenantId).eq('is_active', true),
    // Fetches the active tax/earning elements defined for this specific business
    supabase.from('hr_payroll_elements').select('*').eq('business_id', tenantId).eq('is_active', true),
  ]);

  // ERROR SHIELD: Prevents execution if the physical pipes are broken
  if (tenantError || employeesError || elementsError) {
    console.error("LITONU_FINANCIAL_HANDSHAKE_FAULT:", { tenantError, employeesError, elementsError });
    return { error: 'Authoritative Handshake Refused: Connection to labor registry failed.' };
  }

  // 2. DATA TRANSLATION & WELDING
  // Converts DB results into the 'Contract' shape required by the mathematical kernel
  const typedEmployees = employees.map(emp => ({
      ...emp,
      contracts: (emp as any).salaries?.map((s: any) => ({
          amount: s.base_amount,
          currency_code: s.currency_code
      })) || []
  })) as unknown as EmployeeWithContract[];

  if (!tenant || !typedEmployees || typedEmployees.length === 0) {
    return { error: 'Node Integrity Error: No authorized personnel or salary records found in this node.' };
  }

  // Resolve elements (Prioritize UI-passed dynamic overrides for specific runs)
  const activeElements = (dynamicElements && dynamicElements.length > 0) ? dynamicElements : elements;
  const elementMap = activeElements.reduce((acc, el) => {
    acc[el.name] = el as PayrollElement;
    return acc;
  }, {} as Record<string, PayrollElement>);

  // 3. JURISDICTIONAL MATH EXECUTION
  let calculationResults;
  const countryCode = tenant.country_code || 'UG';
  
  switch (countryCode) {
    case 'UG':
      // Authoritative Uganda/URA Logic
      calculationResults = calculateUgandaPayroll(typedEmployees, elementMap);
      break;
    default:
      return { error: `Sovereign Protocol Alert: Logic for country ${countryCode} not yet birthed in this node.` };
  }
  
  // 4. ATOMIC LEDGER GENERATION
  // Creates the Master Payroll Run in hr_payroll_runs
  const { data: run, error: runError } = await supabase.from('hr_payroll_runs').insert({
    business_id: tenantId,
    period_name: `${periodStart} to ${periodEnd}`,
    status: 'DRAFT',
    total_net_pay: calculationResults.reduce((sum, res) => sum + res.netPay, 0),
    total_tax_paye: calculationResults.reduce((sum, res) => sum + res.totalDeductions, 0) 
  }).select().single();
  
  if (runError) {
      console.error("PAYROLL_LEDGER_ERROR:", runError);
      return { error: 'Failed to initialize the labor ledger for this cycle.' };
  }

  // 5. SEAL INDIVIDUAL PAYSLIPS
  const payslipInserts = calculationResults.map(res => ({
    payroll_run_id: run.id,
    employee_id: res.employeeId,
    business_id: tenantId,
    currency_code: tenant.currency_code || 'UGX',
    gross_earnings: res.grossEarnings,
    net_pay: res.netPay,
    total_deductions: res.totalDeductions,
    status: 'DRAFT'
  }));
  
  const { data: payslips, error: payslipsError } = await supabase.from('hr_payslips').insert(payslipInserts).select();

  if(payslipsError || !payslips) {
      // Emergency Rollback
      await supabase.from('hr_payroll_runs').delete().eq('id', run.id);
      return { error: 'Identity Collision: Could not seal individual payslips in the database.' };
  }

  // 6. RECORD ITEMIZED DETAILS (Statutory Breakdown)
  const detailInserts = payslips.flatMap(p => {
    const result = calculationResults.find(res => res.employeeId === p.employee_id);
    if (!result) return [];
    return result.details.map(d => ({
        payslip_id: p.id,
        element_id: d.elementId,
        calculated_amount: d.amount
    }));
  });

  const { error: detailsError } = await supabase.from('hr_payslip_details').insert(detailInserts);
  
  if(detailsError) {
      await supabase.from('hr_payroll_runs').delete().eq('id', run.id);
      return { error: 'Forensic Failure: Could not record statutory tax breakdown.' };
  }
  
  revalidatePath('/payroll');
  return { success: true, runId: run.id };
}

export async function approvePayrollRun(runId: string) {
    const cookieStore = cookies();
    const supabase = getSovereignClient(cookieStore);
    
    // Updates status to 'PAID' in the authoritative history table
    const { error } = await supabase
        .from('hr_payroll_runs')
        .update({ status: 'PAID' })
        .eq('id', runId);

    if (error) {
        console.error("AUTHORIZATION_REJECTED:", error);
        return { error: 'Ledger authorization failed. Permission denied.' };
    }
    
    revalidatePath(`/payroll/${runId}`);
    return { success: true };
}