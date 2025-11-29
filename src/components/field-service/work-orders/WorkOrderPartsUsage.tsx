'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackagePlus, Box, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
// Import the REAL actions and Types
import { fetchPartsUsage, addPartUsage, fetchPartCatalog, PartCatalogItem } from '@/lib/actions/parts';
import { Badge } from '@/components/ui/badge';

interface TenantContext {
  tenantId: string;
  currency: string;
}

export default function WorkOrderPartsUsage({
  workOrderId,
  tenant,
}: {
  workOrderId: number;
  tenant: TenantContext;
}) {
  const queryClient = useQueryClient();

  // 1. Fetch Data
  const { data: usages, isLoading: loadingUsage } = useQuery({
    queryKey: ['wo-part-usage', workOrderId],
    queryFn: () => fetchPartsUsage(workOrderId, tenant.tenantId),
  });

  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['parts-catalog', tenant.tenantId],
    queryFn: () => fetchPartCatalog(tenant.tenantId),
  });

  // 2. Form State
  const [partId, setPartId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [source, setSource] = useState('van_stock');
  const [notes, setNotes] = useState('');

  // 3. Mutation
  const mutation = useMutation({
    mutationFn: () => addPartUsage({
        work_order_id: workOrderId,
        part_id: Number(partId),
        qty_used: qty,
        source,
        notes,
        tenant_id: tenant.tenantId,
      }),
    onSuccess: () => {
      toast.success('Part consumed successfully');
      setPartId('');
      setQty(1);
      setNotes('');
      // CORRECT: v5 Syntax
      queryClient.invalidateQueries({ queryKey: ['wo-part-usage', workOrderId] });
      // Also refresh catalog to show new stock levels
      queryClient.invalidateQueries({ queryKey: ['parts-catalog', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to record part'),
  });

  const selectedPart = catalog?.find(p => p.id.toString() === partId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" /> Parts & Material Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Input Form */}
        <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-muted/40 p-4 rounded-lg border">
          <div className="w-full md:w-1/3 space-y-1">
            <label className="text-xs font-medium">Part Name</label>
            <Select value={partId} onValueChange={setPartId}>
                <SelectTrigger className="bg-background h-9">
                    <SelectValue placeholder={loadingCatalog ? "Loading..." : "Select Part..."} />
                </SelectTrigger>
                <SelectContent>
                    {catalog?.map((p: PartCatalogItem) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                            <div className="flex justify-between w-full gap-4">
                                <span>{p.code} - {p.name}</span>
                                <Badge variant="secondary" className="text-[10px] h-5">Stock: {p.stock_quantity}</Badge>
                            </div>
                        </SelectItem>
                    ))}
                    {!loadingCatalog && catalog?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">No parts in catalog.</div>
                    )}
                </SelectContent>
            </Select>
          </div>

          <div className="w-24 space-y-1">
             <label className="text-xs font-medium">Qty</label>
             <Input 
                type="number" 
                min={1} 
                max={selectedPart?.stock_quantity || 999}
                value={qty} 
                onChange={e => setQty(Number(e.target.value))} 
                className="bg-background h-9" 
             />
          </div>

          <div className="w-full md:w-1/4 space-y-1">
             <label className="text-xs font-medium">Source</label>
             <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="van_stock">My Van Stock</SelectItem>
                    <SelectItem value="main_store">Main Warehouse</SelectItem>
                    <SelectItem value="customer_supplied">Customer Supplied</SelectItem>
                </SelectContent>
             </Select>
          </div>

          <div className="flex-1 space-y-1">
             <label className="text-xs font-medium">Notes</label>
             <Input placeholder="Installation notes..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-background h-9" />
          </div>

          <Button 
            disabled={!partId || mutation.isPending || (selectedPart ? qty > selectedPart.stock_quantity : false)} 
            onClick={() => mutation.mutate()}
            className="h-9"
          >
             {mutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
          </Button>
        </div>
        
        {selectedPart && qty > selectedPart.stock_quantity && (
            <div className="mb-4 text-xs text-destructive flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3 w-3" /> Warning: Quantity exceeds available stock ({selectedPart.stock_quantity}).
            </div>
        )}

        {/* List */}
        <div className="rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Part Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Recorded At</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loadingUsage ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : usages?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No parts used yet.</TableCell></TableRow>
                ) : usages?.map((u: any) => (
                <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.part_name}</TableCell>
                    <TableCell>{u.qty_used}</TableCell>
                    <TableCell className="capitalize">
                        <Badge variant="outline">{u.source.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{u.notes || '—'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{new Date(u.recorded_at).toLocaleString()}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}