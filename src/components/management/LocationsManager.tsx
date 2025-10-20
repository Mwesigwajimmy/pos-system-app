'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  ArrowUpDown,
  Edit,
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Users,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Types
type Location = { id: string; name: string; address: string; staff_count: number; };
type Employee = { id: string; name: string; };
type LocationMutationData = { name: string; address: string; };

// API Functions
const supabase = createClient();

const fetchLocations = async (): Promise<Location[]> => {
    const { data, error } = await supabase.rpc('get_locations_with_staff_count');
    if (error) throw new Error(error.message);
    return data;
};

const addLocation = async (newData: LocationMutationData) => {
    const { error } = await supabase.from('locations').insert(newData).select().single();
    if (error) throw new Error(error.message);
};

const updateLocation = async ({ id, ...updateData }: { id: string } & Partial<LocationMutationData>) => {
    const { error } = await supabase.from('locations').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
};

const deleteLocation = async (id: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

const fetchStaffForLocation = async (locationId: string): Promise<Employee[]> => {
    const { data, error } = await supabase.rpc('get_staff_for_location', { p_location_id: locationId });
    if (error) throw new Error(error.message);
    return data || [];
};

const fetchUnassignedStaff = async (): Promise<Employee[]> => {
    const { data, error } = await supabase.rpc('get_unassigned_staff');
    if (error) throw new Error(error.message);
    return data || [];
};

const assignStaff = async ({ locationId, employeeId }: { locationId: string; employeeId: string }) => {
    const { error } = await supabase.rpc('assign_staff_to_location', { p_location_id: locationId, p_staff_id: employeeId });
    if (error) throw new Error(error.message);
};

const unassignStaff = async ({ employeeId }: { employeeId: string }) => {
    const { error } = await supabase.rpc('unassign_staff_from_location', { p_staff_id: employeeId });
    if (error) throw new Error(error.message);
};

// Sub-component: Location Add/Edit Form
const LocationForm = ({ initialData, onSubmit, isLoading }: { initialData?: LocationMutationData; onSubmit: (data: LocationMutationData) => void; isLoading: boolean; }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [address, setAddress] = useState(initialData?.address || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, address });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} className="col-span-3" required />
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}</Button>
            </DialogFooter>
        </form>
    );
};

// Sub-component: Staff Management Dialog
const ManageStaffDialog = ({ location }: { location: Location }) => {
    const queryClient = useQueryClient();
    const staffQueryKey = ['locationStaff', location.id];
    const unassignedQueryKey = ['unassignedStaff'];

    const { data: assignedStaff, isLoading: isLoadingAssigned } = useQuery<Employee[]>({ queryKey: staffQueryKey, queryFn: () => fetchStaffForLocation(location.id) });
    const { data: unassignedStaff, isLoading: isLoadingUnassigned } = useQuery<Employee[]>({ queryKey: unassignedQueryKey, queryFn: fetchUnassignedStaff });

    const mutationOptions = (successMessage: string) => ({
        onSuccess: () => {
            toast.success(successMessage);
            queryClient.invalidateQueries({ queryKey: staffQueryKey });
            queryClient.invalidateQueries({ queryKey: unassignedQueryKey });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const assignMutation = useMutation({ mutationFn: assignStaff, ...mutationOptions('Staff assigned successfully.') });
    const unassignMutation = useMutation({ mutationFn: unassignStaff, ...mutationOptions('Staff unassigned successfully.') });

    const StaffList = ({ title, staff, action, mutation, isAssigning }: { title: string, staff?: Employee[], action: (employeeId: string) => void, mutation: any, isAssigning: boolean }) => (
        <div className="space-y-2">
            <h4 className="font-semibold">{title}</h4>
            <Card className="p-2 min-h-[100px]">
                {staff && staff.length > 0 ? staff.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                        <span>{e.name}</span>
                        <Button size="sm" variant="outline" onClick={() => action(e.id)} disabled={mutation.isPending && mutation.variables?.employeeId === e.id}>
                            {mutation.isPending && mutation.variables?.employeeId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAssigning ? "Assign" : "Unassign")}
                        </Button>
                    </div>
                )) : <p className="text-sm text-muted-foreground p-2 text-center">No staff found.</p>}
            </Card>
        </div>
    );
    
    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Manage Staff for {location.name}</DialogTitle><DialogDescription>Assign or unassign employees from this location.</DialogDescription></DialogHeader>
            {(isLoadingAssigned || isLoadingUnassigned) ? <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <StaffList title="Assigned Staff" staff={assignedStaff} action={(employeeId) => unassignMutation.mutate({ employeeId })} mutation={unassignMutation} isAssigning={false} />
                <StaffList title="Available Staff" staff={unassignedStaff} action={(employeeId) => assignMutation.mutate({ locationId: location.id, employeeId })} mutation={assignMutation} isAssigning={true} />
            </div>}
        </DialogContent>
    );
};

