'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Loader2, Plus, CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

interface RevolutionaryCreateExpenseModalProps {
  businessId: string;
  userId: string;
  countryCode?: string;
}

const expenseSchema = z.object({
  date: z.date(),
  description: z.string().min(3, "Enter a description of at least 3 characters"),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  category_id: z.string().min(1, "Select an expense account"),
  payment_account_id: z.string().min(1, "Select where the money was paid from"),
  vendor: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function RevolutionaryCreateExpenseModal({
  businessId,
  userId,
  countryCode = 'UG'
}: RevolutionaryCreateExpenseModalProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

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

  const { data: paymentAccounts, isLoading: loadingPay } = useQuery({
    queryKey: ['accounts', 'payment', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, current_balance, currency')
        .eq('business_id', businessId)
        .eq('type', 'Asset')
        .in('subtype', ['bank', 'cash'])
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
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
        p_currency: 'UGX',
        p_country_code: countryCode,
        p_exchange_rate: 1.0
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Expense saved");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  function onSubmit(values: any) {
    mutation.mutate(values as ExpenseFormValues);
  }

  const isLoadingData = loadingExp || loadingPay;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" />
          New expense
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl p-0 sm:max-w-[560px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle className="text-base font-semibold text-slate-900">New expense</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-medium text-slate-500">Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "h-10 w-full justify-start rounded-lg border-slate-200 text-left text-sm font-normal",
                                !field.value && "text-slate-400"
                              )}
                            >
                              {field.value ? format(field.value, "dd MMM yyyy") : <span>Select date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 text-slate-400" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="z-[1001] w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            captionLayout="dropdown-buttons"
                            fromYear={2010}
                            toYear={new Date().getFullYear()}
                            initialFocus={false}
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
                      <FormLabel className="text-xs font-medium text-slate-500">Amount (UGX)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          value={field.value as string | number}
                          className="h-10 rounded-lg border-slate-200 text-sm tabular-nums"
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
                    <FormLabel className="text-xs font-medium text-slate-500">Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What the money was spent on"
                        {...field}
                        className="h-10 rounded-lg border-slate-200 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-500">Expense account</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger disabled={isLoadingData} className="h-10 rounded-lg border-slate-200 text-sm">
                            <SelectValue placeholder={isLoadingData ? "Loading" : "Select account"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg">
                          {expenseAccounts?.length ? (
                            expenseAccounts.map((acc: any) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code ? `${acc.code} — ` : ''}{acc.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">No accounts available</div>
                          )}
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
                      <FormLabel className="text-xs font-medium text-slate-500">Paid from</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger disabled={isLoadingData} className="h-10 rounded-lg border-slate-200 text-sm">
                            <SelectValue placeholder={isLoadingData ? "Loading" : "Select account"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg">
                          {paymentAccounts?.length ? (
                            paymentAccounts.map((acc: any) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name}
                                <span className="ml-2 text-xs text-slate-400 tabular-nums">
                                  {acc.currency || 'UGX'} {new Intl.NumberFormat().format(acc.current_balance || 0)}
                                </span>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">No accounts available</div>
                          )}
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
                    <FormLabel className="text-xs font-medium text-slate-500">Payee (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Who was paid"
                        {...field}
                        className="h-10 rounded-lg border-slate-200 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-9 rounded-lg bg-slate-900 px-5 text-xs font-medium text-white hover:bg-slate-800"
              >
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save expense
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}