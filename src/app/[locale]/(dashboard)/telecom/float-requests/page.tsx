'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRightLeft, Check, X } from 'lucide-react';

interface FloatRequest {
    id: string;
    agent_name: string;
    amount: number;
    request_type: 'TOPUP' | 'WITHDRAWAL';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
}

export default function FloatRequestsPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { data: requests, isLoading, isError, error } = useQuery({
        queryKey: ['floatRequests'],
        queryFn: async (): Promise<FloatRequest[]> => {
            const { data, error } = await supabase.rpc('get_float_requests');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const { mutate: processRequest, isPending } = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: 'APPROVED' | 'REJECTED' }) => {
            const { error } = await supabase.rpc('process_float_request', { p_request_id: id, p_status: status });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Request processed successfully.");
            queryClient.invalidateQueries({ queryKey: ['floatRequests'] });
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    if (isError) { toast.error(`Failed to load requests: ${error.message}`); }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Float Management</h1>
                <p className="text-muted-foreground">Approve or reject agent liquidity requests.</p>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><ArrowRightLeft className="mr-2 h-5 w-5"/> Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                    !requests || requests.length === 0 ? <p className="text-center text-muted-foreground py-8">No pending float requests.</p> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {requests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{req.agent_name}</TableCell>
                                        <TableCell><Badge variant={req.request_type === 'TOPUP' ? 'default' : 'secondary'}>{req.request_type}</Badge></TableCell>
                                        <TableCell>{req.amount.toLocaleString()}</TableCell>
                                        <TableCell><Badge variant="outline">{req.status}</Badge></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {req.status === 'PENDING' && (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => processRequest({ id: req.id, status: 'APPROVED'})} disabled={isPending}>
                                                        <Check className="h-4 w-4 mr-1"/> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => processRequest({ id: req.id, status: 'REJECTED'})} disabled={isPending}>
                                                        <X className="h-4 w-4 mr-1"/> Reject
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}