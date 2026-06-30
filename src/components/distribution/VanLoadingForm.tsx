// src/components/distribution/VanLoadingForm.tsx
// FINAL & DEFINITIVE VERSION - SOVEREIGN CORPORATE UPGRADE
// VERSION 1.2: DEEP WELD WITH AUDITED BACKEND

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
import { Trash2, Loader2, AlertTriangle, Link2, ShieldAlert, Weight, Warehouse, UserCheck } from 'lucide-react'; 
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
    
    // 1. DATA FETCHING (IDENTITY HANDSHAKE)
    const { data: prereqs, isLoading, isError, error } = useQuery({ 
        queryKey: ['vanLoadingPrereqs'], 
        queryFn: getPrereqs 
    });
    
    // 2. FORM STATE (CHAIN OF CUSTODY)
    const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
    const [salespersonId, setSalespersonId] = useState<string | undefined>(undefined);
    const [locationId, setLocationId] = useState<string | undefined>(undefined);
    const [manifestId, setManifestId] = useState<string | undefined>(undefined);
    const [loadingBayId, setLoadingBayId] = useState<string>('');
    const [dispatcherNotes, setDispatcherNotes] = useState<string>('');
    const [items, setItems] = useState<any[]>([]);

    // 3. COMPLIANCE MEMOS
    const selectedVehicle = useMemo(() => 
        prereqs?.vehicles?.find((v: any) => v.id.toString() === vehicleId), 
    [vehicleId, prereqs]);

    const selectedAgent = useMemo(() => 
        prereqs?.salespeople?.find((p: any) => p.id === salespersonId), 
    [salespersonId, prereqs]);

    // 4. LOAD METRICS (CAPACITY AUDIT)
    const loadMetrics = useMemo(() => {
        return items.reduce((acc, item) => {
            // Finding the product weight from prerequisites
            const prod = prereqs?.products?.find((p: any) => p.value === item.variant_id);
            const weight = (prod?.weight_kg || 0) * item.quantity;
            return { totalWeight: acc.totalWeight + weight };
        }, { totalWeight: 0 });
    }, [items, prereqs]);

    const isOverloaded = selectedVehicle?.max_weight_capacity_kg > 0 && 
                        loadMetrics.totalWeight > selectedVehicle.max_weight_capacity_kg;

    // 5. SUBMISSION MUTATION (THE WELD)
    const mutation = useMutation({ 
        mutationFn: loadVan, 
        onSuccess: () => { 
            toast.success('Operational Protocol Synchronized Successfully'); 
            queryClient.invalidateQueries({queryKey: ['distributionSummary']}); 
            router.push('/distribution'); 
        }, 
        onError: (error: any) => toast.error(`Registry Error: ${error.message}`)
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
            return toast.error('Security Warning: Required legal fields missing.'); 
        }
        
        if (isOverloaded) return toast.error('Safety Alert: Vehicle capacity exceeded.');

        // This payload exactly matches the 7-parameter PostgreSQL function we created
        mutation.mutate({ 
            p_vehicle_id: parseInt(vehicleId), // Mapped to BigInt
            p_salesperson_id: salespersonId,   // Mapped to UUID
            p_source_location_id: locationId, // Mapped to UUID
            p_manifest_id: manifestId === 'none' ? null : manifestId,
            p_loading_bay: loadingBayId,
            p_notes: dispatcherNotes,
            p_items: items.map(i => ({variant_id: i.variant_id, quantity: i.quantity})) 
        }); 
    };

    if (isLoading) return <div className="space-y-6"><h1 className="text-3xl font-bold">Registry Node Handshake...</h1><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>;
    if (isError) return <div className="text-center p-12 text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />Failed to load necessary data. <p className="text-sm">{error.message}</p></div>;
    
    const vehicles = prereqs?.vehicles || [];
    const salespeople = prereqs?.salespeople || [];
    const locations = prereqs?.locations || [];
    const products = prereqs?.products || [];
    const manifests = prereqs?.manifests || [];

    return (
        <div className="space-y-6">
            {/* HEADER AND CAPACITY MONITOR */}
            <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">Create New Van Load</h1>
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
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700 shadow-sm animate-in fade-in">
                            <ShieldAlert className="h-5 w-5" />
                            <div className="text-xs">
                                <p className="font-bold uppercase tracking-tight">Insurance Expired</p>
                                <p className="opacity-80">This vehicle insurance expired on {format(parseISO(selectedVehicle.insurance_expiry), 'PPP')}.</p>
                            </div>
                        </div>
                    )}
                    {selectedAgent?.license_expiry && isBefore(parseISO(selectedAgent.license_expiry), new Date()) && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-700 shadow-sm animate-in fade-in">
                            <UserCheck className="h-5 w-5 text-amber-600" />
                            <div className="text-xs">
                                <p className="font-bold uppercase tracking-tight">License Discrepancy</p>
                                <p className="opacity-80">The agent license expired on {format(parseISO(selectedAgent.license_expiry), 'PPP')}.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 1: REGISTRY DETAILS */}
            <Card className="border-slate-100 shadow-sm">
                <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Details & Chain of Custody</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-600">Active Fleet Vehicle</Label>
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                                <SelectTrigger className="h-11 mt-1.5"><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
                            </Select>
                            {selectedVehicle && <p className="text-[10px] text-blue-600 mt-2 font-black uppercase">Max Load: {selectedVehicle.max_weight_capacity_kg} KG</p>}
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-slate-600">Authorized Agent / Salesperson</Label>
                            <Select value={salespersonId} onValueChange={setSalespersonId}>
                                <SelectTrigger className="h-11 mt-1.5"><SelectValue placeholder="Assign agent..." /></SelectTrigger>
                                <SelectContent>{salespeople.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-600">Source Distribution Warehouse</Label>
                            <Select value={locationId} onValueChange={setLocationId}>
                                <SelectTrigger className="h-11 mt-1.5"><SelectValue placeholder="Source location..." /></SelectTrigger>
                                <SelectContent>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Warehouse size={12} className="text-slate-400" /> Loading Bay / Port</Label>
                            <Input placeholder="e.g. Bay 04" value={loadingBayId} onChange={(e) => setLoadingBayId(e.target.value)} className="h-11 mt-1.5" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Link2 size={12} className="text-blue-500" /> Link Cargo Manifest</Label>
                            <Select value={manifestId} onValueChange={setManifestId}>
                                <SelectTrigger className="border-blue-100 bg-blue-50/10 h-11 mt-1.5">
                                    <SelectValue placeholder="Search manifests..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="font-bold text-slate-400 italic">Standalone Load (No Manifest)</SelectItem>
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
                            <Label className="text-xs font-bold text-slate-600">Dispatcher Notes</Label>
                            <Textarea placeholder="Loading observations..." className="h-20 resize-none mt-1.5 text-xs font-medium" value={dispatcherNotes} onChange={(e) => setDispatcherNotes(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 2: ITEM LOADING MATRIX */}
            <Card className="border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Items to Load</CardTitle>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Weight size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Mass verification protocol active</span>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-2 mb-6">
                        <div className="flex-grow">
                            <Select onValueChange={handleAddItem}>
                                <SelectTrigger className="h-12 bg-white shadow-inner"><SelectValue placeholder="Identify product for load out..." /></SelectTrigger>
                                <SelectContent className="max-h-96">{products.map((p: any) => <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Table className="border border-slate-50">
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="text-[10px] font-bold uppercase text-slate-400">Inventory Specification</TableHead>
                                <TableHead className="w-32 text-[10px] font-bold uppercase text-slate-400">Quantity</TableHead>
                                <TableHead className="w-32 text-right text-[10px] font-bold uppercase text-slate-400 pr-10">Calc. Mass</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-300 font-medium italic">System awaiting entry of inventory items.</TableCell></TableRow> : 
                            items.map(item => (
                                <TableRow key={item.variant_id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4">
                                        <p className="font-black text-slate-900 text-sm">{item.label}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black mt-0.5">Reference Mass: {item.weight_each} KG</p>
                                    </TableCell>
                                    <TableCell><Input type="number" value={item.quantity} onChange={e => handleUpdateQty(item.variant_id, parseInt(e.target.value))} className="h-10 font-bold text-center border-slate-200" /></TableCell>
                                    <TableCell className="text-right pr-10 font-mono text-sm font-bold text-slate-600">{(item.quantity * item.weight_each).toLocaleString()} KG</TableCell>
                                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.variant_id)} className="h-9 w-9 rounded-full text-slate-300 hover:text-red-600 transition-all"><Trash2 size={16}/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* SECTION 3: FINALIZATION CONTROL */}
            <div className="flex justify-end gap-3 items-center pt-6 border-t border-slate-100">
                {manifestId && manifestId !== 'none' && (
                    <Badge variant="outline" className="h-9 px-4 border-emerald-200 bg-emerald-50 text-emerald-800 font-black uppercase tracking-widest text-[9px] shadow-sm">
                        Verification: Manifest Linked
                    </Badge>
                )}
                <Button 
                    size="lg" 
                    onClick={handleSubmit} 
                    disabled={mutation.isPending || isOverloaded}
                    className={`h-14 px-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${isOverloaded ? 'bg-slate-300' : 'bg-slate-900 hover:bg-black active:scale-95'}`}
                >
                    {mutation.isPending && <Loader2 className="mr-3 h-5 w-5 animate-spin"/>}
                    {isOverloaded ? 'Weight Discrepancy Error' : (mutation.isPending ? 'Sealing Records...' : 'Seal & Finalize Load')}
                </Button>
            </div>
        </div>
    );
}