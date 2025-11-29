'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, PackageCheck, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// --- Types ---
interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

interface PurchaseOrderOption {
  id: number;
  po_number: string;
  supplier_name: string;
  order_date: string;
  currency: string;
}

interface POItem {
  id: number;
  product_name: string;
  sku: string;
  ordered_qty: number;
  received_qty: number; // Previously received
  uom: string;
}

interface GRNSubmissionPayload {
  po_id: number;
  items: {
    po_item_id: number;
    received_qty: number;
    is_rejected: boolean;
  }[];
  remarks: string;
  delivery_note_ref: string;
  tenant_id: string;
}

// --- API Logic ---

// 1. Fetch POs that are 'Ordered' or 'Partially Received'
async function fetchPendingPOs(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('id, po_number, supplier_name, order_date, currency')
    .eq('tenant_id', tenantId)
    .in('status', ['Ordered', 'Partially Received']) // Enterprise status flow
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as PurchaseOrderOption[];
}

// 2. Fetch Line Items for selected PO
async function fetchPOItems(poId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select('id, product_name, sku, ordered_qty, received_qty, uom')
    .eq('po_id', poId);

  if (error) throw new Error(error.message);
  return data as POItem[];
}

// 3. Transactional Submit via RPC
async function submitGRN(payload: GRNSubmissionPayload) {
  const supabase = createClient();
  // 'process_grn' is a Postgres function handling the transaction logic
  const { data, error } = await supabase.rpc('process_grn', payload);
  
  if (error) throw new Error(error.message);
  return data;
}

// --- Main Component ---

