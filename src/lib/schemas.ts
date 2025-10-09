import { z } from 'zod';

// Schema for the Manage Float form.
// This version VALIDATES that the amount string is a positive number,
// but it DOES NOT TRANSFORM it. The output type will still be a string.
export const manageFloatSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required.")
    .refine((val) => {
      const num = parseFloat(val);
      // Check that it's a valid number and greater than zero
      return !isNaN(num) && num > 0;
    }, {
      message: "Amount must be a positive number.",
    }),
  notes: z.string().min(3, "Notes are required for this transaction."),
});

// Agent interface remains the same
export interface Agent {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  current_float_balance: number;
}