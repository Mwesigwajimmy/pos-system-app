// All country-specific magic numbers live here. Easy to update.
export const NSSF_EMPLOYEE_RATE = 0.05;
export const NSSF_EMPLOYER_RATE = 0.10;

export const PAYE_BRACKETS_UG = [
  { threshold: 235000, rate: 0, baseTax: 0, priorBracketMax: 0 },
  { threshold: 335000, rate: 0.10, baseTax: 0, priorBracketMax: 235000 },
  { threshold: 410000, rate: 0.20, baseTax: 10000, priorBracketMax: 335000 },
  { threshold: 10000000, rate: 0.30, baseTax: 25000, priorBracketMax: 410000 },
  { threshold: Infinity, rate: 0.40, baseTax: 2992000, priorBracketMax: 10000000 }, // Example top bracket
];