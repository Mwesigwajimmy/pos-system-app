"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";
import { toast } from 'sonner';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, FileDown, Search, FileText, CheckCircle, AlertCircle 
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// --- Types ---
export interface TaxReturn {
  id: string;
  tax_type: string; // VAT, GST, PAYE, CIT
  entity: string;   // Legal Entity Name
  country: string;
  period_name: string; // e.g. "Q1 2024"
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

// --- API Functions ---
const fetchReturnsClient = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_tax_returns')
        .select('*')
        .eq('business_id', businessId)
        .order('end_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data as TaxReturn[];
};

const submitReturn = async (payload: { id: string; filing_ref: string; date: string }) => {
    const supabase = createClient();
    const { error } = await supabase
        .from('accounting_tax_returns')
        .update({
            status: 'submitted',
            submitted_at: payload.date,
            filing_reference: payload.filing_ref
        })
        .eq('id', payload.id);

    if (error) throw new Error(error.message);
};

// --- Sub-Component: Submit Dialog ---
const SubmitReturnDialog = ({ 
    taxReturn, 
    isOpen, 
    onClose 
}: { 
    taxReturn: TaxReturn | null, 
    isOpen: boolean, 
    onClose: () => void 
}) => {
    const queryClient = useQueryClient();
    const [filingRef, setFilingRef] = useState('');

    const mutation = useMutation({
        mutationFn: submitReturn,
        onSuccess: () => {
            toast.success("Tax return marked as submitted");
            queryClient.invalidateQueries({ queryKey: ['tax_returns'] });
            onClose();
            setFilingRef('');
        },
        onError: (err) => toast.error(err.message)
    });

    if (!taxReturn) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>File Tax Return</DialogTitle>
                    <DialogDescription>
                        Mark <strong>{taxReturn.tax_type} ({taxReturn.period_name})</strong> as submitted.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Liability Amount</Label>
                        <div className="font-mono text-lg font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: taxReturn.currency }).format(taxReturn.total_liability)}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Filing Reference Number</Label>
                        <Input 
                            placeholder="e.g. VAT-2024-001-ACK" 
                            value={filingRef} 
                            onChange={(e) => setFilingRef(e.target.value)} 
                        />
                        <p className="text-xs text-muted-foreground">Enter the confirmation code from the tax authority portal.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        onClick={() => mutation.mutate({ id: taxReturn.id, filing_ref: filingRef, date: new Date().toISOString() })} 
                        disabled={mutation.isPending || !filingRef}
                    >
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Submission
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---
export default function TaxReturnsTable({ initialReturns, businessId, userId }: Props) {
  const [filter, setFilter] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<TaxReturn | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  // React Query for live data
  const { data: returns, isLoading } = useQuery({
    queryKey: ['tax_returns', businessId],
    queryFn: () => fetchReturnsClient(businessId),
    initialData: initialReturns
  });

  const filtered = useMemo(() =>
      returns.filter(r =>
          (r.tax_type || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.period_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [returns, filter]
  );

  const handleOpenSubmit = (r: TaxReturn) => {
      setSelectedReturn(r);
      setIsSubmitOpen(true);
  };

  return (
    <div className="space-y-4">
        {/* Header Controls */}
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
            {/* In a real app, this button would trigger a server function to calculate tax based on the ledger */}
            <Button variant="outline">
                <Loader2 className="mr-2 h-4 w-4" /> Run Tax Report
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Filings Overview</CardTitle>
                <CardDescription>Monitor your tax obligations and submission status.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                        <TableHead>Tax Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Liability</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tax returns found.</TableCell></TableRow>
                    ) : (
                        filtered.map(r => (
                        <TableRow key={r.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div className="flex flex-col">
                                        <span>{r.tax_type}</span>
                                        <span className="text-xs text-muted-foreground">{r.country}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>{r.period_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(r.start_date), 'MMM')} - {format(new Date(r.end_date), 'MMM yyyy')}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>{format(new Date(r.end_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right font-mono font-medium">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currency }).format(r.total_liability)}
                            </TableCell>
                            <TableCell>
                                {r.status === 'submitted' ? (
                                    <Badge className="bg-green-600 hover:bg-green-700">Submitted</Badge>
                                ) : r.status === 'paid' ? (
                                    <Badge className="bg-blue-600">Paid</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">Draft</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                                {r.filing_reference || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                {r.status === 'draft' ? (
                                    <Button size="sm" onClick={() => handleOpenSubmit(r)}>
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

        <SubmitReturnDialog 
            taxReturn={selectedReturn} 
            isOpen={isSubmitOpen} 
            onClose={() => setIsSubmitOpen(false)} 
        />
    </div>
  );
}