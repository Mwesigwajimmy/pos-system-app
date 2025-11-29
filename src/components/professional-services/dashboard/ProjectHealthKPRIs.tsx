'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface TenantContext { tenantId: string }

interface ProjectHealth {
    id: string;
    name: string;
    budget_margin_percent: number;
    deadline: string;
    overdue_tasks_count: number;
    status: string;
}

async function fetchProjectHealth(tenantId: string) {
    const db = createClient();
    // Assuming a view 'project_health_view' exists that pre-calculates overdue tasks
    // If not, you would need to join tables.
    const { data, error } = await db
        .from('projects')
        .select('id, name, budget_margin_percent, deadline, status, tasks(count)')
        .eq('tenant_id', tenantId)
        .eq('tasks.status', 'TODO')
        .lt('tasks.due_date', new Date().toISOString()) // tasks that are overdue
        .neq('status', 'COMPLETED')
        .limit(5);

    if (error) throw error;

    // Transform data to include calculated risk
    return data.map((p: any) => {
        const overdue = p.tasks?.[0]?.count || 0; // accessing the count from the join
        let risk = 'LOW';
        if (p.budget_margin_percent < 10 || overdue > 5) risk = 'MEDIUM';
        if (p.budget_margin_percent < 0 || overdue > 10) risk = 'HIGH';

        return {
            id: p.id,
            name: p.name,
            budget_margin_percent: p.budget_margin_percent || 0,
            onTrack: risk === 'LOW',
            overdueTasks: overdue,
            riskLevel: risk
        };
    });
}

export default function ProjectHealthKPIs({ tenant }: { tenant: TenantContext }) {
    const { data, isLoading } = useQuery({
        queryKey: ["proj-health", tenant.tenantId],
        queryFn: () => fetchProjectHealth(tenant.tenantId)
    });

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'HIGH': return <Badge variant="destructive">High</Badge>;
            case 'MEDIUM': return <Badge className="bg-amber-500 hover:bg-amber-600">Medium</Badge>;
            default: return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Low</Badge>;
        }
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Project Health KPIs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Project</TableHead>
                                <TableHead>Margin</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Overdue Tasks</TableHead>
                                <TableHead className="text-right">Risk Profile</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No active projects.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <span className={p.budget_margin_percent < 0 ? "text-red-600 font-bold" : ""}>
                                                {p.budget_margin_percent}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {p.onTrack ? 
                                                <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto"/> : 
                                                <XCircle className="w-4 h-4 text-red-500 mx-auto"/>
                                            }
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {p.overdueTasks > 0 ? (
                                                <span className="text-red-600 font-medium">{p.overdueTasks}</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {getRiskBadge(p.riskLevel)}
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