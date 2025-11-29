'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Loader2, Plus, Clock } from "lucide-react";

interface TenantContext { 
    tenantId: string; 
}

interface TimeEntry {
    id: string;
    hours: number;
    created_at: string;
    project_name: string;
    description?: string;
}

// 1. Fetch available projects for dropdown
async function fetchProjects(tenantId: string) {
    const db = createClient();
    const { data } = await db.from('projects').select('id, name').eq('tenant_id', tenantId).eq('status', 'IN_PROGRESS');
    return (data || []) as { id: string, name: string }[];
}

// 2. Fetch history
async function fetchTimeEntries(tenantId: string, employeeId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('project_time_entries')
        .select(`
            id, hours, created_at, description,
            projects(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map((e: any) => ({
        id: e.id,
        hours: e.hours,
        created_at: e.created_at,
        description: e.description,
        project_name: e.projects?.name || 'Unknown Project'
    })) as TimeEntry[];
}

async function submitEntry(input: any) {
    const db = createClient();
    const { error } = await db.from('project_time_entries').insert([input]);
    if (error) throw error;
}

export default function TimeEntryTracker({ tenant, employeeId }: { tenant: TenantContext, employeeId: string }) {
    const queryClient = useQueryClient();
    const [projectId, setProjectId] = useState('');
    const [hours, setHours] = useState('');
    const [desc, setDesc] = useState('');

    // Queries
    const { data: history, isLoading: historyLoading } = useQuery({ 
        queryKey: ['proj-time', tenant.tenantId, employeeId], 
        queryFn: () => fetchTimeEntries(tenant.tenantId, employeeId) 
    });

    const { data: projects } = useQuery({
        queryKey: ['active-projects-time', tenant.tenantId],
        queryFn: () => fetchProjects(tenant.tenantId)
    });

    // Mutation
    const mutation = useMutation({ 
        mutationFn: () => submitEntry({ 
            project_id: projectId, 
            employee_id: employeeId, 
            hours: parseFloat(hours), 
            description: desc,
            tenant_id: tenant.tenantId 
        }),
        onSuccess: () => {
            toast.success("Hours logged successfully");
            setProjectId('');
            setHours('');
            setDesc('');
            queryClient.invalidateQueries({ queryKey: ['proj-time', tenant.tenantId, employeeId] });
        },
        onError: (e) => toast.error(e.message || "Failed to log time")
    });

    return (
        <Card className="h-full border-t-4 border-t-green-600 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-green-600"/> Time Tracker
                </CardTitle>
                <CardDescription>Log hours against project codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Input Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg border">
                    <div className="md:col-span-1">
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Project..." /></SelectTrigger>
                            <SelectContent>
                                {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            type="number" 
                            placeholder="Hours" 
                            className="bg-white"
                            value={hours} 
                            onChange={e => setHours(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Input 
                            placeholder="Task description..." 
                            className="bg-white"
                            value={desc} 
                            onChange={e => setDesc(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Button 
                            className="w-full" 
                            onClick={() => mutation.mutate()} 
                            disabled={!projectId || !hours || mutation.isPending}
                        >
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Plus className="w-4 h-4 mr-2"/> Log Time</>}
                        </Button>
                    </div>
                </div>

                {/* History Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Hours</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                            ) : !history || history.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No recent entries.</TableCell></TableRow>
                            ) : (
                                history.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(e.created_at), 'MMM d, h:mm a')}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">
                                            {e.project_name}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {e.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {e.hours.toFixed(2)}
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