'use client';

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, AlertCircle } from "lucide-react";

interface DividendRecord { 
    id: string; 
    member_name: string; 
    account_no: string;
    amount: number; 
    declared_date: string; 
    status: 'PROCESSED' | 'PENDING' | 'FAILED'; 
}

async function fetchDividends(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('dividends_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('declared_date', { ascending: false });
  
  if (error) throw error; 
  return data as DividendRecord[];
}

async function distributeDividend({ tenantId, amount, financialYear }: { tenantId: string, amount: number, financialYear: string }) {
  const db = createClient();
  // RPC handles pro-rata calculation based on share capital
  const { error } = await db.rpc('process_dividend_distribution', { 
      p_tenant_id: tenantId, 
      p_total_amount: amount,
      p_financial_year: financialYear
  });
  if (error) throw new Error(error.message);
}

export function DividendManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [year, setYear] = React.useState(new Date().getFullYear().toString());

  const { data: history, isLoading } = useQuery({ 
      queryKey: ['dividends', tenantId], 
      queryFn: () => fetchDividends(tenantId) 
  });

  const mutation = useMutation({ 
      mutationFn: distributeDividend,
      onSuccess: () => {
          toast.success('Dividends processed successfully');
          setAmount('');
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ['dividends', tenantId] });
      },
      onError: (e) => toast.error(e.message || 'Distribution Failed') 
  });

  return (
    <Card className="h-full border-t-4 border-t-amber-500 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500"/> Dividend Management
            </CardTitle>
            <CardDescription>Declare and distribute dividends to members.</CardDescription>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                  <Button className="bg-slate-900 text-white hover:bg-slate-800">Declare Dividends</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Distribute Dividends</DialogTitle>
                      <DialogDescription>
                          This will calculate and credit dividends to all eligible members based on their share capital for the selected year.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Financial Year</label>
                          <Input value={year} onChange={e => setYear(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Total Amount to Distribute</label>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                          />
                      </div>
                      <div className="bg-amber-50 p-3 rounded text-amber-800 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
                          This action is irreversible. Funds will be moved from Retained Earnings to Member Savings accounts immediately.
                      </div>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => mutation.mutate({ tenantId, amount: parseFloat(amount), financialYear: year })} 
                        disabled={!amount || mutation.isPending}
                      >
                          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Confirm Distribution"}
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Dividend Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !history || history.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No dividend history found.</TableCell></TableRow>
                ) : (
                    history.map((d) => (
                    <TableRow key={d.id}>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(d.declared_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                            <span className="font-medium text-slate-800">{d.member_name}</span>
                            <div className="text-xs text-muted-foreground">{d.account_no}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant={d.status === 'PROCESSED' ? 'default' : 'secondary'} className={d.status === 'PROCESSED' ? 'bg-green-600' : ''}>
                                {d.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}