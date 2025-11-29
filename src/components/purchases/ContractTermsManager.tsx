'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

interface ContractTerm {
  id: number;
  supplier_id: number;
  // We join suppliers to get the name
  suppliers: { name: string } | null;
  title: string;
  body: string;
  created_at: string;
  active: boolean;
}

interface SupplierOption {
    id: number;
    name: string;
}

// --- API Calls ---
async function fetchTerms(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('contract_terms')
    .select(`
        *,
        suppliers ( name )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ContractTerm[];
}

async function fetchSuppliers(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('tenant_id', tenantId) // Assuming suppliers are tenant-scoped
        .eq('status', 'ACTIVE')    // Only get active suppliers
        .order('name');
    
    if (error) throw error;
    return data as SupplierOption[];
}

async function addTerm(input: { supplier_id: number; title: string; body: string; tenant_id: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.from('contract_terms').insert([{
      ...input,
      active: true,
      created_at: new Date().toISOString()
  }]);
  if (error) throw error;
  return data;
}

export default function ContractTermsManager({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Queries
  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: ['contract-terms', tenant.tenantId],
    queryFn: () => fetchTerms(tenant.tenantId),
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
      queryKey: ['active-suppliers', tenant.tenantId],
      queryFn: () => fetchSuppliers(tenant.tenantId)
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: addTerm,
    onSuccess: () => {
      toast.success("Contract term successfully added");
      queryClient.invalidateQueries({ queryKey: ['contract-terms', tenant.tenantId] });
      // Reset Form
      setSupplierId(''); 
      setTitle(''); 
      setBody('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save term'),
  });

  const handleSubmit = () => {
    if (!supplierId || !title.trim() || !body.trim()) {
        return toast.error("Please fill in all fields.");
    }
    mutation.mutate({ 
        supplier_id: Number(supplierId), 
        title, 
        body, 
        tenant_id: tenant.tenantId 
    });
  };

  return (
    <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600"/> Legal Terms Manager
        </CardTitle>
        <CardDescription>Define standard terms and conditions per supplier.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Input Area */}
        <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Supplier</label>
                <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={supplierId} 
                    onChange={e => setSupplierId(Number(e.target.value))}
                    disabled={suppliersLoading}
                >
                    <option value="">Select Supplier...</option>
                    {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Term Title</label>
                <Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. Payment Terms 2024" 
                />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Clause Details</label>
            <Textarea 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                placeholder="Enter the full legal text here..." 
                className="min-h-[100px]"
            />
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={mutation.isPending || !supplierId}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2"/>} 
                {mutation.isPending ? "Saving..." : "Add Term"}
            </Button>
          </div>
        </div>

        {/* Results Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {termsLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
              ) : !terms || terms.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No contract terms defined yet.</TableCell></TableRow>
              ) : (
                terms.map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell className="font-medium text-slate-800">
                        {ct.suppliers?.name || <span className="text-red-500">Unknown Supplier</span>}
                    </TableCell>
                    <TableCell>{ct.title}</TableCell>
                    <TableCell>
                        {ct.active 
                            ? <Badge className="bg-green-600 hover:bg-green-700">Active</Badge> 
                            : <Badge variant="secondary">Inactive</Badge>
                        }
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(ct.created_at), 'MMM d, yyyy')}
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