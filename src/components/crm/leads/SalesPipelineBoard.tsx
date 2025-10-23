'use client';

import { useState } from 'react';
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
import { GripVertical, User, Landmark } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { updateDealStage } from '@/lib/crm/actions/leads';

// --- TYPES (DEFINED AND EXPORTED HERE) ---
export interface Stage {
    id: string;
    name: string;
}

export interface Deal {
    id: string;
    title: string;
    stage_id: string;
    value: number | null;
    currency_code: string | null;
    customers: { name: string } | null;
    employees: { full_name: string } | null;
}

interface DealCardProps { deal: Deal; }
interface ColumnProps { stage: Stage; deals: Deal[]; }


// --- SUB-COMPONENTS ---

function DealCard({ deal }: DealCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: deal.id,
        data: { type: 'Deal', deal },
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    const formattedValue = deal.value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency_code || 'USD' }).format(deal.value) : 'No value';

    return (
        <Card ref={setNodeRef} style={style} {...attributes} className="mb-3 bg-card touch-none">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5 flex-grow">
                        <p className="font-semibold text-sm leading-tight">{deal.title}</p>
                         <p className="font-bold text-xs text-green-600 dark:text-green-500">{formattedValue}</p>
                        {deal.customers && (
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Landmark className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                {deal.customers.name}
                            </div>
                        )}
                         {deal.employees && (
                            <div className="flex items-center text-xs text-muted-foreground">
                                <User className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                {deal.employees.full_name}
                            </div>
                        )}
                    </div>
                    <div {...listeners} className="p-1 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PipelineColumn({ stage, deals }: ColumnProps) {
    const { setNodeRef } = useSortable({
        id: stage.id,
        data: { type: 'Stage' }
    });
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(totalValue);

    return (
        <div ref={setNodeRef} className="flex-1 max-w-[320px] min-w-[300px] h-full">
            <div className="flex flex-col h-full bg-muted/50 rounded-lg">
                <div className="p-3 border-b">
                    <h3 className="font-semibold text-sm flex items-center justify-between">
                        <span>{stage.name}</span>
                        <span className="text-muted-foreground font-normal">{formattedTotal}</span>
                    </h3>
                </div>
                <div className="p-3 flex-grow overflow-y-auto">
                    <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
                        {deals.map(deal => (
                            <DealCard key={deal.id} deal={deal} />
                        ))}
                    </SortableContext>
                </div>
            </div>
        </div>
    );
}


// --- MAIN SALES PIPELINE BOARD COMPONENT ---

export function SalesPipelineBoard({ deals, stages }: { deals: Deal[], stages: Stage[] }) {
    const { toast } = useToast();
    const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

    const [columns, setColumns] = useState<Map<string, Deal[]>>(() => {
        const initialColumns = new Map<string, Deal[]>();
        stages.forEach(stage => initialColumns.set(stage.id, []));
        deals.forEach(deal => {
            const stageDeals = initialColumns.get(deal.stage_id) || [];
            initialColumns.set(deal.stage_id, [...stageDeals, deal]);
        });
        return initialColumns;
    });

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    }));

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Deal') {
            setActiveDeal(event.active.data.current.deal);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDeal(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id.toString();
        const activeContainer = active.data.current?.sortable.containerId;
        const overContainer = over.data.current?.sortable.containerId || over.id.toString();

        if (activeContainer !== overContainer) {
            const dealToMove = deals.find(d => d.id === activeId);
            const newStage = stages.find(s => s.id === overContainer);
            if (!dealToMove || !newStage) return;

            // Optimistic UI Update
            setColumns(prev => {
                const newColumns = new Map(prev);
                const sourceColumn = Array.from(newColumns.get(activeContainer) || []);
                const destColumn = Array.from(newColumns.get(overContainer) || []);
                const [movedItem] = sourceColumn.splice(sourceColumn.findIndex(item => item.id === activeId), 1);
                destColumn.push(movedItem);
                newColumns.set(activeContainer, sourceColumn);
                newColumns.set(overContainer, destColumn);
                return newColumns;
            });

            // Call the real Server Action
            const result = await updateDealStage(dealToMove.id, newStage.id);

            if (!result.success) {
                toast({ title: "Error", description: result.message, variant: 'destructive' });
                // Revert on failure
                 setColumns(prev => {
                    const revertedColumns = new Map(prev);
                    const sourceColumn = Array.from(revertedColumns.get(overContainer) || []);
                    const destColumn = Array.from(revertedColumns.get(activeContainer) || []);
                    const [movedItem] = sourceColumn.splice(sourceColumn.findIndex(item => item.id === activeId), 1);
                    destColumn.push(movedItem);
                    revertedColumns.set(overContainer, sourceColumn);
                    revertedColumns.set(activeContainer, destColumn);
                    return revertedColumns;
                });
            } else {
                 toast({ title: "Success", description: `Moved "${dealToMove.title}" to ${newStage.name}.` });
            }
        }
    };

    return (
        <div className="flex h-full w-full items-start p-4 md:p-6 gap-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={stages.map(s => s.id)}>
                    {stages.map(stage => (
                        <PipelineColumn
                            key={stage.id}
                            stage={stage}
                            deals={columns.get(stage.id) || []}
                        />
                    ))}
                </SortableContext>
                 {createPortal(
                    <DragOverlay>
                        {activeDeal ? <DealCard deal={activeDeal} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    );
}