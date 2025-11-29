'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TenantContext { tenantId: string }

interface Project {
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    manager_name?: string; // Derived or joined
    customers: { name: string } | null;
}

async function fetchProjects(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('projects')
        .select(`
            id, name, status, start_date, end_date, 
            customers(name)
        `) // Assuming manager_name might be in a separate profile table, simplified here
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as unknown as Project[];
}

export default function ProjectWorkspace({ tenant }: { tenant: TenantContext }) {
    const { data, isLoading } = useQuery({ 
        queryKey: ['projects-list', tenant.tenantId], 
        queryFn: () => fetchProjects(tenant.tenantId) 
    });

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'COMPLETED': return <Badge className="bg-green-600">Completed</Badge>;
            case 'IN_PROGRESS': return <Badge className="bg-blue-600">In Progress</Badge>;
            case 'BACKLOG': return <Badge variant="secondary">Backlog</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-800"/> Project Workspace
                </CardTitle>
                <CardDescription>Centralized view of all active engagements.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Project Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Timeline</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : !data || data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No projects found.</TableCell></TableRow>
                            ) : (
                                data.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium text-slate-700">{p.name}</TableCell>
                                        <TableCell>{p.customers?.name || 'Internal'}</TableCell>
                                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3"/>
                                                {p.start_date ? format(new Date(p.start_date), 'MMM d') : 'TBD'} 
                                                {' - '}
                                                {p.end_date ? format(new Date(p.end_date), 'MMM d, yyyy') : '...'}
                                            </div>
                                        </TableCell>
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