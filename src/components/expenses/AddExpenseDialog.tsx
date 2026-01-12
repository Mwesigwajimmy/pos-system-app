'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Loader2, Plus, CalendarIcon } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// --- Props Interface ---
interface AddExpenseDialogProps {
  businessId: string;
  userId: string;
}

// --- Zod Schema ---
const expenseSchema = z.object({
  date: z.date(),
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category_id: z.string().min(1, "Please select an expense category"),
  payment_account_id: z.string().min(1, "Please select a payment account"),
  vendor: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// --- API Functions ---
async function fetchExpenseAccounts(businessId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounting_accounts')
    .select('id, name, code')
    .eq('business_id', businessId)
    .in('type', ['Expense', 'Cost of Goods Sold', 'Overhead']) 
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

async function fetchPaymentAccounts(businessId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounting_accounts')
    .select('id, name, current_balance, currency') // Changed 'balance' to 'current_balance' to match your schema results
    .eq('business_id', businessId)
    .in('type', ['Bank', 'Cash']) 
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * ENTERPRISE INTERCONNECT:
 * This function calls the record_enterprise_expense PostgreSQL function.
 * It ensures the expense is linked to the General Ledger, updates account balances,
 * and populates the reports system autonomously.
 */
async function createEnterpriseExpense(vars: { values: ExpenseFormValues; businessId: string; userId: string }) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('record_enterprise_expense', {
    p_business_id: vars.businessId,
    p_user_id: vars.userId,
    p_date: format(vars.values.date, 'yyyy-MM-dd'),
    p_description: vars.values.description,
    p_amount: vars.values.amount,
    p_expense_account_id: vars.values.category_id,
    p_payment_account_id: vars.values.payment_account_id,
    p_vendor_name: vars.values.vendor || null,
    p_currency: 'UGX' // Adjust currency logic here if multi-currency is enabled in UI
  });

  if (error) throw new Error(error.message);
  return data;
}

export default function AddExpenseDialog({ businessId, userId }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: expenseAccounts, isLoading: loadingExp } = useQuery({
    queryKey: ['accounts', 'expense', businessId],
    queryFn: () => fetchExpenseAccounts(businessId),
    enabled: open,
  });

  const { data: paymentAccounts, isLoading: loadingPay } = useQuery({
    queryKey: ['accounts', 'payment', businessId],
    queryFn: () => fetchPaymentAccounts(businessId),
    enabled: open,
  });

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      description: '',
      amount: 0,
      category_id: '',
      payment_account_id: '',
      vendor: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createEnterpriseExpense,
    onSuccess: () => {
      toast.success("Enterprise Expense Booked & Ledger Updated");
      // Invalidate both expenses and accounts so balances refresh in UI
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Accounting Error: ${error.message}`);
    },
  });

  function onSubmit(values: ExpenseFormValues) {
    mutation.mutate({ values, businessId, userId });
  }

  const isLoadingAccounts = loadingExp || loadingPay;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record New Enterprise Expense</DialogTitle>
          <DialogDescription>
            Logging this expense will automatically update your General Ledger, Bank Balances, and Financial Reports.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Transaction Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value as string | number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Office Supplies, Monthly Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense GL Account (Debit)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingAccounts}>
                          <SelectValue placeholder={isLoadingAccounts ? "Syncing Accounts..." : "Select Category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseAccounts?.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code ? `${acc.code} - ` : ''}{acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Source (Credit)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={isLoadingAccounts}>
                          <SelectValue placeholder={isLoadingAccounts ? "Syncing Banks..." : "Select Bank/Cash"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentAccounts?.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency || 'UGX' }).format(acc.current_balance || 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor / Payee (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Who was paid?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post to Ledger
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}