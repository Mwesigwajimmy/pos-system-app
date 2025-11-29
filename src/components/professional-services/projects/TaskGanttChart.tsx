'use client';

import React from "react";
import { useQuery } from '@tanstack/react-query';
import { createClient } from "@/lib/supabase/client";
import { format, differenceInDays, addDays } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Kanban } from 'lucide-react';

interface TenantContext { tenantId: string }

interface Task {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    progress: number; // 0-100
}

async function fetchProjectTasks(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('project_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data as Task[];
}

export default function TaskGanttChart({ tenant }: { tenant: TenantContext }) {
    const { data, isLoading } = useQuery({ 
        queryKey: ['gantt', tenant.tenantId], 
        queryFn: () => fetchProjectTasks(tenant.tenantId) 
    });

    const renderTimeline = (start: string, end: string, progress: number) => {
        const today = new Date();
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Calculate duration in days
        const duration = Math.max(1, differenceInDays(endDate, startDate));
        
        // Visual Width Scaling (Just for demo UI)
        const width = Math.min(duration * 10, 200); 

        return (
            <div className="flex flex-col gap-1 w-full max-w-[250px]">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden relative">
                     <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${progress}%` }}
                     />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{duration} days</span>
                    <span>{progress}%</span>
                </div>
            </div>
        );
    };

    return (
        <Card className="h-full border-t-4 border-t-cyan-600 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Kanban className="w-5 h-5 text-cyan-600"/> Project Timeline
                </CardTitle>
                <CardDescription>Gantt view of active task schedules.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[200px]">Task Name</TableHead>
                                <TableHead className="w-[100px]">Start</TableHead>
                                <TableHead className="w-[100px]">End</TableHead>
                                <TableHead>Timeline & Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : !data || data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No scheduled tasks.</TableCell></TableRow>
                            ) : (
                                data.map((t) => (
                                    <TableRow key={t.id} className="group hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-700">{t.name}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(t.start_date), 'MMM d')}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(t.end_date), 'MMM d')}
                                        </TableCell>
                                        <TableCell>
                                            {renderTimeline(t.start_date, t.end_date, t.progress || 0)}
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