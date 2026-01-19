"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, Search, FileText, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface TaxReturn {
  id: string;
  tax_type: string;
  entity: string;
  country: string;
  period_name: string;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  currency: string;
  status: 'draft' | 'submitted' | 'paid' | 'late';
  submitted_at: string | null;
  filing_reference: string | null;
  total_liability: number;
}

interface Props {
  initialReturns: TaxReturn[];
  businessId: string;
  userId: string;
}

export default function TaxReturnsTable({ initialReturns, businessId, userId }: Props) {
  const [filter, setFilter] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<TaxReturn | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // 1. Live Data Query
  const { data: returns, isLoading, refetch } = useQuery({
    queryKey: ['tax_returns', businessId],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('accounting_tax_returns')
            .select('*')
            .eq('business_id', businessId)
            .order('end_date', { ascending: false });
        if (error) throw error;
        return data as TaxReturn[];
    },
    initialData: initialReturns
  });

  // 2. Reconciliation Mutation (The Interconnect)
  const reconcileMutation = useMutation({
      mutationFn: async () => {
          const { data, error } = await supabase.rpc('rpc_run_global_tax_reconciliation');
          if (error) throw error;
          return data;
      },
      onSuccess: (data) => {
          toast.success(data.message || "Reconciliation successful");
          queryClient.invalidateQueries({ queryKey: ['tax_returns'] });
      },
      onError: (err: any) => toast.error(`Sync Failed: ${err.message}`)
  });

  const filtered = useMemo(() =>
      returns.filter(r =>
          (r.tax_type || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.period_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [returns, filter]
  );

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filter returns..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8" 
                />
            </div>
            {/* THIS BUTTON NOW PULLS FROM POS, INVENTORY AND LEDGER */}
            <Button 
                variant="outline" 
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
            >
                {reconcileMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Run Tax Report
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Filings Overview</CardTitle>
                <CardDescription>Monitor your global tax obligations across all revenue streams.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                        <TableHead>Tax Type & Entity</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Net Liability</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground font-medium">No tax returns found.</p>
                                <p className="text-xs text-muted-foreground">Click "Run Tax Report" to generate them from your POS and Ledger.</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map(r => (
                        <TableRow key={r.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div className="flex flex-col">
                                        <span>{r.tax_type}</span>
                                        <span className="text-xs text-muted-foreground">{r.entity} • {r.country}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{r.period_name}</TableCell>
                            <TableCell>{format(new Date(r.end_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right font-mono font-medium">
                                <span className={r.total_liability > 0 ? "text-red-600" : "text-green-600"}>
                                    {new Intl.NumberFormat(undefined, { style: 'currency', currency: r.currency || 'UGX' }).format(r.total_liability)}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge variant={r.status === 'submitted' || r.status === 'paid' ? 'default' : 'outline'} className={r.status === 'submitted' ? 'bg-green-600' : ''}>
                                    {r.status.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{r.filing_reference || '-'}</TableCell>
                            <TableCell className="text-right">
                                {r.status === 'draft' ? (
                                    <Button size="sm" onClick={() => { setSelectedReturn(r); setIsSubmitOpen(true); }}>
                                        Submit
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="ghost" className="h-8">
                                        <FileDown className="h-4 w-4 mr-1" /> PDF
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
                </ScrollArea>
            </CardContent>
        </Card>

        {/* Reusing your existing Submit Dialog */}
        <SubmitReturnDialog 
            taxReturn={selectedReturn} 
            isOpen={isSubmitOpen} 
            onClose={() => setIsSubmitOpen(false)} 
        />
    </div>
  );
}

// --- Submit Dialog (Simplified Internal Reference) ---
const submitTaxData = async (id: string, ref: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('accounting_tax_returns').update({ status: 'submitted', filing_reference: ref, submitted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
};

const SubmitReturnDialog = ({ taxReturn, isOpen, onClose }: { taxReturn: TaxReturn | null, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [filingRef, setFilingRef] = useState('');
    const mutation = useMutation({
        mutationFn: () => submitTaxData(taxReturn!.id, filingRef),
        onSuccess: () => { toast.success("Filing successful"); queryClient.invalidateQueries({ queryKey: ['tax_returns'] }); onClose(); },
        onError: (err: any) => toast.error(err.message)
    });
    if (!taxReturn) return null;
    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader><DialogTitle>Submit Filing</DialogTitle><DialogDescription>Enter reference for {taxReturn.tax_type} ({taxReturn.period_name})</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Reference Number</Label><Input value={filingRef} onChange={e => setFilingRef(e.target.value)} placeholder="e.g. URA-VAT-001" /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => mutation.mutate()} disabled={!filingRef || mutation.isPending}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};