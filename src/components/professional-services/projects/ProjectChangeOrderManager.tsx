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
import { FileDiff, Loader2, Plus, Trash2 } from "lucide-react";

interface TenantContext { 
    tenantId: string; 
}

interface ChangeOrder {
    id: string;
    project_id: string;
    project_name?: string; // Derived from join
    description: string;
    created_at: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ProjectOption {
    id: string;
    name: string;
}

// 1. Fetch available projects for dropdown
async function fetchProjects(tenantId: string) {
    const db = createClient();
    const { data } = await db.from('projects').select('id, name').eq('tenant_id', tenantId).eq('status', 'IN_PROGRESS');
    return (data || []) as ProjectOption[];
}

// 2. Fetch changes with project names
async function fetchChanges(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('project_change_orders')
        .select(`*, projects(name)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map((d: any) => ({
        ...d,
        project_name: d.projects?.name || 'Unknown Project'
    })) as ChangeOrder[];
}

async function addChange(input: any) {
    const db = createClient();
    const { error } = await db.from('project_change_orders').insert([input]);
    if (error) throw error;
}

async function deleteChange(id: string) {
    const db = createClient();
    const { error } = await db.from('project_change_orders').delete().eq('id', id);
    if (error) throw error;
}

export default function ProjectChangeOrderManager({ tenant }: { tenant: TenantContext }) {
    const queryClient = useQueryClient();
    const [projectId, setProjectId] = useState('');
    const [desc, setDesc] = useState('');

    // Queries
    const { data: changes, isLoading } = useQuery({ 
        queryKey: ['proj-change', tenant.tenantId], 
        queryFn: () => fetchChanges(tenant.tenantId) 
    });

    const { data: projects } = useQuery({
        queryKey: ['active-projects', tenant.tenantId],
        queryFn: () => fetchProjects(tenant.tenantId)
    });

    // Mutations
    const addMutation = useMutation({ 
        mutationFn: () => addChange({ 
            project_id: projectId, 
            description: desc, // Note: DB column might be 'description' not 'desc'
            tenant_id: tenant.tenantId,
            status: 'PENDING'
        }),
        onSuccess: () => {
            toast.success("Change order recorded");
            setProjectId('');
            setDesc('');
            queryClient.invalidateQueries({ queryKey: ['proj-change', tenant.tenantId] });
        },
        onError: (e) => toast.error(e.message || "Failed to add change order")
    });

    const deleteMutation = useMutation({
        mutationFn: deleteChange,
        onSuccess: () => {
            toast.success("Entry removed");
            queryClient.invalidateQueries({ queryKey: ['proj-change', tenant.tenantId] });
        }
    });

    return (
        <Card className="h-full border-t-4 border-t-amber-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileDiff className="w-5 h-5 text-amber-500"/> Change Management
                </CardTitle>
                <CardDescription>Track scope creep and formal change requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Input Form */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-slate-50 rounded-lg border">
                    <div className="md:col-span-4">
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-6">
                        <Input 
                            placeholder="Reason for change..." 
                            value={desc} 
                            onChange={e => setDesc(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Button 
                            className="w-full" 
                            onClick={() => addMutation.mutate()} 
                            disabled={!projectId || !desc || addMutation.isPending}
                        >
                            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-2"/>} Add
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Project</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Date Logged</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                            ) : !changes || changes.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No change orders found.</TableCell></TableRow>
                            ) : (
                                changes.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium text-slate-700">{c.project_name}</TableCell>
                                        <TableCell className="text-slate-600">{c.description}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(c.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                onClick={() => deleteMutation.mutate(c.id)}
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}