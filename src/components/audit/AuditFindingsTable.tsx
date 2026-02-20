'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, CheckCircle2, AlertCircle, FileEdit, AlertTriangle, ShieldAlert, Fingerprint, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; // Upgrade: Integrated for real-time trigger alerts

interface AuditFinding {
  id: string;
  finding_type: "Observation" | "Exception" | "Deficiency" | "Violation" | "Autonomous_Anomaly"; // Upgrade: Added Type Parity
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical" | "CRITICAL" | "HIGH"; // Upgrade: Added Backend Enum Parity
  responsible: string;
  entity: string;
  country: string;
  status: "open" | "in progress" | "closed" | "DETECTED"; // Upgrade: Added Trigger State
  opened_at: string;
  closed_at?: string;
  tenant_id: string;
  execution_id?: string; // Upgrade: Sovereign Audit Reference
}

export default function AuditFindingsTable() {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [isLive, setIsLive] = useState(false); // Upgrade: Visual indicator for trigger activity
  
  const supabase = createClient();

  // Optimized fetch function (Original logic preserved)
  const fetchFindings = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Original Manual Findings
      const { data: manualData, error: manualError } = await supabase
        .from('audit_findings')
        .select('*')
        .order('created_at', { ascending: false });

      if (manualError) throw manualError;

      // 2. Upgrade: Fetch Autonomous Anomalies from Forensic Guard
      const { data: autoData } = await supabase
        .from('sovereign_audit_anomalies')
        .select('*')
        .order('created_at', { ascending: false });

      // Transform Backend Anomalies into UI Findings format without touching original columns
      const autonomousFindings: AuditFinding[] = (autoData || []).map(a => ({
        id: a.id,
        finding_type: "Autonomous_Anomaly",
        title: a.anomaly_type || "Forensic Alert",
        description: a.description,
        severity: a.severity as any,
        responsible: "SYSTEM_GUARD",
        entity: "Autonomous Kernel",
        country: "Global",
        status: "open",
        opened_at: a.created_at,
        tenant_id: a.tenant_id,
        execution_id: a.execution_id
      }));

      setFindings([...autonomousFindings, ...(manualData as AuditFinding[])]);
    } catch (err: any) {
      console.error("Error fetching findings:", err);
      setError(err.message || "Failed to load findings.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFindings();

    // Upgrade: Real-time Listener for Sovereign Audit Triggers (trg_ledger_forensics)
    const channel = supabase
      .channel('autonomous_audit_stream')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sovereign_audit_anomalies' 
      }, (payload) => {
        const newAnomaly = payload.new;
        
        // Immediate notification for Critical Anomaly Inventions
        if (newAnomaly.severity === 'CRITICAL') {
            toast.error(`FORENSIC ALERT: ${newAnomaly.anomaly_type}`, {
                description: newAnomaly.description,
                icon: <ShieldAlert className="text-red-500" />
            });
        }

        setIsLive(true);
        fetchFindings(); // Refresh to merge new autonomous data
        setTimeout(() => setIsLive(false), 3000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [fetchFindings, supabase]);

  const filtered = useMemo(
    () =>
      findings.filter(
        f =>
          (f.title?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.responsible?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.entity?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.country?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.description?.toLowerCase() || "").includes(filter.toLowerCase())
      ),
    [findings, filter]
  );

  return (
    <Card className="h-full flex flex-col border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    Audit Findings Register
                </CardTitle>
                <CardDescription>
                    {isLive ? (
                        <span className="text-emerald-600 font-bold animate-pulse flex items-center gap-1">
                            <Zap size={14} fill="currentColor"/> LIVE SOVEREIGN GUARD ACTIVE
                        </span>
                    ) : (
                        "Real-time tracking of regional findings, severity levels, and remediation status."
                    )}
                </CardDescription>
            </div>
            {isLive && <Badge className="bg-emerald-500">Syncing Trigger...</Badge>}
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input 
            placeholder="Search findings, entities, or owners..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8" 
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => setFilter('')} 
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {loading && findings.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
             <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
             Loading register...
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-red-500 bg-red-50 rounded-md">
             <AlertTriangle className="w-5 h-5 mr-2"/> {error}
          </div>
        ) : (
          <ScrollArea className="h-[500px] w-full border rounded-md">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[200px]">Title / Anomaly</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Ref ID</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No findings found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(f => (
                    <TableRow 
                        key={f.id} 
                        className={`hover:bg-slate-50 transition-colors ${f.finding_type === 'Autonomous_Anomaly' ? 'bg-red-50/30' : ''}`}
                    >
                      <TableCell>
                         <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                           f.status === "closed" ? "bg-green-50 text-green-700 border-green-200" :
                           f.status === "in progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                           f.status === "open" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                           "bg-red-100 text-red-700 border-red-200"
                         }`}>
                            {f.status === "closed" ? <CheckCircle2 className="w-3 h-3" /> :
                             f.status === "in progress" ? <FileEdit className="w-3 h-3" /> :
                             <AlertCircle className="w-3 h-3" />}
                            <span className="capitalize">{f.status}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.finding_type === 'Autonomous_Anomaly' ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none text-[10px]">AUTONOMOUS</Badge>
                        ) : f.finding_type}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {f.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${
                            (f.severity === "Critical" || f.severity === "CRITICAL") ? "border-red-500 text-red-600 bg-red-50" :
                            (f.severity === "High" || f.severity === "HIGH") ? "border-orange-500 text-orange-600 bg-orange-50" :
                            f.severity === "Medium" ? "border-yellow-500 text-yellow-600 bg-yellow-50" :
                            "border-slate-200 text-slate-600"
                        }`}>
                            {f.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.responsible === 'SYSTEM_GUARD' ? (
                            <span className="flex items-center gap-1 text-primary font-mono text-xs font-bold">
                                <ShieldAlert size={12}/> CORE_GUARD
                            </span>
                        ) : f.responsible}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{f.entity}</span>
                            <span className="text-xs text-muted-foreground">{f.country}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(f.opened_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground uppercase">
                        {f.execution_id?.substring(0,8) || f.id.substring(0,8)}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm text-muted-foreground" title={f.description}>
                            {f.description}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}