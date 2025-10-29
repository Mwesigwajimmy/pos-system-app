'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isPast, differenceInDays } from 'date-fns';
import { AlertTriangle, CheckCircle2, CalendarClock } from 'lucide-react';

export interface ComplianceTask {
  id: string;
  name: string;
  due_date: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low';
}

interface RevolutionaryComplianceDashboardProps {
  tasks: ComplianceTask[];
}

const TaskStatusIcon = ({ status }: { status: ComplianceTask['status'] }) => {
  if (status === 'Completed') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === 'Overdue') return <AlertTriangle className="h-5 w-5 text-destructive" />;
  return <CalendarClock className="h-5 w-5 text-yellow-500" />;
};

const PriorityBadge = ({ priority }: { priority: ComplianceTask['priority'] }) => {
  const variants = {
    High: 'destructive',
    Medium: 'secondary',
    Low: 'outline',
  } as const;
  return <Badge variant={variants[priority]}>{priority}</Badge>;
};

export function RevolutionaryComplianceDashboard({ tasks }: RevolutionaryComplianceDashboardProps) {
  const sortedTasks = React.useMemo(() => {
    return tasks
      .map(task => {
        const isOverdue = isPast(new Date(task.due_date)) && task.status !== 'Completed';
        return { ...task, status: isOverdue ? 'Overdue' : task.status };
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .sort((a, b) => (a.status === 'Completed' ? 1 : -1) - (b.status === 'Completed' ? 1 : -1));
  }, [tasks]);

  return (
    <Card className="h-full flex flex-col shadow-lg border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl">Compliance Task Center</CardTitle>
        <CardDescription>Track upcoming filings, renewals, and deadlines.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 p-6">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/40">
                  <div className="mt-1">
                    <TaskStatusIcon status={task.status} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{task.name}</p>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(task.due_date), 'PPP')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No compliance tasks found.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}