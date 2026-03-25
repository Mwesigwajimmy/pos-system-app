'use client';

import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isPast, parseISO } from 'date-fns';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Activity,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComplianceTask {
  id: string;
  name: string;
  due_date: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low';
  category?: string;
}

interface ComplianceDashboardProps {
  tasks: ComplianceTask[];
  businessName?: string;
}

const TaskStatusIcon = ({ status }: { status: ComplianceTask['status'] }) => {
  if (status === 'Completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'Overdue') return <AlertTriangle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
};

const PriorityBadge = ({ priority }: { priority: ComplianceTask['priority'] }) => {
  const variants = {
    High: 'bg-red-50 text-red-700 border-red-100',
    Medium: 'bg-blue-50 text-blue-700 border-blue-100',
    Low: 'bg-slate-50 text-slate-700 border-slate-100',
  } as const;
  
  return (
    <Badge variant="outline" className={cn("font-bold text-[10px] uppercase px-2 py-0", variants[priority])}>
        {priority}
    </Badge>
  );
};

export function RevolutionaryComplianceDashboard({ tasks, businessName = "Business Entity" }: ComplianceDashboardProps) {
  
  const stats = useMemo(() => {
    const total = tasks.length;
    const overdue = tasks.filter(t => isPast(parseISO(t.due_date)) && t.status !== 'Completed').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    return { total, overdue, completed };
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    return (tasks || [])
      .map(task => {
        const isOverdue = isPast(parseISO(task.due_date)) && task.status !== 'Completed';
        return { ...task, status: (isOverdue ? 'Overdue' : task.status) as ComplianceTask['status'] };
      })
      .sort((a, b) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime())
      .sort((a, b) => (a.status === 'Completed' ? 1 : -1) - (b.status === 'Completed' ? 1 : -1));
  }, [tasks]);

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b p-6">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" /> Compliance Status
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                    Tracking obligations for <span className="text-blue-600 font-semibold">{businessName}</span>
                </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                {stats.overdue > 0 && (
                    <Badge className="bg-red-600 text-white font-bold text-[10px] px-2.5">
                        {stats.overdue} Action Required
                    </Badge>
                )}
                <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold text-[10px]">
                    {stats.completed}/{stats.total} Complete
                </Badge>
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[500px] w-full">
          <div className="p-6 space-y-3">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <div 
                    key={task.id} 
                    className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                        task.status === 'Overdue' ? "bg-red-50/50 border-red-100" : "bg-white border-slate-100 hover:bg-slate-50"
                    )}
                >
                  <div className="mt-0.5 p-2 bg-slate-50 rounded-md border border-slate-100">
                    <TaskStatusIcon status={task.status} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-slate-800 text-sm truncate pr-2">{task.name}</p>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                            <Activity className="h-3 w-3" />
                            <span className={cn(
                                task.status === 'Overdue' ? "text-red-600" : 
                                task.status === 'Completed' ? "text-emerald-600" : "text-amber-600"
                            )}>{task.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <Calendar className="h-3 w-3" />
                          Due: {format(parseISO(task.due_date), 'PPP')}
                        </div>
                    </div>
                    {task.category && (
                        <div className="mt-2.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 px-1.5 py-0.5 rounded bg-slate-50">{task.category}</span>
                        </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="p-3 bg-slate-50 rounded-full mb-3">
                    <AlertCircle className="h-10 w-10 text-slate-200" />
                </div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">No Pending Tasks</h4>
                <p className="text-xs text-slate-400 mt-1 italic">Your compliance checklist is currently clear.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="bg-slate-50 border-t py-3 px-6 flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>
              System Verified
            </div>
            <div className="opacity-60">
                Reporting Module v10.2
            </div>
      </CardFooter>
    </Card>
  );
}