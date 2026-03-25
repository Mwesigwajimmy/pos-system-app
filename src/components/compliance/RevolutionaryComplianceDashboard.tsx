'use client';

import React, { useMemo } from 'react';
// GRASSROOT FIX: Explicitly importing all sub-components to prevent ReferenceErrors
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
  CalendarClock, 
  ShieldCheck, 
  Fingerprint, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComplianceTask {
  id: string;
  name: string;
  due_date: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low';
  category?: string; // UPGRADE: Added for Professional Services/Tax DNA
}

interface RevolutionaryComplianceDashboardProps {
  tasks: ComplianceTask[];
  businessName?: string; // UPGRADE: For Sovereign branding
}

const TaskStatusIcon = ({ status }: { status: ComplianceTask['status'] }) => {
  if (status === 'Completed') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === 'Overdue') return <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />;
  return <CalendarClock className="h-5 w-5 text-amber-500" />;
};

const PriorityBadge = ({ priority }: { priority: ComplianceTask['priority'] }) => {
  const variants = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-blue-100 text-blue-700 border-blue-200',
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
  } as const;
  
  return (
    <Badge variant="outline" className={cn("font-black text-[9px] uppercase tracking-widest", variants[priority])}>
        {priority}
    </Badge>
  );
};

export function RevolutionaryComplianceDashboard({ tasks, businessName = "Sovereign Entity" }: RevolutionaryComplianceDashboardProps) {
  
  // --- ENTERPRISE LOGIC: RISK CALCULATION ---
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
    <Card className="h-full flex flex-col shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b pb-6">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-blue-600" /> Compliance Task Center
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                    Deadlines and filings for <span className="text-blue-600 font-bold">{businessName}</span>.
                </CardDescription>
            </div>
            <div className="flex gap-2">
                {stats.overdue > 0 && (
                    <Badge className="bg-red-600 text-white font-black text-[10px] px-3 animate-bounce">
                        {stats.overdue} AT RISK
                    </Badge>
                )}
                <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold text-[10px]">
                    {stats.completed}/{stats.total} DONE
                </Badge>
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-0 bg-white">
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 p-8">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <div 
                    key={task.id} 
                    className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-md",
                        task.status === 'Overdue' ? "bg-red-50/30 border-red-100" : "bg-slate-50/30 border-slate-100"
                    )}
                >
                  <div className="mt-1 p-2 bg-white rounded-xl shadow-sm">
                    <TaskStatusIcon status={task.status} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{task.name}</p>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            <Activity className="h-3 w-3" />
                            Status: <span className={cn(
                                task.status === 'Overdue' ? "text-red-600" : 
                                task.status === 'Completed' ? "text-emerald-600" : "text-amber-600"
                            )}>{task.status}</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <p className="text-[10px] text-slate-500 font-mono">
                          DUE: {format(parseISO(task.due_date), 'PPP')}
                        </p>
                    </div>
                    {task.category && (
                        <div className="mt-3 flex items-center gap-1">
                            <Fingerprint className="w-2.5 h-2.5 text-slate-300" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.category}</span>
                        </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <AlertCircle className="h-12 w-12 text-slate-200" />
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">All Systems Clear</h4>
                <p className="text-xs text-slate-400 mt-1 italic">No outstanding compliance obligations found in the ledger.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="bg-slate-50 border-t py-4 px-8 flex justify-between items-center text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5"/>
              Forensic Integrity Shield Active
            </div>
            <div className="flex items-center gap-4">
                <span>Kernel V10.2</span>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Node: Compliance</span>
            </div>
      </CardFooter>
    </Card>
  );
}