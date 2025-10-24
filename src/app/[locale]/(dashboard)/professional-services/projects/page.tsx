import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ProjectKanbanBoard, Project } from '@/components/professional-services/projects/ProjectKanbanBoard';
import { CreateProjectModal } from '@/components/professional-services/projects/CreateProjectModal';

async function getAllProjects(supabase: any): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select(`id, name, status, due_date, customers ( name )`).order('created_at', { ascending: true });
    if (error) { console.error("Error fetching projects:", error); return []; }
    return data;
}

export default async function ProjectsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const projects = await getAllProjects(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 h-full flex flex-col">
            <div className="flex items-center justify-between flex-shrink-0">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Case & Project Management</h2>
                    <p className="text-muted-foreground">Visualize your workflow and track progress.</p>
                </div>
                <CreateProjectModal />
            </div>
            <div className="flex-grow">
                 <ProjectKanbanBoard initialProjects={projects} />
            </div>
        </div>
    );
}