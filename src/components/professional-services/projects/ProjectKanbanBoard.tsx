'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { updateProjectStatusAction } from '@/lib/professional-services/actions'; // Ensure this action exists
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, CheckCircle2, AlertCircle, Layout } from 'lucide-react';

type Status = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';

export interface Project {
  id: string;
  name: string;
  status: Status; // Ensure DB status column matches these exact strings
  due_date: string | null;
  customers: { name: string; } | null;
}

type ProjectColumns = { [key in Status]: Project[] };

const columnConfig: { [key in Status]: { title: string; color: string } } = {
  BACKLOG: { title: 'Backlog', color: 'bg-slate-100' },
  IN_PROGRESS: { title: 'In Progress', color: 'bg-blue-50' },
  IN_REVIEW: { title: 'In Review', color: 'bg-amber-50' },
  COMPLETED: { title: 'Completed', color: 'bg-green-50' },
};

export function ProjectKanbanBoard({ initialProjects }: { initialProjects: Project[] }) {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [draggedItem, setDraggedItem] = useState<Project | null>(null);

    // Derived state for columns
    const columns: ProjectColumns = {
        BACKLOG: projects.filter(p => p.status === 'BACKLOG'),
        IN_PROGRESS: projects.filter(p => p.status === 'IN_PROGRESS'),
        IN_REVIEW: projects.filter(p => p.status === 'IN_REVIEW'),
        COMPLETED: projects.filter(p => p.status === 'COMPLETED'),
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, project: Project) => {
        setDraggedItem(project);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: Status) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.status === newStatus) return;

        const originalProjects = [...projects];
        
        // Optimistic Update
        setProjects(prev => prev.map(p => 
            p.id === draggedItem.id ? { ...p, status: newStatus } : p
        ));
        
        try {
            const result = await updateProjectStatusAction(draggedItem.id, newStatus);
            if (!result.success) {
                throw new Error(result.message);
            }
            toast({ title: "Status Updated", description: `Project moved to ${columnConfig[newStatus].title}` });
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
            setProjects(originalProjects); // Revert UI
        } finally {
            setDraggedItem(null);
        }
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-h-[500px]">
            {(Object.keys(columns) as Status[]).map(status => (
                <div 
                    key={status} 
                    onDragOver={handleDragOver} 
                    onDrop={e => handleDrop(e, status)} 
                    className={`rounded-xl p-4 flex flex-col gap-3 h-full border ${columnConfig[status].color}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">
                            {columnConfig[status].title}
                        </h3>
                        <Badge variant="secondary" className="bg-white">{columns[status].length}</Badge>
                    </div>

                    <div className="space-y-3 flex-1">
                        {columns[status].map(project => (
                             <Card 
                                key={project.id} 
                                draggable 
                                onDragStart={e => handleDragStart(e, project)} 
                                className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                             >
                                 <CardContent className="p-3 space-y-2">
                                     <div className="flex justify-between items-start">
                                         <p className="font-semibold text-sm text-slate-900 leading-tight">{project.name}</p>
                                     </div>
                                     
                                     <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] truncate max-w-[150px]">
                                            {project.customers?.name || 'Internal'}
                                        </Badge>
                                     </div>

                                     {project.due_date && (
                                         <div className={`flex items-center gap-1 text-xs mt-2 ${
                                             new Date(project.due_date) < new Date() ? 'text-red-600 font-bold' : 'text-slate-500'
                                         }`}>
                                             <Clock className="w-3 h-3" />
                                             {format(new Date(project.due_date), 'MMM dd')}
                                         </div>
                                     )}
                                 </CardContent>
                             </Card>
                        ))}
                        {columns[status].length === 0 && (
                            <div className="h-24 border-2 border-dashed border-slate-300/50 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                                No Projects
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}