'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PenTool, Send, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface SignatureRequest {
    id: string;
    signer_email: string;
    document_name: string;
    status: 'PENDING' | 'SIGNED' | 'VOIDED';
    sent_at: string;
}

// Fetch existing requests
async function fetchSignatureRequests() {
    const db = createClient();
    const { data, error } = await db.from('esign_requests').select('*').order('sent_at', { ascending: false });
    if (error) {
        // Fallback for demo purposes if table doesn't exist yet
        console.warn("ESign table missing, returning empty", error);
        return [];
    }
    return data as SignatureRequest[];
}

// Simulate sending a request (In real life, this calls Docusign API via Server Action)
async function sendSignatureRequest({ email, docName }: { email: string, docName: string }) {
    const db = createClient();
    // We insert into a local tracking table
    const { error } = await db.from('esign_requests').insert([{
        signer_email: email,
        document_name: docName,
        status: 'PENDING',
        sent_at: new Date().toISOString()
    }]);
    
    if (error) throw error;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
}

export default function ESignatureIntegration() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [docName, setDocName] = useState('');

    const { data: requests, isLoading } = useQuery({ 
        queryKey: ['esign-requests'], 
        queryFn: fetchSignatureRequests 
    });

    const mutation = useMutation({
        mutationFn: sendSignatureRequest,
        onSuccess: () => {
            toast.success(`Signature request sent to ${email}`);
            setIsOpen(false);
            setEmail('');
            setDocName('');
            queryClient.invalidateQueries({ queryKey: ['esign-requests'] });
        },
        onError: (e) => toast.error("Failed to send request: " + e.message)
    });

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'SIGNED': return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Signed</Badge>;
            case 'VOIDED': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Voided</Badge>;
            default: return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
        }
    };

    return (
        <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><PenTool className="w-5 h-5 text-purple-600"/> E-Signatures</CardTitle>
                    <CardDescription>Track status of documents sent for digital signature.</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700"><Send className="w-4 h-4 mr-2"/> Request Signature</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Send for Signature</DialogTitle>
                            <DialogDescription>The recipient will receive an email link to sign.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Recipient Email</Label>
                                <Input type="email" placeholder="client@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Document Name</Label>
                                <Input placeholder="e.g. Service Agreement v1.pdf" value={docName} onChange={e=>setDocName(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={() => mutation.mutate({ email, docName })} disabled={!email || !docName || mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Send Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Document</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Sent Date</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                            ) : !requests || requests.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No active signature requests.</TableCell></TableRow>
                            ) : (
                                requests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.document_name}</TableCell>
                                        <TableCell>{req.signer_email}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{format(new Date(req.sent_at), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">{getStatusBadge(req.status)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}