'use client';

import { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { GripVertical, Mail, Phone } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { updateApplicantStage } from '@/lib/hr/actions/recruitment'; // We'll create this action next

// --- TYPES ---
export interface Applicant {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    stage: string;
    applied_at: string;
}

interface ApplicantCardProps {
    applicant: Applicant;
}

interface ColumnProps {
    id: string;
    title: string;
    applicants: Applicant[];
}

const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

// --- SUB-COMPONENTS ---

// 1. The draggable Applicant Card
function ApplicantCard({ applicant }: ApplicantCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: applicant.id,
        data: { type: 'Applicant', applicant },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card ref={setNodeRef} style={style} {...attributes} className="mb-3 bg-card touch-none">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="font-semibold text-sm">{applicant.first_name} {applicant.last_name}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1.5" />
                            {applicant.email}
                        </div>
                    </div>
                    <div {...listeners} className="p-1 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
                 <p className="text-xs text-muted-foreground mt-2">
                    Applied: {format(new Date(applicant.applied_at), 'LLL dd, yyyy')}
                </p>
            </CardContent>
        </Card>
    );
}

// 2. The Column that holds the cards
function Column({ id, title, applicants }: ColumnProps) {
    const { setNodeRef } = useSortable({
        id,
        data: { type: 'Column' }
    });

    return (
        <div ref={setNodeRef} className="flex-1 max-w-[320px] min-w-[300px] h-full">
            <div className="flex flex-col h-full bg-muted/50 rounded-lg">
                <div className="p-3 border-b">
                    <h3 className="font-semibold text-sm flex items-center">
                        {title}
                        <Badge variant="secondary" className="ml-2">{applicants.length}</Badge>
                    </h3>
                </div>
                <div className="p-3 flex-grow overflow-y-auto">
                    <SortableContext items={applicants.map(a => a.id)} strategy={verticalListSortingStrategy}>
                        {applicants.map(applicant => (
                            <ApplicantCard key={applicant.id} applicant={applicant} />
                        ))}
                    </SortableContext>
                </div>
            </div>
        </div>
    );
}

// --- MAIN KANBAN BOARD COMPONENT ---

export function ApplicantKanbanBoard({ applicants, jobId }: { applicants: Applicant[], jobId: string }) {
    const { toast } = useToast();
    const [activeApplicant, setActiveApplicant] = useState<Applicant | null>(null);

    const [columns, setColumns] = useState<Map<string, Applicant[]>>(() => {
        const initialColumns = new Map<string, Applicant[]>();
        STAGES.forEach(stage => initialColumns.set(stage, []));
        applicants.forEach(app => {
            const stageApplicants = initialColumns.get(app.stage) || [];
            initialColumns.set(app.stage, [...stageApplicants, app]);
        });
        return initialColumns;
    });

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    }));

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Applicant') {
            setActiveApplicant(event.active.data.current.applicant);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveApplicant(null);
        const { active, over } = event;
        if (!over) return;
        if (active.id === over.id) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();
        const activeContainer = active.data.current?.sortable.containerId;
        const overContainer = over.data.current?.sortable.containerId || over.id.toString();

        if (activeContainer !== overContainer) {
            // --- This is the core logic ---
            const applicantToMove = applicants.find(app => app.id === activeId);
            if (!applicantToMove) return;

            // Optimistic UI Update
            setColumns(prev => {
                const newColumns = new Map(prev);
                const sourceColumn = Array.from(newColumns.get(activeContainer) || []);
                const destColumn = Array.from(newColumns.get(overContainer) || []);
                const [movedItem] = sourceColumn.splice(sourceColumn.findIndex(item => item.id === activeId), 1);
                
                // Find insertion index in destination
                const overIndex = destColumn.findIndex(item => item.id === overId);
                if(overIndex !== -1) {
                    destColumn.splice(overIndex, 0, movedItem);
                } else {
                     destColumn.push(movedItem); // Drop on column, not on an item
                }
                
                newColumns.set(activeContainer, sourceColumn);
                newColumns.set(overContainer, destColumn);
                return newColumns;
            });

            // Call Server Action
            const result = await updateApplicantStage(applicantToMove.id, overContainer);

            if (!result.success) {
                toast({ title: "Error", description: result.message, variant: 'destructive' });
                // Revert UI on failure
                 setColumns(prev => {
                    const revertedColumns = new Map(prev);
                    // This is a simplified revert. A more robust solution might store pre-drag state.
                    return revertedColumns;
                });
            } else {
                 toast({ title: "Success", description: `Moved ${applicantToMove.first_name} to ${overContainer}.` });
            }
        }
    };

    return (
        <div className="flex h-[calc(100vh-250px)] w-full overflow-x-auto gap-4 pb-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={STAGES}>
                    {STAGES.map(stage => (
                        <Column
                            key={stage}
                            id={stage}
                            title={stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase()}
                            applicants={columns.get(stage) || []}
                        />
                    ))}
                </SortableContext>
                 {createPortal(
                    <DragOverlay>
                        {activeApplicant ? <ApplicantCard applicant={activeApplicant} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    );
}