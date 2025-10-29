'use client';

import React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from 'recharts';
import { Lightbulb, AlertTriangle, AlertOctagon, MessageSquarePlus, LucideIcon, MoreVertical, CheckCircle, XCircle } from 'lucide-react';

// --- The Definitive, Rich Insight Type Definition ---
export interface SuggestedAction { label: string; prompt: string; }
export interface KeyDataItem { value: string | number; href?: string; }
export interface ChartDataItem { name: string; value: number; }
export interface Insight {
  id: string; title: string; severity: 'info' | 'warning' | 'critical';
  message: string; suggested_actions: SuggestedAction[];
  key_data?: Record<string, KeyDataItem | string | number>; chart_data?: ChartDataItem[];
}

interface InsightCardProps { insight: Insight; onAskAI: (prompt: string) => void; }
const severityConfig: Record<Insight['severity'], { Icon: LucideIcon; color: string; borderColor: string; }> = {
  info: { Icon: Lightbulb, color: 'text-sky-500', borderColor: 'border-sky-500/40' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', borderColor: 'border-amber-500/50' },
  critical: { Icon: AlertOctagon, color: 'text-destructive', borderColor: 'border-destructive/60' },
};

const supabase = createClient();

async function dismissInsight(insightId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { error } = await supabase.from('dismissed_insights').insert({ user_id: user.id, insight_id: insightId });
    if (error && error.code !== '23505') throw new Error(error.message); // Ignore unique constraint violation
}

// --- The Revolutionary Component ---
export default function InsightCard({ insight, onAskAI }: InsightCardProps) {
  const config = severityConfig[insight.severity] || severityConfig['info'];
  const queryClient = useQueryClient();

  const mutation = useMutation({
      mutationFn: dismissInsight,
      onSuccess: () => {
          toast.success("Insight has been acknowledged.");
          queryClient.invalidateQueries({ queryKey: ['proactiveInsights'] });
      },
      onError: (error: Error) => toast.error(`Could not dismiss insight: ${error.message}`)
  });

  return (
    <div className={cn('break-inside-avoid rounded-lg border-l-4 bg-card shadow-sm transition-shadow hover:shadow-lg flex flex-col', config.borderColor)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
            <CardTitle className={cn('flex items-center gap-2 text-base font-semibold', config.color)}>
              <config.Icon className="h-5 w-5 flex-shrink-0" /><span>{insight.title}</span>
            </CardTitle>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => mutation.mutate(insight.id)}><CheckCircle className="mr-2 h-4 w-4" /> Acknowledge & Archive</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insight.message}</p>
        {insight.key_data && (
          <div className="text-xs space-y-1 rounded-md border bg-muted/50 p-2">
            {Object.entries(insight.key_data).map(([key, item]) => {
                const isObject = typeof item === 'object' && item !== null && 'value' in item;
                const value = isObject ? item.value : item;
                const href = isObject ? (item as KeyDataItem).href : undefined;
                return (
                  <div key={key} className="flex justify-between items-center gap-2">
                    <span className="font-medium capitalize text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                    {href ? (<Button asChild variant="link" className="p-0 h-auto font-mono text-primary hover:underline"><Link href={href}>{String(value)}</Link></Button>) 
                          : (<span className="font-mono text-foreground">{String(value)}</span>)}
                  </div>
                );
            })}
          </div>
        )}
      </CardContent>
      {insight.suggested_actions && insight.suggested_actions.length > 0 && (
        <CardFooter className="flex flex-col items-start gap-2 pt-4 border-t bg-muted/30">
            <h4 className="text-xs font-semibold text-muted-foreground">Ask Aura to...</h4>
            {insight.suggested_actions.map((action, index) => (
              <Button key={index} size="sm" variant="outline" className="w-full h-auto justify-start text-left py-2" onClick={() => onAskAI(action.prompt)} aria-label={action.prompt}>
                <MessageSquarePlus className="mr-2 h-4 w-4 flex-shrink-0" /><span>{action.label}</span>
              </Button>
            ))}
        </CardFooter>
      )}
    </div>
  );
}