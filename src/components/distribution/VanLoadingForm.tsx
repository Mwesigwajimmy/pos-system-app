// src/components/distribution/VanLoadingForm.tsx
// FINAL & DEFINITIVE VERSION - SOVEREIGN UPGRADE

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, AlertTriangle, Link2 } from 'lucide-react'; // Added Link2 for manifest UI
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

async function getPrereqs() { const { data, error } = await createClient().rpc('get_van_loading_prerequisites'); if (error) throw error; return data; }
async function loadVan(vars: any) { const { error } = await createClient().rpc('load_van_for_route', vars); if (error) throw error; }

export default function VanLoadingForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: prereqs, isLoading, isError, error } = useQuery({ queryKey: ['vanLoadingPrereqs'], queryFn: getPrereqs });
    
    // SOVEREIGN STATE
    const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
    const [salespersonId, setSalespersonId] = useState<string | undefined>(undefined);
    const [locationId, setLocationId] = useState<string | undefined>(undefined);
    const [manifestId, setManifestId] = useState<string | undefined>(undefined); // ADDED: Manifest Link State
    const [items, setItems] = useState<any[]>([]);

    const mutation = useMutation({ 
        mutationFn: loadVan, 
        onSuccess: () => { 
            toast.success('Van loaded and linked successfully!'); 
            queryClient.invalidateQueries({queryKey: ['distributionSummary']}); 
            router.push('/distribution'); 
        }, 
        onError: (error: any) => toast.error(`Failed to load van: ${error.message}`)
    });

    // THIS IS THE REVOLUTIONARY FIX
    const handleAddItem = (productValue: string) => {
        const product = prereqs?.products?.find((p: any) => p.value.toString() === productValue);
        if (!product) return;
        if (!items.find(i => i.variant_id === product.value)) {
            setItems([...items, { variant_id: product.value, label: product.label, quantity: 1 }]);
        }
    };

    const handleUpdateQty = (id: number, qty: number) => setItems(items.map(i => i.variant_id === id ? {...i, quantity: Math.max(1, qty)} : i));
    const handleRemoveItem = (id: number) => setItems(items.filter(i => i.variant_id !== id));
    
    const handleSubmit = () => { 
        if(!vehicleId || !salespersonId || !locationId || items.length === 0) return toast.error('Please fill all fields and add at least one item.'); 
        
        mutation.mutate({ 
            p_vehicle_id: vehicleId, 
            p_salesperson_id: salespersonId, 
            p_source_location_id: locationId, 
            p_manifest_id: manifestId, // ADDED: Passing Manifest ID to the Interconnected RPC
            p_items: items.map(i => ({variant_id: i.variant_id, quantity: i.quantity})) 
        }); 
    };

    if (isLoading) return <div className="space-y-6"><h1 className="text-3xl font-bold">Create New Van Load</h1><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>;
    if (isError) return <div className="text-center p-12 text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />Failed to load necessary data. <p className="text-sm">{error.message}</p></div>;
    
    const vehicles = prereqs?.vehicles || [];
    const salespeople = prereqs?.salespeople || [];
    const locations = prereqs?.locations || [];
    const products = prereqs?.products || [];
    const manifests = prereqs?.manifests || []; // NEW: Pulled from updated RPC

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Create New Van Load</h1>
            <Card>
                <CardHeader><CardTitle>Details & Chain of Custody</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <Label>Vehicle</Label>
                        <Select value={vehicleId} onValueChange={setVehicleId}>
                            <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                            <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Salesperson / Agent</Label>
                        <Select value={salespersonId} onValueChange={setSalespersonId}>
                            <SelectTrigger><SelectValue placeholder="Assign agent..." /></SelectTrigger>
                            <SelectContent>{salespeople.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Source Warehouse</Label>
                        <Select value={locationId} onValueChange={setLocationId}>
                            <SelectTrigger><SelectValue placeholder="Source location..." /></SelectTrigger>
                            <SelectContent>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    {/* ADDED: MANIFEST LINK DROPDOWN */}
                    <div>
                        <Label className="flex items-center gap-1.5"><Link2 size={12} className="text-blue-500" /> Link Cargo Manifest</Label>
                        <Select value={manifestId} onValueChange={setManifestId}>
                            <SelectTrigger className="border-blue-100 bg-blue-50/20">
                                <SelectValue placeholder="Search global manifests..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Standalone Load (No Manifest)</SelectItem>
                                {manifests.map((m: any) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <span className="font-bold">{m.shipment_ref}</span> 
                                        <span className="text-[10px] text-slate-400 ml-2 uppercase">({m.shipment_type})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Items to Load</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <div className="flex-grow">
                            <Select onValueChange={handleAddItem}>
                                <SelectTrigger><SelectValue placeholder="Add a product..." /></SelectTrigger>
                                <SelectContent>{products.map((p: any) => <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="w-32">Quantity</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? <TableRow><TableCell colSpan={3} className="h-24 text-center">No items added to load.</TableCell></TableRow> : 
                            items.map(item => (
                                <TableRow key={item.variant_id}>
                                    <TableCell>{item.label}</TableCell>
                                    <TableCell><Input type="number" value={item.quantity} onChange={e => handleUpdateQty(item.variant_id, parseInt(e.target.value))}/></TableCell>
                                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.variant_id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 items-center">
                {manifestId && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Handshake: Manifest Linked</span>}
                <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {mutation.isPending ? 'Sealing Records...' : 'Confirm & Finalize Load'}
                </Button>
            </div>
        </div>
    );
}