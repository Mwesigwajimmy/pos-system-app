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
  LucideIcon,
  Building2,
  BadgePercent,
  Mail,
  Filter,
} from 'lucide-react';
import React from 'react';

// --- TYPE DEFINITIONS ---
interface Insight {
  type: 'profitability' | 'churn_risk' | 'dead_stock' | 'cash_flow' | 'loan_risk' | 'underutilized_property';
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
  category?: 'Financial' | 'Inventory' | 'Customer' | 'Operations';
}

// --- PROPS ---
interface InsightCardProps {
  insight: Insight;
  onAction: (type: string, data: any) => void;
}

// --- SEVERITY CONFIG ---
const severityConfig: Record<Insight['severity'], { Icon: LucideIcon; color: string; borderColor: string; badge: string }> = {
  info: {
    Icon: Info,
    color: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    badge: 'Info',
  },
  warning: {
    Icon: AlertTriangle,
    color: 'text-amber-500',
    borderColor: 'border-amber-500/40',
    badge: 'Warning',
  },
  critical: {
    Icon: AlertOctagon,
    color: 'text-destructive',
    borderColor: 'border-destructive/50',
    badge: 'Critical',
  },
};

// --- CATEGORY CONFIG (OPTIONAL) ---
const categoryConfig: Record<string, { Icon: LucideIcon; color: string }> = {
  Financial: { Icon: Banknote, color: 'text-green-600' },
  Inventory: { Icon: BadgePercent, color: 'text-yellow-700' },
  Customer: { Icon: Mail, color: 'text-pink-700' },
  Operations: { Icon: Building2, color: 'text-cyan-700' },
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
    case 'loan_risk':
      return { label: 'Review Loan Application', Icon: Shield, action: () => onAction('review_loan', data) };
    case 'underutilized_property':
      return { label: 'Create Marketing Campaign', Icon: TrendingUp, action: () => onAction('market_property', data) };
    default:
      return null;
  }
};

// --- MAIN COMPONENT ---
export default function InsightCard({ insight, onAction }: InsightCardProps) {
  const config = severityConfig[insight.severity] || severityConfig['info'];
  const categoryMeta = insight.category ? categoryConfig[insight.category] : undefined;
  const action = getInsightAction(insight.type, insight.data, onAction);

  return (
    <Card className={cn('break-inside-avoid border-l-4 bg-card transition-shadow hover:shadow-lg', config.borderColor)}>
      <CardHeader>
        <div className="flex items-center gap-2 justify-between">
          <CardTitle className={cn('flex items-center gap-2 text-base font-semibold', config.color)}>
            <config.Icon className="h-5 w-5" />
            <span>{insight.title}</span>
          </CardTitle>
          {/* Severity badge */}
          <span className={cn(
            "rounded px-2 py-0.5 text-xs font-medium border",
            config.color,
            "border-current bg-muted"
          )}>
            {config.badge}
          </span>
        </div>
        {/* Category tag (optional) */}
        {categoryMeta && (
          <div className="mt-1 flex items-center gap-1 text-xs font-medium">
            <categoryMeta.Icon className={cn("h-4 w-4", categoryMeta.color)} />
            <span className={categoryMeta.color}>{insight.category}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render strong markdown, but only for bold **text** */}
        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: insight.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        {/* Action button */}
        {action && (
          <div className="pt-4 border-t border-border/50">
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full sm:w-auto"
              onClick={action.action}
              aria-label={action.label}
            >
              <action.Icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}