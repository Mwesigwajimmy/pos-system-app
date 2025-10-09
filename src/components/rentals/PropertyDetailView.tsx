'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

// Types for our data
interface Unit { id: number; unit_identifier: string; monthly_rent: number; status: string; }
interface PropertyDetails { property: { id: number; name: string; }; units: Unit[] | null; }

// Professional data fetching and mutation functions
async function fetchPropertyDetails(propertyId: number): Promise<PropertyDetails> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_property_details', { p_property_id: propertyId });
    if (error) throw new Error(error.message);
    return data;
}
async function addUnit(data: { property_id: number; unit_identifier: string; monthly_rent: number; }) {
    const supabase = createClient();
    const { error } = await supabase.from('rental_units').insert(data);
    if (error) throw error;
}

export default function PropertyDetailView({ propertyId }: { propertyId: number }) {
    const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: details, isLoading } = useQuery({ 
        queryKey: ['propertyDetails', propertyId], 
        queryFn: () => fetchPropertyDetails(propertyId) 
    });

    const unitMutation = useMutation({
        mutationFn: addUnit,
        onSuccess: () => {
            toast.success("Unit added successfully!");
            queryClient.invalidateQueries({ queryKey: ['propertyDetails', propertyId] });
            setIsUnitDialogOpen(false);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const handleUnitSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        unitMutation.mutate({
            property_id: propertyId,
            unit_identifier: formData.get('unit_identifier') as string,
            monthly_rent: Number(formData.get('monthly_rent')),
        });
    };

    if (isLoading) return <div className="p-10 text-center">Loading property details...</div>;
    if (!details) return <div className="p-10 text-center">Property not found.</div>;

    const { property, units } = details;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">{property.name}</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Units</span>
                        <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>Add Unit</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New Unit to {property.name}</DialogTitle></DialogHeader>
                                <form id="addUnitForm" onSubmit={handleUnitSubmit} className="space-y-4 py-4">
                                    <div><Label htmlFor="unit_identifier">Unit Identifier</Label><Input id="unit_identifier" name="unit_identifier" placeholder="e.g., Apt 101, Shop #5" required /></div>
                                    <div><Label htmlFor="monthly_rent">Monthly Rent (UGX)</Label><Input id="monthly_rent" name="monthly_rent" type="number" required /></div>
                                </form>
                                <DialogFooter><Button type="submit" form="addUnitForm" disabled={unitMutation.isPending}>{unitMutation.isPending ? "Saving..." : "Save Unit"}</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Unit ID</TableHead><TableHead>Monthly Rent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {units?.map((unit: any) => (
                                <TableRow key={unit.id}>
                                    <TableCell>{unit.unit_identifier}</TableCell>
                                    <TableCell>UGX {unit.monthly_rent.toLocaleString()}</TableCell>
                                    <TableCell>{unit.status}</TableCell>
                                </TableRow>
                            ))}
                            {!units?.length && <TableRow><TableCell colSpan={3} className="text-center h-24">No units added to this property yet.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}