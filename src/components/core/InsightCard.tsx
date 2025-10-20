'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lightbulb, AlertTriangle, Briefcase, TrendingUp, Users, Package, Banknote } from 'lucide-react';

// --- Type Definitions ---

// Re-defining the Insight type here to make the component self-contained.
// This should match the type definition in your `CopilotPage`.
interface Insight {
  type: 'profitability' | 'churn_risk' | 'dead_stock' | 'cash_flow' | 'loan_risk' | 'underutilized_property';
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
  category: 'Financial' | 'Inventory' | 'Customer' | 'Operations';
}

interface InsightCardProps {
  insight: Insight;
  onAction: (type: string, data: any) => void;
}

// --- Mappings for Dynamic UI ---

// Map severity levels to specific UI variants (colors, icons)
const severityConfig = {
    critical: {
        icon: AlertTriangle,
        className: "border-destructive/80 bg-destructive/5",
        iconClass: "text-destructive",
    },
    warning: {
        icon: AlertTriangle,
        className: "border-amber-500/80 bg-amber-500/5",
        iconClass: "text-amber-500",
    },
    info: {
        icon: Lightbulb,
        className: "border-sky-500/80 bg-sky-500/5",
        iconClass: "text-sky-500",
    },
};

// Map insight categories to specific icons
const categoryIcons = {
    Financial: Banknote,
    Inventory: Package,
    Customer: Users,
    Operations: Briefcase,
};

// Map insight types to actionable buttons
const actionConfig: { [key in Insight['type']]: { label: string; action: string; } } = {
    profitability: { label: "Analyze Profitability", action: "view_report" },
    churn_risk: { label: "View Customer", action: "send_follow_up" },
    dead_stock: { label: "Create Sale", action: "create_discount" },
    cash_flow: { label: "Review Cash Flow", action: "view_report" },
    loan_risk: { label: "Assess Risk", action: "view_details" },
    underutilized_property: { label: "Manage Assets", action: "view_assets" },
};


// --- The Component ---

/**
 * InsightCard Component
 * Displays an actionable intelligence card for the AI Co-Pilot page.
 * It dynamically adjusts its appearance and actions based on the insight's severity,
 * category, and type.
 */
export default function InsightCard({ insight, onAction }: InsightCardProps) {
    const config = severityConfig[insight.severity];
    const CategoryIcon = categoryIcons[insight.category] || Briefcase;
    const action = actionConfig[insight.type];

    return (
        <Card className={cn("flex flex-col justify-between break-inside-avoid shadow-sm hover:shadow-md transition-shadow", config.className)}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
                            <CategoryIcon className="h-3.5 w-3.5" />
                            {insight.category}
                        </Badge>
                        <CardTitle className="text-lg font-semibold">{insight.title}</CardTitle>
                    </div>
                    <config.icon className={cn("h-6 w-6 flex-shrink-0", config.iconClass)} />
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{insight.message}</p>
            </CardContent>
            <CardFooter>
                {action && (
                    <Button 
                        size="sm"
                        variant={insight.severity === 'critical' ? 'destructive' : 'default'}
                        onClick={() => onAction(action.action, insight.data)}
                        className="w-full"
                    >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {action.label}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}