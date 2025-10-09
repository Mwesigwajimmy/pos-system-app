'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Trash2, Edit, Loader2, Star, AlertTriangle, MoreVertical } from 'lucide-react';

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
import { cn } from '@/lib/utils';

// Types
interface TaxRate { id: number; rate: number; start_date: string; end_date: string | null; profile_id: number; }
interface TaxProfile { id: number; name: string; is_default: boolean; tax_rates: TaxRate[] }
type ProfileFormData = Pick<TaxProfile, 'name'> & { id?: number };
type RateFormData = Omit<TaxRate, 'id' | 'profile_id'> & { id?: number; profile_id: number; };

// API Functions
const supabase = createClient();
const fetchTaxProfiles = async (): Promise<TaxProfile[]> => {
    const { data, error } = await supabase.from('tax_profiles').select('*, tax_rates(*)').order('name');
    if (error) throw new Error(error.message);
    return data as TaxProfile[];
};
const upsertTaxProfile = async (data: ProfileFormData) => { const { error } = await supabase.from('tax_profiles').upsert(data, { onConflict: 'id' }).select().single(); if (error) throw new Error(error.message); return data; };
const deleteTaxProfile = async (id: number) => { const { error } = await supabase.from('tax_profiles').delete().eq('id', id); if (error) throw new Error(error.message); };
const upsertTaxRate = async (data: RateFormData) => { const { error } = await supabase.from('tax_rates').upsert(data, { onConflict: 'id' }).select().single(); if (error) throw new Error(error.message); return data; };
const deleteTaxRate = async (id: number) => { const { error } = await supabase.from('tax_rates').delete().eq('id', id); if (error) throw new Error(error.message); };
const setDefaultProfile = async (id: number) => { const { error } = await supabase.rpc('set_default_tax_profile', { p_profile_id: id }); if (error) throw new Error(error.message); };

const ProfileForm = ({ profile, onSave, isLoading }: { profile?: ProfileFormData, onSave: (data: ProfileFormData) => void, isLoading: boolean }) => {
    const [name, setName] = useState(profile?.name || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: profile?.id, name }); };
    
    useEffect(() => { setName(profile?.name || ''); }, [profile]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
                <div><Label htmlFor="name">Profile Name</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., VAT, Hotel Tax" required /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Profile'}</Button></DialogFooter>
        </form>
    );
};

const RateForm = ({ rate, profileId, onSave, isLoading }: { rate?: TaxRate, profileId: number, onSave: (data: RateFormData) => void, isLoading: boolean }) => {
    const formatDateForInput = (date: string | null | undefined) => date ? format(parseISO(date), 'yyyy-MM-dd') : '';
    const [formData, setFormData] = useState({ rate: rate?.rate || 0, start_date: formatDateForInput(rate?.start_date), end_date: formatDateForInput(rate?.end_date) });
    
    useEffect(() => {
        setFormData({ rate: rate?.rate || 0, start_date: formatDateForInput(rate?.start_date), end_date: formatDateForInput(rate?.end_date) });
    }, [rate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        const payload = { 
            id: rate?.id, 
            profile_id: profileId, 
            ...formData, 
            rate: parseFloat(String(formData.rate)),
            end_date: formData.end_date || null 
        };
        onSave(payload); 
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
                <div><Label htmlFor="rate">Rate (%)</Label><Input id="rate" name="rate" type="number" step="0.01" value={formData.rate} onChange={handleChange} required /></div>
                <div><Label htmlFor="start_date">Start Date</Label><Input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} required /></div>
                <div><Label htmlFor="end_date">End Date (Optional)</Label><Input id="end_date" name="end_date" type="date" value={formData.end_date} onChange={handleChange} /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Rate'}</Button></DialogFooter>
        </form>
    );
};

