'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// --- Schema ---
const lineSchema = z.object({
  accountId: z.string().min(1, "Required"),
  description: z.string().optional(),
  debit: z.coerce.number().min(0),
  credit: z.coerce.number().min(0),
});

const journalSchema = z.object({
  date: z.string().min(1, "Date required"),
  reference: z.string().min(1, "Reference required"),
  description: z.string().min(3, "Description required"),
  lines: z.array(lineSchema).min(2, "At least 2 lines required")
    .refine(lines => {
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    }, "Debits must equal Credits"),
});

interface Account { id: string; name: string; code: string; }

export function CreateJournalEntryModal({ 
  open, 
  onClose, 
  accounts, 
  tenantId, 
  onComplete 
}: { 
  open: boolean; 
  onClose: () => void; 
  accounts: Account[]; 
  tenantId: string; 
  onComplete: () => void; 
}) {
  const form = useForm({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
      lines: [
        { accountId: '', description: '', debit: 0, credit: 0 },
        { accountId: '', description: '', debit: 0, credit: 0 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: z.infer<typeof journalSchema>) => {
    setIsSubmitting(true);
    try {
      const db = createClient();
      
      // 1. Create Header
      const { data: header, error: headErr } = await db.from('journal_entries').insert({
        date: data.date,
        reference: data.reference,
        description: data.description,
        tenant_id: tenantId,
        status: 'POSTED'
      }).select().single();

      if (headErr) throw headErr;

      // 2. Create Lines
      const linesPayload = data.lines.map(l => ({
        journal_entry_id: header.id,
        account_id: l.accountId,
        description: l.description || data.description,
        debit: l.debit,
        credit: l.credit,
        tenant_id: tenantId
      }));

      const { error: lineErr } = await db.from('journal_entry_lines').insert(linesPayload);
      if (lineErr) throw lineErr;

      toast.success("Journal Posted Successfully");
      form.reset();
      onComplete();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Posting Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe calculating with explicit casting to number to avoid TS errors
  const totalDebit = (form.watch('lines') || []).reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = (form.watch('lines') || []).reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
          <DialogDescription>Record a manual adjustment to the general ledger.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="date" render={({field}) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} value={field.value as string} /></FormControl><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control} name="reference" render={({field}) => (
                <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input {...field} value={field.value as string} /></FormControl><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({field}) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value as string} /></FormControl><FormMessage/></FormItem>
              )}/>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[30%]">Account</TableHead>
                    <TableHead>Line Description</TableHead>
                    <TableHead className="w-[15%] text-right">Debit</TableHead>
                    <TableHead className="w-[15%] text-right">Credit</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField control={form.control} name={`lines.${index}.accountId`} render={({field}) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                                value={field.value as string}
                              >
                                <option value="">Select Account...</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}/>
                      </TableCell>
                      <TableCell>
                        <FormField control={form.control} name={`lines.${index}.description`} render={({field}) => (
                          <FormItem className="m-0"><FormControl><Input className="h-9" {...field} value={field.value as string} /></FormControl></FormItem>
                        )}/>
                      </TableCell>
                      <TableCell>
                        <FormField control={form.control} name={`lines.${index}.debit`} render={({field}) => (
                          <FormItem className="m-0">
                            <FormControl>
                              {/* FIX: Manually handle number input to avoid 'unknown' type error */}
                              <Input 
                                type="number" 
                                className="h-9 text-right" 
                                {...field} 
                                value={field.value as number}
                                onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                              />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </TableCell>
                      <TableCell>
                        <FormField control={form.control} name={`lines.${index}.credit`} render={({field}) => (
                          <FormItem className="m-0">
                            <FormControl>
                              {/* FIX: Manually handle number input */}
                              <Input 
                                type="number" 
                                className="h-9 text-right" 
                                {...field} 
                                value={field.value as number}
                                onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                              />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                          <Trash2 className="h-4 w-4 text-red-500"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: '', description: '', debit: 0, credit: 0 })}>
                <PlusCircle className="w-4 h-4 mr-2"/> Add Line
              </Button>
              <div className="flex gap-6 text-sm font-medium">
                <span className="text-slate-600">Total Debit: {totalDebit.toFixed(2)}</span>
                <span className="text-slate-600">Total Credit: {totalCredit.toFixed(2)}</span>
                <span className={isBalanced ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {isBalanced ? "Balanced" : "Unbalanced"}
                </span>
              </div>
            </div>
            {form.formState.errors.lines?.root && <p className="text-red-500 text-sm text-right">{form.formState.errors.lines.root.message}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !isBalanced}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Post Entry
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}