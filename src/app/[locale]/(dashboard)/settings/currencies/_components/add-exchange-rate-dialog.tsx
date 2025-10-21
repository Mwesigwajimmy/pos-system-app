// src/app/(dashboard)/settings/currencies/_components/add-exchange-rate-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PlusCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useCurrencies, useUpsertExchangeRate } from '@/hooks/use-exchange-rates';
import { ExchangeRateSchema, TExchangeRateFormInput, TExchangeRateSchema } from '@/types/currency';
import { toast } from 'sonner';

interface AddExchangeRateDialogProps {
  initialData?: TExchangeRateSchema;
  children: React.ReactNode;
}

/**
 * A robust, reusable dialog component for creating or editing exchange rates.
 * It uses manual Zod validation for maximum reliability and type safety,
 * decoupling the form's state from the final data validation.
 */
export function AddExchangeRateDialog({ initialData, children }: AddExchangeRateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isEditMode = !!initialData;

  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
  const mutation = useUpsertExchangeRate();

  const form = useForm<TExchangeRateFormInput>({
    defaultValues: {
      id: initialData?.id,
      currency_code: initialData?.currency_code || '',
      rate: initialData?.rate ? String(initialData.rate) : '',
      effective_date: initialData?.effective_date || new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    form.reset({
      id: initialData?.id,
      currency_code: initialData?.currency_code || '',
      rate: initialData?.rate ? String(initialData.rate) : '',
      effective_date: initialData?.effective_date || new Date().toISOString().split('T')[0],
    });
  }, [initialData, form]);

  const onSubmit = (values: TExchangeRateFormInput) => {
    // Manually validate the data using the Zod schema.
    // The schema itself handles the transformation of 'rate' from string to number.
    const validationResult = ExchangeRateSchema.safeParse(values);

    if (!validationResult.success) {
      // If validation fails, iterate over the issues and set them in the form state.
      validationResult.error.issues.forEach((error) => {
        const fieldName = error.path[0] as keyof TExchangeRateFormInput;
        form.setError(fieldName, { type: 'manual', message: error.message });
      });
      return;
    }

    // If validation succeeds, call the API mutation with the clean, transformed data.
    mutation.mutate(validationResult.data, {
      onSuccess: () => {
        const successMessage = isEditMode ? 'Exchange rate updated successfully!' : 'Exchange rate created successfully!';
        toast.success(successMessage);
        setIsOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to save rate: ${error.message || 'An unknown error occurred.'}`);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Exchange Rate' : 'Add New Exchange Rate'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id="rate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="currency_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                    <FormControl>
                      <SelectTrigger disabled={isLoadingCurrencies}>
                        <SelectValue placeholder={isLoadingCurrencies ? 'Loading currencies...' : 'Select a currency...'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies?.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.code})
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
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate (1 Foreign Unit = ? UGX)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="e.g., 3850.55" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effective_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button form="rate-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mutation.isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}