"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X, AlertTriangle, CheckCircle2, ShieldAlert, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// ENTERPRISE TYPE ALIGNMENT: Matches DB columns 1:1
interface SupplierRisk {
  id: string;
  supplier_name: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_type: string;
  country: string;
  entity: string;
  details: string;
  is_active: boolean;
  vendor_id?: string;
}

interface Props {
  tenantId?: string;
}

export default function SupplierRiskRegister({ tenantId }: Props) {
  const [rows, setRows] = useState<SupplierRisk[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if(!tenantId) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from('supplier_risk_register')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_active', { ascending: false });

      if (data) setRows(data as any);
      setLoading(false);
    };

    fetchData();
  }, [tenantId, supabase]);

  const filtered = useMemo(
    () => rows.filter(r =>
      (r.supplier_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (r.risk_type || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [rows, filter]
  );

  // Autonomous metric for enterprise oversight
  const criticalCount = rows.filter(r => r.risk_level === 'critical' && r.is_active).length;

  const getRiskBadge = (level: string) => {
    const config = {
        critical: "bg-red-600 text-white hover:bg-red-700",
        high: "bg-orange-500 text-white hover:bg-orange-600",
        medium: "bg-amber-400 text-black hover:bg-amber-500",
        low: "bg-emerald-500 text-white hover:bg-emerald-600"
    };
    const style = config[level as keyof typeof config] || "bg-slate-200";
    return <Badge className={`${style} text-[10px] uppercase font-black px-2 py-0`}>{level}</Badge>;
  };

  return (
    <Card className="border-t-4 border-t-red-600 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-600" /> Supplier Risk Register
                </CardTitle>
                <CardDescription>Monitor sanctions, performance issues, and compliance risks.</CardDescription>
            </div>
            {criticalCount > 0 && (
                <div className="bg-red-50 border border-red-200 px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-red-700">{criticalCount} CRITICAL ALERTS</span>
                </div>
            )}
        </div>
        <div className="relative mt-4 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Search vendor risk profile..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8 h-9"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
          : <ScrollArea className="h-72 border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Supplier & Country</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Risk Type</TableHead>
                    <TableHead>Alert Status</TableHead>
                    <TableHead>Legal Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No active risk alerts found.</TableCell></TableRow>
                    : filtered.map(r => (
                        <TableRow key={r.id} className={`hover:bg-slate-50/50 ${r.risk_level === 'critical' && r.is_active ? 'bg-red-50/30' : ''}`}>
                          <TableCell>
                             <div className="font-bold text-slate-900">{r.supplier_name}</div>
                             <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase mt-1">
                                <Globe className="h-2 w-2" /> {r.country || 'Global'}
                             </div>
                          </TableCell>
                          <TableCell>
                            {getRiskBadge(r.risk_level)}
                          </TableCell>
                          <TableCell className="text-sm italic text-slate-600">{r.risk_type}</TableCell>
                          <TableCell>
                            {r.is_active
                              ? <div className="flex items-center text-amber-600 gap-1 font-bold text-[11px]"><AlertTriangle className="w-3 h-3"/> ACTIVE</div>
                              : <div className="flex items-center text-emerald-600 gap-1 font-bold text-[11px]"><CheckCircle2 className="w-3 h-3"/> RESOLVED</div>
                            }
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-500">{r.entity}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}