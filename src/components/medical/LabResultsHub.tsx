'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, AlertCircle, CheckCircle2, FileSearch, ShieldAlert, Loader2 } from 'lucide-react';

export default function LabResultsHub({ tenantId }: { tenantId: string }) {
    const supabase = createClient();

    const { data: results, isLoading } = useQuery({
        queryKey: ['lab_results', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('medical_lab_results')
                .select('*, medical_patients(full_name)')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!tenantId
    });

    return (
        <Card className="border-t-4 border-t-blue-600 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
                <div>
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                        <FlaskConical className="text-blue-600" /> LABORATORY INTELLIGENCE HUB
                    </CardTitle>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">REAL-TIME MONITORING</Badge>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold text-[10px] uppercase pl-8">Patient / Subject</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase">Detected Values (JSONB)</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase">Forensic Status</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-right pr-8">Verification</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin inline mr-2"/> Syncing Lab Ledger...</TableCell></TableRow> :
                        results?.map(res => (
                            <TableRow key={res.id} className={res.is_critical ? "bg-red-50/50" : ""}>
                                <TableCell className="pl-8 font-bold text-slate-800">
                                    {(res as any).medical_patients?.full_name}
                                    <p className="text-[9px] font-mono text-slate-400">ORDER_ID: {res.order_id?.substring(0,8)}</p>
                                </TableCell>
                                <TableCell>
                                    <pre className="text-[10px] font-mono bg-white p-2 rounded border max-w-xs truncate">
                                        {JSON.stringify(res.detected_values, null, 1)}
                                    </pre>
                                </TableCell>
                                <TableCell>
                                    {res.is_critical ? (
                                        <Badge className="bg-red-600 animate-pulse flex items-center gap-1">
                                            <ShieldAlert size={10} /> CRITICAL ABNORMALITY
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">NORMAL RANGE</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Badge className="bg-slate-900 font-mono text-[9px]">SIG: {res.verified_by?.substring(0,8) || 'PENDING'}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}