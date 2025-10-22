import { EmployeeWithContract, PayslipCalculationResult, PayrollElement } from '@/types/payroll';
import { NSSF_EMPLOYEE_RATE, NSSF_EMPLOYER_RATE, PAYE_BRACKETS_UG } from './constants';

// This is the advanced, data-driven calculation engine for Uganda.
export function calculateUgandaPayroll(
  employees: EmployeeWithContract[],
  systemElements: Record<string, PayrollElement>
): PayslipCalculationResult[] {
  const results: PayslipCalculationResult[] = [];

  const basicSalaryElemId = systemElements['Basic Salary'].id;
  const payeElemId = systemElements['PAYE'].id;
  const nssfEmployeeElemId = systemElements['NSSF Employee'].id;
  const nssfEmployerElemId = systemElements['NSSF Employer'].id;

  for (const employee of employees) {
    if (!employee.contracts) continue;

    const basicSalaryElement = employee.contracts.contract_elements.find(
      (el) => el.payroll_elements.id === basicSalaryElemId
    );
    const grossEarnings = Number(basicSalaryElement?.amount || 0);

    const details: PayslipCalculationResult['details'] = [{ elementId: basicSalaryElemId, amount: grossEarnings }];

    // 1. Calculate NSSF
    const nssfEmployee = grossEarnings * NSSF_EMPLOYEE_RATE;
    const nssfEmployer = grossEarnings * NSSF_EMPLOYER_RATE;
    details.push({ elementId: nssfEmployeeElemId, amount: -nssfEmployee });
    details.push({ elementId: nssfEmployerElemId, amount: nssfEmployer });

    // 2. Calculate PAYE
    const taxableIncome = grossEarnings - nssfEmployee;
    let paye = 0;
    const bracket = PAYE_BRACKETS_UG.find(b => taxableIncome <= b.threshold)!;
    if (bracket.rate > 0) {
      paye = bracket.baseTax + (taxableIncome - bracket.priorBracketMax) * bracket.rate;
    }
    details.push({ elementId: payeElemId, amount: -paye });

    // 3. Calculate Totals
    const totalDeductions = nssfEmployee + paye;
    const netPay = grossEarnings - totalDeductions;
    const totalEmployerContributions = nssfEmployer;

    results.push({
      employeeId: employee.id,
      grossEarnings,
      netPay,
      totalDeductions,
      totalEmployerContributions,
      details,
    });
  }
  return results;
}