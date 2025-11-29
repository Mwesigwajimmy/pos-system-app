'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ComplianceTask {
  id: string;
  task: string;
  law: string;
  entity: string;
  country: string;
  due_date: string;
  status: "done" | "overdue" | "pending";
  assigned_to: string;
}

const ITEMS_PER_PAGE = 5;

export default function ComplianceChecklist() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Enterprise Features: Pagination & Search
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newTask, setNewTask] = useState({ task: '', law: '', entity: '', country: '', due_date: '', assigned_to: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('compliance_tasks')
        .select('*', { count: 'exact' })
        .order('due_date', { ascending: true })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (search) {
        query = query.or(`task.ilike.%${search}%,entity.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      
      if (error) throw error;
      setTasks(data as ComplianceTask[]);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error("Error loading tasks: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, search]);

  useEffect(() => {
    // Debounce search to prevent database spamming
    const timer = setTimeout(() => {
        fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const handleSubmit = async () => {
    if (!newTask.task || !newTask.due_date || !newTask.entity) {
        return toast.error("Please fill in Task, Entity and Due Date");
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('compliance_tasks').insert([{ ...newTask, status: 'pending' }]);
      if (error) throw error;
      toast.success("Task assigned successfully");
      setIsDialogOpen(false);
      setNewTask({ task: '', law: '', entity: '', country: '', due_date: '', assigned_to: '' });
      fetchTasks();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    // Optimistic UI Update (Instant feedback)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const { error } = await supabase.from('compliance_tasks').update({ status: newStatus }).eq('id', id);
    if (error) {
        toast.error("Failed to update status");
        fetchTasks(); // Revert on error
    } else {
        toast.success(`Task marked as ${newStatus}`);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) return;
    const { error } = await supabase.from('compliance_tasks').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else {
        toast.success("Task deleted");
        fetchTasks();
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <Card className="h-full flex flex-col shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-xl">Compliance Checklist</CardTitle>
                <CardDescription>Global regulatory filing obligations & deadlines.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2"/> Add Task
            </Button>
        </div>
        <div className="mt-4">
            <Input 
                placeholder="Search tasks or entities..." 
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
                className="max-w-md"
            />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600"/>
            </div>
        ) : (
            <>
            <div className="rounded-md border flex-1 overflow-auto">
                <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Task Details</TableHead>
                    <TableHead>Entity / Law</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                No tasks found matching your criteria.
                            </TableCell>
                        </TableRow>
                    ) : (
                        tasks.map(t => {
                            const isOverdue = new Date(t.due_date) < new Date() && t.status !== 'done';
                            return (
                                <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <button onClick={() => toggleStatus(t.id, t.status)} className="focus:outline-none">
                                        {t.status === "done" ? 
                                            <CheckCircle2 className="text-green-600 w-5 h-5"/> : 
                                            <div className="w-5 h-5 border-2 rounded-full border-gray-300 hover:border-blue-500"/>
                                        }
                                    </button>
                                </TableCell>
                                <TableCell>
                                    <p className={`font-medium ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                        {t.task}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{t.entity}</span>
                                        <span className="text-xs text-gray-500">{t.law} ({t.country})</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                        <Calendar className="w-3 h-3"/>
                                        {new Date(t.due_date).toLocaleDateString()}
                                        {isOverdue && <Badge variant="destructive" className="text-[10px] h-4 px-1">Overdue</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">{t.assigned_to}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => deleteTask(t.id)} className="hover:text-red-600">
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
                </Table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-gray-500 mr-4">
                    Page {page} of {totalPages || 1}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            </>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create Compliance Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label>Task Description <span className="text-red-500">*</span></Label>
                    <Input value={newTask.task} onChange={e => setNewTask({...newTask, task: e.target.value})} placeholder="e.g. File Q3 VAT Return"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Regulation/Law</Label>
                        <Input value={newTask.law} onChange={e => setNewTask({...newTask, law: e.target.value})} placeholder="e.g. Tax Act 2024"/>
                    </div>
                    <div className="space-y-2">
                        <Label>Due Date <span className="text-red-500">*</span></Label>
                        <Input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})}/>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Entity <span className="text-red-500">*</span></Label>
                        <Input value={newTask.entity} onChange={e => setNewTask({...newTask, entity: e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                        <Label>Country Code</Label>
                        <Input value={newTask.country} onChange={e => setNewTask({...newTask, country: e.target.value})} placeholder="e.g. UG"/>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Assigned To (Email)</Label>
                    <Input type="email" value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}/>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Task
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}