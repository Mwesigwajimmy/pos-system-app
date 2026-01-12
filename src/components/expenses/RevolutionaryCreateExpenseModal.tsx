'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Loader2, PlusCircle, CalendarIcon, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// --- Enterprise Props ---
interface RevolutionaryCreateExpenseModalProps {
  businessId: string;
  userId: string;
}

// --- Enterprise Validation Schema ---
const expenseSchema = z.object({
  date: z.date(),
  description: z.string().min(3, "Description must be detailed for audit purposes"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  category_id: z.string().min(1, "Accounting Category is required"),
  payment_account_id: z.string().min(1, "Payment source (Bank/Cash) is required"),
  vendor: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function RevolutionaryCreateExpenseModal({ businessId, userId }: RevolutionaryCreateExpenseModalProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // --- 1. Fetch Tenant-Specific Expense Accounts ---
  const { data: expenseAccounts, isLoading: loadingExp } = useQuery({
    queryKey: ['accounts', 'expense', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, code')
        .eq('business_id', businessId)
        .in('type', ['Expense', 'Cost of Goods Sold', 'Overhead']) 
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // --- 2. Fetch Tenant-Specific Payment Accounts (Bank/Cash) ---
  const { data: paymentAccounts, isLoading: loadingPay } = useQuery({
    queryKey: ['accounts', 'payment', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, current_balance, currency')
        .eq('business_id', businessId)
        .in('type', ['Bank', 'Cash']) 
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // FIX: Removed strict generic <ExpenseFormValues> to let Zod Resolver handle the 'unknown' vs 'number' type inference
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

  // --- 3. Enterprise Atomic Posting Mutation ---
  const mutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const { data, error } = await supabase.rpc('record_enterprise_expense', {
        p_business_id: businessId,
        p_user_id: userId,
        p_date: format(values.date, 'yyyy-MM-dd'),
        p_description: values.description,
        p_amount: values.amount,
        p_expense_account_id: values.category_id,
        p_payment_account_id: values.payment_account_id,
        p_vendor_name: values.vendor || null,
        p_currency: 'UGX' 
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Expense posted to Ledger successfully");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => {
        toast.error(`Accounting System Error: ${err.message}`);
    }
  });

  function onSubmit(values: any) {
    mutation.mutate(values as ExpenseFormValues);
  }

  const isLoadingData = loadingExp || loadingPay;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg transition-all">
          <PlusCircle className="mr-2 h-4 w-4" />
          Log New Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">Enterprise Expenditure Entry</DialogTitle>
              <DialogDescription>
                This action will perform a double-entry ledger post and update real-time financial reports.
              </DialogDescription>
            </DialogHeader>

            <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs font-medium">
                    Tenant Context: <span className="font-mono">{businessId}</span>
                </AlertDescription>
            </Alert>

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
                            <Button variant={"outline"} className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
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
                        <FormLabel>Total Amount (UGX)</FormLabel>
                        <FormControl>
                        <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            // FIX: Handle string vs number casting for TypeScript compatibility
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
                    <FormLabel>Description / Audit Reference</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., Monthly Internet Subscription - Office B" {...field} />
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
                        <FormLabel>GL Expense Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger disabled={isLoadingData}>
                            <SelectValue placeholder={isLoadingData ? "Syncing..." : "Select Account"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {expenseAccounts?.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.code ? `${acc.code} - ` : ''}{acc.name}</SelectItem>
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
                        <FormLabel>Payment Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger disabled={isLoadingData}>
                            <SelectValue placeholder={isLoadingData ? "Syncing..." : "Select Bank/Cash"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {paymentAccounts?.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name} (UGX {new Intl.NumberFormat().format(acc.current_balance || 0)})</SelectItem>
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
                    <FormLabel>Payee / Vendor (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="Who was the funds recipient?" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[140px]" disabled={mutation.isPending}>
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Post to Ledger"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}