export default function GoodsReceivedNoteManager({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [deliveryRef, setDeliveryRef] = useState('');
  
  // State for inputs: Map<ItemId, Quantity>
  const [inputs, setInputs] = useState<Record<number, number>>({});

  // --- Queries ---
  const { data: poList, isLoading: loadingPOs } = useQuery({
    queryKey: ['pending-pos', tenant.tenantId],
    queryFn: () => fetchPendingPOs(tenant.tenantId)
  });

  const { data: poItems, isLoading: loadingItems } = useQuery({
    queryKey: ['po-items', selectedPoId],
    queryFn: () => fetchPOItems(Number(selectedPoId)),
    enabled: !!selectedPoId
  });

  // --- Effects ---
  
  // Auto-fill "Receive Now" with remaining quantity when items load
  useEffect(() => {
    if (poItems) {
      const initialInputs: Record<number, number> = {};
      poItems.forEach(item => {
        const remaining = Math.max(0, item.ordered_qty - (item.received_qty || 0));
        initialInputs[item.id] = remaining;
      });
      setInputs(initialInputs);
    }
  }, [poItems]);

  // --- Mutation ---
  const mutation = useMutation({
    mutationFn: submitGRN,
    onSuccess: () => {
      toast.success("Goods Received Note created successfully");
      queryClient.invalidateQueries({ queryKey: ['pending-pos', tenant.tenantId] });
      // Reset State
      setSelectedPoId('');
      setRemarks('');
      setDeliveryRef('');
      setInputs({});
    },
    onError: (err: any) => toast.error(`Submission Failed: ${err.message}`)
  });

  // --- Logic Helpers ---

  const handleQtyChange = (itemId: number, val: string) => {
    const num = parseFloat(val);
    setInputs(prev => ({ ...prev, [itemId]: isNaN(num) ? 0 : num }));
  };

  const calculateVariance = (item: POItem, inputQty: number) => {
    const remaining = item.ordered_qty - item.received_qty;
    const diff = inputQty - remaining;
    
    if (diff === 0) return { status: 'MATCH', label: 'Exact' };
    if (diff < 0) return { status: 'PARTIAL', label: `Short (${Math.abs(diff)})` };
    return { status: 'OVER', label: `Excess (+${diff})` };
  };

  const hasErrors = useMemo(() => {
    if (!deliveryRef.trim()) return true;
    // Check for negative inputs
    return Object.values(inputs).some(v => v < 0);
  }, [deliveryRef, inputs]);

  const handleSubmit = () => {
    if (!selectedPoId) return;
    
    // Check if at least one item is being received
    const totalReceived = Object.values(inputs).reduce((a, b) => a + b, 0);
    if (totalReceived <= 0) {
        toast.error("Please enter a quantity greater than 0 for at least one item.");
        return;
    }

    const payload: GRNSubmissionPayload = {
      tenant_id: tenant.tenantId,
      po_id: Number(selectedPoId),
      delivery_note_ref: deliveryRef,
      remarks: remarks,
      items: poItems?.map(item => ({
        po_item_id: item.id,
        received_qty: inputs[item.id] || 0,
        is_rejected: false // Can be expanded for QA
      })) || []
    };

    mutation.mutate(payload);
  };

  return (
    <Card className="border-t-4 border-t-emerald-600 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    Goods Receipt Note (GRN)
                </CardTitle>
                <CardDescription>Verify and record incoming stock against Purchase Orders.</CardDescription>
            </div>
            {poItems && <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">Receiving Mode</Badge>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* 1. PO Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Select Purchase Order
                </label>
                <Select value={selectedPoId} onValueChange={setSelectedPoId}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={loadingPOs ? "Loading POs..." : "Select active PO..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {poList?.map(po => (
                            <SelectItem key={po.id} value={String(po.id)}>
                                <span className="font-mono font-bold mr-2">#{po.po_number || po.id}</span> 
                                <span className="text-muted-foreground">- {po.supplier_name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedPoId && (
                <div className="space-y-2 animate-in fade-in">
                    <label className="text-sm font-medium leading-none">Delivery Note / Invoice Ref</label>
                    <Input 
                        placeholder="e.g. DN-2024-885" 
                        value={deliveryRef} 
                        onChange={e => setDeliveryRef(e.target.value)}
                        className={!deliveryRef ? "border-amber-400 focus-visible:ring-amber-400" : "border-green-200"}
                    />
                </div>
            )}
        </div>

        {/* 2. Items Table */}
        {selectedPoId && (
            <div className="rounded-md border bg-slate-50/50 animate-in slide-in-from-bottom-2">
                <Table>
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-[30%]">Product / SKU</TableHead>
                            <TableHead className="text-center w-[10%]">UOM</TableHead>
                            <TableHead className="text-right w-[15%]">Ordered</TableHead>
                            <TableHead className="text-right w-[15%] text-muted-foreground">Prev. Recv</TableHead>
                            <TableHead className="text-right w-[15%] bg-white border-l border-r border-t border-emerald-100 font-bold text-emerald-700">Receive Now</TableHead>
                            <TableHead className="text-center w-[15%]">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingItems ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                        ) : poItems?.map((item) => {
                            const currentInput = inputs[item.id] || 0;
                            const variance = calculateVariance(item, currentInput);
                            
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium text-slate-800">{item.product_name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs">{item.uom}</TableCell>
                                    <TableCell className="text-right">{item.ordered_qty}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{item.received_qty}</TableCell>
                                    <TableCell className="p-1 border-l border-r bg-white">
                                        <Input 
                                            type="number" 
                                            min={0}
                                            className="text-right font-mono h-8 border-transparent focus:border-emerald-500 hover:bg-slate-50"
                                            value={inputs[item.id] ?? ''}
                                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {variance.status === 'MATCH' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complete</Badge>}
                                        {variance.status === 'PARTIAL' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{variance.label}</Badge>}
                                        {variance.status === 'OVER' && <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">{variance.label}</Badge>}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        )}

        {/* 3. Remarks & Footer */}
        {selectedPoId && (
            <div className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Internal Remarks</label>
                    <Textarea 
                        placeholder="Note any damages, packaging issues, or reasons for variance..." 
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                    />
                </div>

                {Object.values(inputs).some((val, idx) => {
                    const item = poItems?.[idx];
                    return item && val > (item.ordered_qty - item.received_qty);
                }) && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Over-delivery Detected</AlertTitle>
                        <AlertDescription>
                            You are receiving more items than ordered. Ensure this is authorized before submitting.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setSelectedPoId('')}>Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={hasErrors || mutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
                    >
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                        Confirm Receipt
                    </Button>
                </div>
            </div>
        )}

        {!selectedPoId && !loadingPOs && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <Info className="w-10 h-10 mb-2 opacity-20" />
                <p>Select a Purchase Order to begin receiving goods.</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}