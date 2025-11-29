'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Scale, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

interface ReconciliationLineItem {
  item_id: number;
  description: string;
  
  // 3-Way Data Points
  po_qty: number;
  grn_qty: number;
  inv_qty: number;
  
  po_unit_cost: number;
  inv_unit_cost: number;
  
  // Computed Status
  qty_variance: number; // grn_qty - inv_qty
  cost_variance: number; // po_unit_cost - inv_unit_cost
  line_status: 'MATCH' | 'VARIANCE_QTY' | 'VARIANCE_COST' | 'CRITICAL_MISMATCH';
}

interface InvoiceDetails {
  invoice_id: number;
  invoice_number: string;
  po_number: string;
  supplier_name: string;
  total_amount: number;
  currency: string;
  lines: ReconciliationLineItem[];
}

interface InvoiceOption {
  id: number;
  invoice_number: string;
  supplier_name: string;
  amount: number;
  currency: string;
}

// --- API Logic ---

// Fetch invoices explicitly marked 'PENDING_RECONCILIATION'
async function fetchPendingInvoices(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('id, invoice_number, supplier_name, total_amount, currency')
    .eq('tenant_id', tenantId)
    .eq('status', 'PENDING_RECONCILIATION')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as any[]; // ideally mapped to InvoiceOption
}

// Fetch 3-way match data via RPC
async function fetchReconciliationData(invoiceId: number) {
  const supabase = createClient();
  // Complex join logic handled in DB function
  const { data, error } = await supabase.rpc('get_reconciliation_details', { 
    p_invoice_id: invoiceId 
  });

  if (error) throw new Error(error.message);
  return data as InvoiceDetails;
}

// Submit Reconciliation Decision
async function submitReconciliation(
  { invoiceId, status, notes }: 
  { invoiceId: number; status: 'RECONCILED' | 'DISPUTED'; notes?: string }
) {
  const supabase = createClient();
  const { error } = await supabase.rpc('process_reconciliation', {
    p_invoice_id: invoiceId,
    p_status: status,
    p_notes: notes
  });

  if (error) throw new Error(error.message);
}

// --- Main Component ---

