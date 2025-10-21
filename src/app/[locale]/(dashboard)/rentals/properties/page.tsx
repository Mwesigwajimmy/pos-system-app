'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import toast from 'react-hot-toast';
import { ChevronRight, PlusCircle } from 'lucide-react';

// Define types for our data for professional code quality
interface Unit { id: number; unit_identifier: string; monthly_rent: number; status: string; }
interface Property { id: number; name: string; address: string; property_type: string; rental_units: Unit[]; }

// Professional data fetching and mutation functions
async function fetchProperties(): Promise<Property[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('properties').select('*, rental_units(*)').order('name');
    if (error) throw new Error(error.message);
    return data as Property[];
}

async function addProperty(data: { name: string; address: string; property_type: string; }) {
    const supabase = createClient();
    const { error } = await supabase.from('properties').insert(data);
    if (error) throw error;
}

async function addUnit(data: { property_id: number; unit_identifier: string; monthly_rent: number; }) {
    const supabase = createClient();
    const { error } = await supabase.from('rental_units').insert(data);
    if (error) throw error;
}

export default function PropertiesPage() {
    const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const queryClient = useQueryClient();

    const { data: properties, isLoading } = useQuery({ queryKey: ['propertiesWithUnits'], queryFn: fetchProperties });

    const propertyMutation = useMutation({ mutationFn: addProperty, onSuccess: () => { toast.success("Property added successfully!"); queryClient.invalidateQueries({ queryKey: ['propertiesWithUnits'] }); setIsPropertyDialogOpen(false); }, onError: (e: any) => toast.error(e.message) });
    const unitMutation = useMutation({ mutationFn: addUnit, onSuccess: () => { toast.success("Unit added successfully!"); queryClient.invalidateQueries({ queryKey: ['propertiesWithUnits'] }); setIsUnitDialogOpen(false); setSelectedProperty(null); }, onError: (e: any) => toast.error(e.message) });

    const handlePropertySubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); propertyMutation.mutate({ name: fd.get('name') as string, address: fd.get('address') as string, property_type: fd.get('type') as string }); };
    const handleUnitSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); unitMutation.mutate({ property_id: selectedProperty!.id, unit_identifier: fd.get('unit_identifier') as string, monthly_rent: Number(fd.get('monthly_rent')) }); };
    
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Properties & Units</h1>
                <Dialog open={isPropertyDialogOpen} onOpenChange={setIsPropertyDialogOpen}>
                    <DialogTrigger asChild><Button>Add Property</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Property</DialogTitle></DialogHeader>
                        <form id="addPropertyForm" onSubmit={handlePropertySubmit} className="space-y-4 py-4">
                            <div><Label htmlFor="name">Property Name</Label><Input id="name" name="name" required /></div>
                            <div><Label htmlFor="address">Address</Label><Input id="address" name="address" /></div>
                            <div><Label htmlFor="type">Property Type</Label><Input id="type" name="type" placeholder="e.g., Commercial, Residential" /></div>
                        </form>
                        <DialogFooter><Button type="submit" form="addPropertyForm" disabled={propertyMutation.isPending}>{propertyMutation.isPending ? "Saving..." : "Save Property"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-card text-card-foreground">
                {isLoading && <div className="p-4 text-center">Loading properties...</div>}
                {properties?.map(prop => (
                    <Collapsible key={prop.id} className="border-b last:border-none">
                        <CollapsibleTrigger className="flex items-center p-4 w-full text-left [&[data-state=open]>svg]:rotate-90 hover:bg-accent">
                            <ChevronRight className="h-4 w-4 mr-4 transition-transform" />
                            <span className="font-medium flex-1">{prop.name}</span>
                            <span className="text-sm text-muted-foreground">{prop.rental_units.length} Units</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="bg-muted/50 p-4">
                                {prop.rental_units.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Unit ID</TableHead><TableHead>Monthly Rent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {prop.rental_units.map(unit => <TableRow key={unit.id}><TableCell>{unit.unit_identifier}</TableCell><TableCell>UGX {unit.monthly_rent.toLocaleString()}</TableCell><TableCell>{unit.status}</TableCell></TableRow>)}
                                        </TableBody>
                                    </Table>
                                ) : <p className="text-sm text-center text-muted-foreground py-4">No units added to this property yet.</p>}
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSelectedProperty(prop); setIsUnitDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Unit</Button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>

            {/* A single dialog for adding units, its content changes based on selectedProperty */}
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Unit to {selectedProperty?.name}</DialogTitle></DialogHeader>
                    <form id="addUnitForm" onSubmit={handleUnitSubmit} className="space-y-4 py-4">
                        <div><Label htmlFor="unit_identifier">Unit Identifier</Label><Input id="unit_identifier" name="unit_identifier" placeholder="e.g., Apt 101, Shop #5" required /></div>
                        <div><Label htmlFor="monthly_rent">Monthly Rent (UGX)</Label><Input id="monthly_rent" name="monthly_rent" type="number" required /></div>
                    </form>
                    <DialogFooter><Button type="submit" form="addUnitForm" disabled={unitMutation.isPending}>{unitMutation.isPending ? "Saving..." : "Save Unit"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}