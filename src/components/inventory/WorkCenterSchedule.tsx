'use client';

/**
 * --- BBU1 WORK CENTER COMMAND HUB ---
 * VERSION: v1.7 OMEGA (INDUSTRIAL COMMAND WELDED)
 * Use: Real-time floor monitoring and machine-level status control.
 * Logic: Multi-tenant isolated stream from work_center_schedule + Action Handshake.
 * Handshake: Synchronized with mfg_production_orders and agri_production_batches.
 *
 * LAYOUT / UI PASS NOTES:
 * - The `schedule` useQuery, `updateStatusMutation`, and the search filtering logic are all
 *   untouched — same table, same mapping, same mutation payload, same queryKey.
 * - Bug fix (not style): the CSV export built rows with plain string concatenation. Any
 *   product/work-center/operator name containing a comma would silently shift every column
 *   after it out of alignment on open in Excel. Added proper field escaping (quotes fields
 *   containing commas/quotes/newlines, per RFC 4180) — same columns, same data, just safe.
 * - Honesty note, not a fix: the footer's "OEE Optimized: 98.4%" and "Safety Handshake:
 *   Verified" are hardcoded strings, not computed from any real telemetry. I left them as-is
 *   since I wasn't asked to touch data logic, but wanted to flag that they're decorative
 *   placeholders rather than live figures.
 * - Buttons/dropdown actions were already correctly wired in the original (search, CSV/PDF
 *   export, and the three status-change dropdown items all call real functions) — nothing
 *   there needed fixing, just cleaner styling and added aria-labels/focus states.
 */

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Search, Clock, User, Monitor,
    Download, FileText, Loader2, ShieldCheck,
    Activity, Play, Pause, CheckCircle2,
    Database, Sprout, Factory
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { cn } from "@/lib/utils";

// 1. Define the High-Integrity Data Interface (untouched)
export interface WorkCenterScheduleEntry {
  id: string;
  workCenter: string;
  session: string;
  product: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "planned" | "running" | "stopped" | "finished" | string;
  machineOperator: string;
  entity: string;
  country?: string;
  tenantId: string;
  batchId?: string; // Link to physical production batch
  isBiological?: boolean; // Agri-Weld detection
}

// 2. Define Props Interface (untouched)
interface WorkCenterScheduleProps {
  initialData: WorkCenterScheduleEntry[];
  workingBizId?: string; // Resolved from server handshake
}

const supabase = createClient();

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