export default function PurchaseInvoiceReconciliation({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  
  const [selectedId, setSelectedId] = useState<string>('');
  const [disputeReason, setDisputeReason] = useState('');

  // Queries
  const { data: invoiceList, isLoading: loadingList } = useQuery({
    queryKey: ['invoices-for-reconciliation', tenant.tenantId],
    queryFn: () => fetchPendingInvoices(tenant.tenantId),
  });

  const { data: details, isLoading: loadingDetails } = useQuery({
    queryKey: ['reconciliation-details', selectedId],
    queryFn: () => fetchReconciliationData(Number(selectedId)),
    enabled: !!selectedId,
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: submitReconciliation,
    onSuccess: () => {
      toast.success("Reconciliation status updated");
      // FIX: Validated query invalidation syntax
      queryClient.invalidateQueries({ queryKey: ['invoices-for-reconciliation', tenant.tenantId] });
      
      // Reset
      setSelectedId('');
      setDisputeReason('');
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });

  // Helper: Currency Formatter
  const formatMoney = (val: number, curr?: string) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr || tenant.currency }).format(val);

  // Helper: Status Badge for Lines
  const getLineStatus = (status: ReconciliationLineItem['line_status']) => {
    switch (status) {
        case 'MATCH': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Match</Badge>;
        case 'VARIANCE_QTY': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Qty Diff</Badge>;
        case 'VARIANCE_COST': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Cost Diff</Badge>;
        case 'CRITICAL_MISMATCH': return <Badge variant="destructive">Mismatch</Badge>;
        default: return null;
    }
  };

  const hasIssues = details?.lines.some(l => l.line_status !== 'MATCH');

  return (
    <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600"/> 3-Way Reconciliation
        </CardTitle>
        <CardDescription>
            Compare Purchase Order, Goods Receipt, and Invoice data to authorize payment.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* 1. Invoice Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Select Invoice to Reconcile</label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger>
                        <SelectValue placeholder={loadingList ? "Loading..." : "Select Invoice..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {invoiceList?.map((inv: any) => (
                            <SelectItem key={inv.id} value={String(inv.id)}>
                                <span className="font-mono font-bold mr-2">{inv.invoice_number}</span> 
                                <span className="text-muted-foreground">- {inv.supplier_name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {details && (
                <div className="flex items-end justify-end pb-2">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Invoice Total</p>
                        <p className="text-2xl font-bold text-slate-800">{formatMoney(details.total_amount, details.currency)}</p>
                    </div>
                </div>
            )}
        </div>

        {/* 2. Detailed Comparison Table */}
        {selectedId && (
            loadingDetails ? (
                <div className="h-40 flex items-center justify-center border rounded-md bg-slate-50">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600"/>
                </div>
            ) : details ? (
                <div className="border rounded-md bg-white overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-100">
                            <TableRow>
                                <TableHead className="w-[30%]">Item Description</TableHead>
                                <TableHead className="text-center w-[10%] border-l border-slate-200">PO Qty</TableHead>
                                <TableHead className="text-center w-[10%]">GRN Qty</TableHead>
                                <TableHead className="text-center w-[10%] font-bold text-purple-700 bg-purple-50">Inv Qty</TableHead>
                                <TableHead className="text-right w-[15%] border-l border-slate-200">PO Price</TableHead>
                                <TableHead className="text-right w-[15%] font-bold text-purple-700 bg-purple-50">Inv Price</TableHead>
                                <TableHead className="text-center w-[10%]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {details.lines.map((line, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-700">{line.description}</TableCell>
                                    
                                    {/* Quantities */}
                                    <TableCell className="text-center border-l border-slate-100">{line.po_qty}</TableCell>
                                    <TableCell className={cn("text-center", line.grn_qty !== line.inv_qty && "text-red-600 font-bold")}>
                                        {line.grn_qty}
                                    </TableCell>
                                    <TableCell className="text-center bg-purple-50/30 font-semibold">{line.inv_qty}</TableCell>
                                    
                                    {/* Costs */}
                                    <TableCell className="text-right border-l border-slate-100 font-mono text-xs">
                                        {formatMoney(line.po_unit_cost, details.currency)}
                                    </TableCell>
                                    <TableCell className={cn("text-right font-mono text-xs bg-purple-50/30", line.cost_variance !== 0 && "text-red-600 font-bold")}>
                                        {formatMoney(line.inv_unit_cost, details.currency)}
                                    </TableCell>
                                    
                                    {/* Status Badge */}
                                    <TableCell className="text-center">
                                        {getLineStatus(line.line_status)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : null
        )}

        {/* 3. Action Footer */}
        {details && (
            <div className="bg-slate-50 p-4 rounded-lg border flex flex-col gap-4">
                {hasIssues && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded border border-red-200 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>
                            <span className="font-bold">Discrepancies Detected:</span> Quantities or costs do not match between the Purchase Order, GRN, and Invoice. 
                            Please provide a reason if you choose to dispute this invoice.
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Resolution Notes / Dispute Reason</label>
                        <Textarea 
                            placeholder={hasIssues ? "Explain the discrepancy..." : "Optional notes..."} 
                            value={disputeReason}
                            onChange={e => setDisputeReason(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    
                    <div className="flex items-end justify-end gap-3">
                        <Button 
                            variant="destructive" 
                            onClick={() => mutation.mutate({ invoiceId: details.invoice_id, status: 'DISPUTED', notes: disputeReason })}
                            disabled={mutation.isPending || (hasIssues && !disputeReason)}
                        >
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <XCircle className="w-4 h-4 mr-2"/>}
                            Dispute Invoice
                        </Button>
                        
                        <Button 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => mutation.mutate({ invoiceId: details.invoice_id, status: 'RECONCILED', notes: disputeReason })}
                            disabled={mutation.isPending || (hasIssues && !disputeReason)} // If issues exist, force notes even if approving (e.g. override)
                        >
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                            Approve & Match
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {!selectedId && !loadingList && (
            <div className="py-10 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Info className="w-10 h-10 mb-2 opacity-20" />
                <p>Select a pending invoice to start the reconciliation process.</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}