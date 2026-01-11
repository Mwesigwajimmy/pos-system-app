'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccountingAuditLogs } from '@/lib/actions/bills'; // The server action we created
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, Activity, ShieldCheck, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Enterprise Types ---

interface AuditTrailTableProps {
  businessId: string;
}

/**
 * Enterprise Audit Trail
 * Fetches real immutable history from the General Ledger.
 */
export default function AuditTrailTable({ businessId }: AuditTrailTableProps) {
  const [filter, setFilter] = useState('');

  // 1. Live Data Synchronization via TanStack Query
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit_logs', businessId],
    queryFn: () => getAccountingAuditLogs(businessId),
    enabled: !!businessId,
  });

  // 2. Client-side filtering for high-performance searching
  // UPDATED: Mapped to use real columns: action, table_name, user_email
  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l: any) => 
      l.action?.toLowerCase().includes(filter.toLowerCase()) ||
      l.table_name?.toLowerCase().includes(filter.toLowerCase()) ||
      l.user_email?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [logs, filter]);

  // Helper to format the JSON changes (From -> To)
  const formatChange = (val: any) => {
    if (!val) return '-';
    if (typeof val === 'object') return JSON.stringify(val).substring(0, 30) + '...';
    return String(val);
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    Immutable Audit Trail
                </CardTitle>
                <CardDescription>
                    Every accounting action—who did it, what changed, and the precise timestamp.
                </CardDescription>
            </div>
            
            <div className="relative max-w-xs w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search ledger actions..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8 bg-white" 
                />
                {filter && (
                    <X 
                        className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" 
                        onClick={() => setFilter('')}
                    />
                )}
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                <p className="animate-pulse font-medium">Synchronizing Compliance Data...</p>
            </div>
        ) : isError ? (
            <div className="p-12 text-center bg-red-50 border border-red-100 rounded-xl text-red-800">
                <p className="font-bold">System Connection Interrupted</p>
                <p className="text-sm">Could not retrieve the audit trail from the General Ledger.</p>
            </div>
        ) : (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <ScrollArea className="h-[500px]">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-20">
                    <TableRow>
                        <TableHead className="w-[150px]">Timestamp</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Actor (User)</TableHead>
                        <TableHead>Ledger Entity</TableHead>
                        <TableHead>From Value</TableHead>
                        <TableHead>To Value</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filtered.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                                No audit records found for this period.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map((l: any) => (
                        <TableRow key={l.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-mono text-[11px] text-muted-foreground">
                                {format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                                {/* UPDATED: Uses real column l.action */}
                                <Badge variant="outline" className={cn("uppercase text-[10px] font-bold px-2", getStatusStyles(l.action))}>
                                    {l.action}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    {/* UPDATED: Uses real column l.user_email */}
                                    <span className="text-sm font-semibold">{l.user_email || 'System Account'}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">Verified Activity</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    {/* UPDATED: Uses real column l.table_name */}
                                    <span className="text-xs font-bold text-slate-700">{l.table_name.replace('accounting_', '')}</span>
                                    <span className="text-[9px] text-muted-foreground font-mono">REC: {l.record_id.substring(0, 8)}...</span>
                                </div>
                            </TableCell>
                            <TableCell className="font-mono text-[10px] text-red-600 max-w-[150px] truncate">
                                {/* UPDATED: Uses real column l.old_data */}
                                {formatChange(l.old_data)}
                            </TableCell>
                            <TableCell className="font-mono text-[10px] text-green-600 max-w-[150px] truncate font-bold">
                                {/* UPDATED: Uses real column l.new_data */}
                                {formatChange(l.new_data)}
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
                </ScrollArea>
                <div className="p-4 bg-slate-50 border-t flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Activity className="w-3 h-3" /> Live Transaction Monitoring Active
                </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

// Enterprise Helper: Color Coding actions
function getStatusStyles(type: string) {
    if (!type) return 'bg-slate-100';
    if (type.includes('INSERT')) return 'bg-green-50 text-green-700 border-green-200';
    if (type.includes('UPDATE')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
}