// Escapes a single CSV field per RFC 4180: wraps in quotes and doubles any internal quotes
// whenever the value contains a comma, quote, or newline that would otherwise break columns.
const csvField = (value: any) => {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export default function WorkCenterSchedule({ initialData, workingBizId }: WorkCenterScheduleProps) {
  const [filter, setFilter] = useState("");
  const queryClient = useQueryClient();

  // --- 1. INDUSTRIAL DATA SYNC (The Master Weld) — untouched ---
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['work_center_schedule', workingBizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_center_schedule')
        .select(`
            *,
            mfg_order:mfg_order_id(batch_number, metadata)
        `)
        .eq('business_id', workingBizId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Schedule Neural Link Error:", error.message);
        return initialData;
      }

      return data.map((s: any) => ({
        id: s.id,
        workCenter: s.title || "Main Center",
        session: s.notes || "Standard Run",
        product: s.product_name || "Industrial Asset",
        scheduledStart: s.start_time,
        scheduledEnd: s.end_time,
        status: s.status || "planned",
        machineOperator: s.operator_id || "Unassigned",
        entity: s.country_code || "N/A",
        tenantId: s.business_id,
        batchId: s.mfg_order?.batch_number,
        isBiological: !!s.mfg_order?.metadata?.is_biological
      })) as WorkCenterScheduleEntry[];
    },
    initialData: initialData,
    enabled: !!workingBizId,
    refetchInterval: 1000 * 30, // 30s High-Velocity Pulse for manufacturing floor
  });

  // --- 2. ACTION WELD: REMOTE FLOOR CONTROL — untouched ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
        const { error } = await supabase
            .from('work_center_schedule')
            .update({ status: newStatus })
            .eq('id', id);
        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Industrial State Synchronized");
        queryClient.invalidateQueries({ queryKey: ['work_center_schedule'] });
    },
    onError: (err: any) => toast.error(`Handshake Failed: ${err.message}`)
  });

  // --- 3. FORENSIC SEARCH LOGIC — untouched ---
  const filtered = useMemo(() =>
    (schedule || []).filter(s =>
      s.workCenter.toLowerCase().includes(filter.toLowerCase()) ||
      s.product.toLowerCase().includes(filter.toLowerCase()) ||
      s.machineOperator.toLowerCase().includes(filter.toLowerCase())
    ),
    [schedule, filter]
  );

  // --- 4. INDUSTRIAL REPORTING (PDF/CSV) — same columns/data, CSV field-escaping fixed ---
  const downloadIndustrialSchedule = (format: 'PDF' | 'CSV') => {
    if (format === 'CSV') {
        const headers = ['Status', 'WorkCenter', 'Product', 'Batch', 'Operator', 'StartTime', 'EndTime'].map(csvField).join(",") + "\n";
        const rows = filtered.map(s => [
            s.status, s.workCenter, s.product, s.batchId || 'N/A', s.machineOperator, s.scheduledStart, s.scheduledEnd
        ].map(csvField).join(",")).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Production_Schedule_${workingBizId?.substring(0,8)}.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    (doc as any).autoTable({
        head: [['Status', 'Work Center', 'Product', 'Batch ID', 'Operator', 'Timing']],
        body: filtered.map(s => [
            s.status.toUpperCase(),
            s.workCenter,
            s.product,
            s.batchId || 'N/A',
            s.machineOperator,
            `${new Date(s.scheduledStart).toLocaleTimeString()} - ${s.scheduledEnd ? new Date(s.scheduledEnd).toLocaleTimeString() : '--:--'}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`Production_Schedule_${workingBizId?.substring(0,8) || Date.now()}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return <Badge className="bg-emerald-500 text-white border-none font-medium text-[11px] px-2.5 py-1 gap-1.5"><Activity size={11} className="animate-pulse" aria-hidden="true" /> Running</Badge>;
      case "stopped":
      case "paused":
        return <Badge className="bg-amber-400 text-white border-none font-medium text-[11px] px-2.5 py-1 gap-1.5"><Pause size={11} aria-hidden="true" /> Paused</Badge>;
      case "finished":
        return <Badge className="bg-blue-600 text-white border-none font-medium text-[11px] px-2.5 py-1 gap-1.5"><CheckCircle2 size={11} aria-hidden="true" /> Finished</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 font-medium text-[11px] px-2.5 py-1 border-slate-200">Planned</Badge>;
    }
  };

  return (
    <Card className="w-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-none">
      <CardHeader className="p-6 sm:p-7 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-50">
        <div className="space-y-1">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 bg-slate-900 rounded-lg text-emerald-400 flex items-center justify-center">
                    <Database size={19} aria-hidden="true" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight">Work center schedule</CardTitle>
            </div>
            <CardDescription className="text-[12.5px] text-slate-500">
                Machine allocation, operator assignments, and runtime status.
            </CardDescription>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                    placeholder="Search unit, product, or operator…"
                    aria-label="Search work center, product, or operator"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="pl-10 h-10 border-slate-200 bg-white rounded-lg text-sm"
                />
            </div>
            <div className="flex gap-2">
                <Button onClick={() => downloadIndustrialSchedule('CSV')} variant="outline" size="icon" aria-label="Export schedule as CSV" title="Export CSV" className={cn("h-10 w-10 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-50", FOCUS_RING)}>
                    <Download size={17} aria-hidden="true" />
                </Button>
                <Button onClick={() => downloadIndustrialSchedule('PDF')} variant="outline" size="icon" aria-label="Export schedule as PDF" title="Export PDF" className={cn("h-10 w-10 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-50", FOCUS_RING)}>
                    <FileText size={17} aria-hidden="true" />
                </Button>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
              <TableRow className="border-none h-12">
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500 pl-6">Status</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Work center</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Product</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500 text-center">Batch</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Operator</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Timing</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-slate-500 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                            <p className="text-sm font-medium">Loading floor schedule…</p>
                        </div>
                    </TableCell>
                  </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-56 text-center text-sm font-medium text-slate-400">
                    No active sessions match this search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="h-20 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none group">
                    <TableCell className="pl-6">{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 bg-slate-900 rounded-lg text-emerald-400 flex items-center justify-center">
                            <Monitor className="w-4.5 h-4.5" size={17} aria-hidden="true" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-[13.5px]">{item.workCenter}</span>
                            <span className="text-[11px] text-slate-400">{item.session}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            {item.isBiological ? <Sprout size={15} className="text-emerald-500 shrink-0" aria-hidden="true" /> : <Factory size={15} className="text-blue-500 shrink-0" aria-hidden="true" />}
                            <span className="font-medium text-slate-700 text-[13px]">{item.product}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700 font-mono font-medium px-2.5 py-1 text-[11.5px] rounded-md">
                            {item.batchId || 'External'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-700 text-[12.5px] font-medium">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-500">
                            <User className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                        {item.machineOperator}
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1 text-[11.5px] font-mono text-slate-500 tabular-nums">
                            <div className="flex items-center gap-1.5"><Clock size={11} className="text-emerald-500" aria-hidden="true" /> {new Date(item.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="flex items-center gap-1.5"><Clock size={11} className="text-red-400" aria-hidden="true" /> {item.scheduledEnd ? new Date(item.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div>
                        </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-label={`Change status for ${item.workCenter}`} className={cn("bg-slate-900 hover:bg-slate-800 text-white font-medium text-[12px] rounded-lg h-9 px-4", FOCUS_RING)}>
                                    Execute
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 p-1.5">
                                <DropdownMenuLabel className="text-[11px] font-medium text-slate-400 px-2.5 py-1.5">Operational state</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, newStatus: 'running' })} className="flex items-center gap-2.5 font-medium text-emerald-600 rounded-lg py-2 cursor-pointer text-sm">
                                    <Play size={15} aria-hidden="true" /> Resume operation
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, newStatus: 'paused' })} className="flex items-center gap-2.5 font-medium text-amber-600 rounded-lg py-2 cursor-pointer text-sm">
                                    <Pause size={15} aria-hidden="true" /> Stop machine
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, newStatus: 'finished' })} className="flex items-center gap-2.5 font-medium text-blue-600 rounded-lg py-2 cursor-pointer text-sm">
                                    <CheckCircle2 size={15} aria-hidden="true" /> Mark as finished
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>

      <footer className="px-6 sm:px-7 py-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50 gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-blue-500" aria-hidden="true" />
                <p className="text-[11.5px] font-medium text-slate-500">OEE: 98.4%</p>
              </div>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" aria-hidden="true" />
                  <p className="text-[11.5px] font-medium text-slate-500">Safety handshake verified</p>
              </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-medium text-slate-500">Live floor telemetry active</p>
          </div>
      </footer>
    </Card>
  );
}