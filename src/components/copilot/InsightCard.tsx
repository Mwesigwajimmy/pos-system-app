'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Info,
  AlertTriangle,
  AlertOctagon,
  Shield,
  Banknote,
  UserCheck,
  TrendingUp,
  LucideIcon
} from 'lucide-react';
import React from 'react';

// --- TYPE DEFINITIONS ---
interface Insight {
  type: 'profitability' | 'churn_risk' | 'dead_stock' | 'cash_flow';
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
}

interface InsightCardProps {
  insight: Insight;
  onAction: (type: string, data: any) => void;
}

// --- CONFIGURATION OBJECTS ---
const severityConfig: Record<Insight['severity'], { Icon: LucideIcon; color: string; borderColor: string; }> = {
    info: { Icon: Info, color: 'text-blue-500', borderColor: 'border-blue-500/20' },
    warning: { Icon: AlertTriangle, color: 'text-amber-500', borderColor: 'border-amber-500/40' },
    critical: { Icon: AlertOctagon, color: 'text-destructive', borderColor: 'border-destructive/50' },
};

// --- HELPER FUNCTION FOR ACTIONS ---
const getInsightAction = (type: Insight['type'], data: any, onAction: InsightCardProps['onAction']) => {
  switch (type) {
    case 'cash_flow':
      return { label: 'Generate Loan Offer', Icon: Shield, action: () => onAction('generate_loan', data) };
    case 'dead_stock':
      return { label: 'Create Discount', Icon: Banknote, action: () => onAction('create_discount', data) };
    case 'churn_risk':
      return { label: 'Send Follow-up', Icon: UserCheck, action: () => onAction('send_follow_up', data) };
    case 'profitability':
      return { label: 'Promote Item', Icon: TrendingUp, action: () => onAction('promote_item', data) };
    default:
      return null;
  }
};


// --- MAIN COMPONENT ---
export default function InsightCard({ insight, onAction }: InsightCardProps) {
    const config = severityConfig[insight.severity];
    const action = getInsightAction(insight.type, insight.data, onAction);

    return (
        <Card className={cn('break-inside-avoid border-l-4 bg-card', config.borderColor)}>
            <CardHeader>
                <CardTitle className={cn('flex items-center gap-2 text-base font-semibold', config.color)}>
                    <config.Icon className="h-5 w-5" />
                    {insight.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Safely render simple bold markdown from the database message */}
                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: insight.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                
                {action && (
                    <div className="pt-4 border-t border-border/50">
                        <Button size="sm" variant="outline" className="mt-2 w-full sm:w-auto" onClick={action.action}>
                            <action.Icon className="mr-2 h-4 w-4" />
                            {action.label}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}