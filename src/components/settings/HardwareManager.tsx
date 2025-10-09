'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Edit, Loader2, Star, AlertTriangle, MoreVertical, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Types
interface Printer { id: number; name: string; system_name: string; is_default: boolean; }
type PrinterFormData = Omit<Printer, 'id' | 'is_default'> & { id?: number };

// API Functions
const supabase = createClient();
const fetchPrinters = async (): Promise<Printer[]> => {
    const { data, error } = await supabase.from('printers').select('*').order('name');
    if (error) throw new Error(error.message);
    return data;
};
const upsertPrinter = async (data: PrinterFormData) => { const { error } = await supabase.from('printers').upsert(data).select(); if (error) throw new Error(error.message); };
const deletePrinter = async (id: number) => { const { error } = await supabase.from('printers').delete().eq('id', id); if (error) throw new Error(error.message); };
const setDefaultPrinter = async (id: number) => { const { error } = await supabase.rpc('set_default_printer', { p_printer_id: id }); if (error) throw new Error(error.message); };

// Sub-components
const PrinterForm = ({ printer, onSave, isLoading, onOpenChange }: { printer?: PrinterFormData, onSave: (data: PrinterFormData) => void, isLoading: boolean, onOpenChange: (open: boolean) => void }) => {
    const [name, setName] = useState(printer?.name || '');
    const [systemName, setSystemName] = useState(printer?.system_name || '');
    const isEditing = !!printer?.id;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: printer?.id, name, system_name: systemName });
    };

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Printer' : 'Add New Printer'}</DialogTitle>
                    <CardDescription>Enter a friendly name and the exact system name from your OS.</CardDescription>
                </DialogHeader>
                <form id="printerForm" onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="name">Printer Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder='e.g., "Front Counter Receipt"' required />
                    </div>
                    <div>
                        <Label htmlFor="system_name">System Name</Label>
                        <Input id="system_name" value={systemName} onChange={e => setSystemName(e.target.value)} placeholder='e.g., "EPSON TM-T20II"' required />
                    </div>
                </form>
                <DialogFooter>
                    <Button type="submit" form="printerForm" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Printer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const HardwareManagerSkeleton = () => (
    <Card>
        <CardHeader><div className="flex justify-between items-start"><div><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-4 w-96" /></div><Skeleton className="h-10 w-32" /></div></CardHeader>
        <CardContent><div className="rounded-md border p-4"><Skeleton className="h-8 w-full mb-4" /><Skeleton className="h-10 w-full mb-2" /><Skeleton className="h-10 w-full mb-2" /></div></CardContent>
    </Card>
);

// Main Component
export default function HardwareManager() {
    const [action, setAction] = useState<{ type: 'add' | 'edit' | 'delete' | null; data?: Printer }>({ type: null });
    const queryClient = useQueryClient();

    const { data: printers, isLoading, isError, error, refetch } = useQuery({ queryKey: ['printers'], queryFn: fetchPrinters });

    const handleMutation = (promise: Promise<any>, successMessage: string) => {
        toast.promise(promise, {
            loading: 'Processing...',
            success: () => { queryClient.invalidateQueries({ queryKey: ['printers'] }); setAction({ type: null }); return successMessage; },
            error: (err: Error) => err.message,
        });
    };
    
    const upsertMutation = useMutation({ mutationFn: upsertPrinter, onMutate: (data) => handleMutation(Promise.resolve(), `Printer ${data.id ? 'updated' : 'added'}.`) });
    const deleteMutation = useMutation({ mutationFn: deletePrinter, onMutate: () => handleMutation(Promise.resolve(), 'Printer deleted.') });
    const setDefaultMutation = useMutation({ mutationFn: setDefaultPrinter, onMutate: () => handleMutation(Promise.resolve(), 'Default printer updated.') });

    if (isLoading) return <HardwareManagerSkeleton />;
    if (isError) return <div className="text-center p-10"><AlertTriangle className="mx-auto h-12 w-12 text-destructive"/><h2 className="mt-4 text-xl">Failed to load printer data.</h2><p className="text-muted-foreground">{error.message}</p><Button onClick={() => refetch()} className="mt-4">Try Again</Button></div>;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Printer Management</CardTitle><CardDescription>Configure receipt printers for use with the POS bridge application.</CardDescription></div>
                    <Button onClick={() => setAction({ type: 'add' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Printer</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>System Name</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {printers && printers.length > 0 ? printers.map(printer => (
                                <TableRow key={printer.id}>
                                    <TableCell className="font-medium flex items-center gap-2">{printer.name}{printer.is_default && <Badge variant="secondary"><Star className="mr-1 h-3 w-3" />Default</Badge>}</TableCell>
                                    <TableCell className="font-mono text-sm">{printer.system_name}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {!printer.is_default && <DropdownMenuItem onClick={() => setDefaultMutation.mutate(printer.id)}><Star className="mr-2 h-4 w-4"/>Set as Default</DropdownMenuItem>}
                                                <DropdownMenuItem onClick={() => setAction({ type: 'edit', data: printer })}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => setAction({ type: 'delete', data: printer })}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No printers configured. Add one to get started.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>

                {['add', 'edit'].includes(action.type || '') && (
                    <PrinterForm 
                        printer={action.data}
                        onSave={upsertMutation.mutate}
                        isLoading={upsertMutation.isPending}
                        onOpenChange={(open) => !open && setAction({ type: null })}
                    />
                )}

                <AlertDialog open={action.type === 'delete'} onOpenChange={() => setAction({ type: null })}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the printer "{action.data?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(action.data!.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}