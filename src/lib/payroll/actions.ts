'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { calculateUniversalPayroll } from './engine';
import { EmployeeWithContract } from '@/types/payroll';
import { format } from 'date-fns';

const getSovereignClient = (cookieStore: ReturnType<typeof cookies>) => {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
                remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
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

  // 1. FORENSIC INFRASTRUCTURE FETCH
  const [
    { data: employees, error: employeesError },
    { data: fluxInputs, error: fluxError },
    { data: tenant }
  ] = await Promise.all([
    supabase.from('employees').select(`id, full_name, business_id, salary:hr_employee_salaries(*)`).eq('business_id', tenantId).eq('is_active', true),
    supabase.from('hr_payroll_inputs').select('*').eq('business_id', tenantId).gte('effective_date', periodStart).lte('effective_date', periodEnd),
    supabase.from('tenants').select('currency_code').eq('id', tenantId).single()
  ]);

  if (employeesError || fluxError) {
    return { error: 'Authoritative Handshake Refused: Infrastructure registry offline.' };
  }

  // 2. DATA TRANSLATION & ARCHITECTURAL MAPPING
  // We store a local map of 'basic_salary' to satisfy the DB constraint later
  const employeeBaseSalaries: Record<string, number> = {};

  const typedEmployees: EmployeeWithContract[] = (employees || []).map(emp => {
      const dbSalary = emp.salary as any;
      const baseAmount = Number(dbSalary?.base_amount || 0);
      employeeBaseSalaries[emp.id] = baseAmount; // SELLING THE BASE VALUE FOR THE SEAL

      const fluxTotal = (fluxInputs || [])
        .filter(f => f.employee_id === emp.id)
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      return {
        id: emp.id,
        full_name: emp.full_name,
        business_id: emp.business_id,
        contracts: {
          contract_elements: [
            {
              amount: baseAmount,
              currency_code: dbSalary?.currency_code || 'UGX',
              payroll_elements: { id: 101, name: 'Basic Salary', type: 'EARNING', is_system_defined: true }
            },
            {
              amount: fluxTotal,
              currency_code: dbSalary?.currency_code || 'UGX',
              payroll_elements: { id: 102, name: 'Operational Flux', type: 'EARNING', is_system_defined: false }
            },
            ...(dynamicElements || []).map((de, idx) => ({
              amount: (baseAmount + fluxTotal) * (Number(de.value) / 100),
              currency_code: 'UGX',
              payroll_elements: { id: 200 + idx, name: de.name, type: de.type, is_system_defined: true }
            }))
          ]
        }
      } as EmployeeWithContract;
  }).filter(emp => {
      const earnings = emp.contracts.contract_elements.filter(e => e.payroll_elements.type === 'EARNING').reduce((s, el) => s + el.amount, 0);
      return earnings > 0;
  });

  if (typedEmployees.length === 0) {
    return { error: 'Node Integrity Error: No personnel with authorized salary detected.' };
  }

  // 3. EXECUTE CALCULATION ENGINE
  try {
      const results = calculateUniversalPayroll(typedEmployees);
      
      // 4. ATOMIC RUN GENERATION
      const { data: run, error: runError } = await supabase.from('hr_payroll_runs').insert({
        business_id: tenantId,
        period_name: `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`,
        status: 'DRAFT',
        total_net_pay: results.reduce((sum, r) => sum + r.netPay, 0),
        total_tax_paye: results.reduce((sum, r) => sum + r.totalDeductions, 0)
      }).select().single();

      if (runError) throw runError;

      // 5. SEAL INDIVIDUAL PAYSLIPS (MANDATORY SCHEMA WELD)
      const payslips = results.map(r => ({
          payroll_run_id: run.id,
          employee_id: r.employeeId,
          business_id: tenantId,
          // --- THE ENTERPRISE FIX ---
          basic_salary: employeeBaseSalaries[r.employeeId], // Satisfies NOT NULL
          net_pay: r.netPay,                                // Satisfies NOT NULL
          // --- ADDITIONAL AUDIT DATA ---
          gross_earnings: r.grossEarnings,
          total_deductions: r.totalDeductions,
          tax_amount: r.details.filter(d => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0),
          currency_code: tenant?.currency_code || 'UGX',
          status: 'DRAFT'
      }));

      const { error: pError } = await supabase.from('hr_payslips').insert(payslips);
      if (pError) throw pError;

      revalidatePath('/payroll');
      return { success: true, runId: run.id };

  } catch (err: any) {
      console.error("SOVEREIGN_ENGINE_FAULT:", err);
      return { error: `Forensic Calculation Error: ${err.message}` };
  }
}