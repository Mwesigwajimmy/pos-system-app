// src/components/distribution/RoutesManager.tsx
// FINAL & COMPLETE VERSION

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// RPC Calls
async function fetchData(table: 'vehicles' | 'sales_routes') { const { data, error } = await createClient().from(table).select('*'); if (error) throw error; return data; }
async function createVehicle(vars: { name: string, type: string }) { const { error } = await createClient().rpc('create_vehicle', { p_name: vars.name, p_type: vars.type }); if (error) throw error; }
async function createSalesRoute(vars: { name: string, description: string }) { const { error } = await createClient().rpc('create_sales_route', { p_name: vars.name, p_description: vars.description }); if (error) throw error; }

const CreateDialog = ({ type, mutation }: { type: 'Route' | 'Vehicle', mutation: any }) => {
    const [name, setName] = useState('');
    const [field2, setField2] = useState('');
    const [open, setOpen] = useState(false);

    const handleSubmit = () => {
        if (!name) return toast.error('Name is required.');
        if (type === 'Route') mutation.mutate({ name, description: field2 });
        if (type === 'Vehicle') mutation.mutate({ name, type: field2 });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/>New {type}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Create New {type}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div><Label>{type} Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><Label>{type === 'Route' ? 'Description' : 'Vehicle Type'}</Label><Input value={field2} onChange={e => setField2(e.target.value)} /></div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create {type}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function RoutesManager() {
    const queryClient = useQueryClient();
    const { data: vehicles, isLoading: loadingVehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => fetchData('vehicles') });
    const { data: routes, isLoading: loadingRoutes } = useQuery({ queryKey: ['sales_routes'], queryFn: () => fetchData('sales_routes') });
    
    const useCreateMutation = (fn: any, key: string, type: string) => useMutation({ mutationFn: fn, onSuccess: () => { toast.success(`${type} created!`); queryClient.invalidateQueries({queryKey: [key]}); }});
    const vehicleMutation = useCreateMutation(createVehicle, 'vehicles', 'Vehicle');
    const routeMutation = useCreateMutation(createSalesRoute, 'sales_routes', 'Route');

    return (
        <Tabs defaultValue="routes">
            <div className="flex justify-between items-center mb-6">
                <div><h1 className="text-3xl font-bold">Manage Routes & Vehicles</h1><p className="text-muted-foreground">Define your sales routes and manage your fleet of vehicles.</p></div>
                <TabsList><TabsTrigger value="routes">Sales Routes</TabsTrigger><TabsTrigger value="vehicles">Vehicles</TabsTrigger></TabsList>
            </div>
            <TabsContent value="routes">
                <Card>
                    <CardHeader><CardTitle className="flex justify-between items-center"><span>Sales Routes</span><CreateDialog type="Route" mutation={routeMutation} /></CardTitle></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Route Name</TableHead><TableHead>Description</TableHead></TableRow></TableHeader><TableBody>{loadingRoutes ? <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow> : routes?.map((r: any) => <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.description}</TableCell></TableRow>)}</TableBody></Table></CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="vehicles">
                <Card>
                    <CardHeader><CardTitle className="flex justify-between items-center"><span>Vehicles</span><CreateDialog type="Vehicle" mutation={vehicleMutation} /></CardTitle></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Vehicle Name / ID</TableHead><TableHead>Type</TableHead></TableRow></TableHeader><TableBody>{loadingVehicles ? <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow> : vehicles?.map((v: any) => <TableRow key={v.id}><TableCell>{v.name}</TableCell><TableCell>{v.vehicle_type}</TableCell></TableRow>)}</TableBody></Table></CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}