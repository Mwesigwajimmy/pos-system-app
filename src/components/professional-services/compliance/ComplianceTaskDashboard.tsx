'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { format, isBefore, startOfDay, addDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { AlertCircle, Clock, CheckCircle2, Plus, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types & Schema ---
interface ComplianceTask {
  id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const taskSchema = z.object({
  title: z.string().min(3, "Task title is required"),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// --- Data Fetching ---
async function fetchTasks(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('compliance_tasks')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  return data as ComplianceTask[];
}

// --- Sub-Component: Task Item ---
function TaskItem({ task, onToggle }: { task: ComplianceTask; onToggle: (id: string, current: boolean) => void }) {
  const isOverdue = task.due_date && !task.is_completed && isBefore(new Date(task.due_date), startOfDay(new Date()));
  const StatusIcon = task.is_completed ? CheckCircle2 : isOverdue ? AlertCircle : Clock;
  const iconColor = task.is_completed ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-slate-400';

  return (
    <div className={cn("flex items-center space-x-3 rounded-lg border p-3 transition-all hover:bg-slate-50", task.is_completed && "bg-slate-50/50")}>
      <Checkbox
        id={task.id}
        checked={task.is_completed}
        onCheckedChange={() => onToggle(task.id, task.is_completed)}
        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
      />
      <div className="flex-grow grid gap-1">
        <Label 
          htmlFor={task.id} 
          className={cn("text-sm font-medium cursor-pointer", task.is_completed && 'line-through text-muted-foreground')}
        >
          {task.title}
        </Label>
        {task.due_date && (
          <p className={cn("text-xs flex items-center gap-1", isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
            <CalendarIcon className="w-3 h-3"/>
            {isOverdue ? "Overdue: " : "Due: "} 
            {format(new Date(task.due_date), 'MMM d, yyyy')}
          </p>
        )}
      </div>
      <StatusIcon className={cn("h-5 w-5", iconColor)} />
    </div>
  );
}

// --- Main Component ---
export function ComplianceTaskDashboard({ tenantId }: { tenantId: string }) {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const queryClient = useQueryClient();

  // Query
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['compliance-tasks', tenantId],
    queryFn: () => fetchTasks(tenantId)
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const db = createClient();
      await db.from('compliance_tasks').update({ is_completed: !isCompleted }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-tasks', tenantId] }),
    onError: () => toast.error("Failed to update task")
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (val: TaskFormValues) => {
      const db = createClient();
      const { error } = await db.from('compliance_tasks').insert({
        tenant_id: tenantId,
        title: val.title,
        due_date: val.due_date || null,
        is_completed: false,
        priority: 'MEDIUM'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created");
      setShowCreateForm(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['compliance-tasks', tenantId] });
    },
    onError: () => toast.error("Failed to create task")
  });

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', due_date: '' }
  });

  // Grouping Logic
  const today = startOfDay(new Date());
  const completed = tasks?.filter(t => t.is_completed) || [];
  const incomplete = tasks?.filter(t => !t.is_completed) || [];
  const overdue = incomplete.filter(t => t.due_date && isBefore(new Date(t.due_date), today));
  const upcoming = incomplete.filter(t => !t.due_date || !isBefore(new Date(t.due_date), today));

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-slate-800"/> Compliance Tasks
        </CardTitle>
        <CardDescription>Manage regulatory deadlines, tax filings, and internal audits.</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Create Form */}
        {showCreateForm ? (
          <div className="mb-6 p-4 border rounded-lg bg-slate-50 animate-in slide-in-from-top-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem>
                    <Label>Task Title</Label>
                    <FormControl><Input placeholder="e.g. File Quarterly VAT Return" {...field}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="due_date" render={({field}) => (
                  <FormItem>
                    <Label>Due Date (Optional)</Label>
                    <FormControl><Input type="date" {...field}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Save
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <Button variant="outline" className="w-full mb-6 border-dashed" onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Compliance Task
          </Button>
        )}

        {/* Task Lists */}
        {tasks && tasks.length > 0 ? (
          <Accordion type="multiple" defaultValue={["overdue", "upcoming"]} className="w-full">
            
            {overdue.length > 0 && (
              <AccordionItem value="overdue" className="border-b-0 mb-2">
                <AccordionTrigger className="hover:no-underline py-2 bg-red-50 px-3 rounded-md text-red-700 font-semibold">
                  <span>Overdue ({overdue.length})</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 px-1 space-y-2">
                  {overdue.map(t => (
                    <TaskItem 
                      key={t.id} 
                      task={t} 
                      // FIX: Pass arrow function to map arguments to object
                      onToggle={(id, current) => toggleMutation.mutate({ id, isCompleted: current })} 
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="upcoming" className="border-b-0 mb-2">
              <AccordionTrigger className="hover:no-underline py-2 bg-slate-50 px-3 rounded-md text-slate-700 font-semibold">
                <span>Upcoming & Pending ({upcoming.length})</span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 px-1 space-y-2">
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground p-2">No upcoming tasks.</p>}
                {upcoming.map(t => (
                  <TaskItem 
                    key={t.id} 
                    task={t} 
                    // FIX: Pass arrow function to map arguments to object
                    onToggle={(id, current) => toggleMutation.mutate({ id, isCompleted: current })} 
                  />
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="completed" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-md text-slate-500 font-medium text-sm">
                <span>Completed ({completed.length})</span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 px-1 space-y-2">
                {completed.map(t => (
                  <TaskItem 
                    key={t.id} 
                    task={t} 
                    // FIX: Pass arrow function to map arguments to object
                    onToggle={(id, current) => toggleMutation.mutate({ id, isCompleted: current })} 
                  />
                ))}
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        ) : (
          !showCreateForm && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-200 mb-3"/>
              <p>You're all caught up!</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}