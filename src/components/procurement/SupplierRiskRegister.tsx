"use client";

/**
 * --- BBU1 SUPPLIER RISK REGISTER ---
 * VERSION: v5.0 OMEGA (BIOLOGIC COMPLIANCE WELD)
 * Use: Forensic monitoring of vendor risks and biological input integrity.
 * Logic: Multi-tenant risk distribution with optional Agribusiness Guard.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
    Loader2, 
    Search, 
    X, 
    AlertTriangle, 
    CheckCircle2, 
    ShieldAlert, 
    Globe, 
    Sprout, 
    FlaskConical, 
    Database,
    ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  // --- AGRI-DNA FIELDS (OPTIONAL) ---
  domain?: "General" | "Agriculture";
  biologic_impact?: boolean;
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
  
  // Agri-Forensic Metric
  const agriRiskCount = rows.filter(r => r.domain === 'Agriculture' && r.is_active).length;

  const getRiskBadge = (level: string) => {
    const config = {
        critical: "bg-red-600 text-white hover:bg-red-700",
        high: "bg-orange-500 text-white hover:bg-orange-600",
        medium: "bg-amber-400 text-black hover:bg-amber-500",
        low: "bg-emerald-500 text-white hover:bg-emerald-600"
    };
    const style = config[level as keyof typeof config] || "bg-slate-200";
    return <Badge className={`${style} text-[10px] uppercase font-black px-2 py-0 border-none`}>{level}</Badge>;
  };

  const getDomainBadge = (domain?: string) => {
    if (domain === "Agriculture") {
        return (
            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50 text-[9px] font-black uppercase px-2 py-0">
                <Sprout className="h-2.5 w-2.5 mr-1" /> Biologic
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50 text-[9px] font-black uppercase px-2 py-0">
            <Database className="h-2.5 w-2.5 mr-1" /> Industrial
        </Badge>
    );
  };

  return (
    <Card className="border-t-4 border-t-red-600 shadow-xl rounded-2xl overflow-hidden bg-white">
      <CardHeader className="pb-4 px-8 pt-8">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
                    <ShieldAlert className="h-7 w-7 text-red-600" /> Supplier Risk Registry
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium">Monitor sanctions, biological input integrity, and compliance performance.</CardDescription>
            </div>
            
            <div className="flex gap-3">
                {agriRiskCount > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-xl flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{agriRiskCount} AGRI-ALERTS</span>
                    </div>
                )}
                {criticalCount > 0 && (
                    <div className="bg-red-50 border border-red-200 px-4 py-1.5 rounded-xl flex items-center gap-2 animate-pulse">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">{criticalCount} CRITICAL PURGE ALERTS</span>
                    </div>
                )}
            </div>
        </div>

        <div className="flex items-center justify-between mt-6">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                <Input 
                    placeholder="Search vendor forensic risk profile..." 
                    value={filter} 
                    onChange={e=>setFilter(e.target.value)} 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl focus:ring-red-500 font-medium"
                />
                {filter && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-red-500" onClick={()=>setFilter("")}/>}
            </div>
            <div className="flex items-center gap-2 opacity-40">
                <ShieldCheck size={16} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Compliance Seal Active</span>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-8 pb-8">
        {loading
          ? <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-red-600" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Reconciling Vendor Integrity Data...</p>
            </div>
          : <ScrollArea className="h-[450px] rounded-2xl border border-slate-100 shadow-inner bg-slate-50/20">
              <Table>
                <TableHeader className="bg-white sticky top-0 z-20 shadow-sm">
                  <TableRow className="h-12 border-b border-slate-100">
                    <TableHead className="pl-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Supplier & Origin</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest text-center">Domain</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Risk Index</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Forensic Detail</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest text-center">Registry Status</TableHead>
                    <TableHead className="pr-6 font-black uppercase text-[10px] text-slate-400 tracking-widest text-right">Legal Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center py-32">
                        <div className="flex flex-col items-center opacity-20 gap-4">
                            <ShieldCheck size={64} />
                            <p className="font-black uppercase tracking-[0.2em] text-xs">No active risk anomalies detected</p>
                        </div>
                      </TableCell></TableRow>
                    : filtered.map(r => (
                        <TableRow key={r.id} className={cn(
                            "h-20 transition-colors border-b border-slate-50 last:border-0",
                            r.risk_level === 'critical' && r.is_active ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50'
                        )}>
                          <TableCell className="pl-6">
                             <div className="font-black text-slate-900 text-sm tracking-tight">{r.supplier_name}</div>
                             <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase mt-1">
                                <Globe className="h-3 w-3 text-blue-500" /> {r.country || 'Global Jurisdiction'}
                             </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getDomainBadge(r.domain)}
                          </TableCell>
                          <TableCell>
                            {getRiskBadge(r.risk_level)}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="text-xs font-bold text-slate-700 truncate">{r.risk_type}</div>
                            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{r.details}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {r.is_active
                              ? <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase">
                                  <AlertTriangle className="w-3 h-3 mr-1.5"/> Active Signal
                                </Badge>
                              : <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase">
                                  <CheckCircle2 className="w-3 h-3 mr-1.5"/> Resolved
                                </Badge>
                            }
                          </TableCell>
                          <TableCell className="pr-6 text-right font-black text-[10px] text-slate-400 uppercase tracking-tighter">
                            {r.entity || 'Unclassified'}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}