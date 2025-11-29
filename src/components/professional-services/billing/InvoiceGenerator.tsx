'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface TenantContext { tenantId: string; currency: string; }
interface Client { id: string; name: string; email: string; }
interface InvoiceLine { description: string; qty: number; unit_price: number; total: number; }

async function fetchClients(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('clients').select('id, name, email').eq('tenant_id', tenantId);
  if (error) throw error;
  return data as Client[];
}

export default function InvoiceGenerator({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  
  const { data: clients } = useQuery({
    queryKey: ['clients', tenant.tenantId],
    queryFn: () => fetchClients(tenant.tenantId)
  });

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 12096e5).toISOString().split('T')[0]); // +14 days
  
  // Line Item State
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [currentLine, setCurrentLine] = useState({ desc: '', qty: 1, price: 0 });

  const addLine = () => {
    if (!currentLine.desc || currentLine.qty <= 0) return;
    setLines([...lines, { 
      description: currentLine.desc, 
      qty: currentLine.qty, 
      unit_price: currentLine.price,
      total: currentLine.qty * currentLine.price
    }]);
    setCurrentLine({ desc: '', qty: 1, price: 0 });
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalAmount = lines.reduce((sum, line) => sum + line.total, 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const db = createClient();
      const client = clients?.find(c => c.id === selectedClient);
      
      // 1. Create Invoice Header
      const { data: invoice, error: invError } = await db.from('invoices').insert({
        tenant_id: tenant.tenantId,
        client_id: selectedClient,
        client_name: client?.name,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`, // Simple ID gen
        issue_date: new Date().toISOString(),
        due_date: dueDate,
        total: totalAmount,
        currency: tenant.currency,
        status: 'SENT'
      }).select().single();

      if (invError) throw invError;

      // 2. Create Invoice Lines
      const lineItems = lines.map(l => ({
        invoice_id: invoice.id,
        tenant_id: tenant.tenantId,
        description: l.description,
        quantity: l.qty,
        unit_price: l.unit_price,
        total: l.total
      }));

      const { error: linesError } = await db.from('invoice_lines').insert(lineItems);
      if (linesError) throw linesError;
    },
    onSuccess: () => {
      toast.success('Invoice generated & sent');
      setLines([]);
      setSelectedClient('');
      queryClient.invalidateQueries({ queryKey: ['invoices', tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Generation failed'),
  });

  return (
    <Card className="h-full border-t-4 border-t-indigo-600">
      <CardHeader>
        <CardTitle>Invoice Generator</CardTitle>
        <CardDescription>Create and send invoices to clients.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <Select onValueChange={setSelectedClient} value={selectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Line Item Input */}
        <div className="bg-slate-50 p-4 rounded-lg border flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1 w-full">
            <label className="text-xs font-medium text-slate-500">Description</label>
            <Input 
              placeholder="Service / Product Description" 
              value={currentLine.desc} 
              onChange={e => setCurrentLine({...currentLine, desc: e.target.value})} 
            />
          </div>
          <div className="w-24 space-y-1">
            <label className="text-xs font-medium text-slate-500">Qty</label>
            <Input 
              type="number" min={1} 
              value={currentLine.qty} 
              onChange={e => setCurrentLine({...currentLine, qty: Number(e.target.value)})} 
            />
          </div>
          <div className="w-32 space-y-1">
            <label className="text-xs font-medium text-slate-500">Price</label>
            <Input 
              type="number" min={0} 
              value={currentLine.price} 
              onChange={e => setCurrentLine({...currentLine, price: Number(e.target.value)})} 
            />
          </div>
          <Button onClick={addLine} disabled={!currentLine.desc} variant="secondary">
            <Plus className="w-4 h-4"/>
          </Button>
        </div>

        {/* Lines Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Add items to invoice.</TableCell></TableRow>
              ) : (
                lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{l.description}</TableCell>
                    <TableCell className="text-right">{l.qty}</TableCell>
                    <TableCell className="text-right">{l.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{l.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8 text-red-500">
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xl font-bold text-slate-800">
            Total: {tenant.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <Button 
            size="lg" 
            onClick={() => mutation.mutate()} 
            disabled={!selectedClient || lines.length === 0 || mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
            Generate & Send Invoice
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}