// src/types/payroll.ts

// The minimal types required for the payroll calculation engine

export interface PayrollElement {
  id: number; // The unique ID of the payroll element (e.g., Basic Salary, PAYE)
  name: string;
  is_system_defined: boolean;
  type: 'EARNING' | 'DEDUCTION' | 'CONTRIBUTION'; // Example types
  // Add other properties from your payroll_elements table here
}

export interface ContractElement {
  amount: number;
  currency_code: string;
  payroll_elements: PayrollElement; // Assuming this is the joined object
  // Add other properties from your contract_elements table here
}

export interface Contract {
  contract_elements: ContractElement[]; // An array of the elements tied to this contract
  // Add other properties from your contracts table here
}

export interface EmployeeWithContract {
  id: string; // Employee ID
  full_name: string;
  contracts: Contract;
  // Add other properties from your employees table here
  [key: string]: any; // Catch-all for other employee fields
}

export interface PayslipDetail {
  elementId: number;
  amount: number; // Positive for Earnings/Contributions, Negative for Deductions
}

export interface PayslipCalculationResult {
  employeeId: string;
  grossEarnings: number;
  netPay: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  details: PayslipDetail[];
}