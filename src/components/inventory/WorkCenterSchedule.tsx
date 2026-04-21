'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    Search, X, Clock, User, Monitor, 
    Download, FileText, Loader2, ShieldCheck, 
    Settings2, Activity 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// 1. Define the High-Integrity Data Interface
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
}

// 2. Define Props Interface
interface WorkCenterScheduleProps {
  initialData: WorkCenterScheduleEntry[];
  workingBizId?: string; // Resolved from server handshake
}

const supabase = createClient();

export default function WorkCenterSchedule({ initialData, workingBizId }: WorkCenterScheduleProps) {
  const [filter, setFilter] = useState("");
  const queryClient = useQueryClient();

  // --- 1. INDUSTRIAL DATA SYNC (The Weld) ---
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['work_center_schedule', workingBizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_center_schedule')
        .select('*')
        .eq('business_id', workingBizId) // Enforce sector partitioning
        .order('start_time', { ascending: true });

      if (error) {
        console.error("Schedule Neural Link Error:", error.message);
        return initialData; // Fallback to server data
      }

      // Mapping database columns to UI identities (No assumptions)
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
        tenantId: s.business_id
      })) as WorkCenterScheduleEntry[];
    },
    initialData: initialData,
    enabled: !!workingBizId,
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 mins for floor monitoring
  });

  // --- 2. FORENSIC SEARCH LOGIC ---
  const filtered = useMemo(() =>
    (schedule || []).filter(s =>
      s.workCenter.toLowerCase().includes(filter.toLowerCase()) ||
      s.product.toLowerCase().includes(filter.toLowerCase()) ||
      s.machineOperator.toLowerCase().includes(filter.toLowerCase())
    ),
    [schedule, filter]
  );

  // --- 3. INDUSTRIAL REPORTING (PDF/EXCEL) ---
  const downloadIndustrialSchedule = (format: 'PDF' | 'CSV') => {
    if (format === 'CSV') {
        const headers = "Status,WorkCenter,Product,Operator,StartTime,EndTime\n";
        const rows = filtered.map(s => `${s.status},${s.workCenter},${s.product},${s.machineOperator},${s.scheduledStart},${s.scheduledEnd}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Production_Schedule_${workingBizId?.substring(0,8)}.csv`;
        link.click();
        return;
    }

    const doc = new jsPDF();
    (doc as any).autoTable({
        head: [['Status', 'Work Center', 'Product', 'Operator', 'Timing']],
        body: filtered.map(s => [
            s.status.toUpperCase(),
            s.workCenter,
            s.product,
            s.machineOperator,
            `${new Date(s.scheduledStart).toLocaleTimeString()} - ${new Date(s.scheduledEnd).toLocaleTimeString()}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] } // Match your slate-900 UI
    });
    doc.save(`Shift_Schedule_${Date.now()}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[9px] tracking-widest px-3">Running</Badge>;
      case "stopped":
        return <Badge variant="destructive" className="font-black uppercase text-[9px] tracking-widest px-3">Stopped</Badge>;
      case "finished":
        return <Badge className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-[9px] tracking-widest px-3 text-white border-none">Finished</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 font-black uppercase text-[9px] tracking-widest px-3 border-slate-200">Planned</Badge>;
    }
  };

  return (
    <Card className="w-full border-slate-200 shadow-sm rounded-[2rem] overflow-hidden bg-white">
      <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
        <div>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Work Center Schedule</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
            Machine allocation, operator assignments, and industrial runtime status.
            </CardDescription>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Filter machine, product, or operator..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-10 h-11 border-slate-200 bg-white shadow-inner rounded-xl font-bold text-sm"
                />
                {filter && (
                    <X 
                    className="absolute right-3 top-3.5 h-4 w-4 text-slate-300 cursor-pointer hover:text-red-500 transition-colors" 
                    onClick={() => setFilter("")}
                    />
                )}
            </div>
            <div className="flex gap-2">
                <Button onClick={() => downloadIndustrialSchedule('CSV')} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm">
                    <Download size={18} />
                </Button>
                <Button onClick={() => downloadIndustrialSchedule('PDF')} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm">
                    <FileText size={18} />
                </Button>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-none h-14">
                <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-8 tracking-widest">Runtime Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Work Center Unit</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Molecular Target</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Production Session</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Authorized Operator</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Planned Commencement</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Projected Finalization</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest pr-8 text-right">Region</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-60 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Synchronizing Shift Schedule...</p>
                        </div>
                    </TableCell>
                  </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-300 font-bold italic uppercase text-xs tracking-widest">
                    No active industrial sessions mapped in this sector.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="h-24 hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none group">
                    <TableCell className="pl-8">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="font-black text-slate-900 text-sm tracking-tight">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors">
                            <Monitor className="w-5 h-5" />
                        </div>
                        {item.workCenter}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-600 text-sm">{item.product}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className="border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-md shadow-none">
                            {item.session}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-black text-slate-700 text-xs uppercase tracking-tight">
                        <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-500 shadow-sm">
                            <User className="w-4 h-4" />
                        </div>
                        {item.machineOperator}
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-mono font-bold text-slate-400 tracking-tighter">
                      {new Date(item.scheduledStart).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono font-bold text-slate-400 tracking-tighter">
                      {new Date(item.scheduledEnd).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            {item.entity}
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <footer className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
          <div className="flex items-center gap-3">
              <Activity size={16} className="text-blue-500" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine Utilization: Optimized</p>
          </div>
          <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Forensic Registry Sync: Active</p>
          </div>
      </footer>
    </Card>
  );
}