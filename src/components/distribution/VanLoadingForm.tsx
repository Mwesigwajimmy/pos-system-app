// src/components/distribution/VanLoadingForm.tsx
// FINAL & DEFINITIVE VERSION - SOVEREIGN CORPORATE UPGRADE
// VERSION 1.3: DEEP WELD WITH AUDITED BACKEND (NAME & ID ALIGNMENT)

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
    // This pulls the corrected JSON from our fixed SQL function
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

    // 3. COMPLIANCE DATA MATCHING (THE WELD)
    // We match by ID to show real-time alerts for the selected vehicle/agent
    const selectedVehicle = useMemo(() => 
        prereqs?.vehicles?.find((v: any) => v.id.toString() === vehicleId), 
    [vehicleId, prereqs]);

    const selectedAgent = useMemo(() => 
        prereqs?.salespeople?.find((p: any) => p.id === salespersonId), 
    [salespersonId, prereqs]);

    // 4. CAPACITY AUDIT (SMART WEIGHT LOGIC)
    const loadMetrics = useMemo(() => {
        return items.reduce((acc, item) => {
            return { totalWeight: acc.totalWeight + (item.weight_each * item.quantity) };
        }, { totalWeight: 0 });
    }, [items]);

    const isOverloaded = selectedVehicle?.max_weight_capacity_kg > 0 && 
                        loadMetrics.totalWeight > selectedVehicle.max_weight_capacity_kg;

    // 5. REGISTRY SYNCHRONIZATION (SUBMISSION)
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

        // DATA WELD: Matching the 7-parameter signature in the database
        mutation.mutate({ 
            p_vehicle_id: parseInt(vehicleId), 
            p_salesperson_id: salespersonId,   
            p_source_location_id: locationId, 
            p_manifest_id: manifestId === 'none' ? null : manifestId,
            p_loading_bay: loadingBayId,
            p_notes: dispatcherNotes,
            p_items: items.map(i => ({variant_id: i.variant_id, quantity: i.quantity})) 
        }); 
    };

    if (isLoading) return <div className="space-y-6 px-10 pt-10"><h1 className="text-3xl font-bold">Syncing Node Registry...</h1><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>;
    
    if (isError) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-destructive">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <h2 className="text-xl font-bold">Identity Handshake Failure</h2>
            <p className="text-sm opacity-70 mt-2">Error: {error.message}</p>
            <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>Retry Handshake</Button>
        </div>
    );
    
    const vehicles = prereqs?.vehicles || [];
    const salespeople = prereqs?.salespeople || [];
    const locations = prereqs?.locations || [];
    const products = prereqs?.products || [];
    const manifests = prereqs?.manifests || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* TOP BAR: IDENTITY & CAPACITY */}
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create New Van Load</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protocol Version: 1.3 • Corporate Distribution</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Live Load Weight</p>
                        <p className={`text-2xl font-black tabular-nums ${isOverloaded ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                            {loadMetrics.totalWeight.toLocaleString()} KG
                        </p>
                    </div>
                </div>
            </div>

            {/* COMPLIANCE WARNINGS */}
            {(selectedVehicle?.insurance_expiry || selectedAgent?.license_expiry) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVehicle?.insurance_expiry && isBefore(parseISO(selectedVehicle.insurance_expiry), new Date()) && (
                        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-center gap-4 text-red-800 shadow-sm">
                            <ShieldAlert className="h-6 w-6 text-red-500" />
                            <div className="text-xs">
                                <p className="font-black uppercase tracking-tight">Vehicle Insurance Breach</p>
                                <p className="font-medium opacity-80 mt-0.5">Insurance for this unit expired on {format(parseISO(selectedVehicle.insurance_expiry), 'do MMMM yyyy')}.</p>
                            </div>
                        </div>
                    )}
                    {selectedAgent?.license_expiry && isBefore(parseISO(selectedAgent.license_expiry), new Date()) && (
                        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4 text-amber-800 shadow-sm">
                            <UserCheck className="h-6 w-6 text-amber-600" />
                            <div className="text-xs">
                                <p className="font-black uppercase tracking-tight">Operator License Risk</p>
                                <p className="font-medium opacity-80 mt-0.5">Agent license reached expiration on {format(parseISO(selectedAgent.license_expiry), 'do MMMM yyyy')}.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 1: CUSTODY PARAMETERS */}
            <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-5 border-b border-slate-100 px-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Details & Chain of Custody</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
                    <div className="space-y-5">
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Assigned Transport Unit</Label>
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                                <SelectTrigger className="h-12 mt-2 rounded-xl shadow-inner bg-slate-50/30">
                                    <SelectValue placeholder="Select vehicle..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {vehicles.map((v: any) => (
                                        <SelectItem key={v.id} value={v.id.toString()} className="font-bold text-xs uppercase">
                                            {v.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedVehicle && <p className="text-[10px] text-blue-600 mt-2 font-black uppercase tracking-tighter">Legal Capacity: {selectedVehicle.max_weight_capacity_kg} KG</p>}
                        </div>
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Responsible Field Agent</Label>
                            <Select value={salespersonId} onValueChange={setSalespersonId}>
                                <SelectTrigger className="h-12 mt-2 rounded-xl shadow-inner bg-slate-50/30">
                                    <SelectValue placeholder="Assign agent..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {salespeople.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id} className="font-bold text-xs uppercase">{p.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Distribution Origin</Label>
                            <Select value={locationId} onValueChange={setLocationId}>
                                <SelectTrigger className="h-12 mt-2 rounded-xl shadow-inner bg-slate-50/30">
                                    <SelectValue placeholder="Source location..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {locations.map((l: any) => (
                                        <SelectItem key={l.id} value={l.id} className="font-bold text-xs uppercase">{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1.5"><Warehouse size={12}/> Loading Station / Port</Label>
                            <Input placeholder="e.g. Bay 04" value={loadingBayId} onChange={(e) => setLoadingBayId(e.target.value)} className="h-12 mt-2 rounded-xl border-slate-200 font-bold text-xs uppercase" />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1.5"><Link2 size={12} className="text-blue-500" /> Link Legal Manifest</Label>
                            <Select value={manifestId} onValueChange={setManifestId}>
                                <SelectTrigger className="border-blue-100 bg-blue-50/10 h-12 mt-2 rounded-xl">
                                    <SelectValue placeholder="Search manifests..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="none" className="font-bold text-slate-400 italic">Standalone Load (No Manifest)</SelectItem>
                                    {manifests.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <span className="font-black uppercase text-xs">{m.shipment_ref}</span> 
                                            <span className="text-[9px] text-blue-500 ml-2 font-black">[{m.shipment_type}]</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Loading Observations</Label>
                            <Textarea placeholder="Dispatcher notes..." className="h-24 resize-none mt-2 text-xs font-bold uppercase rounded-2xl border-slate-200 bg-slate-50/20" value={dispatcherNotes} onChange={(e) => setDispatcherNotes(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 2: ITEM LOADING LEDGER */}
            <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-900 py-5 px-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Inventory Specification Matrix</CardTitle>
                    <div className="flex items-center gap-2 text-white/40">
                        <Weight size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Weight Logic Active</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                        <Select onValueChange={handleAddItem}>
                            <SelectTrigger className="h-14 bg-white rounded-2xl border-slate-100 shadow-xl"><SelectValue placeholder="Identify material for load out..." /></SelectTrigger>
                            <SelectContent className="max-h-96 rounded-2xl shadow-2xl">
                                {products.map((p: any) => <SelectItem key={p.value} value={p.value.toString()} className="font-bold text-xs uppercase">{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Table>
                        <TableHeader className="bg-slate-50/50 h-14">
                            <TableRow className="border-none">
                                <TableHead className="text-[10px] font-black uppercase text-slate-500 pl-8">Material Identity</TableHead>
                                <TableHead className="w-32 text-[10px] font-black uppercase text-slate-500 text-center">Quantity</TableHead>
                                <TableHead className="w-40 text-right text-[10px] font-black uppercase text-slate-500 pr-12">Calculated Mass</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">System awaiting material entry.</TableCell></TableRow> : 
                            items.map(item => (
                                <TableRow key={item.variant_id} className="hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-none group">
                                    <TableCell className="py-6 pl-8">
                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.label}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black mt-1">Ref Mass: {item.weight_each} KG / UNIT</p>
                                    </TableCell>
                                    <TableCell className="text-center"><Input type="number" value={item.quantity} onChange={e => handleUpdateQty(item.variant_id, parseInt(e.target.value))} className="h-12 w-24 mx-auto font-black text-center border-slate-200 rounded-xl" /></TableCell>
                                    <TableCell className="text-right pr-12 font-mono text-base font-black text-slate-900 tracking-tighter">{(item.quantity * item.weight_each).toLocaleString()} KG</TableCell>
                                    <TableCell className="pr-4"><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.variant_id)} className="h-10 w-10 rounded-full text-slate-200 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={20}/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* SECTION 3: PROTOCOL FINALIZATION */}
            <div className="flex justify-end gap-5 items-center pt-8 border-t border-slate-100">
                {manifestId && manifestId !== 'none' && (
                    <Badge variant="outline" className="h-10 px-6 border-emerald-100 bg-emerald-50 text-emerald-800 font-black uppercase tracking-widest text-[9px] shadow-sm rounded-xl">
                        Chain of Custody: Manifest Linked
                    </Badge>
                )}
                <Button 
                    size="lg" 
                    onClick={handleSubmit} 
                    disabled={mutation.isPending || isOverloaded}
                    className={`h-16 px-16 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all shadow-2xl ${isOverloaded ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'}`}
                >
                    {mutation.isPending && <Loader2 className="mr-3 h-5 w-5 animate-spin"/>}
                    {isOverloaded ? 'Weight Discrepancy Protocol Blocked' : (mutation.isPending ? 'Sealing Audit Records...' : 'Seal & Finalize Load Out')}
                </Button>
            </div>
        </div>
    );
}