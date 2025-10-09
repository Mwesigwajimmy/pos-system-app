'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import toast from 'react-hot-toast';
import { ChevronRight, PlusCircle } from 'lucide-react';

// --- TYPE DEFINITIONS ---
// FIXED: Define the shape of a single rental unit.
interface RentalUnit {
    id: number;
    unit_identifier: string;
    monthly_rent: number;
    status: string;
}

// FIXED: Define the shape of a property, including its nested rental units.
interface Property {
    id: number;
    name: string;
    rental_units: RentalUnit[];
}

// --- DATA FETCHING & MUTATIONS ---
// FIXED: Specify the function's return type.
async function fetchProperties(): Promise<Property[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('properties').select('*, rental_units(*)').order('name');
    if (error) throw error;
    return data || [];
}

async function addProperty(data: any) { const supabase = createClient(); const { error } = await supabase.from('properties').insert(data); if (error) throw error; }
async function addUnit(data: any) { const supabase = createClient(); const { error } = await supabase.from('rental_units').insert(data); if (error) throw error; }

// --- MAIN COMPONENT ---
export default function PropertiesWithUnits() {
    const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // FIXED: Tell useQuery what data shape to expect.
    const { data: properties, isLoading } = useQuery<Property[]>({ queryKey: ['propertiesWithUnits'], queryFn: fetchProperties });

    const propertyMutation = useMutation({ mutationFn: addProperty, onSuccess: () => { toast.success("Property added!"); queryClient.invalidateQueries({ queryKey: ['propertiesWithUnits'] }); setIsPropertyDialogOpen(false); } });
    const unitMutation = useMutation({ mutationFn: addUnit, onSuccess: () => { toast.success("Unit added!"); queryClient.invalidateQueries({ queryKey: ['propertiesWithUnits'] }); setIsUnitDialogOpen(false); } });

    const handlePropertySubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); propertyMutation.mutate({ name: fd.get('name'), address: fd.get('address'), property_type: fd.get('type') }); };
    const handleUnitSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); unitMutation.mutate({ property_id: selectedPropertyId, unit_identifier: fd.get('unit_identifier'), monthly_rent: fd.get('monthly_rent') }); };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isPropertyDialogOpen} onOpenChange={setIsPropertyDialogOpen}>
                    <DialogTrigger asChild><Button>Add Property</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Property</DialogTitle></DialogHeader>
                        <form id="addPropertyForm" onSubmit={handlePropertySubmit} className="space-y-4">
                            <div><Label>Property Name</Label><Input name="name" required /></div>
                            <div><Label>Address</Label><Input name="address" /></div>
                            <div><Label>Type</Label><Input name="type" placeholder="e.g., Commercial" /></div>
                        </form>
                        <DialogFooter><Button type="submit" form="addPropertyForm" disabled={propertyMutation.isPending}>{propertyMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="rounded-md border bg-card">
                {isLoading && <div className="p-4 text-center">Loading properties...</div>}
                {properties?.map((prop: Property) => (
                    <Collapsible key={prop.id} className="border-b">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center p-4 cursor-pointer hover:bg-accent">
                                <ChevronRight className="h-4 w-4 mr-2 transition-transform [&[data-state=open]>svg]:rotate-90" />
                                <span className="font-medium flex-1">{prop.name}</span>
                                <span className="text-sm text-muted-foreground">{prop.rental_units.length} Units</span>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="bg-muted/50 p-4">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Unit ID</TableHead><TableHead>Monthly Rent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {/* FIXED: Explicitly type 'unit' to resolve the 'any' type error. */}
                                        {prop.rental_units.map((unit: RentalUnit) => 
                                            <TableRow key={unit.id}>
                                                <TableCell>{unit.unit_identifier}</TableCell>
                                                <TableCell>UGX {unit.monthly_rent.toLocaleString()}</TableCell>
                                                <TableCell>{unit.status}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <Dialog open={isUnitDialogOpen && selectedPropertyId === prop.id} onOpenChange={setIsUnitDialogOpen}>
                                    <DialogTrigger asChild><Button variant="outline" size="sm" className="mt-2" onClick={() => { setIsUnitDialogOpen(true); setSelectedPropertyId(prop.id); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Unit</Button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Add Unit to {prop.name}</DialogTitle></DialogHeader>
                                        <form id="addUnitForm" onSubmit={handleUnitSubmit} className="space-y-4">
                                            <div><Label>Unit Identifier</Label><Input name="unit_identifier" placeholder="e.g., Apt 101, Shop #5" required /></div>
                                            <div><Label>Monthly Rent (UGX)</Label><Input name="monthly_rent" type="number" required /></div>
                                        </form>
                                        <DialogFooter><Button type="submit" form="addUnitForm" disabled={unitMutation.isPending}>{unitMutation.isPending ? "Saving..." : "Save Unit"}</Button></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        </div>
    );
}