// --- Main Component ---
export default function LocationsManager() {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [actionState, setActionState] = useState<{ type: 'add' | 'edit' | 'delete' | 'staff' | null; data?: Location }>({ type: null });

    const { data: locations, isLoading, isError, error } = useQuery<Location[]>({ queryKey: ['locations'], queryFn: fetchLocations });

    // =========================================================================
    // THIS IS THE CORRECTED CODE
    // We make the function generic with `<TVariables>` and use that type for
    // the mutation function's parameters. This allows TypeScript to infer
    // the correct types for `addMutation` and `updateMutation`.
    // =========================================================================
    const createMutationHandler = <TVariables extends {}>(
        mutationFn: (variables: TVariables) => Promise<void>,
        successMessage: string
    ) => {
        return useMutation({
            mutationFn,
            onSuccess: () => {
                toast.success(successMessage);
                queryClient.invalidateQueries({ queryKey: ['locations'] });
                setActionState({ type: null });
            },
            onError: (err: Error) => toast.error(err.message),
        });
    };
    
    const addMutation = createMutationHandler(addLocation, 'Location added successfully.');
    const updateMutation = createMutationHandler(updateLocation, 'Location updated successfully.');
    const deleteMutation = createMutationHandler(deleteLocation, 'Location deleted successfully.');

    const columns: ColumnDef<Location>[] = useMemo(() => [
        { accessorKey: 'name', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Name<ArrowUpDown className="ml-2 h-4 w-4" /></Button> },
        { accessorKey: 'address', header: 'Address' },
        { accessorKey: 'staff_count', header: 'Assigned Staff', cell: ({ row }) => <Badge variant="secondary">{row.original.staff_count}</Badge> },
        { id: 'actions', cell: ({ row }) => (
            <div className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setActionState({ type: 'staff', data: row.original })}>
                            <Users className="mr-2 h-4 w-4" /> Manage Staff
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActionState({ type: 'edit', data: row.original })}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setActionState({ type: 'delete', data: row.original })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )},
    ], []);

    const table = useReactTable({ data: locations ?? [], columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

    if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
    if (isError) return <div className="text-center p-10 text-destructive"><AlertTriangle className="mx-auto h-12 w-12" />Error: {error.message}</div>;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Manage Locations</CardTitle><CardDescription>Add, edit, and manage staff for your business locations.</CardDescription></div>
                    <Button onClick={() => setActionState({ type: 'add' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Location</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                        <TableBody>{table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No locations found. Start by adding one.</TableCell></TableRow>}</TableBody>
                    </Table>
                </div>

                <Dialog open={actionState.type === 'add' || actionState.type === 'edit'} onOpenChange={() => setActionState({ type: null })}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{actionState.type === 'add' ? 'Add New Location' : 'Edit Location'}</DialogTitle><DialogDescription>Fill in the details for the location below.</DialogDescription></DialogHeader>
                        <LocationForm 
                            initialData={actionState.type === 'edit' ? { name: actionState.data!.name, address: actionState.data!.address } : undefined}
                            isLoading={addMutation.isPending || updateMutation.isPending}
                            onSubmit={data => {
                                if (actionState.type === 'add') {
                                    addMutation.mutate(data);
                                } else if (actionState.type === 'edit' && actionState.data) {
                                    updateMutation.mutate({ id: actionState.data.id, ...data });
                                }
                            }}
                        />
                    </DialogContent>
                </Dialog>

                {actionState.data && <Dialog open={actionState.type === 'staff'} onOpenChange={() => setActionState({ type: null })}><ManageStaffDialog location={actionState.data} /></Dialog>}

                <AlertDialog open={actionState.type === 'delete'} onOpenChange={() => setActionState({ type: null })}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{actionState.data?.name}" location. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => actionState.data && deleteMutation.mutate(actionState.data.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}