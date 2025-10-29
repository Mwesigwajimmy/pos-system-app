'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { createTaskAction, toggleTaskAction, CreateFormState } from '@/lib/actions/complianceActions';
import { AlertCircle, Clock, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITION ---
export interface ComplianceTask {
  id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
}

// --- SUB-COMPONENTS ---

// A single, actionable task item
function TaskItem({ task }: { task: ComplianceTask }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const { pending } = useFormStatus();

  const isOverdue = task.due_date && !task.is_completed && isBefore(new Date(task.due_date), startOfDay(new Date()));
  const StatusIcon = task.is_completed ? CheckCircle2 : isOverdue ? AlertCircle : Clock;
  const iconColor = task.is_completed ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-orange-500';

  return (
    <form ref={formRef} action={toggleTaskAction} className="flex items-center space-x-3 rounded-md border p-3 transition-colors hover:bg-muted/50">
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="isCompleted" value={String(!task.is_completed)} />
      <Checkbox
        id={task.id}
        checked={task.is_completed}
        onCheckedChange={() => formRef.current?.requestSubmit()}
        disabled={pending}
        aria-label={`Mark task "${task.title}" as ${task.is_completed ? 'incomplete' : 'complete'}`}
      />
      <div className="flex-grow grid gap-1.5 leading-none">
        <Label htmlFor={task.id} className={cn("text-base cursor-pointer", task.is_completed && 'line-through text-muted-foreground')}>
          {task.title}
        </Label>
        {task.due_date && <p className="text-sm text-muted-foreground">Due: {format(new Date(task.due_date), 'PP')}</p>}
      </div>
      <StatusIcon className={cn("h-5 w-5", iconColor)} />
    </form>
  );
}

// Form for creating a new task
function CreateTaskForm({ onDone }: { onDone: () => void }) {
  const initialState: CreateFormState = { success: false, message: '' };
  const [state, formAction] = useFormState(createTaskAction, initialState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onDone(); // Hide the form after successful creation
    }
  }, [state, onDone]);

  return (
    <form action={formAction} ref={formRef} className="space-y-4 p-3 border-t">
      <div>
        <Label htmlFor="title">Task Title</Label>
        <Input id="title" name="title" placeholder="e.g., File quarterly sales tax" required />
        {state.errors?.title && <p className="text-sm text-destructive mt-1">{state.errors.title[0]}</p>}
      </div>
      <div>
        <Label htmlFor="due_date">Due Date (Optional)</Label>
        <Input id="due_date" name="due_date" type="date" />
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit">Save Task</Button>
      </div>
    </form>
  );
}


// --- MAIN REVOLUTIONARY COMPONENT ---
export function RevolutionaryComplianceDashboard({ tasks }: { tasks: ComplianceTask[] }) {
  const [showCreateForm, setShowCreateForm] = React.useState(false);

  // --- Intelligent Grouping Logic ---
  const today = startOfDay(new Date());
  const completed = tasks.filter(t => t.is_completed);
  const incomplete = tasks.filter(t => !t.is_completed);
  const overdue = incomplete.filter(t => t.due_date && isBefore(new Date(t.due_date), today));
  const upcoming = incomplete.filter(t => !t.due_date || !isBefore(new Date(t.due_date), today));

  const sections = [
    { title: "Overdue", tasks: overdue, defaultOpen: true },
    { title: "Due Soon", tasks: upcoming, defaultOpen: true },
    { title: "Completed", tasks: completed, defaultOpen: false },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Compliance Dashboard</CardTitle>
        <CardDescription>Stay on top of important administrative and tax deadlines.</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length > 0 ? (
          <Accordion type="multiple" defaultValue={sections.filter(s => s.defaultOpen).map(s => s.title)}>
            {sections.filter(s => s.tasks.length > 0).map(section => (
              <AccordionItem key={section.title} value={section.title}>
                <AccordionTrigger className="text-lg font-semibold">
                  {section.title} ({section.tasks.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {section.tasks.map(task => <TaskItem key={task.id} task={task} />)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p className="mb-4">You're all clear! No compliance tasks found.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Your First Task
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch p-0">
        {showCreateForm ? (
          <CreateTaskForm onDone={() => setShowCreateForm(false)} />
        ) : (
          tasks.length > 0 && (
            <div className="p-3 border-t">
              <Button variant="outline" className="w-full" onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add New Task
              </Button>
            </div>
          )
        )}
      </CardFooter>
    </Card>
  );
}