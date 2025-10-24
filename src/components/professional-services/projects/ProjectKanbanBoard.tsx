'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { updateProjectStatusAction } from '@/lib/professional-services/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

type Status = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
export interface Project {
  id: string;
  name: string;
  status: Status;
  due_date: string | null;
  customers: { name: string; } | null;
}
type ProjectColumns = { [key in Status]: Project[] };

const columnTitles: { [key in Status]: string } = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
};

export function ProjectKanbanBoard({ initialProjects }: { initialProjects: Project[] }) {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [draggedItem, setDraggedItem] = useState<Project | null>(null);

    const columns: ProjectColumns = {
        BACKLOG: projects.filter(p => p.status === 'BACKLOG'),
        IN_PROGRESS: projects.filter(p => p.status === 'IN_PROGRESS'),
        IN_REVIEW: projects.filter(p => p.status === 'IN_REVIEW'),
        COMPLETED: projects.filter(p => p.status === 'COMPLETED'),
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, project: Project) => {
        setDraggedItem(project);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: Status) => {
        if (!draggedItem || draggedItem.status === newStatus) return;

        const originalProjects = projects;
        setProjects(prev => prev.map(p => p.id === draggedItem.id ? { ...p, status: newStatus } : p));
        
        const result = await updateProjectStatusAction(draggedItem.id, newStatus);
        if (!result.success) {
            toast({ title: "Error", description: result.message, variant: "destructive" });
            setProjects(originalProjects); // Revert on failure
        } else {
             toast({ title: "Success!", description: result.message });
        }
        setDraggedItem(null);
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(columns) as Status[]).map(status => (
                <div key={status} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, status)} className="bg-muted/50 rounded-lg p-2">
                    <h3 className="font-bold p-2">{columnTitles[status]} ({columns[status].length})</h3>
                    <div className="space-y-2 h-full">
                        {columns[status].map(project => (
                             <Card key={project.id} draggable onDragStart={e => handleDragStart(e, project)} className="cursor-grab p-3">
                                 <p className="font-semibold text-sm">{project.name}</p>
                                 <p className="text-xs text-muted-foreground">{project.customers?.name}</p>
                                 {project.due_date && <p className="text-xs text-muted-foreground mt-2">{format(new Date(project.due_date), 'MMM dd')}</p>}
                             </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}