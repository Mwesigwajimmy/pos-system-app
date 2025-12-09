'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck } from 'lucide-react';

interface ComplianceLog {
    id: string;
    check_type: string;
    status: 'PASSED' | 'FLAGGED';
    details: string;
    checked_at: string;
}

export default function CompliancePage() {
    const supabase = createClient();
    const { data: logs, isLoading, isError, error } = useQuery({
        queryKey: ['complianceLogs'],
        queryFn: async (): Promise<ComplianceLog[]> => {
            const { data, error } = await supabase.rpc('get_compliance_logs');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    if (isError) { toast.error(`Error: ${error.message}`); }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Regulatory Compliance</h1>
                <p className="text-muted-foreground">Audit logs and regulatory check statuses.</p>
            </header>
            <Card>
                <CardHeader><CardTitle className="flex items-center"><ShieldCheck className="mr-2"/> Compliance Audit</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check Type</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {logs?.map(l => (
                                    <TableRow key={l.id}>
                                        <TableCell>{new Date(l.checked_at).toLocaleString()}</TableCell>
                                        <TableCell className="font-medium">{l.check_type}</TableCell>
                                        <TableCell>{l.status}</TableCell>
                                        <TableCell>{l.details}</TableCell>
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