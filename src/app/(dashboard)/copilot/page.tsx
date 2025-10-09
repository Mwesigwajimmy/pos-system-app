'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, UserCheck, PackageX, Banknote, Shield, Lightbulb, AlertTriangle, Info, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Types
interface Insight {
  type: 'profitability' | 'churn_risk' | 'dead_stock';
  title: string;
  severity: 'info' | 'warning';
  message: string;
  data: any;
}

const supabase = createClient();
const fetchAllInsights = async (): Promise<Insight[]> => { const { data, error } = await supabase.rpc('get_all_copilot_insights'); if(error) throw new Error(error.message); return data || []; };

const severityConfig = {
    info: { Icon: Info, color: 'text-blue-500', borderColor: 'border-blue-500/20' },
    warning: { Icon: AlertTriangle, color: 'text-amber-500', borderColor: 'border-amber-500/40' },
};

const InsightCard = ({ insight, onAction }: { insight: Insight, onAction: (type: string, data: any) => void }) => {
    const { Icon, color, borderColor } = severityConfig[insight.severity];
    
    const getInsightAction = (type: string, data: any) => {
      switch (type) {
        case 'dead_stock': return { label: 'Create Discount', Icon: Banknote, action: () => onAction('create_discount', data) };
        case 'churn_risk': return { label: 'Send Follow-up', Icon: UserCheck, action: () => onAction('send_follow_up', data) };
        case 'profitability': return { label: 'Promote Item', Icon: TrendingUp, action: () => onAction('promote_item', data) };
        default: return null;
      }
    };
    
    const action = getInsightAction(insight.type, insight.data);

    return (
        <Card className={cn('break-inside-avoid border-l-4', borderColor)}>
            <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-base ${color}`}><Icon className="h-5 w-5" />{insight.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm" dangerouslySetInnerHTML={{ __html: insight.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                {action && (
                    <div className="pt-4 border-t">
                        <Button size="sm" variant="outline" className="mt-2" onClick={action.action}>
                            <action.Icon className="mr-2 h-4 w-4" />{action.label}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const CopilotSkeleton = () => (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full break-inside-avoid" />)}
    </div>
);

export default function CopilotPage() {
    const [action, setAction] = useState<{ type: string; data: any } | null>(null);
    const { data: insights, isLoading, isError, error, refetch } = useQuery({ queryKey: ['allCopilotInsights'], queryFn: fetchAllInsights });

    const { actionableInsights, generalObservations } = useMemo(() => {
        const actionable = insights?.filter(i => i.severity === 'warning') || [];
        const general = insights?.filter(i => i.severity === 'info') || [];
        return { actionableInsights: actionable, generalObservations: general };
    }, [insights]);
    
    return (
        <div className="container mx-auto py-6 space-y-8">
            <header>
                <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="text-primary"/>AI Business Co-Pilot</h1>
                <p className="text-muted-foreground">Actionable insights to help you grow your business, powered by your own data.</p>
            </header>

            {isLoading ? <CopilotSkeleton /> :
             isError ? <div className="text-center p-10"><h2 className="text-xl">Failed to load insights.</h2><p>{(error as Error).message}</p><Button onClick={() => refetch()} className="mt-4">Try Again</Button></div> :
             (insights?.length || 0) === 0 ? (
                <div className="text-center p-10 border-2 border-dashed rounded-lg">
                    <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No new insights right now</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Co-Pilot is analyzing your data. Check back later for new strategic advice.</p>
                </div>
             ) : (
                <>
                    {actionableInsights.length > 0 && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold">Actionable Insights</h2>
                            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                                {/* CORRECTED: Created a function that matches the prop's expected signature */}
                                {actionableInsights.map((insight, i) => <InsightCard key={i} insight={insight} onAction={(type, data) => setAction({ type, data })} />)}
                            </div>
                        </section>
                    )}
                    {generalObservations.length > 0 && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold">General Observations</h2>
                            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                                {/* CORRECTED: Created a function that matches the prop's expected signature */}
                                {generalObservations.map((insight, i) => <InsightCard key={i} insight={insight} onAction={(type, data) => setAction({ type, data })} />)}
                            </div>
                        </section>
                    )}
                </>
             )}

            <Dialog open={!!action} onOpenChange={() => setAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Take Action: {action?.data.name}</DialogTitle>
                        <DialogDescription>
                            {action?.type === 'create_discount' && `Create a limited-time sale for ${action.data.name} to move dead stock.`}
                            {action?.type === 'send_follow_up' && `Send a personalized follow-up message to ${action.data.name}.`}
                        </DialogDescription>
                    </DialogHeader>
                    {action?.type === 'create_discount' && (
                        <div className="py-4 space-y-4">
                            <div><Label htmlFor="discount">Discount Percentage</Label><Input id="discount" type="number" placeholder="e.g., 20" /></div>
                            <div><Label htmlFor="end_date">Sale End Date</Label><Input id="end_date" type="date" /></div>
                        </div>
                    )}
                    {action?.type === 'send_follow_up' && (
                        <div className="py-4"><Label>Message Content</Label><textarea className="w-full min-h-[100px] p-2 border rounded-md" defaultValue={`Hi ${action.data.name}, we've missed you! Here's a 10% discount on your next purchase.`}></textarea></div>
                    )}
                    <DialogFooter><Button onClick={() => { toast.success('Action recorded!'); setAction(null); }}>Confirm Action</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}