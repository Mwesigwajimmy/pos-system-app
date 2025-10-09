// src/components/management/ApiSettingsManager.tsx

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, Trash2, KeyRound, AlertTriangle, Copy } from 'lucide-react';

// REAL RPC FUNCTION CALLS
async function listApiKeys() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('list_api_keys');
    if (error) throw new Error(error.message);
    return data;
}

async function generateApiKey(keyName: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('generate_and_store_api_key', { p_key_name: keyName });
    if (error) throw new Error(error.message);
    return data;
}

async function deleteApiKey(keyId: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_api_key', { p_key_id: keyId });
    if (error) throw new Error(error.message);
}

export default function ApiSettingsManager() {
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const [isViewKeyDialogOpen, setIsViewKeyDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [keyNameToDelete, setKeyNameToDelete] = useState<string | null>(null);
    const [keyIdToDelete, setKeyIdToDelete] = useState<string | null>(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: apiKeys, isLoading } = useQuery({
        queryKey: ['apiKeys'],
        queryFn: listApiKeys,
    });

    const generateMutation = useMutation({
        mutationFn: generateApiKey,
        onSuccess: (newKey) => {
            toast.success('API Key generated successfully!');
            queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
            setGeneratedApiKey(newKey);
            setIsGenerateDialogOpen(false);
            setIsViewKeyDialogOpen(true);
            setNewKeyName('');
        },
        onError: (error: any) => toast.error(`Failed to generate key: ${error.message}`),
    });
    
    const deleteMutation = useMutation({
        mutationFn: deleteApiKey,
        onSuccess: () => {
            toast.success('API Key deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
            setIsDeleteDialogOpen(false);
        },
        onError: (error: any) => toast.error(`Failed to delete key: ${error.message}`),
    });

    const handleGenerate = () => {
        if (!newKeyName) return toast.error('Please provide a name for the key.');
        generateMutation.mutate(newKeyName);
    };

    const handleDelete = () => {
        if (keyIdToDelete) {
            deleteMutation.mutate(keyIdToDelete);
        }
    };
    
    const copyToClipboard = () => {
        if (generatedApiKey) {
            navigator.clipboard.writeText(generatedApiKey);
            toast.success('API Key copied to clipboard!');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>API & Integrations</CardTitle>
                        <CardDescription>Manage API keys to connect e-commerce sites or external services to UG-BizSuite.</CardDescription>
                    </div>
                    <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                        <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Generate New Key</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Generate New API Key</DialogTitle><DialogDescription>Give this key a descriptive name to remember its purpose.</DialogDescription></DialogHeader>
                            <div className="py-4 space-y-2">
                                <Label htmlFor="keyName">Key Name</Label>
                                <Input id="keyName" placeholder="e.g., E-commerce Website" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsGenerateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                                    {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Generate Key
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="text-center p-8">Loading API Keys...</div> :
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Created</TableHead><TableHead>Last Used</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {apiKeys && apiKeys.length > 0 ? apiKeys.map((key: any) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /> {key.key_name}</TableCell>
                                        <TableCell>{format(new Date(key.created_at), 'PPP')}</TableCell>
                                        <TableCell>{key.last_used_at ? format(new Date(key.last_used_at), 'PPP p') : 'Never'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="destructive" size="sm" onClick={() => { setKeyIdToDelete(key.id); setKeyNameToDelete(key.key_name); setIsDeleteDialogOpen(true); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No API keys generated yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    }
                </CardContent>
            </Card>

            <Dialog open={isViewKeyDialogOpen} onOpenChange={setIsViewKeyDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>API Key Generated Successfully</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">Please copy this key and store it somewhere safe. **This is the only time you will be able to see it.** If you lose it, you must generate a new one.</p>
                        </div>
                        <div className="relative">
                            <Input value={generatedApiKey || ''} readOnly className="pr-10 font-mono" />
                            <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={() => setIsViewKeyDialogOpen(false)}>I have copied my key</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the API key named "{keyNameToDelete}". Any application using this key will immediately lose access. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Key'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}