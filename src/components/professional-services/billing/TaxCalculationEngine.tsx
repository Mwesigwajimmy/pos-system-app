'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calculator, Percent, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- Types ---
interface TenantContext { 
  tenantId: string; 
  currency: string; 
  country: string; 
}

interface TaxRule { 
  id: string; 
  name: string; 
  rate: number; 
  applies_to: string[]; 
  country_code: string;
}

interface TaxCalculation {
  totalTax: number;
  breakdown: { name: string; rate: number; amount: number }[];
}

// --- Schema ---
const taxSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  itemType: z.enum(["goods", "services"]),
});

type TaxFormValues = z.infer<typeof taxSchema>;

// --- Data Fetching ---
async function fetchTaxRules(tenantId: string, countryCode: string) {
  const db = createClient();
  const { data, error } = await db
    .from('tax_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('country_code', countryCode)
    .eq('active', true);
  
  if (error) throw error;
  return data as TaxRule[];
}

export default function TaxCalculationEngine({ tenant }: { tenant: TenantContext }) {
  const [result, setResult] = useState<TaxCalculation | null>(null);

  const { data: taxRules, isLoading: loadingRules } = useQuery({
    queryKey: ['tax-rules', tenant.tenantId, tenant.country],
    queryFn: () => fetchTaxRules(tenant.tenantId, tenant.country)
  });

  // Fixed: Removed explicit generic to resolve Zod coercion type mismatch
  const form = useForm({
    resolver: zodResolver(taxSchema),
    defaultValues: { amount: 0, itemType: 'goods' }
  });

  const onSubmit = (data: TaxFormValues) => {
    if (!taxRules || taxRules.length === 0) {
      toast.error(`No tax rules configured for ${tenant.country}`);
      return;
    }

    const breakdown = taxRules
      .filter(rule => rule.applies_to.includes(data.itemType))
      .map(rule => ({
        name: rule.name,
        rate: rule.rate,
        amount: data.amount * (rule.rate / 100)
      }));

    const totalTax = breakdown.reduce((sum, item) => sum + item.amount, 0);

    setResult({ totalTax, breakdown });
    toast.success("Tax calculation complete");
  };

  return (
    <Card className="h-full border-t-4 border-t-emerald-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600" /> Tax Engine
        </CardTitle>
        <CardDescription>
          Real-time calculation using {tenant.country} tax jurisdiction rules.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {loadingRules ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => onSubmit(d as TaxFormValues))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxable Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">{tenant.currency}</span>
                          {/* Fixed: Manual handling of number input */}
                          <Input 
                            type="number" 
                            className="pl-12" 
                            {...field} 
                            value={field.value as number}
                            onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="goods">Physical Goods</SelectItem>
                          <SelectItem value="services">Services / Labor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                Calculate Liability
              </Button>
            </form>
          </Form>
        )}

        {result && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Breakdown</h4>
            
            {result.breakdown.length > 0 ? (
              <div className="space-y-2">
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <Percent className="w-3 h-3" /> {item.name} ({item.rate}%)
                    </span>
                    <span className="font-mono font-medium">
                      {tenant.currency} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="border-t border-slate-300 my-2 pt-2 flex justify-between font-bold text-emerald-800 text-lg">
                  <span>Total Tax</span>
                  <span>{tenant.currency} {result.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500 italic">
                <AlertCircle className="w-4 h-4"/> No applicable taxes found.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}