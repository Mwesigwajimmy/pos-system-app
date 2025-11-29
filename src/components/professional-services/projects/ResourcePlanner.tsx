'use client';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2, Plus } from "lucide-react";

interface TenantContext { 
    tenantId: string; 
}

interface ResourceAssignment {
    id: string;
    employee_name: string;
    project_name: string;
    role: string;
    start_date: string;
}

interface Option { id: string; name: string; }

// Fetch Helpers
async function fetchAssignments(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('project_resources')
        .select(`
            id, role, start_date,
            employees(first_name, last_name),
            projects(name)
        `)
        .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    // Transform to flat structure
    return data.map((d: any) => ({
        id: d.id,
        role: d.role,
        start_date: d.start_date,
        employee_name: `${d.employees?.first_name} ${d.employees?.last_name}`,
        project_name: d.projects?.name
    })) as ResourceAssignment[];
}

async function fetchOptions(tenantId: string) {
    const db = createClient();
    const [empRes, projRes] = await Promise.all([
        db.from('employees').select('id, first_name, last_name').eq('tenant_id', tenantId),
        db.from('projects').select('id, name').eq('tenant_id', tenantId).eq('status', 'IN_PROGRESS')
    ]);
    
    return {
        employees: (empRes.data || []).map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })),
        projects: (projRes.data || []) as Option[]
    };
}

async function assignResource(input: any) {
    const db = createClient();
    const { error } = await db.from('project_resources').insert([input]);
    if (error) throw error;
}

export default function ResourcePlanner({ tenant }: { tenant: TenantContext }) {
    const queryClient = useQueryClient();
    const [projectId, setProjectId] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [role, setRole] = useState('Developer');

    // Queries
    const { data: assignments, isLoading } = useQuery({ 
        queryKey: ['resources', tenant.tenantId], 
        queryFn: () => fetchAssignments(tenant.tenantId) 
    });

    const { data: options } = useQuery({
        queryKey: ['resource-options', tenant.tenantId],
        queryFn: () => fetchOptions(tenant.tenantId)
    });

    // Mutation
    const mutation = useMutation({ 
        mutationFn: () => assignResource({ 
            project_id: projectId, 
            employee_id: employeeId, 
            role,
            tenant_id: tenant.tenantId,
            start_date: new Date().toISOString()
        }),
        onSuccess: () => { 
            toast.success("Resource successfully assigned"); 
            setProjectId(''); 
            setEmployeeId(''); 
            queryClient.invalidateQueries({ queryKey: ['resources', tenant.tenantId] }); 
        },
        onError: (e) => toast.error(e.message || 'Assignment failed') 
    });

    return (
        <Card className="h-full border-t-4 border-t-indigo-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500"/> Resource Planner
                </CardTitle>
                <CardDescription>Allocate team members to active projects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Allocation Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg border">
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                        <SelectContent>
                            {options?.employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select Project" /></SelectTrigger>
                        <SelectContent>
                            {options?.projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                            {['Developer', 'Manager', 'Analyst', 'Designer'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => mutation.mutate()} disabled={!projectId || !employeeId || mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Plus className="w-4 h-4 mr-2"/> Assign</>}
                    </Button>
                </div>

                {/* Allocation Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Start Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                            ) : !assignments || assignments.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No active allocations.</TableCell></TableRow>
                            ) : (
                                assignments.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.employee_name}</TableCell>
                                        <TableCell>{r.project_name}</TableCell>
                                        <TableCell><span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-700 font-semibold">{r.role}</span></TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs">
                                            {new Date(r.start_date).toLocaleDateString()}
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