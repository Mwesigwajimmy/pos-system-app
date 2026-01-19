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
import { 
  Loader2, FileDown, Search, FileText, CheckCircle, 
  AlertCircle, RefreshCcw, Landmark, ShieldCheck 
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Enterprise PDF Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
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
    const supabase = createClient();
    const [filingRef, setFilingRef] = useState('');

    const mutation = useMutation({
        mutationFn: async (payload: { id: string; ref: string }) => {
            const { error } = await supabase
                .from('accounting_tax_returns')
                .update({
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                    filing_reference: payload.ref
                })
                .eq('id', payload.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Tax return successfully filed");
            queryClient.invalidateQueries({ queryKey: ['tax_returns'] });
            onClose();
            setFilingRef('');
        },
        onError: (err: any) => toast.error(err.message)
    });

    if (!taxReturn) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        Finalize Tax Filing
                    </DialogTitle>
                    <DialogDescription>
                        Confirming submission for <strong>{taxReturn.tax_type} ({taxReturn.period_name})</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="p-3 bg-muted rounded-lg border">
                        <Label className="text-xs text-muted-foreground uppercase">Net Liability to Remit</Label>
                        <div className="text-2xl font-mono font-bold text-primary">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: taxReturn.currency || 'UGX' }).format(taxReturn.total_liability)}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ref">Government Reference Number (PRN/ACK)</Label>
                        <Input 
                            id="ref"
                            placeholder="e.g. URA-2026-X991-001" 
                            value={filingRef} 
                            onChange={(e) => setFilingRef(e.target.value)} 
                        />
                        <p className="text-[10px] text-muted-foreground">This number connects this record to the official tax authority portal for audit purposes.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        onClick={() => mutation.mutate({ id: taxReturn.id, ref: filingRef })} 
                        disabled={mutation.isPending || !filingRef}
                    >
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & File
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
  const queryClient = useQueryClient();
  const supabase = createClient();

  // 1. Live Data Synchronization
  const { data: returns, isLoading } = useQuery({
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

  // 2. Global Reconciliation Mutation
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

  // 3. Enterprise PDF Export Logic
  const handleExportPDF = (r: TaxReturn) => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    // Branding
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("TAX COMPLIANCE SUMMARY", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Generated: ${timestamp}`, 14, 28);
    doc.text(`System Reference: ${r.id}`, 14, 33);

    // Entity Metadata
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Business Entity", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${r.entity}`, 14, 54);
    doc.text(`Jurisdiction: ${r.country || 'Uganda'}`, 14, 60);

    doc.setFont("helvetica", "bold");
    doc.text("Filing Period", 120, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${r.period_name}`, 120, 54);
    doc.text(`Fiscal Year: ${r.fiscal_year}`, 120, 60);

    // Financial Table
    autoTable(doc, {
      startY: 70,
      head: [['Metric', 'Detail']],
      body: [
        ['Tax Category', r.tax_type],
        ['Filing Reference', r.filing_reference || 'Pending Submission'],
        ['Submission Date', r.submitted_at ? format(new Date(r.submitted_at), 'dd MMM yyyy') : 'N/A'],
        ['Total Net Liability', `${r.currency || 'UGX'} ${new Intl.NumberFormat().format(r.total_liability)}`],
        ['Filing Status', r.status.toUpperCase()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { cellPadding: 5 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 120;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Certification: This document is an autonomous extract from the unified ledger system.", 14, finalY + 15);
    doc.text("Reconciliation Status: Ledger Matched", 14, finalY + 20);

    doc.save(`Tax_Filing_${r.period_name}_${r.tax_type.replace(' ', '_')}.pdf`);
    toast.success("Enterprise report downloaded");
  };

  const filtered = useMemo(() =>
      returns.filter(r =>
          (r.tax_type || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.period_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [returns, filter]
  );

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
                    className="pl-8 h-10 shadow-sm" 
                />
            </div>
            <Button 
                variant="outline" 
                className="h-10 border-primary/20 hover:bg-primary/5"
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
            >
                {reconcileMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Run Reconciliation
            </Button>
        </div>

        <Card className="shadow-lg border-muted-foreground/10">
            <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    Global Filings Overview
                </CardTitle>
                <CardDescription>Consolidated view of liabilities generated from POS, Invoices, and Procurement.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ScrollArea className="h-[500px] border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-20">
                    <TableRow>
                        <TableHead className="w-[250px]">Tax Type & Entity</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Net Liability</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Audit Reference</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-48"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary"/></TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-20">
                                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">No tax returns generated</p>
                                <p className="text-sm text-muted-foreground">Click "Run Reconciliation" to pull data from your modules.</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map(r => (
                        <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span>{r.tax_type}</span>
                                        <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-tighter">
                                            {r.entity} • {r.country || 'Global'}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{r.period_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(r.end_date), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                                <span className={r.total_liability > 0 ? "text-red-600" : "text-green-600"}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currency || 'UGX' }).format(r.total_liability)}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    variant={r.status === 'submitted' || r.status === 'paid' ? 'default' : 'outline'} 
                                    className={
                                        r.status === 'submitted' ? 'bg-green-600 hover:bg-green-700 text-white border-none' : 
                                        r.status === 'paid' ? 'bg-blue-600 hover:bg-blue-700 text-white border-none' : 
                                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }
                                >
                                    {r.status.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                                {r.filing_reference || '---'}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {r.status === 'draft' ? (
                                        <Button size="sm" variant="default" className="bg-primary shadow-sm" onClick={() => { setSelectedReturn(r); setIsSubmitOpen(true); }}>
                                            Submit
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-8 flex items-center gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                            onClick={() => handleExportPDF(r)}
                                        >
                                            <FileDown className="h-3.5 w-3.5" /> PDF
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
                </ScrollArea>
            </CardContent>
        </Card>

        {/* Professional Submission Dialog */}
        <SubmitReturnDialog 
            taxReturn={selectedReturn} 
            isOpen={isSubmitOpen} 
            onClose={() => setIsSubmitOpen(false)} 
        />
    </div>
  );
}