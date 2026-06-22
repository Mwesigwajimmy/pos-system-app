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
    Plus,
    Users,
    Coins,
    Percent
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { updateDealStage, convertDealToWorkOrder } from '@/lib/crm/actions/leads';

// --- TYPES ENHANCED FOR DEEP COMMISSION & AGENT TRACKING ---
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

// --- ENTERPRISE UTILITY: DEEP FORENSIC REPORTING ---

/**
 * Generates an audit of all active deals in the pipeline
 */
const generatePipelineAudit = (deals: Deal[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("Sovereign CRM: Pipeline Forensic Audit", 14, 20);
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

    doc.save(`Forensic_Pipeline_Audit_${Date.now()}.pdf`);
};

/**
 * Generates an evaluation per agent or a full team summary including commissions
 */
const downloadAgentEvaluationReport = (deals: Deal[], targetAgentId?: string) => {
    const doc = new jsPDF();
    const isSummary = !targetAgentId;
    
    const filteredDeals = targetAgentId ? deals.filter(d => d.marketing_agent_id === targetAgentId) : deals;
    const agentName = isSummary ? "Global Marketing Teams" : (filteredDeals[0]?.employees?.full_name || "Agent Record");

    doc.setFontSize(20);
    doc.text(isSummary ? "Global Marketing Summary" : "Agent Performance Audit", 14, 20);
    doc.setFontSize(10);
    doc.text(`Target: ${agentName} | Forensic Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const totalLeads = filteredDeals.length;
    const closedWon = filteredDeals.filter(d => d.stage_id.toLowerCase().includes('won') || d.stage_id.toLowerCase().includes('closed')).length;
    const convRate = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : "0";
    const totalRev = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalComm = filteredDeals.reduce((sum, d) => sum + (d.commission_earned_ugx || 0), 0);

    autoTable(doc, {
        startY: 40,
        head: [['Performance Metric', 'Value']],
        body: [
            ['Total Prospects Captured', totalLeads],
            ['Closed/Converted Sales', closedWon],
            ['Conversion Efficiency', `${convRate}%`],
            ['Gross Revenue Pipeline', `${totalRev.toLocaleString()} (Mixed Currencies)`],
            ['TOTAL COMMISSIONS EARNED', `${totalComm.toLocaleString()} UGX`],
            ['Audit Status', 'Verified via Autonomous Paymaster']
        ],
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105] } // Forensic Green for Financials
    });

    doc.save(`${isSummary ? 'Team_Financial_Summary' : 'Agent_Payout_Audit'}_${Date.now()}.pdf`);
};

// --- UPGRADED DealCard: FORENSIC DATA VIEW ---
function DealCard({ deal }: DealCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: deal.id,
        data: { type: 'Deal', deal },
    });
    
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    const [isConverting, startTransition] = useTransition();
    const { toast } = useToast();

    const formattedValue = deal.value 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency_code || 'UGX' }).format(deal.value) 
        : 'No value';

    const handleConvert = () => {
        if (!deal.customers) {
            toast({ title: "Action Required", description: "Assign a customer to this deal before converting.", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await convertDealToWorkOrder(deal.id);
            if (result.success) toast({ title: "Success!", description: result.message });
            else toast({ title: "Error", description: result.message, variant: "destructive" });
        });
    };

    return (
        <Card ref={setNodeRef} style={style} {...attributes} className="mb-3 bg-card border-slate-200/60 shadow-sm hover:shadow-md transition-shadow touch-none">
            <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1.5 flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                             <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-1.5 border-slate-200 text-slate-400">
                                {deal.nature_of_business || 'General Business'}
                             </Badge>
                             {deal.subscription_status === 'ACTIVE' && <ShieldCheck className="h-3 w-3 text-blue-500" />}
                        </div>
                        <p className="font-bold text-[13px] text-slate-800 leading-tight">{deal.title}</p>
                        <div className="flex items-center gap-3">
                            <p className="font-black text-xs text-emerald-600 uppercase tracking-tight">{formattedValue}</p>
                            {deal.agreed_commission_percentage && (
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 rounded">{deal.agreed_commission_percentage}% COMM</span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-1.5 mt-2">
                            {deal.customers && (
                                <div className="flex items-center text-[10px] font-semibold text-slate-500">
                                    <Landmark className="h-3 w-3 mr-1.5 text-slate-400" />
                                    {deal.customers.name}
                                </div>
                            )}
                            <div className="flex items-center text-[10px] font-medium text-slate-400">
                                <Package className="h-3 w-3 mr-1.5" />
                                {deal.target_package_name || 'Standard Setup'}
                            </div>
                            <div className="flex items-center text-[10px] font-bold text-blue-600/70">
                                <User className="h-3 w-3 mr-1.5" />
                                {deal.employees?.full_name || 'No Agent'} 
                                {deal.marketing_team_name && <span className="ml-1 opacity-50">({deal.marketing_team_name})</span>}
                            </div>
                            <div className="flex items-center text-[9px] font-bold text-slate-300 uppercase">
                                <MapPin className="h-2.5 w-2.5 mr-1.5" />
                                {deal.country_code || 'UG'} | {deal.currency_code || 'UGX'}
                            </div>
                        </div>
                    </div>
                    <div {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                        <GripVertical className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <Button size="sm" variant="outline" className="w-full h-8 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50" onClick={handleConvert} disabled={isConverting}>
                        {isConverting ? "Processing..." : "Convert to Work Order"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// --- PIPELINE COLUMN ---
function PipelineColumn({ stage, deals }: ColumnProps) {
    const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'Stage' } });
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const currency = deals[0]?.currency_code || 'UGX';
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(totalValue);

    return (
        <div ref={setNodeRef} className="flex-1 max-w-[320px] min-w-[300px] h-full">
            <div className="flex flex-col h-full bg-slate-50/50 border border-slate-200/50 rounded-xl overflow-hidden">
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">{stage.name}</h3>
                        <Badge className="bg-slate-900 text-white font-black text-[10px]">{deals.length}</Badge>
                    </div>
                    <p className="mt-1 font-black text-lg text-slate-900 tracking-tighter">{formattedTotal}</p>
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

// --- MAIN ENTERPRISE COMPONENT ---
export function SalesPipelineBoard({ deals, stages }: { deals: Deal[], stages: Stage[] }) {
    const { toast } = useToast();
    const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); 

    const stats = useMemo(() => {
        const closedCount = deals.filter(d => d.stage_id.toLowerCase().includes('won') || d.stage_id.toLowerCase().includes('closed')).length;
        const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
        return { closedCount, totalValue };
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
                toast({ title: "Forensic Sync Error", description: result.message, variant: 'destructive' });
            } else {
                 toast({ title: "Pipeline Updated", description: `"${dealToMove.title}" synchronized to ${newStage.name}.` });
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white">
            {/* SOVEREIGN INTELLIGENCE HEADER */}
            <div className="px-6 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-5">
                    <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Pipeline</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center text-[10px] font-black uppercase text-emerald-600">
                                <BarChart3 size={12} className="mr-1" /> {stats.closedCount} Closed Won
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-bold text-slate-400">Commission Engine Active</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsCreateModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6">
                        <Plus size={16} /> Record Field Data
                    </Button>
                    <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest gap-2 h-10 border-slate-200 hover:bg-slate-50" onClick={() => generatePipelineAudit(deals)}>
                        <FileText size={14} /> Full Audit
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest gap-2 h-10 px-6 shadow-lg shadow-blue-200" onClick={() => downloadAgentEvaluationReport(deals)}>
                        <Users size={14} /> Team Summary
                    </Button>
                </div>
            </div>

            {/* DND PIPELINE BOARD */}
            <div className="flex-grow overflow-x-auto">
                <div className="flex h-full p-6 gap-6 min-w-max">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={stages.map(s => s.id)}>
                            {stages.map(stage => (
                                <PipelineColumn key={stage.id} stage={stage} deals={columns.get(stage.id) || []} />
                            ))}
                        </SortableContext>
                        {createPortal(<DragOverlay>{activeDeal ? <DealCard deal={activeDeal} /> : null}</DragOverlay>, document.body)}
                    </DndContext>
                </div>
            </div>

            {/* INTEGRATION: Record Field Data Modal */}
            {/* <CreateDealModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} /> */}
        </div>
    );
}