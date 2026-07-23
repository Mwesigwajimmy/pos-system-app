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
    dynamicElements?: any[] // User-defined overrides (PAYE/NSSF)
) {
  const cookieStore = cookies();
  const supabase = getSovereignClient(cookieStore);

  // 1. FORENSIC INFRASTRUCTURE FETCH
  const [
    { data: employees, error: employeesError },
    { data: fluxInputs, error: fluxError }
  ] = await Promise.all([
    // Fetch personnel and their unique salary contract
    supabase.from('employees').select(`
      id, 
      full_name, 
      business_id,
      salary:hr_employee_salaries(*)
    `).eq('business_id', tenantId).eq('is_active', true),
    
    // Fetch commissions/bonuses for this specific window
    supabase.from('hr_payroll_inputs')
      .select('*')
      .eq('business_id', tenantId)
      .gte('effective_date', periodStart)
      .lte('effective_date', periodEnd)
  ]);

  if (employeesError || fluxError) {
    return { error: 'Authoritative Handshake Refused: Infrastructure registry offline.' };
  }

  // 2. DATA TRANSLATION (Mapping DB to your specific Types)
  const typedEmployees: EmployeeWithContract[] = (employees || []).map(emp => {
      // UNIQUE Constraint fix: emp.salary is now a single object, not an array
      const dbSalary = emp.salary as any;
      const basePay = Number(dbSalary?.base_amount || 0);

      // Aggregating Weekly Commissions
      const fluxTotal = (fluxInputs || [])
        .filter(f => f.employee_id === emp.id)
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      // Construct the object following your src/types/payroll.ts interface
      return {
        id: emp.id,
        full_name: emp.full_name,
        business_id: emp.business_id,
        contracts: {
          contract_elements: [
            // Element 1: The Base Contract (Fixed Salary)
            {
              amount: basePay,
              currency_code: dbSalary?.currency_code || 'UGX',
              payroll_elements: { id: 101, name: 'Basic Salary', type: 'EARNING', is_system_defined: true }
            },
            // Element 2: Operational Flux (Commissions)
            {
              amount: fluxTotal,
              currency_code: dbSalary?.currency_code || 'UGX',
              payroll_elements: { id: 102, name: 'Commissions', type: 'EARNING', is_system_defined: false }
            },
            // Dynamic Statutory Elements (PAYE/NSSF from the Form)
            ...(dynamicElements || []).map((de, idx) => ({
              amount: (basePay + fluxTotal) * (Number(de.value) / 100),
              currency_code: 'UGX',
              payroll_elements: { id: 200 + idx, name: de.name, type: de.type, is_system_defined: true }
            }))
          ]
        }
      } as EmployeeWithContract;
  }).filter(emp => {
      // Only include employees who actually have earnings this cycle
      const total = emp.contracts.contract_elements.reduce((s, el) => s + el.amount, 0);
      return total > 0;
  });

  if (typedEmployees.length === 0) {
    return { error: 'Node Integrity Error: No personnel with authorized labor value found.' };
  }

  // 3. EXECUTE SOVEREIGN MATH
  try {
      const results = calculateUniversalPayroll(typedEmployees);
      
      // 4. ATOMIC LEDGER GENERATION
      const { data: run, error: runError } = await supabase.from('hr_payroll_runs').insert({
        business_id: tenantId,
        period_name: `${format(new Date(periodStart), 'dd MMM')} - ${format(new Date(periodEnd), 'dd MMM yyyy')}`,
        status: 'DRAFT',
        total_net_pay: results.reduce((sum, r) => sum + r.netPay, 0),
        total_tax_paye: results.reduce((sum, r) => sum + r.totalDeductions, 0)
      }).select().single();

      if (runError) throw runError;

      // 5. SEAL INDIVIDUAL PAYSLIPS
      const payslips = results.map(r => ({
          payroll_run_id: run.id,
          employee_id: r.employeeId,
          business_id: tenantId,
          gross_earnings: r.grossEarnings,
          net_pay: r.netPay,
          total_deductions: r.totalDeductions,
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