'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, CheckCircle2, AlertCircle, FileEdit, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AuditFinding {
  id: string;
  finding_type: "Observation" | "Exception" | "Deficiency" | "Violation";
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  responsible: string;
  entity: string;
  country: string;
  status: "open" | "in progress" | "closed";
  opened_at: string;
  closed_at?: string;
  tenant_id: string;
}

export default function AuditFindingsTable() {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  const supabase = createClient();

  // Optimized fetch function
  const fetchFindings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_findings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFindings(data as AuditFinding[]);
    } catch (err: any) {
      console.error("Error fetching findings:", err);
      setError(err.message || "Failed to load findings.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const filtered = useMemo(
    () =>
      findings.filter(
        f =>
          (f.title?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.responsible?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.entity?.toLowerCase() || "").includes(filter.toLowerCase()) ||
          (f.country?.toLowerCase() || "").includes(filter.toLowerCase())
      ),
    [findings, filter]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Audit Findings Register</CardTitle>
        <CardDescription>
          Real-time tracking of regional findings, severity levels, and remediation status.
        </CardDescription>
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
        {loading ? (
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
                  <TableHead className="w-[200px]">Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
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
                    <TableRow key={f.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                         <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                           f.status === "closed" ? "bg-green-50 text-green-700 border-green-200" :
                           f.status === "in progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                           "bg-yellow-50 text-yellow-700 border-yellow-200"
                         }`}>
                            {f.status === "closed" ? <CheckCircle2 className="w-3 h-3" /> :
                             f.status === "in progress" ? <FileEdit className="w-3 h-3" /> :
                             <AlertCircle className="w-3 h-3" />}
                            <span className="capitalize">{f.status}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.finding_type}</TableCell>
                      <TableCell className="font-medium text-sm">{f.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${
                            f.severity === "Critical" ? "border-red-500 text-red-600 bg-red-50" :
                            f.severity === "High" ? "border-orange-500 text-orange-600 bg-orange-50" :
                            f.severity === "Medium" ? "border-yellow-500 text-yellow-600 bg-yellow-50" :
                            "border-slate-200 text-slate-600"
                        }`}>
                            {f.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.responsible}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{f.entity}</span>
                            <span className="text-xs text-muted-foreground">{f.country}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(f.opened_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {f.closed_at ? new Date(f.closed_at).toLocaleDateString() : "-"}
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