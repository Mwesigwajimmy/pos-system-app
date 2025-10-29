'use client';

import React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from 'recharts';
import {
  Lightbulb, AlertTriangle, AlertOctagon, MessageSquarePlus, LucideIcon,
  MoreVertical, CheckCircle, XCircle
} from 'lucide-react';

// --- TYPE DEFINITIONS for a rich, actionable insight ---
interface SuggestedAction {
  label: string;
  prompt: string;
}

interface KeyDataItem {
  value: string | number;
  href?: string; // Make specific dashboard pages linkable
}

interface ChartDataItem {
  name: string; // Typically a date or category
  value: number;
}

export interface Insight {
  id: string; // For acknowledging or dismissing
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggested_actions: SuggestedAction[];
  key_data?: Record<string, KeyDataItem>;
  chart_data?: ChartDataItem[];
}

interface InsightCardProps {
  insight: Insight;
  onAskAI: (prompt: string) => void;
}

// --- CONFIGURATION for visual representation ---
const severityConfig: Record<Insight['severity'], { Icon: LucideIcon; color: string; borderColor: string; }> = {
  info: { Icon: Lightbulb, color: 'text-sky-500', borderColor: 'border-sky-500/40' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', borderColor: 'border-amber-500/50' },
  critical: { Icon: AlertOctagon, color: 'text-destructive', borderColor: 'border-destructive/60' },
};

// --- SERVER ACTION to interact with the database ---
const supabase = createClient();

async function dismissInsight(insightId: string): Promise<void> {
    const { error } = await supabase.rpc('dismiss_insight', { p_insight_id: insightId });
    if (error) throw new Error(error.message);
}

// --- THE REVOLUTIONARY COMPONENT ---
export default function InsightCard({ insight, onAskAI }: InsightCardProps) {
  const config = severityConfig[insight.severity] || severityConfig['info'];
  const queryClient = useQueryClient();

  const mutation = useMutation({
      mutationFn: dismissInsight,
      onSuccess: () => {
          toast.success("Insight has been acknowledged.");
          // Invalidate the query to refetch insights and remove this card from the UI
          queryClient.invalidateQueries({ queryKey: ['proactiveInsights'] });
      },
      onError: (error: Error) => {
          toast.error(`Could not dismiss insight: ${error.message}`);
      }
  });

  const handleDismiss = () => {
      mutation.mutate(insight.id);
  };

  return (
    <div className={cn('break-inside-avoid rounded-lg border-l-4 bg-card shadow-sm transition-shadow hover:shadow-lg flex flex-col', config.borderColor)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
            <CardTitle className={cn('flex items-center gap-2 text-base font-semibold', config.color)}>
              <config.Icon className="h-5 w-5 flex-shrink-0" />
              <span>{insight.title}</span>
            </CardTitle>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDismiss}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge & Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDismiss} className="focus:bg-destructive/10 focus:text-destructive text-destructive">
                        <XCircle className="mr-2 h-4 w-4" /> Dismiss
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insight.message}</p>
        
        {insight.chart_data && insight.chart_data.length > 0 && (
            <div className="h-24 -mx-6 -mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insight.chart_data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <Tooltip
                            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                            labelStyle={{ fontWeight: 'bold' }}
                            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Value"]}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )}

        {insight.key_data && (
          <div className="text-xs space-y-1 rounded-md border bg-muted/50 p-2">
            {Object.entries(insight.key_data).map(([key, item]) => (
              <div key={key} className="flex justify-between items-center gap-2">
                <span className="font-medium capitalize text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                {item.href ? (
                    <Button asChild variant="link" className="p-0 h-auto font-mono text-primary hover:underline">
                        <Link href={item.href}>{String(item.value)}</Link>
                    </Button>
                ) : (
                    <span className="font-mono text-foreground">{String(item.value)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {insight.suggested_actions && insight.suggested_actions.length > 0 && (
        <CardFooter className="flex flex-col items-start gap-2 pt-4 border-t bg-muted/30">
            <h4 className="text-xs font-semibold text-muted-foreground">Ask Aura to...</h4>
            {insight.suggested_actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                className="w-full h-auto justify-start text-left py-2"
                onClick={() => onAskAI(action.prompt)}
                aria-label={action.prompt}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{action.label}</span>
              </Button>
            ))}
        </CardFooter>
      )}
    </div>
  );
}