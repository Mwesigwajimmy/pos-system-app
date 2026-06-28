// src/components/distribution/VanLoadingForm.tsx
// FINAL & DEFINITIVE VERSION - SOVEREIGN CORPORATE UPGRADE

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Loader2, AlertTriangle, Link2, ShieldAlert, Weight, Warehouse } from 'lucide-react'; 
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { isBefore, parseISO, format } from 'date-fns';

async function getPrereqs() { 
    const { data, error } = await createClient().rpc('get_van_loading_prerequisites'); 
    if (error) throw error; 
    return data; 
}

async function loadVan(vars: any) { 
    const { error } = await createClient().rpc('load_van_for_route', vars); 
    if (error) throw error; 
}

export default function VanLoadingForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: prereqs, isLoading, isError, error } = useQuery({ 
        queryKey: ['vanLoadingPrereqs'], 
        queryFn: getPrereqs 
    });
    
    // FORM STATE
    const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
    const [salespersonId, setSalespersonId] = useState<string | undefined>(undefined);
    const [locationId, setLocationId] = useState<string | undefined>(undefined);
    const [manifestId, setManifestId] = useState<string | undefined>(undefined);
    const [loadingBayId, setLoadingBayId] = useState<string>('');
    const [dispatcherNotes, setDispatcherNotes] = useState<string>('');
    const [items, setItems] = useState<any[]>([]);

    // COMPLIANCE DATA DERIVATION
    const selectedVehicle = useMemo(() => 
        prereqs?.vehicles?.find((v: any) => v.id.toString() === vehicleId), 
    [vehicleId, prereqs]);

    const selectedAgent = useMemo(() => 
        prereqs?.salespeople?.find((p: any) => p.id === salespersonId), 
    [salespersonId, prereqs]);

    // CAPACITY LOGIC
    const loadMetrics = useMemo(() => {
        return items.reduce((acc, item) => {
            const prod = prereqs?.products?.find((p: any) => p.value === item.variant_id);
            const weight = (prod?.weight_kg || 0) * item.quantity;
            return { totalWeight: acc.totalWeight + weight };
        }, { totalWeight: 0 });
    }, [items, prereqs]);

    const isOverloaded = selectedVehicle?.max_weight_capacity_kg > 0 && 
                        loadMetrics.totalWeight > selectedVehicle.max_weight_capacity_kg;

    const mutation = useMutation({ 
        mutationFn: loadVan, 
        onSuccess: () => { 
            toast.success('Van loaded and records finalized!'); 
            queryClient.invalidateQueries({queryKey: ['distributionSummary']}); 
            router.push('/distribution'); 
        }, 
        onError: (error: any) => toast.error(`Failed to load van: ${error.message}`)
    });

    const handleAddItem = (productValue: string) => {
        const product = prereqs?.products?.find((p: any) => p.value.toString() === productValue);
        if (!product) return;
        if (!items.find(i => i.variant_id === product.value)) {
            setItems([...items, { 
                variant_id: product.value, 
                label: product.label, 
                quantity: 1,
                weight_each: product.weight_kg || 0 
            }]);
        }
    };

    const handleUpdateQty = (id: number, qty: number) => 
        setItems(items.map(i => i.variant_id === id ? {...i, quantity: Math.max(1, qty)} : i));
    
    const handleRemoveItem = (id: number) => 
        setItems(items.filter(i => i.variant_id !== id));
    
    const handleSubmit = () => { 
        if(!vehicleId || !salespersonId || !locationId || items.length === 0) {
            return toast.error('Required fields missing. Ensure vehicle, agent, and items are set.'); 
        }
        
        // Final Safety Block
        if (isOverloaded) return toast.error('Finalization blocked: Vehicle is overloaded.');

        mutation.mutate({ 
            p_vehicle_id: vehicleId, 
            p_salesperson_id: salespersonId, 
            p_source_location_id: locationId, 
            p_manifest_id: manifestId === 'none' ? null : manifestId,
            p_loading_bay: loadingBayId,
            p_notes: dispatcherNotes,
            p_items: items.map(i => ({variant_id: i.variant_id, quantity: i.quantity})) 
        }); 
    };

    if (isLoading) return <div className="space-y-6"><h1 className="text-3xl font-bold">Create New Van Load</h1><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>;
    if (isError) return <div className="text-center p-12 text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />Failed to load necessary data. <p className="text-sm">{error.message}</p></div>;
    
    const vehicles = prereqs?.vehicles || [];
    const salespeople = prereqs?.salespeople || [];
    const locations = prereqs?.locations || [];
    const products = prereqs?.products || [];
    const manifests = prereqs?.manifests || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold">Create New Van Load</h1>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Load Weight</p>
                        <p className={`text-xl font-black ${isOverloaded ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                            {loadMetrics.totalWeight.toLocaleString()} KG
                        </p>
                    </div>
                </div>
            </div>

            {/* COMPLIANCE ALERT BANNER */}
            {(selectedVehicle?.insurance_expiry || selectedAgent?.license_expiry) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVehicle?.insurance_expiry && isBefore(parseISO(selectedVehicle.insurance_expiry), new Date()) && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700">
                            <ShieldAlert className="h-5 w-5" />
                            <div className="text-xs">
                                <p className="font-bold uppercase">Insurance Expired</p>
                                <p>Vehicle insurance expired on {format(parseISO(selectedVehicle.insurance_expiry), 'PPP')}.</p>
                            </div>
                        </div>
                    )}
                    {selectedAgent?.license_expiry && isBefore(parseISO(selectedAgent.license_expiry), new Date()) && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-700">
                            <UserCheck className="h-5 w-5 text-amber-600" />
                            <div className="text-xs">
                                <p className="font-bold uppercase">Driver License Warning</p>
                                <p>Agent license expired on {format(parseISO(selectedAgent.license_expiry), 'PPP')}.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Card>
                <CardHeader><CardTitle>Details & Chain of Custody</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div>
                            <Label>Vehicle</Label>
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.license_plate})</SelectItem>)}</SelectContent>
                            </Select>
                            {selectedVehicle && <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Max Capacity: {selectedVehicle.max_weight_capacity_kg} KG</p>}
                        </div>
                        <div>
                            <Label>Salesperson / Agent</Label>
                            <Select value={salespersonId} onValueChange={setSalespersonId}>
                                <SelectTrigger><SelectValue placeholder="Assign agent..." /></SelectTrigger>
                                <SelectContent>{salespeople.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label>Source Warehouse</Label>
                            <Select value={locationId} onValueChange={setLocationId}>
                                <SelectTrigger><SelectValue placeholder="Source location..." /></SelectTrigger>
                                <SelectContent>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="flex items-center gap-1.5"><Warehouse size={12} className="text-slate-400" /> Loading Bay</Label>
                            <Input placeholder="e.g. Bay 04" value={loadingBayId} onChange={(e) => setLoadingBayId(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
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
                        <div>
                            <Label>Internal Dispatcher Notes</Label>
                            <Textarea placeholder="Loading observations..." className="h-20 resize-none" value={dispatcherNotes} onChange={(e) => setDispatcherNotes(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Items to Load</CardTitle>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Weight size={14} />
                        <span className="text-xs font-bold uppercase">Weight verification active</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <div className="flex-grow">
                            <Select onValueChange={handleAddItem}>
                                <SelectTrigger><SelectValue placeholder="Add a product to load..." /></SelectTrigger>
                                <SelectContent>{products.map((p: any) => <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Identity</TableHead>
                                <TableHead className="w-32">Quantity</TableHead>
                                <TableHead className="w-32 text-right">Sub-Weight</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-400 italic">No inventory added to this load.</TableCell></TableRow> : 
                            items.map(item => (
                                <TableRow key={item.variant_id}>
                                    <TableCell>
                                        <p className="font-bold text-slate-900">{item.label}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Unit Weight: {item.weight_each} KG</p>
                                    </TableCell>
                                    <TableCell><Input type="number" value={item.quantity} onChange={e => handleUpdateQty(item.variant_id, parseInt(e.target.value))}/></TableCell>
                                    <TableCell className="text-right font-mono text-sm">{(item.quantity * item.weight_each).toLocaleString()} KG</TableCell>
                                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.variant_id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 items-center pt-4 border-t border-slate-100">
                {manifestId && manifestId !== 'none' && (
                    <Badge variant="outline" className="h-8 px-4 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest">
                        Handshake: Manifest Linked
                    </Badge>
                )}
                <Button 
                    size="lg" 
                    onClick={handleSubmit} 
                    disabled={mutation.isPending || isOverloaded}
                    className={`${isOverloaded ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'} transition-all`}
                >
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isOverloaded ? 'Capacity Breach: Cannot Save' : (mutation.isPending ? 'Sealing Audit Logs...' : 'Confirm & Finalize Load')}
                </Button>
            </div>
        </div>
    );
}