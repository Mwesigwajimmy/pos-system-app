import { 
  EmployeeWithContract, 
  PayslipCalculationResult, 
  PayslipDetail 
} from '@/types/payroll';

/**
 * BBU1 SOVEREIGN CALCULATION KERNEL
 * A universal mathematical engine that calculates labor value based on 
 * the provided Contractual Elements.
 */
export function calculateUniversalPayroll(
  employees: EmployeeWithContract[]
): PayslipCalculationResult[] {
  return employees.map(emp => {
    let grossEarnings = 0;
    let totalDeductions = 0;
    let totalEmployerContributions = 0;
    const details: PayslipDetail[] = [];

    // Access the contract elements defined in your Types
    const elements = emp.contracts?.contract_elements || [];

    elements.forEach(ce => {
      const amount = Number(ce.amount || 0);
      const type = ce.payroll_elements?.type;

      if (type === 'EARNING') {
        grossEarnings += amount;
      } else if (type === 'DEDUCTION') {
        totalDeductions += amount;
      } else if (type === 'CONTRIBUTION') {
        totalEmployerContributions += amount;
      }

      details.push({
        elementId: ce.payroll_elements?.id,
        amount: type === 'DEDUCTION' ? -amount : amount
      });
    });

    return {
      employeeId: emp.id,
      grossEarnings,
      totalDeductions,
      totalEmployerContributions,
      netPay: grossEarnings - totalDeductions,
      details
    };
  });
}