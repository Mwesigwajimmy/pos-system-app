'use client';

import { useState, useTransition, useMemo } from 'react';
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
import { 
    GripVertical, 
    User, 
    Landmark, 
    Package, 
    ShieldCheck, 
    FileText, 
    BarChart3,
    TrendingUp,
    MapPin,
    Users
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { updateDealStage, convertDealToWorkOrder } from '@/lib/crm/actions/leads';

// --- TYPES ---
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
    country_code: string | null;
    nature_of_business: string | null;
    target_package_name: string | null;
    subscription_status: string | null;
    marketing_agent_id: string | null;
    marketing_team_name: string | null;
    agreed_commission_percentage: number | null;
    commission_earned_ugx: number | null;
    customers: { name: string; email: string } | null;
    employees: { full_name: string } | null; 
    created_at: string;
}

interface DealCardProps { deal: Deal; }
interface ColumnProps { stage: Stage; deals: Deal[]; }

// --- REPORTING UTILITIES ---

const generatePipelineAudit = (deals: Deal[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("Sales Pipeline: Audit Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Active Deals: ${deals.length}`, 14, 28);

    autoTable(doc, {
        startY: 35,
        head: [['Title', 'Agent', 'Value', 'Comm %', 'Package', 'Nature of Biz', 'Status']],
        body: deals.map(d => [
            d.title,
            d.employees?.full_name || 'Unassigned',
            `${(d.value || 0).toLocaleString()} ${d.currency_code || 'UGX'}`,
            `${d.agreed_commission_percentage || 0}%`,
            d.target_package_name || 'Standard',
            d.nature_of_business || 'General',
            d.subscription_status || 'PROSPECT'
        ]),
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 }
    });

    doc.save(`Pipeline_Audit_${Date.now()}.pdf`);
};

const downloadAgentEvaluationReport = (deals: Deal[], targetAgentId?: string) => {
    const doc = new jsPDF();
    const isSummary = !targetAgentId;
    const filteredDeals = targetAgentId ? deals.filter(d => d.marketing_agent_id === targetAgentId) : deals;
    const agentName = isSummary ? "Global Marketing Teams" : (filteredDeals[0]?.employees?.full_name || "Agent Record");

    doc.setFontSize(18);
    doc.text(isSummary ? "Team Performance Summary" : "Agent Performance Audit", 14, 20);
    doc.setFontSize(10);
    doc.text(`Target: ${agentName} | Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const totalLeads = filteredDeals.length;
    const closedWon = filteredDeals.filter(d => d.stage_id.toLowerCase().includes('won') || d.stage_id.toLowerCase().includes('closed')).length;
    const convRate = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : "0";
    const totalRev = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalComm = filteredDeals.reduce((sum, d) => sum + (d.commission_earned_ugx || 0), 0);

    autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
            ['Total Prospects', totalLeads],
            ['Closed Sales', closedWon],
            ['Conversion Rate', `${convRate}%`],
            ['Gross Revenue', `${totalRev.toLocaleString()} Mixed`],
            ['Total Commissions', `${totalComm.toLocaleString()} UGX`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`${isSummary ? 'Team_Summary' : 'Agent_Audit'}_${Date.now()}.pdf`);
};

// --- DEAL CARD ---
function DealCard({ deal }: DealCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: deal.id,
        data: { type: 'Deal', deal },
    });
    
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    const [isConverting, startTransition] = useTransition();
    const { toast } = useToast();

    const formattedValue = deal.value 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency_code || 'UGX', maximumFractionDigits: 0 }).format(deal.value) 
        : '—';

    const handleConvert = () => {
        if (!deal.customers) {
            toast({ title: "Action Required", description: "Assign a customer before converting.", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await convertDealToWorkOrder(deal.id);
            if (result.success) toast({ title: "Success", description: result.message });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <Card ref={setNodeRef} style={style} {...attributes} className="mb-3 bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 touch-none">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2">
                             <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0 border-slate-200 text-slate-600 bg-slate-50">
                                {deal.nature_of_business || 'General'}
                             </Badge>
                             {deal.subscription_status === 'ACTIVE' && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                        </div>
                        <h4 className="font-semibold text-sm text-slate-900 leading-snug">{deal.title}</h4>
                        
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-emerald-600">{formattedValue}</span>
                            {deal.agreed_commission_percentage && (
                                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{deal.agreed_commission_percentage}% Comm</span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-1.5 mt-3">
                            {deal.customers && (
                                <div className="flex items-center text-[11px] text-slate-600">
                                    <Landmark className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                    {deal.customers.name}
                                </div>
                            )}
                            <div className="flex items-center text-[11px] text-slate-500">
                                <Package className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                {deal.target_package_name || 'Standard Package'}
                            </div>
                            <div className="flex items-center text-[11px] font-medium text-slate-700">
                                <User className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                {deal.employees?.full_name || 'Unassigned'}
                            </div>
                            <div className="flex items-center text-[10px] text-slate-400 font-medium">
                                <MapPin className="h-3 w-3 mr-2" />
                                {deal.country_code || 'UG'} · {deal.currency_code || 'UGX'}
                            </div>
                        </div>
                    </div>
                    <div {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                        <GripVertical className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full h-9 text-xs font-medium border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors" 
                        onClick={handleConvert} 
                        disabled={isConverting}
                    >
                        {isConverting ? "Converting..." : "Convert to Work Order"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// --- COLUMN ---
function PipelineColumn({ stage, deals }: ColumnProps) {
    const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'Stage' } });
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const currency = deals[0]?.currency_code || 'UGX';
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(totalValue);

    return (
        <div ref={setNodeRef} className="flex-1 max-w-[320px] min-w-[300px] h-full">
            <div className="flex flex-col h-full bg-slate-50/60 border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-tight">{stage.name}</h3>
                        <Badge variant="outline" className="bg-white text-slate-700 text-[11px] border-slate-200 font-medium">{deals.length}</Badge>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{formattedTotal}</p>
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

// --- MAIN BOARD ---
export function SalesPipelineBoard({ deals, stages }: { deals: Deal[], stages: Stage[] }) {
    const { toast } = useToast();
    const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

    const stats = useMemo(() => {
        const closedCount = deals.filter(d => d.stage_id.toLowerCase().includes('won') || d.stage_id.toLowerCase().includes('closed')).length;
        return { closedCount };
    }, [deals]);

    const [columns, setColumns] = useState<Map<string, Deal[]>>(() => {
        const initialColumns = new Map<string, Deal[]>();
        stages.forEach(stage => initialColumns.set(stage.id, []));
        deals.forEach(deal => {
            const stageDeals = initialColumns.get(deal.stage_id) || [];
            initialColumns.set(deal.stage_id, [...stageDeals, deal]);
        });
        return initialColumns;
    });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

            setColumns(prev => {
                const newColumns = new Map(prev);
                const sourceColumn = Array.from(newColumns.get(activeContainer) || []);
                const destColumn = Array.from(newColumns.get(overContainer) || []);
                const idx = sourceColumn.findIndex(item => item.id === activeId);
                if (idx !== -1) {
                    const [movedItem] = sourceColumn.splice(idx, 1);
                    destColumn.push({ ...movedItem, stage_id: newStage.id });
                }
                newColumns.set(activeContainer, sourceColumn);
                newColumns.set(overContainer, destColumn);
                return newColumns;
            });

            const result = await updateDealStage(dealToMove.id, newStage.id);
            if (!result.success) {
                toast({ title: "Sync Error", description: result.message, variant: 'destructive' });
            } else {
                 toast({ title: "Pipeline Updated", description: `"${dealToMove.title}" moved to ${newStage.name}.` });
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white font-sans">
            <header className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="h-11 w-11 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Pipeline</h1>
                        <div className="flex items-center gap-2.5 mt-0.5">
                            <span className="flex items-center text-xs font-medium text-emerald-600">
                                <BarChart3 size={14} className="mr-1.5" /> {stats.closedCount} Won
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-xs text-slate-500 font-medium">Auto-Commissioning Enabled</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        className="text-xs font-semibold gap-2 h-10 border-slate-200 px-4 hover:bg-slate-50" 
                        onClick={() => generatePipelineAudit(deals)}
                    >
                        <FileText size={16} className="text-slate-400" /> Pipeline Audit
                    </Button>
                    <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold gap-2 h-10 px-5 shadow-sm shadow-blue-100" 
                        onClick={() => downloadAgentEvaluationReport(deals)}
                    >
                        <Users size={16} /> Team Performance
                    </Button>
                </div>
            </header>

            <main className="flex-grow overflow-x-auto">
                <div className="flex h-full p-8 gap-8 min-w-max">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={stages.map(s => s.id)}>
                            {stages.map(stage => (
                                <PipelineColumn key={stage.id} stage={stage} deals={columns.get(stage.id) || []} />
                            ))}
                        </SortableContext>
                        {createPortal(<DragOverlay>{activeDeal ? <DealCard deal={activeDeal} /> : null}</DragOverlay>, document.body)}
                    </DndContext>
                </div>
            </main>
        </div>
    );
}