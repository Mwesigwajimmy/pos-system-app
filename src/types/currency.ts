// src/types/currency.ts
import { z } from 'zod';

/**
 * @description Zod schema for validating the FINAL data structure of an exchange rate.
 * This schema uses a robust transform/refine chain to handle string inputs from the form,
 * ensuring compatibility with all Zod v3 versions.
 */
export const ExchangeRateSchema = z.object({
  id: z.number().optional(),
  currency_code: z.string().min(1, 'Currency is required.'),
  rate: z
    .string() // Start with string, as all form inputs are strings
    .min(1, 'Rate is required.') // Ensure the string is not empty
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Rate must be a valid number.',
    }) // Check if it's a number-like string
    .transform((val) => parseFloat(val)) // Convert the string to a number
    .refine((num) => num > 0, {
      message: 'Rate must be a positive number greater than zero.',
    }), // Check if the resulting number is positive
  effective_date: z.string().min(1, 'Effective date is required.'),
});

/**
 * @description TypeScript type inferred from the `ExchangeRateSchema`.
 * Represents the clean, validated, and ready-to-use exchange rate data object.
 * The 'rate' property will be correctly inferred as 'number' after the transform.
 */
export type TExchangeRateSchema = z.infer<typeof ExchangeRateSchema>;

/**
 * @description Represents the raw, unprocessed data structure from the form.
 * This type accurately reflects that 'rate' is a string before validation.
 */
export type TExchangeRateFormInput = {
  id?: number;
  currency_code: string;
  rate: string; // The form's input for rate will always be a string
  effective_date: string;
};

/**
 * @description Represents the data model for an exchange rate as it exists in the database.
 */
export interface ExchangeRate {
  id: number;
  currency_code: string;
  rate: number;
  effective_date: string;
}

/**
 * @description Represents the data model for a currency as it exists in the database.
 */
export interface Currency {
  code: string;
  name: string;
}