const TaxRateManager = ({ profile, onAction }: { profile: TaxProfile, onAction: (type: string, data?: any) => void }) => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="flex items-center gap-2">{profile.name}{profile.is_default && <Badge variant="secondary"><Star className="mr-1 h-3 w-3" />Default</Badge>}</CardTitle>
                    <CardDescription>Manage rates for this tax profile.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {!profile.is_default && <Button variant="outline" size="sm" onClick={() => onAction('setDefault', profile.id)}>Set as Default</Button>}
                    <Button size="sm" onClick={() => onAction('addRate', profile)}><PlusCircle className="mr-2 h-4 w-4"/>Add Rate</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Rate (%)</TableHead><TableHead>Start Date</TableHead><TableHead>End Date</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                    {profile.tax_rates.length > 0 ? profile.tax_rates.map(rate => (
                        <TableRow key={rate.id}><TableCell>{rate.rate}%</TableCell><TableCell>{format(parseISO(rate.start_date), 'dd MMM, yyyy')}</TableCell><TableCell>{rate.end_date ? format(parseISO(rate.end_date), 'dd MMM, yyyy') : 'Ongoing'}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onAction('editRate', {profile, rate})}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => onAction('deleteRate', rate)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No tax rates defined for this profile.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const TaxManagerSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <Card><CardHeader><div className="flex justify-between items-center"><Skeleton className="h-6 w-3/4"/><Skeleton className="h-8 w-8"/></div></CardHeader><CardContent className="space-y-2 mt-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent></Card>
        <div><Card><CardHeader><Skeleton className="h-8 w-1/2 mb-2"/><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card></div>
    </div>
);

export default function TaxManager() {
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [action, setAction] = useState<{ type: string; data?: any }>({ type: '' });
    const queryClient = useQueryClient();

    const { data: profiles, isLoading, isError, error, refetch } = useQuery({ queryKey: ['taxProfiles'], queryFn: fetchTaxProfiles });
    const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

    useEffect(() => { if (!selectedProfileId && profiles && profiles.length > 0) { setSelectedProfileId(profiles[0].id); } }, [profiles, selectedProfileId]);

    const commonMutationOptions = {
        onSuccess: (message: string) => {
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: ['taxProfiles'] });
            setAction({ type: '' });
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    };

    const profileMutation = useMutation({
        mutationFn: upsertTaxProfile,
        onSuccess: (data) => commonMutationOptions.onSuccess(`Profile '${data.name}' ${'id' in data && data.id ? 'updated' : 'created'}.`),
        onError: commonMutationOptions.onError,
    });
    
    const rateMutation = useMutation({
        mutationFn: upsertTaxRate,
        onSuccess: (data) => commonMutationOptions.onSuccess(`Rate ${'id' in data && data.id ? 'updated' : 'added'}.`),
        onError: commonMutationOptions.onError,
    });

    const deleteProfileMutation = useMutation({
        mutationFn: deleteTaxProfile,
        onSuccess: () => commonMutationOptions.onSuccess('Profile deleted.'),
        onError: commonMutationOptions.onError,
    });
    
    const deleteRateMutation = useMutation({
        mutationFn: deleteTaxRate,
        onSuccess: () => commonMutationOptions.onSuccess('Rate deleted.'),
        onError: commonMutationOptions.onError,
    });
    
    const setDefaultMutation = useMutation({
        mutationFn: setDefaultProfile,
        onSuccess: () => commonMutationOptions.onSuccess('Default profile updated.'),
        onError: commonMutationOptions.onError,
    });

    if (isLoading) return <TaxManagerSkeleton />;
    if (isError) return <div className="text-center p-10"><AlertTriangle className="mx-auto h-12 w-12 text-destructive"/><h2 className="mt-4 text-xl">Failed to load tax data.</h2><p className="text-muted-foreground">{error.message}</p><Button onClick={() => refetch()} className="mt-4">Try Again</Button></div>;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center"><CardTitle>Tax Profiles</CardTitle><Button size="sm" variant="ghost" onClick={() => setAction({ type: 'addProfile' })}><PlusCircle className="h-4 w-4"/></Button></div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {profiles && profiles.length > 0 ? profiles.map(p => (
                        <Button key={p.id} variant={selectedProfileId === p.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setSelectedProfileId(p.id)}>
                            {p.is_default && <Star className="h-4 w-4 text-amber-500"/>}{p.name}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => setAction({ type: 'editProfile', data: p })}><Edit className="mr-2 h-4 w-4"/>Edit Name</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setAction({ type: 'deleteProfile', data: p })}><Trash2 className="mr-2 h-4 w-4"/>Delete Profile</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </Button>
                    )) : <p className="text-sm text-center text-muted-foreground p-4">No profiles created.</p>}
                </CardContent>
            </Card>
            <div>
                {selectedProfile ? <TaxRateManager profile={selectedProfile} onAction={(type, data) => type === 'setDefault' ? setDefaultMutation.mutate(data) : setAction({ type, data })} /> : 
                <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg p-8">
                    <CardTitle>Select a Profile</CardTitle><CardDescription>Choose a tax profile from the list to manage its rates.</CardDescription>
                </div>}
            </div>

            {/* Dialogs */}
            <Dialog open={['addProfile', 'editProfile'].includes(action.type)} onOpenChange={(isOpen) => !isOpen && setAction({ type: '' })}>
                <DialogContent><DialogHeader><DialogTitle>{action.type === 'addProfile' ? 'Add New' : 'Edit'} Tax Profile</DialogTitle></DialogHeader><ProfileForm profile={action.data} onSave={profileMutation.mutate} isLoading={profileMutation.isPending} /></DialogContent>
            </Dialog>
            <Dialog open={['addRate', 'editRate'].includes(action.type)} onOpenChange={(isOpen) => !isOpen && setAction({ type: '' })}>
                <DialogContent><DialogHeader><DialogTitle>{action.type === 'addRate' ? `Add Rate to ${action.data?.name}` : 'Edit Tax Rate'}</DialogTitle></DialogHeader><RateForm rate={action.data?.rate} profileId={action.data?.id || action.data?.profile?.id} onSave={rateMutation.mutate} isLoading={rateMutation.isPending} /></DialogContent>
            </Dialog>
            <AlertDialog open={['deleteProfile', 'deleteRate'].includes(action.type)} onOpenChange={(isOpen) => !isOpen && setAction({ type: '' })}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the {action.type === 'deleteProfile' ? `profile "${action.data?.name}" and all its rates` : 'tax rate'}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => action.type === 'deleteProfile' ? deleteProfileMutation.mutate(action.data.id) : deleteRateMutation.mutate(action.data.id)}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </div>
    );
}