'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Users, Search, UserPlus, ShieldCheck, 
    Droplets, Activity, Calendar, MoreVertical, Loader2 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function PatientRegistry({ tenantId }: { tenantId: string }) {
    const supabase = createClient();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: patients, isLoading } = useQuery({
        queryKey: ['medical_patients', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('medical_patients')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!tenantId
    });

    const filteredPatients = patients?.filter(p => 
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_uid?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
                <div>
                    <CardTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <Users className="text-primary" /> PATIENT 360 REGISTRY
                    </CardTitle>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search Name or UID..." 
                            className="pl-10 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                        <UserPlus size={18} className="mr-2" /> Register New
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400 pl-8">Identity</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Bio Data</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Insurance</TableHead>
                            <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-slate-400 pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Synching Patient Ledger...</TableCell></TableRow>
                        ) : filteredPatients?.map(p => (
                            <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                <TableCell className="pl-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            {p.full_name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{p.full_name}</span>
                                            <span className="text-[10px] font-mono text-slate-400 uppercase">UID: {p.patient_uid || 'TEMP-ID'}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                            <Activity size={12} className="text-slate-300" /> {p.gender} • {p.dob}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-black text-red-600">
                                            <Droplets size={12} className="text-red-400" /> GROUP {p.blood_group || 'N/A'}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={p.is_active ? 'default' : 'secondary'} className={p.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                        {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">{p.insurance_provider || 'Private Pay'}</span>
                                        <span className="text-[9px] text-slate-400 font-mono italic">{p.insurance_policy_no || 'NO POLICY'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-primary"><MoreVertical size={18} /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}