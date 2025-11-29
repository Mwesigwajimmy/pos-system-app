'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch'; // Assuming you have shadcn switch, else use checkbox
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, ShieldCheck, AlertTriangle, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchContracts, addContract, toggleContractStatus, deleteContract, WarrantyContract } from '@/lib/actions/warranty';

interface TenantContext { 
  tenantId: string; 
}

export default function WarrantyAndContractManager({
  equipmentId,
  tenant,
}: {
  equipmentId: number;
  tenant: TenantContext;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // --- Form State ---
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);

  // --- 1. Data Fetching ---
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['eq-contracts', equipmentId, tenant.tenantId],
    queryFn: () => fetchContracts(equipmentId, tenant.tenantId),
  });

  // --- 2. Create Mutation ---
  const createMutation = useMutation({
    mutationFn: () => addContract({ 
      equipment_id: equipmentId, 
      title, 
      details, 
      active, 
      start_date: startDate || null, 
      end_date: endDate || null, 
      tenant_id: tenant.tenantId 
    }),
    onSuccess: () => {
      toast.success('Contract saved successfully');
      setTitle(''); setDetails(''); setStartDate(''); setEndDate(''); setIsAdding(false);
      // FIXED: Correct v5 syntax
      queryClient.invalidateQueries({ queryKey: ['eq-contracts', equipmentId, tenant.tenantId] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add contract'),
  });

  // --- 3. Toggle Status Mutation ---
  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: boolean }) => toggleContractStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eq-contracts', equipmentId, tenant.tenantId] });
      toast.success('Status updated');
    },
  });

  // --- 4. Delete Mutation ---
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteContract(id),
    onSuccess: () => {
      toast.success('Contract removed');
      queryClient.invalidateQueries({ queryKey: ['eq-contracts', equipmentId, tenant.tenantId] });
    },
  });

  const getStatusBadge = (contract: WarrantyContract) => {
    const isExpired = contract.end_date ? new Date(contract.end_date) < new Date() : false;
    
    if (!contract.active) return <Badge variant="secondary">Inactive</Badge>;
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Warranty & Contracts
            </CardTitle>
            <CardDescription>Manage AMCs, warranties, and insurance policies.</CardDescription>
        </div>
        <Button variant={isAdding ? "secondary" : "default"} size="sm" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Add New</>}
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* --- ADD NEW FORM --- */}
        {isAdding && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/20 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Contract Title</Label>
                    <Input placeholder="e.g. Manufacturer Warranty" value={title} onChange={e=>setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-2 h-10">
                        <Switch checked={active} onCheckedChange={setActive} />
                        <span className="text-sm">{active ? "Active upon creation" : "Inactive"}</span>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Details / Terms</Label>
                <Textarea placeholder="Coverage details, support contacts..." value={details} onChange={e=>setDetails(e.target.value)} />
            </div>

            <div className="flex justify-end">
                <Button onClick={()=>createMutation.mutate()} disabled={createMutation.isPending || !title}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Contract
                </Button>
            </div>
          </div>
        )}

        {/* --- DATA TABLE --- */}
        <div className="rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                )}
                
                {!isLoading && contracts?.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No active warranties found.</TableCell></TableRow>
                )}

                {contracts?.map((c) => (
                <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-sm">
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" /> Start: {c.start_date ? new Date(c.start_date).toLocaleDateString() : "N/A"}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> End: {c.end_date ? new Date(c.end_date).toLocaleDateString() : "Lifetime"}</span>
                        </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(c)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={c.details || ""}>{c.details || "—"}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                            <Switch 
                                checked={c.active} 
                                onCheckedChange={(val) => toggleMutation.mutate({ id: c.id, status: val })} 
                                title="Toggle Active Status"
                            />
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(c.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}