'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Handshake } from 'lucide-react';

interface Partner {
    id: string;
    company_name: string;
    type: 'DISTRIBUTOR' | 'RETAILER';
    region: string;
    commission_earned: number;
}

export default function ChannelPartnersPage() {
    const supabase = createClient();
    const { data: partners, isLoading, isError, error } = useQuery({
        queryKey: ['channelPartners'],
        queryFn: async (): Promise<Partner[]> => {
            const { data, error } = await supabase.rpc('get_channel_partners');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    if (isError) { toast.error(`Error: ${error.message}`); }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Channel Partners</h1>
                <p className="text-muted-foreground">Manage distributors and B2B relationships.</p>
            </header>
            <Card>
                <CardHeader><CardTitle className="flex items-center"><Handshake className="mr-2"/> Partner List</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Type</TableHead><TableHead>Region</TableHead><TableHead className="text-right">Commission Earned</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {partners?.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.company_name}</TableCell>
                                        <TableCell>{p.type}</TableCell>
                                        <TableCell>{p.region}</TableCell>
                                        <TableCell className="text-right">{p.commission_earned.toLocaleString()}</TableCell>
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