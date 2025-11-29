'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Receipt, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

// Schema
const expenseSchema = z.object({
  description: z.string().min(3, "Description required"),
  amount: z.coerce.number().min(1, "Amount must be positive"),
  category: z.enum(['Travel', 'Meals', 'Supplies', 'Software', 'Other']),
  date: z.string().min(1, "Date required"),
  reference: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseClaim {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reference?: string;
  claimant: string;
}

async function fetchExpenses(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('expense_claims').select('*').eq('tenant_id', tenantId).order('date', { ascending: false });
  if (error) throw error;
  return data as ExpenseClaim[];
}

export default function ExpenseClaimsManager({ tenantId, currency }: { tenantId: string; currency: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', tenantId],
    queryFn: () => fetchExpenses(tenantId)
  });

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: 'Travel',
      date: new Date().toISOString().split('T')[0],
      reference: ''
    }
  });

  const createMutation = useMutation({
    mutationFn: async (val: ExpenseFormValues) => {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      
      const { error } = await db.from('expense_claims').insert({
        tenant_id: tenantId,
        ...val,
        status: 'PENDING',
        claimant: user?.email || 'Unknown'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense claim submitted");
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      setIsOpen(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const db = createClient();
      const { error } = await db.from('expense_claims').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] })
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-orange-600"/> Expense Management</CardTitle>
          <CardDescription>Track and approve employee expenses.</CardDescription>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2"/> New Claim
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Claimant</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : expenses?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                  <TableCell className="text-sm text-slate-500">{e.claimant}</TableCell>
                  <TableCell className="text-right font-bold">{currency} {e.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={e.status === 'APPROVED' ? 'default' : e.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === 'PENDING' && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => statusMutation.mutate({ id: e.id, status: 'APPROVED' })}>
                          <CheckCircle className="w-4 h-4"/>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => statusMutation.mutate({ id: e.id, status: 'REJECTED' })}>
                          <XCircle className="w-4 h-4"/>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Expense Claim</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => createMutation.mutate(d as ExpenseFormValues))} className="space-y-4">
              <FormField control={form.control} name="description" render={({field}) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value as string} /></FormControl><FormMessage/></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({field}) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      {/* FIX: Manually handle number input props */}
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value as number}
                        onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                      />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="date" render={({field}) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} value={field.value as string} /></FormControl><FormMessage/></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="category" render={({field}) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Meals">Meals</SelectItem>
                      <SelectItem value="Supplies">Supplies</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Submit Claim</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}