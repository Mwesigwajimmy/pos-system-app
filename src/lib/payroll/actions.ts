'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { calculateUgandaPayroll } from '../localization/ug/calculator';
import { EmployeeWithContract, PayrollElement } from '@/types/payroll';

/**
 * LITONU BUSINESS BASE UNIVERSE LTD - SOVEREIGN PAYROLL ENGINE
 * VERSION: 11.0 | AUTHORITATIVE MULTI-TENANT FLUX WELD
 */

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
    dynamicElements?: any[]
) {
  const cookieStore = cookies();
  const supabase = getSovereignClient(cookieStore);

  // 1. AUTHORITATIVE INFRASTRUCTURE FETCH
  const [
    { data: tenant, error: tenantError },
    { data: employees, error: employeesError },
    { data: elements, error: elementsError },
    { data: fluxInputs, error: fluxError }
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    // Joins with Base Salary Contract
    supabase.from('employees').select(`
      *,
      salaries:hr_employee_salaries (
        base_amount,
        currency_code,
        pay_frequency
      )
    `).eq('business_id', tenantId).eq('is_active', true),
    // Standard Tax Elements
    supabase.from('hr_payroll_elements').select('*').eq('business_id', tenantId).eq('is_active', true),
    // NEW: Fetch Weekly Commissions/Bonuses (Operational Flux)
    supabase.from('hr_payroll_inputs')
      .select('*')
      .eq('business_id', tenantId)
      .gte('effective_date', periodStart)
      .lte('effective_date', periodEnd)
  ]);

  if (tenantError || employeesError || elementsError || fluxError) {
    console.error("LITONU_FINANCIAL_HANDSHAKE_FAULT:", { tenantError, employeesError, elementsError, fluxError });
    return { error: 'Authoritative Handshake Refused: Connection to labor registry failed.' };
  }

  // 2. DATA TRANSLATION & FLUX WELDING
  const typedEmployees = employees
    .filter(emp => {
        // SAFETY: Filter out people with 0.00 or missing salaries
        const salary = (emp as any).salaries;
        const amount = Array.isArray(salary) ? salary[0]?.base_amount : salary?.base_amount;
        return amount > 0;
    })
    .map(emp => {
      const salary = (emp as any).salaries;
      
      // FIX: Handle both Array and Object returns from Supabase (The Weld)
      const baseSalaryRecord = Array.isArray(salary) ? salary[0] : salary;
      
      // Calculate total flux (Commissions/Bonuses) for this specific person
      const personnelFlux = fluxInputs
        ?.filter(f => f.employee_id === emp.id)
        .reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      return {
          ...emp,
          contracts: [{
              amount: Number(baseSalaryRecord?.base_amount || 0) + personnelFlux,
              currency_code: baseSalaryRecord?.currency_code || 'UGX'
          }]
      };
  }) as unknown as EmployeeWithContract[];

  if (!tenant || typedEmployees.length === 0) {
    return { error: 'Node Integrity Error: No authorized personnel with active salaries found for this cycle.' };
  }

  const activeElements = (dynamicElements && dynamicElements.length > 0) ? dynamicElements : elements;
  const elementMap = activeElements.reduce((acc, el) => {
    acc[el.name] = el as PayrollElement;
    return acc;
  }, {} as Record<string, PayrollElement>);

  // 3. JURISDICTIONAL MATH EXECUTION
  let calculationResults;
  const countryCode = tenant.country_code || 'UG';
  
  if (countryCode === 'UG') {
      calculationResults = calculateUgandaPayroll(typedEmployees, elementMap);
  } else {
      return { error: `Logic for country ${countryCode} not yet birthed.` };
  }
  
  // 4. ATOMIC LEDGER GENERATION
  const { data: run, error: runError } = await supabase.from('hr_payroll_runs').insert({
    business_id: tenantId,
    period_name: `${format(new Date(periodStart), 'MMM d')} to ${format(new Date(periodEnd), 'MMM d, yyyy')}`,
    status: 'DRAFT',
    total_net_pay: calculationResults.reduce((sum, res) => sum + res.netPay, 0),
    total_tax_paye: calculationResults.reduce((sum, res) => sum + res.totalDeductions, 0) 
  }).select().single();
  
  if (runError) return { error: 'Failed to initialize the labor ledger for this cycle.' };

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
  
  const { error: payslipsError } = await supabase.from('hr_payslips').insert(payslipInserts);

  if(payslipsError) {
      await supabase.from('hr_payroll_runs').delete().eq('id', run.id);
      return { error: 'Identity Collision: Could not seal individual payslips.' };
  }

  revalidatePath('/payroll');
  return { success: true, runId: run.id };
}

// ... approvePayrollRun remains the same ...