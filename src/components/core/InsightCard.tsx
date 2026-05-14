'use client';

/**
 * --- BBU1 SOVEREIGN INSIGHT ARCHITECTURE ---
 * A high-authority, actionable intelligence card that bridges 
 * forensic data analysis with executive decision-making.
 * 
 * Capability: Multi-Sector Auditing, Glowing Data Viz, Forensic Verification.
 * Integrity Grade: OMEGA-LEVEL / Executive Audit Ready.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis, XAxis, CartesianGrid } from 'recharts';
import {
  Lightbulb, AlertTriangle, AlertOctagon, MessageSquarePlus, LucideIcon,
  MoreVertical, CheckCircle, XCircle, ShieldCheck, Zap, 
  ArrowUpRight, TrendingUp, Fingerprint, SearchSlash, Activity
} from 'lucide-react';

// --- ENHANCED TYPE DEFINITIONS ---
interface SuggestedAction {
  label: string;
  prompt: string;
}

interface KeyDataItem {
  value: string | number;
  href?: string;
  trend?: number; // Optional percentage change for forensic analysis
}

interface ChartDataItem {
  name: string; 
  value: number;
}

export interface Insight {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  sector?: 'finance' | 'medical' | 'sacco' | 'logistics' | 'hr' | 'general';
  message: string;
  suggested_actions: SuggestedAction[];
  key_data?: Record<string, KeyDataItem>;
  chart_data?: ChartDataItem[];
  is_forensic_verified?: boolean; // CROSS-CHECKED BY AURA-AUDITOR
  generated_at?: string;
}

interface InsightCardProps {
  insight: Insight;
  onAskAI: (prompt: string) => void;
}

// --- SOVEREIGN BRANDING CONFIGURATION ---
const severityConfig: Record<Insight['severity'], { Icon: LucideIcon; color: string; bgColor: string; borderColor: string; glow: string; }> = {
  info: { 
    Icon: Lightbulb, 
    color: 'text-sky-500', 
    bgColor: 'bg-sky-500/10', 
    borderColor: 'border-sky-500/40',
    glow: 'shadow-[0_0_20px_rgba(14,165,233,0.15)]'
  },
  warning: { 
    Icon: AlertTriangle, 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10', 
    borderColor: 'border-amber-500/50',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
  },
  critical: { 
    Icon: AlertOctagon, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10', 
    borderColor: 'border-destructive/60',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]'
  },
};

const supabase = createClient();

async function dismissInsight(insightId: string): Promise<void> {
    const { error } = await supabase.rpc('dismiss_insight', { p_insight_id: insightId });
    if (error) throw new Error(error.message);
}

export default function InsightCard({ insight, onAskAI }: InsightCardProps) {
  const config = severityConfig[insight.severity] || severityConfig['info'];
  const queryClient = useQueryClient();

  const mutation = useMutation({
      mutationFn: dismissInsight,
      onSuccess: () => {
          toast.success("Intelligence Acknowledged", {
            description: "Aura has archived this insight to the historical audit trail."
          });
          queryClient.invalidateQueries({ queryKey: ['proactiveInsights'] });
      },
      onError: (error: Error) => {
          toast.error(`Neural Handshake Error: ${error.message}`);
      }
  });

  const handleDismiss = () => mutation.mutate(insight.id);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        'group relative break-inside-avoid rounded-2xl border-l-4 bg-card shadow-sm transition-all duration-300 hover:shadow-2xl flex flex-col overflow-hidden mb-6 border-slate-200 dark:border-slate-800', 
        config.borderColor,
        config.glow,
        'hover:-translate-y-1'
      )}
    >
      {/* 1. EXECUTIVE HEADER */}
      <CardHeader className="pb-3 bg-gradient-to-br from-transparent to-muted/10">
        <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
                <CardTitle className={cn('flex items-center gap-2 text-[13px] font-black uppercase tracking-wider', config.color)}>
                  <config.Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{insight.title}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                    {insight.is_forensic_verified && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest animate-in fade-in zoom-in duration-500">
                            <ShieldCheck size={10} className="fill-current" /> Forensic Verified
                        </div>
                    )}
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                        {insight.generated_at ? new Date(insight.generated_at).toLocaleTimeString() : 'Live Scan'}
                    </span>
                </div>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-40 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-2xl border-slate-200">
                    <DropdownMenuItem onClick={handleDismiss} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Acknowledge & Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAskAI(`Perform a deep-dive analysis on this insight: ${insight.title}. Message: ${insight.message}`)} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
                        <TrendingUp className="mr-2 h-4 w-4 text-blue-500" /> Executive Drill-Down
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDismiss} className="cursor-pointer font-bold text-xs uppercase tracking-tighter focus:bg-destructive/10 focus:text-destructive text-destructive">
                        <XCircle className="mr-2 h-4 w-4" /> Dismiss Intel
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>

      {/* 2. INTELLIGENCE BODY */}
      <CardContent className="space-y-5 flex-grow py-4">
        <div className="relative">
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {insight.message}
            </p>
        </div>
        
        {/* Glowing Area Chart Visualization */}
        {insight.chart_data && insight.chart_data.length > 0 && (
            <div className="h-32 -mx-2 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-2 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={insight.chart_data}>
                        <defs>
                            <linearGradient id={`glow-${insight.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ background: '#020617', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                            itemStyle={{ fontWeight: 'bold', color: '#60a5fa' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--primary))" 
                            fillOpacity={1} 
                            fill={`url(#glow-${insight.id})`} 
                            strokeWidth={3} 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )}

        {/* Forensic Data Points Grid */}
        {insight.key_data && (
          <div className="grid grid-cols-1 gap-2.5 rounded-xl border bg-muted/40 p-4 shadow-inner">
            {Object.entries(insight.key_data).map(([key, item]) => (
              <div key={key} className="flex justify-between items-center group/item">
                <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full bg-slate-300 transition-colors group-hover/item:bg-primary")} />
                    <span className="text-[11px] font-bold capitalize text-slate-500 tracking-tight">{key.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                    {item.trend !== undefined && (
                        <span className={cn('text-[10px] font-black flex items-center', item.trend > 0 ? 'text-emerald-500' : 'text-red-500')}>
                            {item.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowUpRight className="rotate-90" size={12} />}
                            {Math.abs(item.trend)}%
                        </span>
                    )}
                    {item.href ? (
                        <Button asChild variant="link" className="p-0 h-auto font-mono text-[11px] font-black text-primary hover:text-blue-700 decoration-dotted underline-offset-4">
                            <Link href={item.href}>{String(item.value)}</Link>
                        </Button>
                    ) : (
                        <span className="font-mono text-[11px] font-black text-slate-900 dark:text-white">{String(item.value)}</span>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* 3. EXECUTIVE ACTION FOOTER */}
      {insight.suggested_actions && insight.suggested_actions.length > 0 && (
        <CardFooter className="flex flex-col items-start gap-3 pt-5 border-t bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
                <Zap size={13} className="text-primary fill-primary animate-pulse" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Autonomous Agency</h4>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full pb-2">
                {insight.suggested_actions.map((action, index) => (
                <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="group/btn relative w-full h-auto justify-between text-left py-3 px-4 rounded-xl border-slate-200 bg-white hover:border-primary hover:bg-primary/5 transition-all overflow-hidden shadow-sm"
                    onClick={() => onAskAI(action.prompt)}
                >
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-1.5 rounded-lg bg-slate-100 group-hover/btn:bg-primary/10 transition-colors">
                            <MessageSquarePlus className="h-3.5 w-3.5 text-slate-500 group-hover/btn:text-primary" />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 group-hover/btn:text-slate-900">{action.label}</span>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300 group-hover/btn:text-primary transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    
                    {/* Subtle interaction gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                </Button>
                ))}
            </div>
        </CardFooter>
      )}

      {/* BOTTOM FORENSIC BAR */}
      <div className="px-6 py-2.5 bg-slate-950 border-t border-white/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
                <Fingerprint size={10} className="text-slate-500" />
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">Sovereign Intel: {insight.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2">
                <Activity size={10} className="text-slate-600" />
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">BBU1 Ecosystem v10.8</span>
            </div>
      </div>
    </motion.div>
  );
}

/**
 * STATUS: Executive Card Operational.
 * JURISDICTION: BBU1 Global Dashboard.
 * VERSION: v10.8 (Sovereign Edition).
 */